import { Link } from 'react-router-dom';
import type { Player } from '../../../shared/types';
import { Avatar } from './Avatar';

export interface LeaderRow { player: Player; value: string; rank: number; tied?: boolean }

/** NHL-team-page style: big featured #1, then ranks 2-5 in a compact list. */
export function LeaderCard({ title, rows }: { title: string; rows: LeaderRow[] }) {
  const [top, ...rest] = rows.slice(0, 5);
  return (
    <div className="card leader-card">
      <h4>{title}</h4>
      {!top ? <p className="muted">No data yet</p> : (
        <>
          <Link to={`/player/${top.player.id}`} className="featured">
            <Avatar player={top.player} size={88} />
            <div><small>#{top.player.number} · {top.player.position}</small><b className="nm">{top.player.name}</b></div>
            <span className="val">{top.value}</span>
          </Link>
          <ol start={2}>{rest.map((r) => (
            <li key={r.player.id}><Link to={`/player/${r.player.id}`}><span className="rk">{r.tied ? 'T' : ''}{r.rank}</span><Avatar player={r.player} size={28} /><span className="nm">{r.player.name}</span><b>{r.value}</b></Link></li>
          ))}</ol>
        </>
      )}
    </div>
  );
}
