import { Link } from 'react-router-dom';
import type { Game } from '../../../shared/types';
import { finals, fmtDate, fmtTime, resultOf } from '../stats';

export function Ticker({ games }: { games: Game[] }) {
  const past = finals(games).slice(-4);
  const next = games.filter((g) => g.status === 'scheduled').slice(0, 3);
  const shown = [...past, ...next];
  if (!shown.length) return null;
  return (
    <div className="ticker">
      {shown.map((g) => {
        const r = resultOf(g);
        return (
          <Link key={g.id} to={`/game/${g.id}`} className="tick">
            <small>{fmtDate(g.date)}{r ? ` · FINAL${r.suffix}` : ` · ${fmtTime(g.date)}`}</small>
            <span className={r?.win ? 'win' : ''}>KNT {r ? g.ourScore : ''}</span>
            <span>{g.home ? 'vs' : '@'} {g.opponent.slice(0, 14)} {r ? g.theirScore : ''}</span>
          </Link>
        );
      })}
    </div>
  );
}
