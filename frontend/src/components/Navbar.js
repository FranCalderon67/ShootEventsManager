import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <img src="/logo-navbar.svg" alt="Logo" style={{ height: '30px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>TIRO <span>DINÁMICO</span></span>
      </Link>
      <div className="navbar-nav" style={{ overflow: "visible", flexShrink: 0 }}>
        <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>
          Eventos
        </Link>
        {isAdmin && (
          <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
            Admin <span className="nav-badge">ADM</span>
          </Link>
        )}
        <span className="nav-username" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</span>
        <button
          onClick={handleLogout}
          className="btn btn-outline btn-sm"
          style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
