import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AlbumSummary } from '../../../shared/types';
import { useAuth } from '../auth';
import { listAlbums, newId, saveAlbum } from '../api';
import { SignIn } from '../components/SignIn';
import { fmtDate } from '../stats';

/** Members-only. Signed links expire after 15 minutes, so the list refreshes itself well before that. */
export function useRefreshing<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const run = useCallback(() => load().then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps);
  useEffect(() => { run(); const t = setInterval(run, 10 * 60 * 1000); return () => clearInterval(t); }, [run]);
  return { data, error, reload: run };
}

export default function Gallery() {
  const { isMember, isAdmin } = useAuth();
  if (!isMember) return <SignIn note="The photo gallery is for team members only. Sign in with the account your coach set up for you." />;
  return <Albums isAdmin={isAdmin} />;
}

function Albums({ isAdmin }: { isAdmin: boolean }) {
  const { data, error, reload } = useRefreshing<AlbumSummary[]>(listAlbums, []);
  const [creating, setCreating] = useState(false);
  const nav = useNavigate();
  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = newId('al-');
    await saveAlbum({ id, title: String(f.get('title')), description: String(f.get('description')) || undefined, date: String(f.get('date')) });
    nav(`/gallery/${id}`);
  };
  return (
    <>
      <h1 className="page">Gallery</h1>
      <p className="muted">Team photos — visible to signed-in players and admins only.</p>
      {isAdmin && !creating && <button className="btn" onClick={() => setCreating(true)}>+ New album</button>}
      {creating && (
        <form onSubmit={create} className="card form"><div className="row">
          <label>Title<input name="title" maxLength={80} required autoFocus /></label>
          <label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label></div>
          <label>Description<textarea name="description" rows={2} maxLength={500} /></label>
          <div><button className="btn">Create album</button> <button type="button" className="btn ghost" onClick={() => setCreating(false)}>Cancel</button></div></form>
      )}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p className="muted">No albums yet.{isAdmin ? ' Create one to start uploading.' : ''}</p>}
      <div className="album-grid">{data?.map((a) => (
        <Link key={a.id} to={`/gallery/${a.id}`} className="album card">
          {a.coverUrl ? <img src={a.coverUrl} alt="" loading="lazy" /> : <div className="album-empty">No photos yet</div>}
          <div className="album-meta"><b>{a.title}</b><small>{fmtDate(a.date, { month: 'short', day: 'numeric', year: 'numeric' })} · {a.count} photo{a.count === 1 ? '' : 's'}</small></div>
        </Link>))}</div>
    </>
  );
}
