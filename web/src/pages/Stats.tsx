import { useState } from 'react';
import { useData } from '../DataContext';
import { attendance, fmtDate, pct, playerStats, record } from '../stats';

function useSort<T>(rows: T[], init: keyof T & string) {
  const [key, setKey] = useState<string>(init);
  const sorted = [...rows].sort((a: any, b: any) => (b[key] ?? 0) - (a[key] ?? 0));
  return { sorted, key, th: (k: string, label: string) => <th className={key === k ? 'on' : ''} onClick={() => setKey(k)}>{label}</th> };
}

export default function Stats() {
  const { data } = useData();
  const { games, players } = data!;
  const rec = record(games), att = attendance(games);
  const [showRetired, setShowRetired] = useState(false);
  const hasRetired = players.some((p) => p.retired);
  const { skaters, goalies } = playerStats(showRetired ? players : players.filter((p) => !p.retired), games);
  const sk = useSort(skaters.map((s) => ({ ...s, name: s.player.name })), 'pts');
  const gl = useSort(goalies, 'svPct');
  const max = Math.max(1, ...att.games.map((g) => g.attendance!));
  return (
    <>
      <h1 className="page">Stats</h1>
      <div className="tiles">
        {[['GP', rec.gp], ['W-L-OTL', `${rec.w}-${rec.l}-${rec.otl}`], ['PTS', rec.pts], ['GF', rec.gf], ['GA', rec.ga], ['AVG HOME ATT', att.avgHome]].map(([k, v]) => <div key={k} className="tile"><small>{k}</small><b>{v}</b></div>)}
      </div>

      {hasRetired && <label className="check"><input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} /> Include retired players / alumni</label>}

      <h3 className="sect">Skaters <small className="muted">(click a column to sort)</small></h3>
      <div className="scroll"><table><thead><tr><th>#</th><th>Player</th><th>Pos</th>{sk.th('gp', 'GP')}{sk.th('g', 'G')}{sk.th('a', 'A')}{sk.th('pts', 'PTS')}{sk.th('sog', 'SOG')}{sk.th('shPct', 'SH%')}{sk.th('pim', 'PIM')}</tr></thead>
        <tbody>{sk.sorted.map((s) => <tr key={s.player.id}><td>{s.player.number}</td><td className="l">{s.player.name}{s.player.retired && <span className="tag">ALUM</span>}</td><td>{s.player.position}</td><td>{s.gp}</td><td>{s.g}</td><td>{s.a}</td><td><b>{s.pts}</b></td><td>{s.sog}</td><td>{pct(s.shPct)}</td><td>{s.pim}</td></tr>)}</tbody></table></div>

      <h3 className="sect">Goalies</h3>
      <div className="scroll"><table><thead><tr><th>#</th><th>Player</th>{gl.th('gp', 'GP')}{gl.th('sa', 'SA')}{gl.th('ga', 'GA')}{gl.th('sv', 'SV')}{gl.th('svPct', 'SV%')}{gl.th('gaa', 'GAA')}</tr></thead>
        <tbody>{gl.sorted.map((s) => <tr key={s.player.id}><td>{s.player.number}</td><td className="l">{s.player.name}{s.player.retired && <span className="tag">ALUM</span>}</td><td>{s.gp}</td><td>{s.sa}</td><td>{s.ga}</td><td>{s.sv}</td><td><b>{pct(s.svPct)}</b></td><td>{s.gaa.toFixed(2)}</td></tr>)}</tbody></table></div>

      <h3 className="sect">Attendance</h3>
      {att.games.length === 0 ? <p className="muted">No attendance recorded yet.</p> : (
        <>
          <p className="muted">Total {att.total.toLocaleString()} · Avg home {att.avgHome}{att.best && <> · Best {att.best.attendance} vs {att.best.opponent}</>}</p>
          <div className="bars">{att.games.map((g) => (
            <div key={g.id} className={`bar ${g.home ? '' : 'away'}`} title={`${g.opponent}: ${g.attendance}`}>
              <i style={{ height: `${(g.attendance! / max) * 100}%` }} /><small>{fmtDate(g.date)}</small>
            </div>))}</div>
          <p className="muted"><span className="dot" /> Home <span className="dot away" /> Away</p>
        </>
      )}
    </>
  );
}
