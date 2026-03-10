import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';

export default function AdminEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ name: '', date: '', registrationDeadline: '', description: '', location: '', status: 'upcoming' });
  const [allUsers, setAllUsers] = useState([]);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/users').then(res => setAllUsers(res.data));
    if (isEdit) {
      API.get(`/events/${id}`).then(res => {
        const ev = res.data;
        setForm({
          name: ev.name,
          date: ev.date?.slice(0, 10),
          registrationDeadline: ev.registrationDeadline?.slice(0, 10) || '',
          description: ev.description || '',
          location: ev.location || '',
          status: ev.status
        });
        setRegisteredIds(ev.registrations?.map(r => r.user?._id || r.user) || []);
      });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await API.put(`/events/${id}`, form);
        // Sync registrations: add new ones
        const current = (await API.get(`/events/${id}`)).data.registrations?.map(r => r.user?._id || r.user) || [];
        for (const uid of registeredIds) {
          if (!current.includes(uid)) await API.post(`/events/${id}/register`, { userId: uid, categoria: 'General', division: 'Stock' });
        }
        for (const uid of current) {
          if (!registeredIds.includes(uid)) await API.delete(`/events/${id}/register/${uid}`);
        }
        navigate(`/events/${id}`);
      } else {
        const res = await API.post('/events', form);
        const newId = res.data._id;
        for (const uid of registeredIds) {
          await API.post(`/events/${newId}/register`, { userId: uid });
        }
        navigate(`/events/${newId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (uid) => {
    setRegisteredIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="page" style={{ maxWidth: '700px' }}>
      <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>← Volver</button>
      <div className="section-header">
        <div className="section-title">{isEdit ? 'Editar Evento' : 'Nuevo Evento'}</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header"><div className="card-title">Información del Evento</div></div>
          <div className="card-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Nombre del Evento *</label>
              <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ej: Campeonato Regional 2025" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="upcoming">Próximo</option>
                  <option value="active">En curso</option>
                  <option value="finished">Finalizado</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Cierre de inscripciones</label>
              <input
                type="date"
                className="form-control"
                value={form.registrationDeadline}
                onChange={e => setForm({ ...form, registrationDeadline: e.target.value })}
                max={form.date || undefined}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Opcional. Si no se define, las inscripciones cierran con el evento.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Lugar</label>
              <input className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ej: Club de Tiro San Martín" />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Información adicional del evento..." />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">Tiradores Inscriptos</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{registeredIds.length} seleccionados</span>
          </div>
          <div className="card-body">
            {allUsers.length === 0 ? (
              <div className="alert alert-info">No hay usuarios registrados aún. <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/admin/users')} style={{ marginLeft: '0.5rem' }}>Gestionar usuarios</button></div>
            ) : (
              <div className="user-list">
                {allUsers.map(u => (
                  <div key={u._id} className={`user-item ${registeredIds.includes(u._id) ? 'selected' : ''}`} onClick={() => toggleUser(u._id)}>
                    <div className="user-avatar">{u.name[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                    {registeredIds.includes(u._id) && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 700 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, padding: '0.75rem' }}>
            {loading ? <><span className="spinner"></span> Guardando...</> : (isEdit ? '💾 Guardar Cambios' : '✅ Crear Evento')}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
