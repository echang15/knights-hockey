import { Link, useParams } from 'react-router-dom';
import { useData } from '../DataContext';
import { fmtDate, fmtTime, resultOf } from '../stats';

export default function GamePage() {
  const { id } = useParams();
  const { data } = useData();
  const g = data!.games.find((x) => x.id === id);
  if (!g) return <p>Game not found. <Link to="/schedule">Back to schedule</Link></p>;
  const r = resultOf(g);
  const lines = (g.lines ?? []).map((l) => ({ l, p: data!.players.find((p) => p.id === l.playerId) })).filter((x) => x.p);
  const sk = lines.filter((x) => x.p!.position !== 'G'), gl = lines.filter((x) => x.p!.position === 'G');
  return (
    <>
      <Link to="/schedule" className="more">← Schedule</Link>
      <div className="scoreboard card">
        <div className="side"><small>KNIGHTS</small><b>{g.status === 'final' ? g.ourScore : '–'}</b></div>
        <div className="mid"><small>{r ? `FINAL${r.suffix}` : g.status === 'cancelled' ? 'POSTPONED' : 'UPCOMING'}</small><span>{fmtDate(g.date, { weekday: 'long', month: 'long', day: 'numeric' })}</span><span>{fmtTime(g.date)} · {g.location}</span></div>
        <div className="side"><small>{g.opponent.toUpperCase()}</small><b>{g.status === 'final' ? g.theirScore : '–'}</b></div>
      </div>
      {g.attendance != null && <p className="muted">Attendance: <b>{g.attendance.toLocaleString()}</b></p>}
      {g.recap && <section><h3 className="sect">Recap</h3>{g.recap.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</section>}
      {sk.length > 0 && (
        <section><h3 className="sect">Skaters</h3>
          <table><thead><tr><th>#</th><th>Player</th><th>G</th><th>A</th><th>PTS</th><th>SOG</th><th>PIM</th></tr></thead>
            <tbody>{sk.map(({ l, p }) => <tr key={p!.id}><td>{p!.number}</td><td className="l">{p!.name}</td><td>{l.g ?? 0}</td><td>{l.a ?? 0}</td><td>{(l.g ?? 0) + (l.a ?? 0)}</td><td>{l.sog ?? 0}</td><td>{l.pim ?? 0}</td></tr>)}</tbody></table></section>
      )}
      {gl.length > 0 && (
        <section><h3 className="sect">Goalies</h3>
          <table><thead><tr><th>#</th><th>Player</th><th>SA</th><th>GA</th><th>SV</th></tr></thead>
            <tbody>{gl.map(({ l, p }) => <tr key={p!.id}><td>{p!.number}</td><td className="l">{p!.name}</td><td>{l.sa ?? 0}</td><td>{l.ga ?? 0}</td><td>{(l.sa ?? 0) - (l.ga ?? 0)}</td></tr>)}</tbody></table></section>
      )}
    </>
  );
}
