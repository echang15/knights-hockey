import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useData } from './DataContext';
import { TEAM } from './config';
import { Ticker } from './components/Ticker';
import { Crest } from './components/Crest';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import GamePage from './pages/GamePage';
import Roster from './pages/Roster';
import PlayerPage from './pages/PlayerPage';
import Stats from './pages/Stats';
import Blog, { PostPage } from './pages/Blog';
import Admin from './pages/Admin';
import Gallery from './pages/Gallery';
import AlbumPage from './pages/AlbumPage';
import { SignIn } from './components/SignIn';
import { setDevRole, signOut, useAuth, isLocalDev } from './auth';

export default function App() {
  const { data, error } = useData();
  const { pathname } = useLocation();
  const auth = useAuth();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      {data && <Ticker games={data.games} />}
      <header className="nav">
        <Link to="/" className="brand"><Crest size={64} /><span><b>{TEAM.name}</b><small>{TEAM.full}</small></span></Link>
        <nav>
          {[['/', 'Home'], ['/schedule', 'Schedule'], ['/roster', 'Roster'], ['/stats', 'Stats'], ['/blog', 'Blog'], ...(auth.isMember ? [['/gallery', 'Gallery']] : [])].map(([to, l]) => (
            <NavLink key={to} to={to} end={to === '/'}>{l}</NavLink>
          ))}
        </nav>
      </header>
      <main>
        {error && <p className="error">Couldn’t load data: {error}</p>}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/game/:id" element={<GamePage />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<PostPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/gallery/:id" element={<AlbumPage />} />
            <Route path="/login" element={auth.isMember ? <MemberHome /> : <SignIn />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
        )}
      </main>
      <footer>
        <span>© {new Date().getFullYear()} {TEAM.full}</span>
        <span className="foot-links">
          {isLocalDev() && <label className="devrole">DEV role <select value={auth.role} onChange={(e) => setDevRole(e.target.value as 'guest' | 'player' | 'admin')}><option>guest</option><option>player</option><option>admin</option></select></label>}
          {auth.isMember ? <><span className="muted">{auth.email}</span> <button className="linklike" onClick={signOut}>Sign out</button></> : <Link to="/login">Member sign-in</Link>}
          {auth.isAdmin && <Link to="/admin">Admin</Link>}
        </span>
      </footer>
    </>
  );
}

function MemberHome() {
  return <p>You're signed in. <Link to="/gallery">Open the gallery →</Link></p>;
}
