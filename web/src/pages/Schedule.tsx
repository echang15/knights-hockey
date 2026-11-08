import type { Game } from '../../../shared/types';
import { useData } from '../DataContext';
import { GameRow } from '../components/GameRow';
import { fmtDate } from '../stats';

export default function Schedule() {
  const { data } = useData();
  const byMonth = new Map<string, Game[]>();
  for (const g of data!.games) {
    const k = fmtDate(g.date, { month: 'long', year: 'numeric' });
    byMonth.set(k, [...(byMonth.get(k) ?? []), g]);
  }
  return (
    <>
      <h1 className="page">Schedule &amp; Results</h1>
      {byMonth.size === 0 && <p className="muted">No games yet.</p>}
      {[...byMonth].map(([m, gs]) => (
        <section key={m}><h3 className="sect">{m}</h3><div className="card flush">{gs.map((g) => <GameRow key={g.id} g={g} />)}</div></section>
      ))}
    </>
  );
}
