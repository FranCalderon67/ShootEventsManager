import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

// Converts DD/MM/AAAA display to YYYY-MM-DD for backend
function DateInput({ value, onChange }) {
  const toDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  };

  const [display, setDisplay] = React.useState(toDisplay(value));

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (raw.length <= 2) formatted = raw;
    else if (raw.length <= 4) formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    else formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
    setDisplay(formatted);
    if (raw.length === 8) {
      const d = raw.slice(0, 2), m = raw.slice(2, 4), y = raw.slice(4, 8);
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className="form-control"
      value={display}
      onChange={handleChange}
      placeholder="DD/MM/AAAA"
      maxLength={10}
      required
    />
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
  const { login } = useAuth();
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="/logo-login.png"
            alt="Tiro Federal Mendoza"
            style={{ height: '90px', width: 'auto', objectFit: 'contain', marginBottom: '0.75rem' }}
            onError={e => e.target.style.display = 'none'}
          />
          <div className="login-title">TIRO FEDERAL MENDOZA</div>
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
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <Link to="/reset-password" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
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
                  <DateInput value={fechaNacimiento} onChange={setFechaNacimiento} />
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
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}