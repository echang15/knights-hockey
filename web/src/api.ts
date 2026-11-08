import type { Checkin, Collection, Game, Player, Post } from '../../shared/types';
import { config } from './config';
import { authHeader } from './auth';

async function req(path: string, init?: RequestInit) {
  const r = await fetch(config.apiUrl + path, { ...init, headers: { 'content-type': 'application/json', ...authHeader(), ...init?.headers } });
  if (!r.ok) throw new Error(r.status === 401 ? 'Session expired — sign in again' : ((await r.json().catch(() => ({}))).error ?? r.statusText));
  return r.json();
}
export const list = <T,>(c: Collection): Promise<T[]> => req('/' + c);
export const save = (c: Collection, item: { id: string }) => req(`/${c}/${item.id}`, { method: 'PUT', body: JSON.stringify(item) });
export const remove = (c: Collection, id: string) => req(`/${c}/${id}`, { method: 'DELETE' });

export interface Data { players: Player[]; games: Game[]; posts: Post[]; checkins: Checkin[] }
export const checkin = (gameId: string, name: string, status: 'in' | 'out') =>
  req(`/games/${gameId}/checkin`, { method: 'POST', body: JSON.stringify({ name, status }) });
export async function loadAll(): Promise<Data> {
  const [players, games, posts, checkins] = await Promise.all([list<Player>('players'), list<Game>('games'), list<Post>('posts'), list<Checkin>('checkins')]);
  games.sort((a, b) => a.date.localeCompare(b.date));
  posts.sort((a, b) => b.date.localeCompare(a.date));
  players.sort((a, b) => a.number - b.number);
  return { players, games, posts, checkins };
}
export async function uploadPhoto(playerId: string, base64Jpeg: string): Promise<string> {
  return (await req(`/photos/${playerId}`, { method: 'PUT', body: JSON.stringify({ image: base64Jpeg }) })).url;
}
export const newId = (prefix = '') => prefix + Math.random().toString(36).slice(2, 10);
