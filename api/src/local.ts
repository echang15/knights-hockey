// Local dev server: same router, JSON-file storage, NO auth. Never deploy this.
import http from 'node:http';
import { promises as fs } from 'node:fs';
import { FileStore } from './store';
import { route } from './router';
import { SEED } from './seed';

const file = new URL('../data/db.json', import.meta.url).pathname;
const store = new FileStore(file);
if ((await store.list('players')).length === 0 && !(await fs.stat(file).catch(() => null))) {
  for (const [c, items] of Object.entries(SEED)) for (const i of items) await store.put(c as any, i as any);
  console.log('seeded sample data');
}

http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const ch of req) chunks.push(ch as Buffer);
  const raw = Buffer.concat(chunks).toString();
  const r = await route(req.method ?? 'GET', (req.url ?? '/').split('?')[0], raw ? JSON.parse(raw) : undefined, store);
  res.writeHead(r.status, { 'content-type': 'application/json' }).end(JSON.stringify(r.body));
}).listen(8787, () => console.log('local api on http://localhost:8787'));
