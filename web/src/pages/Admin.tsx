import { useState, type FormEvent } from 'react';
import type { Game, Player, Post, StatLine } from '../../../shared/types';
import { useData } from '../DataContext';
import { isLocalDev, isSignedIn, signIn, signOut } from '../auth';
import { newId, remove, save, uploadPhoto } from '../api';
import { Avatar } from '../components/Avatar';
import { fmtDate } from '../stats';

type Tab = 'games' | 'players' | 'posts';

export default function Admin() {
  const [, bump] = useState(0);
  const [tab, setTab] = useState<Tab>('games');
  if (!isSignedIn()) return <Login onDone={() => bump((n) => n + 1)} />;
  return (
    <>
      <h1 className="page">Admin</h1>
      {isLocalDev() ? <p className="muted">Local dev mode — no sign-in required.</p> : <button className="btn ghost" onClick={() => { signOut(); bump((n) => n + 1); }}>Sign out</button>}
      <div className="tabs">{(['games', 'players', 'posts'] as Tab[]).map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'games' && <Games />}{tab === 'players' && <Players />}{tab === 'posts' && <Posts />}
    </>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await signIn(String(f.get('u')), String(f.get('p'))); onDone(); } catch (x) { setErr((x as Error).message); }
  };
  return (
    <form onSubmit={submit} className="card form narrow">
      <h2>Admin sign-in</h2>
      <label>Email<input name="u" type="email" autoComplete="username" required /></label>
      <label>Password<input name="p" type="password" autoComplete="current-password" required /></label>
      {err && <p className="error">{err}</p>}
      <button className="btn">Sign in</button>
    </form>
  );
}

function useSaver() {
  const { reload } = useData();
  const [msg, setMsg] = useState('');
  return {
    msg,
    run: async (fn: () => Promise<unknown>) => {
      try { await fn(); await reload(); setMsg('Saved ✓'); } catch (e) { setMsg('Error: ' + (e as Error).message); }
    },
  };
}
const num = (v: FormDataEntryValue | null) => (v === null || v === '' ? undefined : Number(v));

function Games() {
  const { data } = useData();
  const [editing, setEditing] = useState<Game | null>(null);
  const s = useSaver();
  const blank = (): Game => ({ id: newId('g'), date: new Date().toISOString().slice(0, 11) + '18:00', opponent: '', home: true, location: '', status: 'scheduled' });
  return (
    <>
      <button className="btn" onClick={() => setEditing(blank())}>+ New game</button> <span className="muted">{s.msg}</span>
      {editing && <GameForm key={editing.id} game={editing} players={data!.players} onCancel={() => setEditing(null)} onSave={(g) => s.run(async () => { await save('games', g); setEditing(null); })} />}
      <div className="card flush">{[...data!.games].reverse().map((g) => (
        <div key={g.id} className="admin-row">
          <span>{fmtDate(g.date, { month: 'short', day: 'numeric', year: 'numeric' })} — {g.home ? 'vs' : '@'} {g.opponent} {g.status === 'final' && <b>({g.ourScore}-{g.theirScore})</b>}</span>
          <span><button className="btn ghost" onClick={() => setEditing(g)}>Edit</button> <button className="btn danger" onClick={() => confirm('Delete game?') && s.run(() => remove('games', g.id))}>Delete</button></span>
        </div>))}</div>
    </>
  );
}

