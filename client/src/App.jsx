import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Trophy, LogOut, LayoutDashboard, UserPlus, LogIn, ShieldAlert } from 'lucide-react';
import Home from './pages/Home';
import TeamLogin from './pages/TeamLogin';
import TeamSignup from './pages/TeamSignup';
import TeamDashboard from './pages/TeamDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import QuizPage from './pages/QuizPage';
import ProjectWorkspace from './pages/ProjectWorkspace';
import TeamStats from './pages/TeamStats';
import RecordingsGallery from './pages/RecordingsGallery';
import Leaderboard from './pages/Leaderboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import Logo from './components/Logo';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="glass-panel" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, padding: '12px 0', borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="container flex justify-between items-center">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size={40} />
        </Link>
        <div className="flex gap-6 items-center">
          <Link to="/leaderboard" className="btn btn-ghost gap-2"><Trophy size={18} /> Leaderboard</Link>
          {user ? (
            <>
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-ghost gap-2">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <button onClick={handleLogout} className="btn gap-2" style={{ background: 'var(--danger)', color: 'white' }}>
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/team/login" className="btn btn-ghost gap-2"><LogIn size={18} /> Team Login</Link>
              <Link to="/team/signup" className="btn btn-primary gap-2" style={{ padding: '12px 30px' }}><UserPlus size={18} /> Register Team</Link>
              <Link to="/admin/login" className="btn btn-ghost gap-2" title="Admin Access">
                <ShieldAlert size={18} /> Admin
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer style={{
    marginTop: 'auto',
    padding: '40px 0',
    textAlign: 'center',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    color: 'var(--text-muted)',
    fontSize: '0.9rem'
  }}>
    <div className="container">
      <p style={{ letterSpacing: '0.5px' }}>© {new Date().getFullYear()} SeminarComp. All rights reserved to Deenan.</p>
    </div>
  </footer>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '80px' }}>
          <Navbar />
          <div className="flex-1 w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/team/login" element={<TeamLogin />} />
              <Route path="/team/signup" element={<TeamSignup />} />
              <Route path="/dashboard" element={<TeamDashboard />} />
              <Route path="/quiz/:num" element={<QuizPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/team-stats/:id" element={<TeamStats />} />
              <Route path="/admin/recordings" element={<RecordingsGallery />} />
              <Route path="/project-workspace/:id" element={<ProjectWorkspace />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
