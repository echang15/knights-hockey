import { useData } from '../DataContext';

const groups = [['F', 'Forwards'], ['D', 'Defense'], ['G', 'Goalies']] as const;
export default function Roster() {
  const { data } = useData();
  return (
    <>
      <h1 className="page">Roster</h1>
      {data!.players.length === 0 && <p className="muted">No players yet — add them in Admin.</p>}
      {groups.map(([pos, label]) => {
        const ps = data!.players.filter((p) => p.position === pos);
        return ps.length ? (
          <section key={pos}><h3 className="sect">{label}</h3>
            <div className="cards">{ps.map((p) => (
              <div key={p.id} className="card player"><span className="num">{p.number}</span><b>{p.name}</b><small>{p.position}{p.shoots ? ` · Shoots ${p.shoots}` : ''}{p.grade ? ` · ${p.grade}` : ''}</small></div>
            ))}</div></section>
        ) : null;
      })}
    </>
  );
}