function GameForm({ game, players, onSave, onCancel }: { game: Game; players: Player[]; onSave: (g: Game) => void; onCancel: () => void }) {
  const [status, setStatus] = useState(game.status);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const out: Game = {
      id: game.id, date: String(f.get('date')), opponent: String(f.get('opponent')), home: f.get('home') === '1',
      location: String(f.get('location')), status, recap: String(f.get('recap') ?? '') || undefined,
    };
    if (status === 'final') {
      out.ourScore = num(f.get('our')) ?? 0; out.theirScore = num(f.get('their')) ?? 0;
      out.decision = String(f.get('decision')) as Game['decision']; out.attendance = num(f.get('att'));
      const lines: StatLine[] = [];
      for (const p of players) {
        const v = (k: string) => num(f.get(`${p.id}.${k}`));
        const l: StatLine = p.position === 'G'
          ? { playerId: p.id, sa: v('sa'), ga: v('ga') }
          : { playerId: p.id, g: v('g'), a: v('a'), sog: v('sog'), pim: v('pim') };
        if (Object.entries(l).some(([k, x]) => k !== 'playerId' && x !== undefined)) lines.push(l);
      }
      out.lines = lines;
    }
    onSave(out);
  };
  return (
    <form onSubmit={submit} className="card form">
      <div className="row">
        <label>Date/time<input name="date" type="datetime-local" defaultValue={game.date} required /></label>
        <label>Opponent<input name="opponent" defaultValue={game.opponent} required /></label>
        <label>Location<input name="location" defaultValue={game.location} /></label>
        <label>Home/Away<select name="home" defaultValue={game.home ? '1' : '0'}><option value="1">Home</option><option value="0">Away</option></select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as Game['status'])}><option value="scheduled">Scheduled</option><option value="final">Final</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      {status === 'final' && (
        <>
          <div className="row">
            <label>Knights score<input name="our" type="number" min="0" defaultValue={game.ourScore} required /></label>
            <label>Opponent score<input name="their" type="number" min="0" defaultValue={game.theirScore} required /></label>
            <label>Decided in<select name="decision" defaultValue={game.decision ?? 'REG'}><option value="REG">Regulation</option><option value="OT">OT</option><option value="SO">Shootout</option></select></label>
            <label>Attendance<input name="att" type="number" min="0" defaultValue={game.attendance} /></label>
          </div>
          <label>Recap<textarea name="recap" rows={4} defaultValue={game.recap} /></label>
          <table className="entry"><thead><tr><th>Player</th><th>G</th><th>A</th><th>SOG</th><th>PIM</th><th>SA</th><th>GA</th></tr></thead><tbody>
            {players.map((p) => {
              const l = game.lines?.find((x) => x.playerId === p.id); const G = p.position === 'G';
              const cell = (k: keyof StatLine, on: boolean) => <td>{on ? <input name={`${p.id}.${k}`} type="number" min="0" defaultValue={l?.[k]} /> : null}</td>;
              return <tr key={p.id}><td className="l">#{p.number} {p.name}</td>{cell('g', !G)}{cell('a', !G)}{cell('sog', !G)}{cell('pim', !G)}{cell('sa', G)}{cell('ga', G)}</tr>;
            })}</tbody></table>
        </>
      )}
      <div><button className="btn">Save game</button> <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function Players() {
  const { data } = useData();
  const [editing, setEditing] = useState<Player | null>(null);
  const s = useSaver();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p: Player = { id: editing!.id, name: String(f.get('name')), number: Number(f.get('number')), position: String(f.get('pos')) as Player['position'], grade: String(f.get('grade')) || undefined, shoots: (String(f.get('shoots')) || undefined) as Player['shoots'], photoUrl: String(f.get('photoUrl')) || undefined, bio: String(f.get('bio')) || undefined, hometown: String(f.get('hometown')) || undefined, height: String(f.get('height')) || undefined, weight: String(f.get('weight')) || undefined, retired: f.get('retired') === 'on' || undefined, retiredYear: f.get('retired') === 'on' ? String(f.get('retiredYear')) || undefined : undefined };
    s.run(async () => { await save('players', p); setEditing(null); });
  };
  return (
    <>
      <button className="btn" onClick={() => setEditing({ id: newId('p'), name: '', number: 0, position: 'F' })}>+ New player</button> <span className="muted">{s.msg}</span>
      {editing && (
        <form key={editing.id} onSubmit={submit} className="card form"><div className="row">
          <label>#<input name="number" type="number" min="0" defaultValue={editing.number} required /></label>
          <label>Name<input name="name" defaultValue={editing.name} required /></label>
          <label>Position<select name="pos" defaultValue={editing.position}><option value="F">Forward</option><option value="D">Defense</option><option value="G">Goalie</option></select></label>
          <label>Shoots<select name="shoots" defaultValue={editing.shoots ?? ''}><option value="">–</option><option>L</option><option>R</option></select></label>
          <label>Grade<input name="grade" defaultValue={editing.grade} /></label>
          <label className="check"><span><input name="retired" type="checkbox" defaultChecked={editing.retired} /> Retired / alumni</span></label>
          <label>Retired year<input name="retiredYear" placeholder="2025" defaultValue={editing.retiredYear} /></label>
        </div>
        <div className="row">
          <label>Hometown<input name="hometown" defaultValue={editing.hometown} /></label>
          <label>Height<input name="height" placeholder={"5'10\""} defaultValue={editing.height} /></label>
          <label>Weight<input name="weight" placeholder="165 lb" defaultValue={editing.weight} /></label>
        </div>
        <PhotoField player={editing} />
        <label>Bio (blank line = new paragraph)<textarea name="bio" rows={5} defaultValue={editing.bio} /></label>
        <div><button className="btn">Save</button> <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button></div></form>
      )}
      <div className="card flush">{data!.players.map((p) => (
        <div key={p.id} className="admin-row"><span>#{p.number} {p.name} ({p.position}){p.retired && <span className="tag">RETIRED{p.retiredYear ? ` ${p.retiredYear}` : ''}</span>}</span>
          <span><button className="btn ghost" onClick={() => setEditing(p)}>Edit</button> <button className="btn danger" onClick={() => confirm('Delete player?') && s.run(() => remove('players', p.id))}>Delete</button></span></div>))}</div>
    </>
  );
}

