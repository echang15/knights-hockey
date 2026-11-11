import { useState } from 'react';
import type { Game } from '../../../shared/types';
import { useData } from '../DataContext';
import { checkin, remove } from '../api';
import { useAuth } from '../auth';
import { rsvpFor } from '../stats';

const KEY = 'rsvpName';

export function Rsvp({ game }: { game: Game }) {
  const { data, reload } = useData();
  const { isAdmin } = useAuth();
  const [name, setName] = useState(() => localStorage.getItem(KEY) ?? '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const { ins, outs } = rsvpFor(data!.checkins, game.id);
  const roster = data!.players.filter((p) => !p.retired);
  const mine = name.trim().toLowerCase();
  const mineStatus = [...ins, ...outs].find((c) => c.name.toLowerCase() === mine)?.status;

  const go = async (status: 'in' | 'out') => {
    if (!name.trim()) { setMsg('Enter your name first'); return; }
    setBusy(true);
    try {
      await checkin(game.id, name.trim(), status);
      localStorage.setItem(KEY, name.trim());
      await reload();
      setMsg(status === 'in' ? "You're in! ✓" : "Marked out — thanks for letting us know");
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const del = async (id: string) => { try { await remove('checkins', id); await reload(); } catch (e) { setMsg((e as Error).message); } };
  const list = (items: typeof ins, label: string, cls: string) => (
    <div className={`rsvp-col ${cls}`}>
      <h4>{label} ({items.length})</h4>
      {items.length === 0 ? <small className="muted">Nobody yet</small> : (
        <ul>{items.map((c) => <li key={c.id}>{c.name}{isAdmin && <button className="x" title="Remove" onClick={() => del(c.id)}>×</button>}</li>)}</ul>
      )}
    </div>
  );

  return (
    <section>
      <h3 className="sect">Who’s in?</h3>
      <div className="card rsvp">
        <div className="rsvp-form">
          <input list="roster-names" value={name} maxLength={40} placeholder="Your name" onChange={(e) => { setName(e.target.value); setMsg(''); }} />
          <datalist id="roster-names">{roster.map((p) => <option key={p.id} value={p.name} />)}</datalist>
          <button className={`btn ${mineStatus === 'in' ? '' : 'ghost'}`} disabled={busy} onClick={() => go('in')}>I’m in</button>
          <button className={`btn ${mineStatus === 'out' ? 'danger' : 'ghost'}`} disabled={busy} onClick={() => go('out')}>I’m out</button>
        </div>
        {(msg || mineStatus) && <p className="muted">{msg || `Currently marked: ${mineStatus === 'in' ? 'IN ✓' : 'OUT'} (tap again to change)`}</p>}
        <div className="rsvp-cols">{list(ins, 'In', 'in')}{list(outs, 'Out', 'out')}</div>
      </div>
    </section>
  );
}
