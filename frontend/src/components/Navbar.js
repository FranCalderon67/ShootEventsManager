import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo-navbar.png" alt="Logo" style={{ height: '30px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
          <span style={{ whiteSpace: 'nowrap' }}>TIRO <span>DINÁMICO</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="navbar-nav desktop-nav">
          <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>
            Eventos
          </Link>
          {isAdmin && (
            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
              Admin <span className="nav-badge">ADM</span>
            </Link>
          )}
          <a
            href="/reglamento.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)', flexShrink: 0, textDecoration: 'none' }}
          >
            📄 Reglamento
          </a>
          <span className="nav-username">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
          >
            Salir
          </button>
        </div>

        {/* Hamburger button - mobile only */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menú"
        >
          <span className={`ham-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`ham-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`ham-line ${menuOpen ? 'open' : ''}`}></span>
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMenu}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <img src="/logo-navbar.png" alt="Logo" style={{ height: '28px', width: 'auto' }} onError={e => e.target.style.display = 'none'} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                  TIRO <span style={{ color: 'var(--accent)' }}>DINÁMICO</span>
                </span>
              </div>
              <button className="mobile-menu-close" onClick={closeMenu}>✕</button>
            </div>

            {/* User info */}
            <div className="mobile-menu-user">
              <div className="mobile-user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {isAdmin ? '⚙️ Administrador' : '🎯 Tirador'}
                </div>
              </div>
            </div>

            <div className="mobile-menu-divider" />

            {/* Nav links */}
            <Link
              to="/events"
              className={`mobile-nav-link ${isActive('/events') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="mobile-nav-icon">🎯</span>
              Eventos
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`mobile-nav-link ${isActive('/admin') ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <span className="mobile-nav-icon">⚙️</span>
                Panel Admin
                <span className="nav-badge" style={{ marginLeft: 'auto' }}>ADM</span>
              </Link>
            )}

            <div className="mobile-menu-divider" />

            <a
              href="/reglamento.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-nav-link"
              style={{ textDecoration: 'none' }}
              onClick={closeMenu}
            >
              <span className="mobile-nav-icon">📄</span>
              Reglamento
            </a>

            <div className="mobile-menu-divider" />

            <button className="mobile-nav-link mobile-logout" onClick={handleLogout}>
              <span className="mobile-nav-icon">🚪</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}