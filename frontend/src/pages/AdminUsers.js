import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchUsers = () => API.get('/users').then(res => setUsers(res.data));

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.post('/users', form);
      setSuccess('Usuario creado correctamente');
      setForm({ name: '', email: '', password: '', role: 'user' });
      setShowForm(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser._id) return alert('No podés eliminar tu propia cuenta');
    if (!window.confirm('¿Eliminar este usuario?')) return;
    await API.delete(`/users/${id}`);
    fetchUsers();
  };

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Gestión de Usuarios</div>
        <button className="btn btn-accent" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancelar' : '+ Nuevo Usuario'}
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><div className="card-title">Crear Usuario</div></div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Nombre completo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="email@ejemplo.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input type="password" className="form-control" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
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
                    {u._id !== currentUser._id && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>
                        Eliminar
                      </button>
                    )}
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
