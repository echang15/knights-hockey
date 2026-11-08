// SAMPLE DATA for local development only. Replace via the /admin page.
import type { Player, Game, Post, StatLine } from '../../shared/types';

const names: [number, string, Player['position']][] = [
  [91, 'Sample Forward A', 'F'], [17, 'Sample Forward B', 'F'], [9, 'Sample Forward C', 'F'], [22, 'Sample Forward D', 'F'],
  [14, 'Sample Forward E', 'F'], [7, 'Sample Forward F', 'F'], [4, 'Sample Defense A', 'D'], [28, 'Sample Defense B', 'D'],
  [5, 'Sample Defense C', 'D'], [30, 'Sample Goalie A', 'G'], [35, 'Sample Goalie B', 'G'],
];
const players: Player[] = names.map(([number, name, position], i) => ({ id: `p${i + 1}`, number, name, position }));

const opp = ['Sample Wolves', 'Sample Raiders', 'Sample Storm', 'Sample Titans', 'Sample Hawks', 'Sample Bears'];
const rnd = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const r = rnd(42);
const games: Game[] = opp.concat(opp).map((o, i) => {
  const d = new Date(Date.UTC(2026, 8, 20 + i * 7, 18, 30));
  const date = d.toISOString().slice(0, 16);
  const past = d < new Date('2026-11-08');
  const g: Game = { id: `g${i + 1}`, date, opponent: o, home: i % 2 === 0, location: i % 2 === 0 ? 'Home Rink' : `${o} Arena`, status: past ? 'final' : 'scheduled' };
  if (past) {
    g.ourScore = Math.floor(r() * 6); g.theirScore = Math.floor(r() * 5); g.decision = 'REG';
    g.attendance = 80 + Math.floor(r() * 220);
    const lines: StatLine[] = [];
    for (let k = 0; k < g.ourScore; k++) {
      const s = players[Math.floor(r() * 9)], a = players[Math.floor(r() * 9)];
      const sl = lines.find((l) => l.playerId === s.id) ?? (lines.push({ playerId: s.id, g: 0, a: 0, pim: 0, sog: 0 }), lines[lines.length - 1]);
      sl.g!++; sl.sog!++;
      if (a.id !== s.id) { const al = lines.find((l) => l.playerId === a.id) ?? (lines.push({ playerId: a.id, g: 0, a: 0, pim: 0, sog: 0 }), lines[lines.length - 1]); al.a!++; }
    }
    lines.push({ playerId: 'p10', sa: g.theirScore + 15 + Math.floor(r() * 10), ga: g.theirScore });
    g.lines = lines;
    g.recap = `Sample recap for the game vs ${o}.`;
  }
  return g;
});

const posts: Post[] = [
  { id: 'welcome', title: 'Welcome to the new site', date: '2026-10-01', author: 'Coach', tags: ['news'], body: 'Scores, schedule, stats and attendance all live here now.\n\nThis is sample content — edit or delete it from the Admin page.' },
  { id: 'tape-tales', title: 'Tape tales: the great stick-tape shortage', date: '2026-10-20', author: 'Team Parent', tags: ['random'], body: 'Nobody knows where it all goes. Somebody owes the bench about forty rolls.' },
];

export const SEED = { players, games, posts };
