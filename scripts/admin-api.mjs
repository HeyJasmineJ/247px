import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sitePath = join(root, "src/data/site.json");
const mediaDir = join(root, "public/media");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"]);
const MAX_MEDIA_BYTES = 120 * 1024 * 1024;
const MAX_JSON_BYTES = 12 * 1024 * 1024;

function send(res, status, data, contentType = "application/json") {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
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

export function adminApi() {
  return {
    name: "247px-admin-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (!url?.startsWith("/api/admin")) return next();

        try {
          if (req.method === "GET" && url === "/api/admin/health") {
            return send(res, 200, { ok: true });
          }

          if (req.method === "GET" && url === "/api/admin/site") {
            return send(res, 200, readFileSync(sitePath, "utf8"), "application/json");
          }

          if (req.method === "PUT" && url === "/api/admin/site") {
            const raw = (await readBody(req, MAX_JSON_BYTES)).toString("utf8");
            const body = JSON.parse(raw);
            if (!isSiteData(body)) {
              return send(res, 400, { error: "Invalid site data" });
            }
            writeFileSync(sitePath, `${JSON.stringify(body, null, 2)}\n`);
            return send(res, 200, { ok: true });
          }

          if (req.method === "POST" && url === "/api/admin/media") {
            const original = req.headers["x-filename"];
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
        } catch (err) {
          const message = err instanceof Error ? err.message : "Server error";
          const status = message === "File too large" ? 413 : 500;
          return send(res, status, { error: message });
        }
      });
    },
  };
}
