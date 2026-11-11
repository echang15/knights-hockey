import { useState } from 'react';
import { useData } from '../DataContext';
import { Link } from 'react-router-dom';
import { pct, playerStats, ranked, record } from '../stats';
import { Avatar } from '../components/Avatar';
import { LeaderCard } from '../components/LeaderCard';

function useSort<T>(rows: T[], init: keyof T & string) {
  const [key, setKey] = useState<string>(init);
  const sorted = [...rows].sort((a: any, b: any) => (b[key] ?? 0) - (a[key] ?? 0));
  return { sorted, key, th: (k: string, label: string) => <th className={key === k ? 'on' : ''} onClick={() => setKey(k)}>{label}</th> };
}

export default function Stats() {
  const { data } = useData();
  const { games, players } = data!;
  const rec = record(games);
  const [showRetired, setShowRetired] = useState(false);
  const hasRetired = players.some((p) => p.retired);
  const { skaters, goalies } = playerStats(showRetired ? players : players.filter((p) => !p.retired), games);
  const pointsBoard = ranked(skaters, (r) => r.pts, (a, b) => b.g - a.g || a.gp - b.gp);
  const sk = useSort(skaters.map((s) => ({ ...s, name: s.player.name })), 'pts');
  const gl = useSort(goalies, 'svPct');
  return (
    <>
      <h1 className="page">Stats</h1>
      <div className="tiles">
        {[['GP', rec.gp], ['W-L-OTL', `${rec.w}-${rec.l}-${rec.otl}`], ['PTS', rec.pts], ['GF', rec.gf], ['GA', rec.ga]].map(([k, v]) => <div key={k} className="tile"><small>{k}</small><b>{v}</b></div>)}
      </div>



      {hasRetired && <label className="check"><input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} /> Include retired players / alumni</label>}
      <h3 className="sect">Team leaders</h3>
      <div className="leader-grid">
        <LeaderCard title="Points" rows={pointsBoard.filter((r) => r.pts > 0).map((r) => ({ player: r.player, value: String(r.pts), rank: r.rank, tied: r.tied }))} />
        <LeaderCard title="Goals" rows={ranked(skaters.filter((r) => r.g > 0), (r) => r.g, (a, b) => b.a - a.a).map((r) => ({ player: r.player, value: String(r.g), rank: r.rank, tied: r.tied }))} />
        <LeaderCard title="Assists" rows={ranked(skaters.filter((r) => r.a > 0), (r) => r.a, (a, b) => b.g - a.g).map((r) => ({ player: r.player, value: String(r.a), rank: r.rank, tied: r.tied }))} />
        <LeaderCard title="Save %" rows={ranked(goalies.filter((r) => r.sa > 0), (r) => r.svPct).map((r) => ({ player: r.player, value: pct(r.svPct), rank: r.rank, tied: r.tied }))} />
      </div>

      <h3 className="sect">Points leaderboard</h3>
      <div className="scroll"><table className="board"><thead><tr><th>Rk</th><th>Player</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>P/GP</th></tr></thead>
        <tbody>{pointsBoard.map((r) => <tr key={r.player.id} className={r.rank === 1 ? 'first' : ''}><td className="rk">{r.tied ? 'T' : ''}{r.rank}</td>
          <td className="l"><Link className="pl" to={`/player/${r.player.id}`}><Avatar player={r.player} size={34} /><span><b>{r.player.name}</b><small>#{r.player.number} · {r.player.position}</small></span></Link>{r.player.retired && <span className="tag">ALUM</span>}</td>
          <td>{r.gp}</td><td>{r.g}</td><td>{r.a}</td><td><b>{r.pts}</b></td><td>{r.gp ? (r.pts / r.gp).toFixed(2) : '–'}</td></tr>)}</tbody></table></div>

      <h3 className="sect">All skaters <small className="muted">(click a column to sort)</small></h3>
      <div className="scroll"><table><thead><tr><th>#</th><th>Player</th><th>Pos</th>{sk.th('gp', 'GP')}{sk.th('g', 'G')}{sk.th('a', 'A')}{sk.th('pts', 'PTS')}{sk.th('sog', 'SOG')}{sk.th('shPct', 'SH%')}{sk.th('pim', 'PIM')}</tr></thead>
        <tbody>{sk.sorted.map((s) => <tr key={s.player.id}><td>{s.player.number}</td><td className="l"><Link className="pl" to={`/player/${s.player.id}`}><Avatar player={s.player} size={28} />{s.player.name}</Link>{s.player.retired && <span className="tag">ALUM</span>}</td><td>{s.player.position}</td><td>{s.gp}</td><td>{s.g}</td><td>{s.a}</td><td><b>{s.pts}</b></td><td>{s.sog}</td><td>{pct(s.shPct)}</td><td>{s.pim}</td></tr>)}</tbody></table></div>

      <h3 className="sect">Goalies</h3>
      <div className="scroll"><table><thead><tr><th>#</th><th>Player</th>{gl.th('gp', 'GP')}{gl.th('sa', 'SA')}{gl.th('ga', 'GA')}{gl.th('sv', 'SV')}{gl.th('svPct', 'SV%')}{gl.th('gaa', 'GAA')}</tr></thead>
        <tbody>{gl.sorted.map((s) => <tr key={s.player.id}><td>{s.player.number}</td><td className="l"><Link className="pl" to={`/player/${s.player.id}`}><Avatar player={s.player} size={28} />{s.player.name}</Link>{s.player.retired && <span className="tag">ALUM</span>}</td><td>{s.gp}</td><td>{s.sa}</td><td>{s.ga}</td><td>{s.sv}</td><td><b>{pct(s.svPct)}</b></td><td>{s.gaa.toFixed(2)}</td></tr>)}</tbody></table></div>
    </>
  );
}
