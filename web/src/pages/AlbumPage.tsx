import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AlbumDetail, MediaView } from '../../../shared/types';
import { useAuth } from '../auth';
import { deleteAlbum, deleteMedia, getAlbum, saveAlbum, saveCaption, uploadMedia } from '../api';
import { toJpeg } from '../image';
import { Lightbox } from '../components/Lightbox';
import { SignIn } from '../components/SignIn';
import { useRefreshing } from './Gallery';
import { fmtDate } from '../stats';

export default function AlbumPage() {
  const { isMember, isAdmin } = useAuth();
  if (!isMember) return <SignIn note="The photo gallery is for team members only." />;
  return <Album isAdmin={isAdmin} />;
}

function Album({ isAdmin }: { isAdmin: boolean }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, reload } = useRefreshing<AlbumDetail>(() => getAlbum(id!), [id]);
  const [open, setOpen] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  if (error && !data) return <><p className="error">{error}</p><Link to="/gallery" className="more">← Gallery</Link></>;
  if (!data) return <p className="muted">Loading…</p>;
  const { album, media } = data;

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    const fails: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(`Uploading ${i + 1} of ${files.length}…`);
      try { await uploadMedia(album.id, await toJpeg(files[i], 1600, 0.82), await toJpeg(files[i], 400, 0.78)); }
      catch (x) { fails.push(`${files[i].name}: ${(x as Error).message}`); }
    }
    await reload();
    setStatus(fails.length ? `${files.length - fails.length} uploaded; failed: ${fails.join('; ')}` : `Uploaded ${files.length} ✓`);
  };
  const del = async (m: MediaView) => {
    if (!confirm('Delete this photo for everyone?')) return;
    await deleteMedia(m.id); setOpen(null); await reload();
  };
  const caption = async (m: MediaView) => {
    const c = prompt('Caption', m.caption ?? '');
    if (c !== null) { await saveCaption(m.id, c); await reload(); }
  };
  const delAlbum = async () => {
    if (confirm(`Delete the album "${album.title}" and all ${media.length} photos? This can't be undone.`)) { await deleteAlbum(album.id); nav('/gallery'); }
  };
  const rename = async () => {
    const title = prompt('Album title', album.title);
    if (title?.trim()) { await saveAlbum({ ...album, title: title.trim() }); await reload(); }
  };

  return (
    <>
      <Link to="/gallery" className="more">← Gallery</Link>
      <h1 className="page">{album.title}</h1>
      <p className="muted">{fmtDate(album.date, { month: 'long', day: 'numeric', year: 'numeric' })} · {media.length} photo{media.length === 1 ? '' : 's'}</p>
      {album.description && <p>{album.description}</p>}
      {isAdmin && (
        <div className="admin-bar card">
          <label className="btn">+ Add photos<input type="file" accept="image/*" multiple hidden onChange={upload} /></label>
          <button className="btn ghost" onClick={rename}>Rename</button>
          <button className="btn danger" onClick={delAlbum}>Delete album</button>
          <span className="muted">{status}</span>
        </div>
      )}
      {media.length === 0 && <p className="muted">No photos in this album yet.</p>}
      <div className="photo-grid">{media.map((m, i) => (
        <button key={m.id} className="photo" onClick={() => setOpen(i)} title={m.caption}>
          <img src={m.thumbUrl} alt={m.caption ?? ''} loading="lazy" />
          {isAdmin && album.coverId !== m.id && <span className="cover-btn" role="button" title="Use as album cover" onClick={async (e) => { e.stopPropagation(); await saveAlbum({ ...album, coverId: m.id }); await reload(); }}>★</span>}
          {album.coverId === m.id && <span className="cover-btn on" title="Album cover">★</span>}
        </button>))}</div>
      {open !== null && <Lightbox items={media} index={open} onIndex={setOpen} onClose={() => setOpen(null)} onDelete={isAdmin ? del : undefined} onCaption={isAdmin ? caption : undefined} />}
    </>
  );
}
