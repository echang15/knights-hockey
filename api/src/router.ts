import type { Collection } from '../../shared/types';
import type { Store } from './store';

export interface Res { status: number; body: unknown }
const COLLECTIONS: Collection[] = ['players', 'games', 'posts'];
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
export async function route(method: string, rawPath: string, body: unknown, store: Store): Promise<Res> {
  const [, api, coll, id] = rawPath.split('/');
  if (api !== 'api' || !COLLECTIONS.includes(coll as Collection)) return { status: 404, body: { error: 'not found' } };
  const c = coll as Collection;
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
