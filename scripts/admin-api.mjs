import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { randomBytes } from "node:crypto";

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"]);
const MAX_MEDIA_BYTES = 120 * 1024 * 1024;
const MAX_JSON_BYTES = 12 * 1024 * 1024;

function send(res, status, data, contentType = "application/json") {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}

function randomName(ext) {
  const id = randomBytes(18)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24);
  return `${id}${ext}`;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("File too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function requestUrl(req) {
  const raw = req.originalUrl || req.url || "/";
  return new URL(raw, "http://127.0.0.1");
}

function isSlide(value) {
  return (
    value &&
    typeof value === "object" &&
    (value.type === "image" || value.type === "video" || value.type === "vimeo") &&
    typeof value.src === "string" &&
    typeof value.alt === "string" &&
    typeof value.aspect === "number"
  );
}

function isSiteData(value) {
  return (
    value &&
    typeof value === "object" &&
    value.site &&
    typeof value.site === "object" &&
    Array.isArray(value.galleries) &&
    value.galleries.every(
      (gallery) =>
        gallery &&
        typeof gallery.id === "string" &&
        typeof gallery.label === "string" &&
        Array.isArray(gallery.slides) &&
        gallery.slides.every(isSlide),
    )
  );
}

function pathsFor(root) {
  return {
    root,
    sitePath: join(root, "src/data/site.json"),
    mediaDir: join(root, "public/media"),
  };
}

export function adminApi() {
  return {
    name: "247px-admin-api",
    apply: "serve",
    configureServer(server) {
      const { root, sitePath, mediaDir } = pathsFor(server.config.root || process.cwd());

      const printUrls = () => {
        const local = server.resolvedUrls?.local?.[0];
        if (!local) {
          setTimeout(printUrls, 100);
          return;
        }
        const url = `${local.replace(/\/?$/, "/")}?admin=1`;
        console.log(`\n  Gallery editor: ${url}`);
        console.log(`  Saving galleries to: ${sitePath}`);
        if (!existsSync(sitePath)) {
          console.error(`  Missing site.json — run npm run dev from the 247px project folder.\n`);
        } else {
          console.log("");
        }
      };
      printUrls();

      server.middlewares.use((req, res, next) => {
        const parsed = requestUrl(req);
        if (!parsed.pathname.startsWith("/api/admin")) return next();

        Promise.resolve()
          .then(async () => {
            if (req.method === "GET" && parsed.pathname === "/api/admin/health") {
              return send(res, 200, { ok: true, root, sitePath, siteExists: existsSync(sitePath) });
            }

            if (req.method === "GET" && parsed.pathname === "/api/admin/site") {
              if (!existsSync(sitePath)) {
                return send(res, 500, {
                  error: `Could not find site.json at ${sitePath}. Run npm run dev from the 247px folder.`,
                });
              }
              return send(res, 200, readFileSync(sitePath, "utf8"), "application/json");
            }

            if (req.method === "PUT" && parsed.pathname === "/api/admin/site") {
              const raw = (await readBody(req, MAX_JSON_BYTES)).toString("utf8");
              const body = JSON.parse(raw);
              if (!isSiteData(body)) {
                return send(res, 400, { error: "Invalid site data" });
              }
              writeFileSync(sitePath, `${JSON.stringify(body, null, 2)}\n`);
              return send(res, 200, { ok: true });
            }

            if (req.method === "POST" && parsed.pathname === "/api/admin/media") {
              const original =
                parsed.searchParams.get("filename") ||
                parsed.searchParams.get("name") ||
                req.headers["x-filename"];
              if (typeof original !== "string" || !original.trim()) {
                return send(res, 400, { error: "Missing filename" });
              }
              const ext = extname(original).toLowerCase();
              if (!ALLOWED_EXT.has(ext)) {
                return send(res, 400, { error: `Unsupported file type: ${ext || "unknown"}` });
              }
              mkdirSync(mediaDir, { recursive: true });
              const name = randomName(ext === ".jpeg" ? ".jpg" : ext);
              const dest = join(mediaDir, name);
              const buf = await readBody(req, MAX_MEDIA_BYTES);
              if (!buf.length) return send(res, 400, { error: "Empty file" });
              writeFileSync(dest, buf);
              return send(res, 200, { src: `/media/${name}`, bytes: buf.length });
            }

            return send(res, 404, { error: "Not found" });
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : "Server error";
            const status = message === "File too large" ? 413 : 500;
            if (!res.writableEnded) send(res, status, { error: message });
          });
      });
    },
  };
}
