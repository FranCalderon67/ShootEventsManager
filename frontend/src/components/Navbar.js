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
        <img src="/logo-navbar.svg" alt="Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
        TIRO <span>DINÁMICO</span>
      </Link>
      <div className="navbar-nav">
        <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>
          Eventos
        </Link>
        {isAdmin && (
          <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
            Admin <span className="nav-badge">ADM</span>
          </Link>
        )}
        <span className="nav-username">{user?.name}</span>
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
