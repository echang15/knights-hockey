import { Link } from 'react-router-dom';
import { useData } from '../DataContext';
import { Avatar } from '../components/Avatar';
import { playerStats } from '../stats';

/** Large headshot at the top of a roster card; players without one get a same-size placeholder so cards line up. */
function Photo({ p }: { p: Parameters<typeof Avatar>[0]['player'] }) {
  return p.photoUrl
    ? <img className="roster-photo" src={p.photoUrl} alt={p.name} loading="lazy" />
    : <div className="roster-photo ph" aria-hidden><img src="/logo.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} /></div>;
}

const groups = [['F', 'Forwards'], ['D', 'Defense'], ['G', 'Goalies']] as const;
export default function Roster() {
  const { data } = useData();
  const active = data!.players.filter((p) => !p.retired);
  const retired = data!.players.filter((p) => p.retired);
  const { skaters, goalies } = playerStats(retired, data!.games);
  const career = (id: string) => {
    const s = skaters.find((x) => x.player.id === id), g = goalies.find((x) => x.player.id === id);
    if (s) return `${s.gp} GP · ${s.g} G · ${s.a} A · ${s.pts} PTS`;
    if (g) return `${g.gp} GP · ${g.svPct ? g.svPct.toFixed(3).replace(/^0/, '') : '.000'} SV% · ${g.gaa.toFixed(2)} GAA`;
    return '';
  };
  return (
    <>
      <h1 className="page">Roster</h1>
      {active.length === 0 && <p className="muted">No players yet — add them in Admin.</p>}
      {groups.map(([pos, label]) => {
        const ps = active.filter((p) => p.position === pos);
        return ps.length ? (
          <section key={pos}><h3 className="sect">{label}</h3>
            <div className="cards">{ps.map((p) => (
              <Link key={p.id} to={`/player/${p.id}`} className="card player"><Photo p={p} /><span className="num">{p.number}</span><b>{p.name}</b><small>{p.position}{p.shoots ? ` · Shoots ${p.shoots}` : ''}{p.grade ? ` · ${p.grade}` : ''}</small></Link>
            ))}</div></section>
        ) : null;
      })}
      {retired.length > 0 && (
        <section><h3 className="sect">Alumni / Retired</h3>
          <div className="cards">{retired.map((p) => (
            <Link key={p.id} to={`/player/${p.id}`} className="card player alumni"><Photo p={p} /><span className="num">{p.number}</span><b>{p.name}</b>
              <small>{p.position}{p.retiredYear ? ` · Retired ${p.retiredYear}` : ''}</small>
              <small className="career">Career: {career(p.id)}</small></Link>
          ))}</div></section>
      )}
    </>
  );
}
