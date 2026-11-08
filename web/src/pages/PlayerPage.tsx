import { Link, useParams } from 'react-router-dom';
import { useData } from '../DataContext';
import { Avatar } from '../components/Avatar';
import { fmtDate, gameLog, pct, playerStats, ranked, resultOf } from '../stats';

export default function PlayerPage() {
  const { id } = useParams();
  const { data } = useData();
  const p = data!.players.find((x) => x.id === id);
  if (!p) return <p>Player not found. <Link to="/roster">Back to roster</Link></p>;
  const isG = p.position === 'G';
  const { skaters, goalies } = playerStats(data!.players, data!.games);
  const s = skaters.find((x) => x.player.id === p.id), g = goalies.find((x) => x.player.id === p.id);
  const rank = s && s.gp ? ranked(skaters, (x) => x.pts, (a, b) => b.g - a.g).find((x) => x.player.id === p.id)?.rank : undefined;
  const tiles: [string, string | number][] = isG && g
    ? [['GP', g.gp], ['SA', g.sa], ['GA', g.ga], ['SV', g.sv], ['SV%', pct(g.svPct)], ['GAA', g.gaa.toFixed(2)]]
    : s ? [['GP', s.gp], ['G', s.g], ['A', s.a], ['PTS', s.pts], ['SOG', s.sog], ['PIM', s.pim], ['TEAM RANK', rank ? `#${rank}` : '–']] : [];
  const log = gameLog(p.id, data!.games);
  const facts = [p.position === 'F' ? 'Forward' : p.position === 'D' ? 'Defense' : 'Goalie', p.shoots && `Shoots ${p.shoots}`, p.grade, p.hometown, p.height, p.weight].filter(Boolean) as string[];
  return (
    <>
      <Link to="/roster" className="more">← Roster</Link>
      <div className="bio-hero card">
        {p.photoUrl ? <img className="bio-photo" src={p.photoUrl} alt={p.name} /> : <div className="bio-photo ph"><Avatar player={p} size={160} /></div>}
        <div>
          <span className="bio-num">#{p.number}</span>
          <h1>{p.name}{p.retired && <span className="tag">ALUM{p.retiredYear ? ` ${p.retiredYear}` : ''}</span>}</h1>
          <p className="chips">{facts.map((f) => <span key={f}>{f}</span>)}</p>
        </div>
      </div>
      {p.bio && <section><h3 className="sect">Bio</h3>{p.bio.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}</section>}
      {tiles.length > 0 && <section><h3 className="sect">Stats</h3><div className="tiles">{tiles.map(([k, v]) => <div key={k} className="tile"><small>{k}</small><b>{v}</b></div>)}</div></section>}
      {log.length > 0 && (
        <section><h3 className="sect">Game log</h3>
          <div className="scroll"><table>
            <thead><tr><th>Date</th><th>Opponent</th><th>Result</th>{isG ? <><th>SA</th><th>GA</th><th>SV%</th></> : <><th>G</th><th>A</th><th>PTS</th><th>SOG</th><th>PIM</th></>}</tr></thead>
            <tbody>{log.map(({ game, line }) => {
              const r = resultOf(game)!;
              return <tr key={game.id}><td>{fmtDate(game.date)}</td><td className="l"><Link to={`/game/${game.id}`}>{game.home ? 'vs' : '@'} {game.opponent}</Link></td><td>{r.label} {game.ourScore}-{game.theirScore}</td>
                {isG ? <><td>{line!.sa ?? 0}</td><td>{line!.ga ?? 0}</td><td>{line!.sa ? pct(((line!.sa) - (line!.ga ?? 0)) / line!.sa) : '–'}</td></>
                  : <><td>{line!.g ?? 0}</td><td>{line!.a ?? 0}</td><td>{(line!.g ?? 0) + (line!.a ?? 0)}</td><td>{line!.sog ?? 0}</td><td>{line!.pim ?? 0}</td></>}</tr>;
            })}</tbody></table></div></section>
      )}
    </>
  );
}
