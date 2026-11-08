import { Link } from 'react-router-dom';
import { useData } from '../DataContext';
import { attendance, finals, fmtDate, fmtTime, pct, playerStats, record } from '../stats';
import { GameRow } from '../components/GameRow';
import { TEAM } from '../config';

export default function Home() {
  const { data } = useData();
  const { games, players, posts } = data!;
  const rec = record(games), att = attendance(games);
  const next = games.find((g) => g.status === 'scheduled');
  const last = finals(games).at(-1);
  const { skaters, goalies } = playerStats(players.filter((p) => !p.retired), games);
  const top = [...skaters].sort((a, b) => b.pts - a.pts || b.g - a.g)[0];
  const goalie = [...goalies].filter((g) => g.sa > 0).sort((a, b) => b.svPct - a.svPct)[0];
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{TEAM.full}</p>
          <h1>{rec.w}-{rec.l}-{rec.otl}</h1>
          <p className="muted">{rec.pts} PTS · {rec.gf} GF · {rec.ga} GA · {att.avgHome} avg home attendance</p>
        </div>
        {next && (
          <Link to={`/game/${next.id}`} className="card next">
            <p className="eyebrow">Next game</p>
            <h2>{next.home ? 'vs' : '@'} {next.opponent}</h2>
            <p>{fmtDate(next.date, { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtTime(next.date)}</p>
            <p className="muted">{next.location}</p>
          </Link>
        )}
      </section>

      <div className="grid2">
        <section>
          <h3 className="sect">Recent &amp; upcoming</h3>
          <div className="card flush">
            {last && <GameRow g={last} />}
            {games.filter((g) => g.status === 'scheduled').slice(0, 4).map((g) => <GameRow key={g.id} g={g} />)}
          </div>
          <Link className="more" to="/schedule">Full schedule →</Link>
        </section>
        <section>
          <h3 className="sect">Team leaders</h3>
          <div className="card leaders">
            {top && <div><small>POINTS</small><b>{top.pts}</b><span>#{top.player.number} {top.player.name}</span></div>}
            {top && <div><small>GOALS</small><b>{[...skaters].sort((a, b) => b.g - a.g)[0].g}</b><span>#{[...skaters].sort((a, b) => b.g - a.g)[0].player.number} {[...skaters].sort((a, b) => b.g - a.g)[0].player.name}</span></div>}
            {goalie && <div><small>SV%</small><b>{pct(goalie.svPct)}</b><span>#{goalie.player.number} {goalie.player.name}</span></div>}
          </div>
          <Link className="more" to="/stats">All stats →</Link>
        </section>
      </div>

      {posts.length > 0 && (
        <section>
          <h3 className="sect">From the blog</h3>
          <div className="posts">
            {posts.slice(0, 3).map((p) => (
              <Link key={p.id} to={`/blog/${p.id}`} className="card post">
                <small>{fmtDate(p.date, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                <h4>{p.title}</h4>
                <p className="muted">{p.body.slice(0, 120)}{p.body.length > 120 ? '…' : ''}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
