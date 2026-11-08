// Local dev server: same router, JSON-file storage, NO auth. Never deploy this.
import http from 'node:http';
import { promises as fs } from 'node:fs';
import { FileStore } from './store';
import { FilePhotoStore } from './photos';
import { route } from './router';
import { SEED } from './seed';

const file = new URL('../data/db.json', import.meta.url).pathname;
const store = new FileStore(file);
const photos = new FilePhotoStore(new URL('../data/photos', import.meta.url).pathname);
if ((await store.list('players')).length === 0 && !(await fs.stat(file).catch(() => null))) {
  for (const [c, items] of Object.entries(SEED)) for (const i of items) await store.put(c as any, i as any);
  console.log('seeded sample data');
}

http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const ch of req) chunks.push(ch as Buffer);
  const raw = Buffer.concat(chunks).toString();
  const photo = /^\/photos\/([A-Za-z0-9_-]+\.jpg)$/.exec(req.url ?? '');
  if (photo) {
    const bytes = await fs.readFile(`${photos.dir}/${photo[1]}`).catch(() => null);
    res.writeHead(bytes ? 200 : 404, { 'content-type': 'image/jpeg' }).end(bytes ?? undefined);
    return;
  }
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('Knights Hockey local API (dev only).\nThis is not the website — open http://localhost:5173\nTry /api/games, /api/players, /api/posts\n');
    return;
  }
  const r = await route(req.method ?? 'GET', (req.url ?? '/').split('?')[0], raw ? JSON.parse(raw) : undefined, store, photos);
  res.writeHead(r.status, { 'content-type': 'application/json' }).end(JSON.stringify(r.body));
}).listen(8787, () => console.log('local api on http://localhost:8787  (site: http://localhost:5173)'));
