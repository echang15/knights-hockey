import type { Game, Player } from '../../shared/types';

export const finals = (games: Game[]) => games.filter((g) => g.status === 'final' && g.ourScore != null && g.theirScore != null);

export function record(games: Game[]) {
  let w = 0, l = 0, otl = 0, gf = 0, ga = 0;
  for (const g of finals(games)) {
    gf += g.ourScore!; ga += g.theirScore!;
    if (g.ourScore! > g.theirScore!) w++;
    else if (g.decision && g.decision !== 'REG') otl++;
    else l++;
  }
  const gp = w + l + otl;
  return { gp, w, l, otl, gf, ga, pts: w * 2 + otl, pct: gp ? (w * 2 + otl) / (gp * 2) : 0 };
}

export function attendance(games: Game[]) {
  const a = finals(games).filter((g) => g.attendance != null);
  const home = a.filter((g) => g.home);
  const sum = (xs: Game[]) => xs.reduce((s, g) => s + g.attendance!, 0);
  return { total: sum(a), avgHome: home.length ? Math.round(sum(home) / home.length) : 0, best: a.reduce<Game | null>((b, g) => (!b || g.attendance! > b.attendance! ? g : b), null), games: a };
}

export interface Skater { player: Player; gp: number; g: number; a: number; pts: number; pim: number; sog: number; shPct: number }
export interface Goalie { player: Player; gp: number; sa: number; ga: number; sv: number; svPct: number; gaa: number }

export function playerStats(players: Player[], games: Game[]) {
  const skaters: Skater[] = [], goalies: Goalie[] = [];
  for (const p of players) {
    let gp = 0, g = 0, a = 0, pim = 0, sog = 0, sa = 0, ga = 0;
    for (const game of finals(games)) {
      const l = game.lines?.find((x) => x.playerId === p.id);
      if (!l) continue;
      gp++; g += l.g ?? 0; a += l.a ?? 0; pim += l.pim ?? 0; sog += l.sog ?? 0; sa += l.sa ?? 0; ga += l.ga ?? 0;
    }
    if (p.position === 'G') goalies.push({ player: p, gp, sa, ga, sv: sa - ga, svPct: sa ? (sa - ga) / sa : 0, gaa: gp ? ga / gp : 0 });
    else skaters.push({ player: p, gp, g, a, pts: g + a, pim, sog, shPct: sog ? g / sog : 0 });
  }
  return { skaters, goalies };
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
  new Date(iso).toLocaleDateString('en-US', opts);
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export const pct = (n: number) => (n ? n.toFixed(3).replace(/^0/, '') : '.000');
export const resultOf = (g: Game) => {
  if (g.status !== 'final') return null;
  const win = g.ourScore! > g.theirScore!;
  return { win, label: win ? 'W' : g.decision && g.decision !== 'REG' ? 'OTL' : 'L', suffix: g.decision && g.decision !== 'REG' ? ` (${g.decision})` : '' };
};

export const rsvpFor = (checkins: import('../../shared/types').Checkin[], gameId: string) => {
  const mine = checkins.filter((c) => c.gameId === gameId).sort((a, b) => a.at.localeCompare(b.at));
  return { ins: mine.filter((c) => c.status === 'in'), outs: mine.filter((c) => c.status === 'out') };
};

/** Competition ranking (ties share a rank), highest value first. */
export function ranked<T>(rows: T[], value: (r: T) => number, tiebreak: (a: T, b: T) => number = () => 0): (T & { rank: number; tied: boolean })[] {
  const sorted = [...rows].sort((a, b) => value(b) - value(a) || tiebreak(a, b));
  return sorted.map((r) => ({ ...r, rank: sorted.findIndex((x) => value(x) === value(r)) + 1, tied: sorted.filter((x) => value(x) === value(r)).length > 1 }));
}

/** Per-game log for one player, newest first. */
export function gameLog(playerId: string, games: Game[]) {
  return finals(games)
    .map((g) => ({ game: g, line: g.lines?.find((l) => l.playerId === playerId) }))
    .filter((x) => x.line)
    .reverse();
}
