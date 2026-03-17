import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

// Separate component so useGoogleLogin hook is only called when clientId exists
function GoogleButton({ onSuccess, onError, loading }) {
  const { useGoogleLogin } = require('@react-oauth/google');
  const signIn = useGoogleLogin({ onSuccess, onError });
  return (
    <>
      <button
        onClick={() => signIn()}
        disabled={loading}
        style={{
          width: '100%', padding: '0.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          background: '#fff', border: '1.5px solid #dadce0',
          borderRadius: 'var(--radius)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 600,
          fontSize: '0.9rem', color: '#3c4043',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s', marginBottom: '1rem',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
      >
        {loading ? (
          <span className="spinner" style={{ borderColor: '#4285f4', borderTopColor: 'transparent' }}></span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.51 10.53c-.16-.48-.25-.99-.25-1.53s.09-1.05.25-1.53V5.4H1.83a8 8 0 0 0 0 7.2l2.68-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.47c.64-1.87 2.4-3.29 4.48-3.29z"/>
          </svg>
        )}
        {loading ? 'Conectando...' : 'Continuar con Google'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>O</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
    </>
  );
}

export default function Login() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [genero, setGenero] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const resetForm = () => {
    setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setError('');
  };

  const switchMode = (newMode) => { setMode(newMode); resetForm(); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/events');
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales incorrectas');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    setLoading(true);
    try {
      await API.post('/auth/register', { name, email, password, role: 'user', genero, fechaNacimiento });
      await login(email, password);
      navigate('/events');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setGoogleLoading(true);
    setError('');
    try {
      // Exchange access token for ID token via userinfo
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      }).then(r => r.json());

      const res = await API.post('/auth/google-token', {
        googleId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/events');
    } catch (err) {
      setError('Error al iniciar sesión con Google');
    } finally { setGoogleLoading(false); }
  };

  const hasGoogleClientId = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="/logo-login.png"
            alt="Tiro Federal Mendoza"
            style={{ height: '90px', width: 'auto', objectFit: 'contain', marginBottom: '0.75rem' }}
            onError={e => e.target.style.display='none'}
          />
          <div className="login-title">TIRO FEDERAL MENDOZA</div>
          <div className="login-subtitle">Sistema de Gestión de Eventos</div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-alt)', borderRadius: 'var(--radius)', padding: '4px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '0.5rem', border: 'none',
                borderRadius: 'calc(var(--radius) - 2px)',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.9rem', letterSpacing: '0.04em', cursor: 'pointer',
                transition: 'all 0.15s',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-muted)',
              }}
            >
              {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="card-body">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Google button */}
                        {hasGoogleClientId && (
              <GoogleButton
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Error al conectar con Google')}
                loading={googleLoading}
              />
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input type="password" className="form-control" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }} disabled={loading}>
                  {loading ? <><span className="spinner"></span> Ingresando...</> : 'Iniciar Sesión'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Nombre completo</label>
                  <input type="text" className="form-control" placeholder="Juan Pérez" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Género</label>
                  <select className="form-control" value={genero} onChange={e => setGenero(e.target.value)} required>
                    <option value="">— Seleccionar —</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de nacimiento</label>
                  <input type="date" className="form-control" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input type="password" className="form-control" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar contraseña</label>
                  <input type="password" className="form-control" placeholder="Repetí la contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }} disabled={loading}>
                  {loading ? <><span className="spinner"></span> Registrando...</> : 'Crear Cuenta'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '0.875rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Tu cuenta será de tipo <strong>usuario</strong>. El admin te asignará a los eventos.
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
