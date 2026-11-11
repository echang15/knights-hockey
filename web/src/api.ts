import type { Checkin, Collection, Game, Player, Post } from '../../shared/types';
import { config } from './config';
import { authHeader, signOut } from './auth';
import type { AlbumDetail, AlbumSummary, Album, MediaView, Me, Member } from '../../shared/types';

async function req(path: string, init?: RequestInit) {
  const r = await fetch(config.apiUrl + path, { ...init, headers: { 'content-type': 'application/json', ...authHeader(), ...init?.headers } });
  if (!r.ok) {
    if (r.status === 401 && authHeader().Authorization) signOut(); // expired token: drop to guest
    throw new Error(r.status === 401 ? 'Please sign in again' : ((await r.json().catch(() => ({}))).error ?? r.statusText));
  }
  return r.json();
}
export const list = <T,>(c: Collection): Promise<T[]> => req('/' + c);
export const save = (c: Collection, item: { id: string }) => req(`/${c}/${item.id}`, { method: 'PUT', body: JSON.stringify(item) });
export const remove = (c: Collection, id: string) => req(`/${c}/${id}`, { method: 'DELETE' });

export interface Data { players: Player[]; games: Game[]; posts: Post[]; checkins: Checkin[]; me: Me | null }
export const checkin = (gameId: string, playerId: string, status: 'in' | 'out') =>
  req(`/games/${gameId}/checkin`, { method: 'POST', body: JSON.stringify({ playerId, status }) });
/** Check-ins are members-only, so guests never request them. */
export async function loadAll(isMember: boolean): Promise<Data> {
  const [players, games, posts, checkins, me] = await Promise.all([list<Player>('players'), list<Game>('games'), list<Post>('posts'), isMember ? list<Checkin>('checkins') : Promise.resolve([]), isMember ? (req('/me') as Promise<Me>) : Promise.resolve(null)]);
  games.sort((a, b) => a.date.localeCompare(b.date));
  posts.sort((a, b) => b.date.localeCompare(a.date));
  players.sort((a, b) => a.number - b.number);
  return { players, games, posts, checkins, me };
}
export async function uploadPhoto(playerId: string, base64Jpeg: string): Promise<string> {
  return (await req(`/photos/${playerId}`, { method: 'PUT', body: JSON.stringify({ image: base64Jpeg }) })).url;
}
export const newId = (prefix = '') => prefix + Math.random().toString(36).slice(2, 10);

// --- members-only gallery (the API rejects guests; these never work signed out)
export const listAlbums = (): Promise<AlbumSummary[]> => req('/gallery/albums');
export const getAlbum = (id: string): Promise<AlbumDetail> => req(`/gallery/albums/${id}`);
export const saveAlbum = (a: Album): Promise<Album> => req(`/gallery/albums/${a.id}`, { method: 'PUT', body: JSON.stringify(a) });
export const deleteAlbum = (id: string) => req(`/gallery/albums/${id}`, { method: 'DELETE' });
export const uploadMedia = (albumId: string, image: string, thumb: string, caption?: string): Promise<MediaView> =>
  req(`/gallery/albums/${albumId}/photos`, { method: 'POST', body: JSON.stringify({ image, thumb, caption }) });
export const deleteMedia = (id: string) => req(`/gallery/media/${id}`, { method: 'DELETE' });
export const saveCaption = (id: string, caption: string) => req(`/gallery/media/${id}`, { method: 'PUT', body: JSON.stringify({ caption }) });

// --- member accounts (admins)
export const listMembers = (): Promise<Member[]> => req('/members');
export const inviteMember = (email: string, role: Member['role'], playerId?: string) => req('/members', { method: 'POST', body: JSON.stringify({ email, role, playerId: playerId || undefined }) });
export const setMemberPlayer = (email: string, playerId: string | null) => req('/members/link', { method: 'PUT', body: JSON.stringify({ email, playerId }) });
export const removeMember = (email: string) => req('/members/remove', { method: 'POST', body: JSON.stringify({ email }) });
