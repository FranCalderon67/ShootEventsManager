import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const calcCategoria = (genero, fechaNacimiento) => {
  if (!genero || !fechaNacimiento) return null;
  if (genero === 'Femenino') return 'Lady';
  const birth = new Date(fechaNacimiento);
  const ref = new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  if (age < 21) return 'Junior';
  if (age >= 70) return 'Grand Senior';
  if (age >= 65) return 'Super Senior';
  if (age >= 55) return 'Senior';
  return 'General';
};

const CATEGORIA_COLORS = {
  'Lady':        { bg: '#fdf2f8', border: '#f9a8d4', color: '#9d174d' },
  'Junior':      { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' },
  'General':     { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
  'Senior':      { bg: '#fffbeb', border: '#fcd34d', color: '#92400e' },
  'Super Senior':{ bg: '#fff7ed', border: '#fdba74', color: '#9a3412' },
  'Grand Senior':{ bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    genero: user?.genero || '',
    fechaNacimiento: user?.fechaNacimiento ? user.fechaNacimiento.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const categoria = calcCategoria(user?.genero, user?.fechaNacimiento);
  const catStyle = categoria ? CATEGORIA_COLORS[categoria] : null;

  const calcAge = (fecha) => {
    if (!fecha) return null;
    const birth = new Date(fecha);
    const ref = new Date();
    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await API.put('/users/me', form);
      setUser(res.data);
      setEditing(false);
      setMessage('✅ Perfil actualizado correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const age = calcAge(user?.fechaNacimiento);

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Mi Perfil</div>
        {!editing && (
          <button className="btn btn-accent" onClick={() => { setEditing(true); setMessage(''); }}>
            ✏️ Editar
          </button>
        )}
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Categoria badge */}
      {categoria && (
        <div style={{
          background: catStyle.bg, border: `2px solid ${catStyle.border}`,
          borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <span style={{ fontSize: '2.5rem' }}>🎯</span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: catStyle.color, opacity: 0.7 }}>
              Categoría asignada
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: catStyle.color, lineHeight: 1.2 }}>
              {categoria}
            </div>
            {age !== null && (
              <div style={{ fontSize: '0.8rem', color: catStyle.color, opacity: 0.7, marginTop: '0.15rem' }}>
                {age} años · {user.genero}
              </div>
            )}
          </div>
        </div>
      )}

      {!categoria && (
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          ⚠️ Completá tu género y fecha de nacimiento para que el sistema asigne tu categoría automáticamente.
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Datos personales</div>
        </div>
        <div className="card-body">
          {editing ? (
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre completo</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={user?.email} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Género</label>
                  <select className="form-control" value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })} required>
                    <option value="">— Seleccionar —</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de nacimiento</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.fechaNacimiento}
                    onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner"></span> Guardando...</> : '💾 Guardar cambios'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setError(''); }}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="grid-2">
              {[
                { label: 'Nombre', value: user?.name },
                { label: 'Email', value: user?.email },
                { label: 'Género', value: user?.genero || '—' },
                { label: 'Fecha de nacimiento', value: user?.fechaNacimiento ? new Date(user.fechaNacimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                { label: 'Edad', value: age !== null ? `${age} años` : '—' },
                { label: 'Rol', value: user?.role === 'admin' ? 'Administrador' : user?.isOC ? 'Oficial de Campo' : 'Tirador' },
              ].map(({ label, value }) => (
                <div key={label} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
