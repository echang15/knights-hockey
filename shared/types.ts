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
  attendance?: number;
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

/** A public RSVP. One per (game, name); re-submitting updates it. */
export interface Checkin {
  id: string;
  gameId: string;
  name: string;
  status: 'in' | 'out';
  at: string;
}

export type Collection = 'players' | 'games' | 'posts' | 'checkins';
