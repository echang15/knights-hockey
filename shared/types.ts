export type Position = 'F' | 'D' | 'G';

export interface Player {
  id: string;
  number: number;
  name: string;
  position: Position;
  grade?: string;
  shoots?: 'L' | 'R';
  /** Alumni: off the active roster, but their game stats still count in history. */
  retired?: boolean;
  /** Free text, e.g. "2025" or "2023-24". */
  retiredYear?: string;
  /** Site-relative URL, e.g. /photos/p1-abc.jpg (set by the admin photo uploader). */
  photoUrl?: string;
  bio?: string;
  hometown?: string;
  height?: string;
  weight?: string;
}

/** One player's line in one game. Skaters use g/a/pim/sog; goalies use sa/ga. */
export interface StatLine {
  playerId: string;
  g?: number;
  a?: number;
  pim?: number;
  sog?: number;
  sa?: number;
  ga?: number;
}

export interface Game {
  id: string;
  /** ISO local datetime, e.g. 2026-11-14T18:30 */
  date: string;
  opponent: string;
  home: boolean;
  location: string;
  status: 'scheduled' | 'final' | 'cancelled';
  ourScore?: number;
  theirScore?: number;
  decision?: 'REG' | 'OT' | 'SO';
  recap?: string;
  lines?: StatLine[];
}

export interface Post {
  id: string;
  title: string;
  date: string;
  author: string;
  body: string;
  tags?: string[];
}

/** A roster player's availability for an upcoming game (used to plan lines and pairings). One per (game, player). */
export interface Checkin {
  id: string;
  gameId: string;
  playerId: string;
  status: 'in' | 'out';
  at: string;
}

export type Collection = 'players' | 'games' | 'posts' | 'checkins' | 'albums' | 'media' | 'links';

/** Who is calling. Derived server-side from Cognito groups; guests have no/unknown group. */
export type Role = 'admin' | 'player' | 'guest';

// --- Members-only gallery (never exposed through the public collection routes) ---
export interface Album { id: string; title: string; description?: string; date: string; coverId?: string }
export interface Media { id: string; albumId: string; caption?: string; at: string }
export interface AlbumSummary extends Album { count: number; coverUrl?: string }
/** `thumbUrl`/`url` are short-lived signed links; re-fetch the album to refresh them. */
export interface MediaView extends Media { thumbUrl: string; url: string }
export interface AlbumDetail { album: Album; media: MediaView[] }
export interface Member { email: string; role: 'admin' | 'player'; status: string; created?: string; /** roster player this account is linked to */ playerId?: string }
/** The signed-in caller, as the API sees them. */
export interface Me { role: Role; email?: string; playerId?: string }