function Posts() {
  const { data } = useData();
  const [editing, setEditing] = useState<Post | null>(null);
  const s = useSaver();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const tags = String(f.get('tags')).split(',').map((t) => t.trim()).filter(Boolean);
    const p: Post = { id: editing!.id, title: String(f.get('title')), author: String(f.get('author')), date: String(f.get('date')), body: String(f.get('body')), tags };
    s.run(async () => { await save('posts', p); setEditing(null); });
  };
  return (
    <>
      <button className="btn" onClick={() => setEditing({ id: newId('post-'), title: '', author: '', date: new Date().toISOString().slice(0, 10), body: '' })}>+ New post</button> <span className="muted">{s.msg}</span>
      {editing && (
        <form key={editing.id} onSubmit={submit} className="card form">
          <div className="row"><label>Title<input name="title" defaultValue={editing.title} required /></label><label>Author<input name="author" defaultValue={editing.author} /></label>
            <label>Date<input name="date" type="date" defaultValue={editing.date} required /></label><label>Tags (comma-sep)<input name="tags" defaultValue={editing.tags?.join(', ')} /></label></div>
          <label>Body (blank line = new paragraph)<textarea name="body" rows={10} defaultValue={editing.body} required /></label>
          <div><button className="btn">Publish</button> <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button></div>
        </form>
      )}
      <div className="card flush">{data!.posts.map((p) => (
        <div key={p.id} className="admin-row"><span>{p.date} — {p.title}</span>
          <span><button className="btn ghost" onClick={() => setEditing(p)}>Edit</button> <button className="btn danger" onClick={() => confirm('Delete post?') && s.run(() => remove('posts', p.id))}>Delete</button></span></div>))}</div>
    </>
  );
}

/** Crops the chosen image to a 480px square JPEG in the browser (keeps uploads small), uploads it, and stores the URL in a hidden input. */
async function toSquareJpeg(file: File, side = 480): Promise<string> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas'); c.width = c.height = side;
  const m = Math.min(bmp.width, bmp.height);
  // Crop from the upper-middle: headshots usually have the face in the top half.
  c.getContext('2d')!.drawImage(bmp, (bmp.width - m) / 2, (bmp.height - m) * 0.25, m, m, 0, 0, side, side);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1];
}

function PhotoField({ player }: { player: Player }) {
  const [url, setUrl] = useState(player.photoUrl ?? '');
  const [state, setState] = useState('');
  const pick = async (file?: File) => {
    if (!file) return;
    setState('Uploading…');
    try { setUrl(await uploadPhoto(player.id, await toSquareJpeg(file))); setState('Uploaded ✓ — remember to Save'); }
    catch (e) { setState('Error: ' + (e as Error).message); }
  };
  return (
    <div className="photo-field">
      <Avatar player={{ ...player, photoUrl: url || undefined }} size={72} />
      <div>
        <label>Photo<input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} /></label>
        <small className="muted">{state || 'Any image; it is cropped to a square and shrunk automatically.'}</small>
        {url && <button type="button" className="btn ghost" onClick={() => setUrl('')}>Remove photo</button>}
      </div>
      <input type="hidden" name="photoUrl" value={url} />
    </div>
  );
}
