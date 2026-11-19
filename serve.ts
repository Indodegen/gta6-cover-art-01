// Neon Vice Cover Studio — tiny static server for local tries only.
// Serves app/ at http://localhost:8080. Not part of the entry; the app
// itself is plain static files and runs under any static file server.
//
//   node serve.ts

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const port = Number(process.env.PORT ?? 8080);

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const target = resolve(join(root, path === '/' ? 'index.html' : normalize(path)));
    if (!target.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': types.get(extname(target)) ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    console.log(`404 ${req.url ?? '/'}`);
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Neon Vice Cover Studio at http://localhost:${port}`);
});
