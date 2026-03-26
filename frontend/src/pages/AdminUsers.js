import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'user', genero: '', fechaNacimiento: '' };


// Converts YYYY-MM-DD to DD/MM/AAAA for display
const toDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

// Custom date input - numeric keyboard on mobile, auto-inserts slashes
function DateInput({ value, onChange }) {
  const [display, setDisplay] = React.useState(toDisplay(value));

  React.useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (raw.length <= 2) {
      formatted = raw;
    } else if (raw.length <= 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    } else {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
    }
    setDisplay(formatted);
    // Convert to ISO only when complete
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
    />
  );
}

// Defined OUTSIDE AdminUsers so React doesn't remount it on every render
function UserForm({ title, data, onChange, onSubmit, onCancel, isEdit, loading }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header"><div className="card-title">{title}</div></div>
      <div className="card-body">
        <form onSubmit={onSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-control" value={data.name} onChange={e => onChange('name', e.target.value)} required placeholder="Nombre completo" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={data.email} onChange={e => onChange('email', e.target.value)} required placeholder="email@ejemplo.com" />
            </div>
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input type="password" className="form-control" value={data.password} onChange={e => onChange('password', e.target.value)} required placeholder="Mínimo 6 caracteres" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-control" value={data.role} onChange={e => onChange('role', e.target.value)}>
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Género</label>
              <select className="form-control" value={data.genero} onChange={e => onChange('genero', e.target.value)}>
                <option value="">— Seleccionar —</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de nacimiento</label>
              <DateInput
                value={data.fechaNacimiento}
                onChange={v => onChange('fechaNacimiento', v)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? '💾 Guardar cambios' : 'Crear Usuario'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchUsers = () => API.get('/users').then(res => setUsers(res.data));
  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('/users', form);
      setSuccess('Usuario creado correctamente');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear usuario');
    } finally { setLoading(false); }
  };

  const handleEdit = (u) => {
    setEditingUser({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      genero: u.genero || '',
      fechaNacimiento: u.fechaNacimiento ? u.fechaNacimiento.slice(0, 10) : '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.put(`/users/${editingUser._id}`, editingUser);
      setSuccess('Usuario actualizado correctamente');
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar usuario');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (id === currentUser._id) return alert('No podés eliminar tu propia cuenta');
    if (!window.confirm('¿Eliminar este usuario?')) return;
    await API.delete(`/users/${id}`);
    fetchUsers();
  };

  const handleToggleOC = async (u) => {
    try {
      const res = await API.put(`/users/${u._id}/oc`, { isOC: !u.isOC });
      setUsers(users.map(x => x._id === u._id ? res.data : x));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar OC');
    }
  };

  return (
    <div className="page">
      {/* Edit modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '1.5rem', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <UserForm
              title={`✏️ Editar — ${editingUser.name}`}
              data={editingUser}
              onChange={(f, v) => setEditingUser({ ...editingUser, [f]: v })}
              onSubmit={handleSaveEdit}
              onCancel={() => setEditingUser(null)}
              isEdit={true}
              loading={loading}
            />
          </div>
        </div>
      )}

      <div className="section-header">
        <div className="section-title">Gestión de Usuarios</div>
        <button className="btn btn-accent" onClick={() => { setShowForm(!showForm); setError(''); }}>
          {showForm ? '✕ Cancelar' : '+ Nuevo Usuario'}
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <UserForm
          title="Crear Usuario"
          data={form}
          onChange={(f, v) => setForm({ ...form, [f]: v })}
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); }}
          isEdit={false}
          loading={loading}
        />
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>OC</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <strong>{u.name}</strong>
                      {u._id === currentUser._id && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>YO</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-active' : 'badge-upcoming'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    {u.role !== 'admin' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', justifyContent: 'center' }}>
                        <input type="checkbox" checked={u.isOC || false} onChange={() => handleToggleOC(u)} style={{ width: '16px', height: '16px', accentColor: '#d97706', cursor: 'pointer' }} />
                        {u.isOC && <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>🏅</span>}
                      </label>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(u)}>✏️ Editar</button>
                      {u._id !== currentUser._id && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>Eliminar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}