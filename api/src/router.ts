import { randomUUID } from 'node:crypto';
import type { Album, AlbumDetail, AlbumSummary, Collection, Media, MediaView, Member, Role } from '../../shared/types';
import type { Store } from './store';
import type { PhotoStore } from './photos';
import type { GalleryStore } from './gallery';
import { MemberExistsError, type MemberStore } from './members';

export interface Res { status: number; body: unknown }
/** Everything a request handler needs. `caller` is derived from verified Cognito groups, never from the request body. */
export interface Ctx { store: Store; photos: PhotoStore; gallery: GalleryStore; members: MemberStore; caller: Role; email?: string }

/** Collections served by the generic public-read / admin-write routes. Gallery data is deliberately NOT here. */
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

const deny = (ctx: Ctx, need: 'member' | 'admin'): Res | null => {
  if (ctx.caller === 'admin') return null;
  if (need === 'member' && ctx.caller === 'player') return null;
  return ctx.caller === 'guest'
    ? { status: need === 'admin' ? 403 : 401, body: { error: need === 'admin' ? 'admins only' : 'members only — sign in' } }
    : { status: 403, body: { error: 'admins only' } };
};

// ---------------------------------------------------------------- gallery (members read, admins write)
const MAX_FULL = 1_500_000, MAX_THUMB = 250_000, MAX_ALBUMS = 100, MAX_PER_ALBUM = 300;
const keysOf = (m: { albumId: string; id: string }) => ({ full: `${m.albumId}-${m.id}.jpg`, thumb: `${m.albumId}-${m.id}-t.jpg` });
const jpeg = (b64: unknown, max: number) => {
  const bytes = Buffer.from(typeof b64 === 'string' ? b64 : '', 'base64');
  return bytes.length >= 100 && bytes.length <= max && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? bytes : null;
};
const byAt = (a: Media, b: Media) => a.at.localeCompare(b.at);

async function view(m: Media, g: GalleryStore): Promise<MediaView> {
  const k = keysOf(m);
  const [thumbUrl, url] = await Promise.all([g.url(k.thumb), g.url(k.full)]);
  return { ...m, thumbUrl, url };
}

async function gallery(method: string, parts: string[], body: any, ctx: Ctx): Promise<Res> {
  const { store, gallery: g } = ctx;
  const read = deny(ctx, 'member');
  if (read) return read; // guests never get past here, whatever the API Gateway config says
  const [, , , kind, id, sub] = parts;
  const albums = async () => (await store.list('albums')) as unknown as Album[];
  const media = async () => (await store.list('media')) as unknown as Media[];

  if (kind === 'albums' && !id && method === 'GET') {
    const [as, ms] = await Promise.all([albums(), media()]);
    const out: AlbumSummary[] = await Promise.all(as.sort((a, b) => b.date.localeCompare(a.date)).map(async (a) => {
      const mine = ms.filter((m) => m.albumId === a.id).sort(byAt);
      const cover = mine.find((m) => m.id === a.coverId) ?? mine[0];
      return { ...a, count: mine.length, coverUrl: cover ? await g.url(keysOf(cover).thumb) : undefined };
    }));
    return { status: 200, body: out };
  }
  if (kind === 'albums' && id && !sub && method === 'GET') {
    const a = (await albums()).find((x) => x.id === id);
    if (!a) return { status: 404, body: { error: 'album not found' } };
    const mine = (await media()).filter((m) => m.albumId === id).sort(byAt);
    const detail: AlbumDetail = { album: a, media: await Promise.all(mine.map((m) => view(m, g))) };
    return { status: 200, body: detail };
  }

  const w = deny(ctx, 'admin');
  if (w) return w;
  if (!id || !ID.test(id)) return { status: 400, body: { error: 'bad id' } };

  if (kind === 'albums' && !sub && method === 'PUT') {
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 80 || typeof body?.date !== 'string') return { status: 400, body: { error: 'album needs a title (≤80 chars) and date' } };
    const existing = await albums();
    if (!existing.some((a) => a.id === id) && existing.length >= MAX_ALBUMS) return { status: 400, body: { error: 'too many albums' } };
    const album: Album = { id, title, date: body.date, description: typeof body.description === 'string' ? body.description.slice(0, 500) : undefined, coverId: typeof body.coverId === 'string' && ID.test(body.coverId) ? body.coverId : undefined };
    await store.put('albums', album as unknown as { id: string });
    return { status: 200, body: album };
  }
  if (kind === 'albums' && !sub && method === 'DELETE') {
    const mine = (await media()).filter((m) => m.albumId === id);
    await g.remove(mine.flatMap((m) => Object.values(keysOf(m))));
    for (const m of mine) await store.remove('media', m.id);
    await store.remove('albums', id);
    return { status: 200, body: { ok: true } };
  }
  if (kind === 'albums' && sub === 'photos' && method === 'POST') {
    if (!(await albums()).some((a) => a.id === id)) return { status: 404, body: { error: 'album not found' } };
    if ((await media()).filter((m) => m.albumId === id).length >= MAX_PER_ALBUM) return { status: 400, body: { error: 'album is full' } };
    const full = jpeg(body?.image, MAX_FULL), thumb = jpeg(body?.thumb, MAX_THUMB);
    if (!full || !thumb) return { status: 400, body: { error: 'image and thumb must be JPEGs (≤1.5 MB / ≤250 KB)' } };
    const m: Media = { id: randomUUID().replace(/-/g, '').slice(0, 12), albumId: id, at: new Date().toISOString(), caption: typeof body.caption === 'string' && body.caption.trim() ? body.caption.trim().slice(0, 200) : undefined };
    const k = keysOf(m);
    await Promise.all([g.put(k.full, full), g.put(k.thumb, thumb)]);
    await store.put('media', m as unknown as { id: string });
    return { status: 200, body: await view(m, g) };
  }
  if (kind === 'media' && (method === 'PUT' || method === 'DELETE')) {
    const m = (await media()).find((x) => x.id === id);
    if (!m) return { status: 404, body: { error: 'photo not found' } };
    if (method === 'PUT') {
      const caption = typeof body?.caption === 'string' && body.caption.trim() ? body.caption.trim().slice(0, 200) : undefined;
      await store.put('media', { ...m, caption } as unknown as { id: string });
      return { status: 200, body: { ok: true } };
    }
    await g.remove(Object.values(keysOf(m)));
    await store.remove('media', id);
    const a = (await albums()).find((x) => x.id === m.albumId);
    if (a?.coverId === id) await store.put('albums', { ...a, coverId: undefined } as unknown as { id: string });
    return { status: 200, body: { ok: true } };
  }
  return { status: 404, body: { error: 'not found' } };
}

