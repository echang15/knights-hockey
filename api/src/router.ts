import type { Collection } from '../../shared/types';
import type { Store } from './store';
import type { PhotoStore } from './photos';

export interface Res { status: number; body: unknown }
const COLLECTIONS: Collection[] = ['players', 'games', 'posts', 'checkins'];
const MAX_CHECKINS_PER_GAME = 150;
const ID = /^[A-Za-z0-9_-]{1,80}$/;

function validate(c: Collection, b: any): string | null {
  if (!b || typeof b !== 'object') return 'body must be an object';
  if (c === 'players' && (typeof b.name !== 'string' || !b.name || !['F', 'D', 'G'].includes(b.position))) return 'player needs name and position F/D/G';
  if (c === 'games' && (typeof b.opponent !== 'string' || !b.opponent || typeof b.date !== 'string')) return 'game needs opponent and date';
  if (c === 'posts' && (typeof b.title !== 'string' || !b.title || typeof b.body !== 'string')) return 'post needs title and body';
  return null;
}

/**
 * Routes: GET /api/{collection}; PUT /api/{collection}/{id} (upsert); DELETE /api/{collection}/{id}.
 * Write authorization is enforced by API Gateway's JWT authorizer (or LOCAL dev mode); the router trusts the caller.
 */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** PUBLIC (no auth): POST /api/games/{id}/checkin {name, status:'in'|'out'} */
async function checkin(gameId: string, body: any, store: Store): Promise<Res> {
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 1 || name.length > 40 || /[<>]/.test(name)) return { status: 400, body: { error: 'name must be 1-40 characters' } };
  if (body.status !== 'in' && body.status !== 'out') return { status: 400, body: { error: "status must be 'in' or 'out'" } };
  const key = slug(name);
  const id = `${gameId}__${key}`;
  if (!key || !ID.test(id)) return { status: 400, body: { error: 'bad name' } };
  const game = (await store.list('games')).find((g) => g.id === gameId);
  if (!game) return { status: 404, body: { error: 'game not found' } };
  if (game.status !== 'scheduled') return { status: 409, body: { error: 'check-in is only open for upcoming games' } };
  const existing = (await store.list('checkins')).filter((c) => c.gameId === gameId);
  if (!existing.some((c) => c.id === id) && existing.length >= MAX_CHECKINS_PER_GAME) return { status: 429, body: { error: 'check-in list is full' } };
  await store.put('checkins', { id, gameId, name, status: body.status, at: new Date().toISOString() });
  return { status: 200, body: { ok: true } };
}

const MAX_PHOTO_BYTES = 1_000_000;

/** PUT /api/photos/{playerId} {image: base64 JPEG} -> {url}. Admin only (API Gateway authorizer). */
async function uploadPhoto(id: string, body: any, photos: PhotoStore): Promise<Res> {
  if (!ID.test(id)) return { status: 400, body: { error: 'bad id' } };
  const b64 = typeof body?.image === 'string' ? body.image : '';
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES) return { status: 400, body: { error: 'image must be under 1 MB' } };
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return { status: 400, body: { error: 'image must be a JPEG' } };
  const key = `${id}-${Date.now().toString(36)}.jpg`;
  await photos.put(key, bytes);
  return { status: 200, body: { url: `/photos/${key}` } };
}

export async function route(method: string, rawPath: string, body: unknown, store: Store, photos: PhotoStore): Promise<Res> {
  const [, api, coll, id] = rawPath.split('/');
  if (api === 'api' && coll === 'photos' && method === 'PUT') return uploadPhoto(id, body, photos);
  if (api !== 'api' || !COLLECTIONS.includes(coll as Collection)) return { status: 404, body: { error: 'not found' } };
  const c = coll as Collection;
  const parts = rawPath.split('/');
  if (method === 'POST' && c === 'games' && parts[4] === 'checkin' && parts.length === 5) return checkin(id, body, store);
  if (c === 'checkins' && method === 'PUT') return { status: 405, body: { error: 'use POST /api/games/{id}/checkin' } };
  if (method === 'GET' && !id) return { status: 200, body: await store.list(c) };
  if (!id || !ID.test(id)) return { status: 400, body: { error: 'bad id' } };
  if (method === 'PUT') {
    const err = validate(c, body);
    if (err) return { status: 400, body: { error: err } };
    await store.put(c, { ...(body as object), id });
    return { status: 200, body: { ok: true } };
  }
  if (method === 'DELETE') { await store.remove(c, id); return { status: 200, body: { ok: true } }; }
  return { status: 405, body: { error: 'method not allowed' } };
}
