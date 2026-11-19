// SPDX-License-Identifier: MIT
// Tiny static server for trying the app locally: serves app/ at http://localhost:8080.
// Usage: node serve.ts [port]. No dependencies, no network beyond localhost.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(new URL(".", import.meta.url)), "app"));
const port = Number(process.argv[2] ?? 8080);
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const path = normalize(join(root, decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)));
    const file = path.endsWith("/") || path === root ? join(path, "index.html") : path;
    if (!file.startsWith(root)) { res.writeHead(403); res.end("forbidden"); return; }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, () => console.log(`Neon Coast Cover Studio at http://localhost:${port}`));
