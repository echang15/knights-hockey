import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Game, Player } from '../../../shared/types';
import { useData } from '../DataContext';
import { checkin, remove } from '../api';
import { useAuth } from '../auth';
import { lineupFor } from '../stats';

const KEY = 'checkinPlayerId';
const POS = { F: 'Forwards', D: 'Defense', G: 'Goalies' } as const;

/**
 * Player availability for an upcoming game, so coaches can plan lines and pairings.
 * Members pick a roster player and mark them In/Out; the In / Out / No-response columns are visible to members only.
 */
export function Rsvp({ game }: { game: Game }) {
  const { data, reload } = useData();
  const { isAdmin, isMember } = useAuth();
  const roster = data!.players.filter((p) => !p.retired);
  const [pid, setPid] = useState(() => (roster.some((p) => p.id === localStorage.getItem(KEY)) ? localStorage.getItem(KEY)! : ''));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const lineup = lineupFor(data!.players, data!.checkins, game.id);
  const current = pid ? lineup.status.get(pid) : undefined;

  if (!isMember) {
    return (
      <section>
        <h3 className="sect">Availability</h3>
        <div className="card rsvp"><p className="muted">Game-day check-in is for team members. <Link to="/login" className="more">Sign in</Link> to mark a player in or out.</p></div>
      </section>
    );
  }

  const go = async (playerId: string, status: 'in' | 'out') => {
    if (!playerId) { setMsg('Pick a player first'); return; }
    setBusy(true);
    try {
      await checkin(game.id, playerId, status);
      localStorage.setItem(KEY, playerId);
      await reload();
      const who = roster.find((p) => p.id === playerId)!;
      setMsg(`${who.name} is ${status === 'in' ? 'IN ✓' : 'OUT'}`);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const clear = async (p: Player) => {
    const c = data!.checkins.find((x) => x.gameId === game.id && x.playerId === p.id);
    if (c) { try { await remove('checkins', c.id); await reload(); } catch (e) { setMsg((e as Error).message); } }
  };

  const tally = (['F', 'D', 'G'] as const).map((pos) => {
    const all = roster.filter((p) => p.position === pos).length;
    return { pos, in: lineup.in.filter((p) => p.position === pos).length, all };
  });
  const col = (title: string, cls: string, ps: Player[]) => (
    <div className={`rsvp-col ${cls}`}>
      <h4>{title} ({ps.length})</h4>
      {ps.length === 0 ? <small className="muted">—</small> : (['F', 'D', 'G'] as const).map((pos) => {
        const g = ps.filter((p) => p.position === pos);
        return g.length ? (
          <div key={pos} className="pos-group"><small className="pos-label">{POS[pos]}</small>
            <ul>{g.map((p) => (
              <li key={p.id}><button className="pick" onClick={() => setPid(p.id)} title="Select this player"><span className="n">#{p.number}</span> {p.name}</button>
                {isAdmin && cls !== 'pending' && <button className="x" title="Clear (back to no response)" onClick={() => clear(p)}>×</button>}</li>))}</ul>
          </div>
        ) : null;
      })}
    </div>
  );

  return (
    <section>
      <h3 className="sect">Availability</h3>
      <div className="card rsvp">
        <div className="rsvp-form">
          <select value={pid} onChange={(e) => { setPid(e.target.value); setMsg(''); }}>
            <option value="">Select a player…</option>
            {roster.map((p) => <option key={p.id} value={p.id}>#{p.number} {p.name} ({p.position})</option>)}
          </select>
          <button className={`btn ${current === 'in' ? '' : 'ghost'}`} disabled={busy || !pid} onClick={() => go(pid, 'in')}>I’m in</button>
          <button className={`btn ${current === 'out' ? 'danger' : 'ghost'}`} disabled={busy || !pid} onClick={() => go(pid, 'out')}>I’m out</button>
        </div>
        {msg ? <p className="muted">{msg}</p> : current && <p className="muted">Currently marked: {current === 'in' ? 'IN ✓' : 'OUT'} (tap again to change)</p>}
        <p className="tally">{tally.map((t) => <span key={t.pos}><b>{t.in}</b>/{t.all} {POS[t.pos]}</span>)}<span><b>{lineup.pending.length}</b> no response</span></p>
        <div className="rsvp-cols three">{col('In', 'in', lineup.in)}{col('Out', 'out', lineup.out)}{col('No response', 'pending', lineup.pending)}</div>
      </div>
    </section>
  );
}
