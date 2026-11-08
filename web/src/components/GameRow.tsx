import { Link } from 'react-router-dom';
import type { Game } from '../../../shared/types';
import { fmtDate, fmtTime, resultOf } from '../stats';

export function GameRow({ g }: { g: Game }) {
  const r = resultOf(g);
  return (
    <Link to={`/game/${g.id}`} className="game-row">
      <div className="when"><b>{fmtDate(g.date, { month: 'short', day: 'numeric' })}</b><small>{fmtDate(g.date, { weekday: 'short' })} · {fmtTime(g.date)}</small></div>
      <div className="vs"><span className="ha">{g.home ? 'HOME' : 'AWAY'}</span> <b>{g.opponent}</b><small>{g.location}</small></div>
      <div className="res">
        {r ? <><span className={`badge ${r.win ? 'w' : 'l'}`}>{r.label}</span><b>{g.ourScore}–{g.theirScore}{r.suffix}</b></>
          : g.status === 'cancelled' ? <span className="badge x">PPD</span> : <span className="muted">Upcoming</span>}
      </div>
    </Link>
  );
}
