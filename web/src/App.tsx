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
import Stats from './pages/Stats';
import Blog, { PostPage } from './pages/Blog';
import Admin from './pages/Admin';

export default function App() {
  const { data, error } = useData();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      {data && <Ticker games={data.games} />}
      <header className="nav">
        <Link to="/" className="brand"><Crest size={44} /><span><b>{TEAM.name}</b><small>{TEAM.full}</small></span></Link>
        <nav>
          {[['/', 'Home'], ['/schedule', 'Schedule'], ['/roster', 'Roster'], ['/stats', 'Stats'], ['/blog', 'Blog']].map(([to, l]) => (
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
            <Route path="/stats" element={<Stats />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<PostPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
        )}
      </main>
      <footer><span>© {new Date().getFullYear()} {TEAM.full}</span><Link to="/admin">Admin</Link></footer>
    </>
  );
}
