import { readFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "scripts/download-manifest.json"), "utf8"));
const publicDir = join(root, "public");
const concurrency = 12;

async function download(item) {
  const dest = join(publicDir, item.local);
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest) && statSync(dest).size > 0) {
    return { item, skipped: true };
  }
  const res = await fetch(item.url, {
    headers: { "User-Agent": "Mozilla/5.0 247px-selfhost" },
  });
  if (!res.ok) throw new Error(`${res.status} ${item.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { writeFileSync } = await import("node:fs");
  writeFileSync(dest, buf);
  return { item, bytes: buf.length };
}

async function run() {
  let done = 0;
  let skipped = 0;
  let failed = 0;
  const queue = [...manifest];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        const result = await download(item);
        done += 1;
        if (result.skipped) skipped += 1;
        if (done % 20 === 0 || done === manifest.length) {
          console.log(`${done}/${manifest.length} (${skipped} cached, ${failed} failed)`);
        }
      } catch (err) {
        failed += 1;
        done += 1;
        console.error(`FAIL ${item.local}: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);
  console.log(`Finished ${done} files, ${skipped} cached, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
