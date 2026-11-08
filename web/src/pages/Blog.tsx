import { Link, useParams } from 'react-router-dom';
import { useData } from '../DataContext';
import { fmtDate } from '../stats';

const D = { month: 'long', day: 'numeric', year: 'numeric' } as const;
export default function Blog() {
  const { data } = useData();
  return (
    <>
      <h1 className="page">Blog</h1>
      {data!.posts.length === 0 && <p className="muted">No posts yet.</p>}
      <div className="posts">{data!.posts.map((p) => (
        <Link key={p.id} to={`/blog/${p.id}`} className="card post">
          <small>{fmtDate(p.date, D)} · {p.author}</small><h4>{p.title}</h4>
          <p className="muted">{p.body.slice(0, 200)}{p.body.length > 200 ? '…' : ''}</p>
        </Link>))}</div>
    </>
  );
}
export function PostPage() {
  const { id } = useParams();
  const { data } = useData();
  const p = data!.posts.find((x) => x.id === id);
  if (!p) return <p>Post not found. <Link to="/blog">Back</Link></p>;
  return (
    <article className="article">
      <Link to="/blog" className="more">← Blog</Link>
      <h1>{p.title}</h1>
      <p className="muted">{fmtDate(p.date, D)} · {p.author}{p.tags?.length ? ` · ${p.tags.map((t) => '#' + t).join(' ')}` : ''}</p>
      {p.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
    </article>
  );
}
