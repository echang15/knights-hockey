import { Link } from 'react-router-dom';
import { useData } from '../DataContext';
import { finals, fmtDate, fmtTime, playerStats, ranked, record, rsvpFor } from '../stats';
import { GameRow } from '../components/GameRow';
import { useAuth } from '../auth';
import { LeaderCard } from '../components/LeaderCard';
import { TEAM } from '../config';

export default function Home() {
  const { data } = useData();
  const { isMember } = useAuth();
  const { games, players, posts } = data!;
  const rec = record(games);
  const next = games.find((g) => g.status === 'scheduled');
  const last = finals(games).at(-1);
  const { skaters } = playerStats(players.filter((p) => !p.retired), games);
  const pts = ranked(skaters.filter((s) => s.pts > 0), (s) => s.pts, (a, b) => b.g - a.g);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{TEAM.full}</p>
          <h1>{rec.w}-{rec.l}-{rec.otl}</h1>
          <p className="muted">{rec.pts} PTS · {rec.gf} GF · {rec.ga} GA</p>
        </div>
        {next && (
          <Link to={`/game/${next.id}`} className="card next">
            <p className="eyebrow">Next game</p>
            <h2>{next.home ? 'vs' : '@'} {next.opponent}</h2>
            <p>{fmtDate(next.date, { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtTime(next.date)}</p>
            <p className="muted">{next.location}</p>
            {isMember && <p><span className="tag">{rsvpFor(data!.checkins, next.id).ins.length} IN</span> <span className="muted">tap to check in / out</span></p>}
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
          <h3 className="sect">Points leaders</h3>
          <LeaderCard title="Points" rows={pts.map((r) => ({ player: r.player, value: String(r.pts), rank: r.rank, tied: r.tied }))} />
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