// ---------------------------------------------------------------- members (admins only)
const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,255}\.[^\s@<>]{2,}$/;

async function members(method: string, parts: string[], body: any, ctx: Ctx): Promise<Res> {
  const d = deny(ctx, 'admin');
  if (d) return d;
  const sub = parts[3];
  if (method === 'GET' && !sub) return { status: 200, body: await ctx.members.list() };
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email)) return { status: 400, body: { error: 'valid email required' } };
  if (method === 'POST' && !sub) {
    if (body.role !== 'admin' && body.role !== 'player') return { status: 400, body: { error: "role must be 'admin' or 'player'" } };
    try { await ctx.members.invite(email, body.role); } catch (e) {
      if (e instanceof MemberExistsError) return { status: 409, body: { error: 'that email already has an account' } };
      throw e;
    }
    return { status: 200, body: { ok: true } };
  }
  if (method === 'POST' && sub === 'remove') {
    if (email === ctx.email?.toLowerCase()) return { status: 400, body: { error: "you can't remove your own account" } };
    const all: Member[] = await ctx.members.list();
    const target = all.find((m) => m.email.toLowerCase() === email);
    if (target?.role === 'admin' && all.filter((m) => m.role === 'admin').length <= 1) return { status: 400, body: { error: "can't remove the last admin" } };
    await ctx.members.remove(email);
    return { status: 200, body: { ok: true } };
  }
  return { status: 404, body: { error: 'not found' } };
}

export async function route(method: string, rawPath: string, body: unknown, ctx: Ctx): Promise<Res> {
  const parts = rawPath.split('/');
  const [, api, coll, id] = parts;
  if (api === 'api' && coll === 'gallery') return gallery(method, parts, body, ctx);
  if (api === 'api' && coll === 'members') return members(method, parts, body, ctx);
  if (api === 'api' && coll === 'photos' && method === 'PUT') return deny(ctx, 'admin') ?? uploadPhoto(id, body, ctx.photos);
  if (api !== 'api' || !COLLECTIONS.includes(coll as Collection)) return { status: 404, body: { error: 'not found' } };
  const c = coll as Collection;
  const store = ctx.store;
  if (method === 'POST' && c === 'games' && parts[4] === 'checkin' && parts.length === 5) return checkin(id, body, store); // public
  if (method === 'GET' && !id) return { status: 200, body: await store.list(c) }; // public
  // Everything below is a write: admins only (API Gateway only proves "has a valid token"; players have tokens too).
  const forbidden = deny(ctx, 'admin');
  if (forbidden) return forbidden;
  if (c === 'checkins' && method === 'PUT') return { status: 405, body: { error: 'use POST /api/games/{id}/checkin' } };
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
