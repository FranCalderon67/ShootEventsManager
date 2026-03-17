import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import RegistrationModal from '../components/RegistrationModal';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEvent, setModalEvent] = useState(null); // event being registered to
  const [deleteEvent, setDeleteEvent] = useState(null); // event to delete
  const [registering, setRegistering] = useState(false);
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const fetchEvents = () =>
    API.get('/events').then(res => {
      setEvents(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));

  useEffect(() => { fetchEvents(); }, []);

  const getMyRegistration = (event) =>
    event.registrations?.find(r => (r.user?._id || r.user) === user._id);

  const isRegistered = (event) => Boolean(getMyRegistration(event));

  const endOfDayUTC3 = (date) => {
    const d = new Date(date);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 3, 0, 0, 0);
  };

  const isDeadlinePassed = (event) => {
    if (!event.registrationDeadline) return false;
    return Date.now() > endOfDayUTC3(event.registrationDeadline);
  };

  const handleRegisterClick = (e, event) => {
    e.stopPropagation();
    setModalEvent(event);
  };

  const handleUnregister = async (e, event) => {
    e.stopPropagation();
    if (!window.confirm('¿Cancelar inscripción?')) return;
    try {
      await API.delete(`/events/${event._id}/register/${user._id}`);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const handleConfirmRegister = async ({ categoria, division }) => {
    setRegistering(true);
    try {
      await API.post(`/events/${modalEvent._id}/register`, { categoria, division });
      setModalEvent(null);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al inscribirse');
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteEvent = (e, event) => {
    e.stopPropagation();
    setDeleteEvent(event);
  };

  const handleConfirmDelete = async () => {
    try {
      await API.delete(`/events/${deleteEvent._id}`);
      setDeleteEvent(null);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el evento');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const statusLabel = { upcoming: 'Próximo', active: 'En curso', finished: 'Finalizado' };

  if (loading) return <div className="loading-center"><span className="spinner"></span></div>;

  return (
    <div className="page">
      {modalEvent && (
        <RegistrationModal
          existing={getMyRegistration(modalEvent)}
          loading={registering}
          onConfirm={handleConfirmRegister}
          onCancel={() => setModalEvent(null)}
        />
      )}

      {deleteEvent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', maxWidth: '420px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.4rem' }}>
                🗑️ Eliminar evento
              </div>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                ¿Estás seguro que querés eliminar <strong style={{ color: '#111827' }}>"{deleteEvent.name}"</strong>? Esta acción no se puede deshacer y se perderán todos los datos del evento.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setDeleteEvent(null)}
                style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '0.75rem', background: '#dc2626', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section-header">
        <div>
          <div className="section-title">Eventos</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {events.length} evento{events.length !== 1 ? 's' : ''} disponible{events.length !== 1 ? 's' : ''}
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-accent" onClick={() => navigate('/admin/events/new')}>
            + Nuevo Evento
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-text">No hay eventos creados aún</div>
        </div>
      ) : (
        <div className="event-grid">
          {events.map(event => {
            const myReg = getMyRegistration(event);
            const registered = Boolean(myReg);
            const finished = event.status === 'finished';
            const totalShooters = event.registrations?.length ?? event.registeredUsers?.length ?? 0;

            return (
              <div key={event._id} className="card event-card" onClick={() => navigate(`/events/${event._id}`)}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className={`badge badge-${event.status}`}>{statusLabel[event.status]}</span>
                      {event.isPrivate && <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.68rem' }}>🔒 Privado</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalShooters} tiradores</span>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteEvent(e, event)}
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 'var(--radius)' }}
                          title="Eliminar evento"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="event-date">{formatDate(event.date)}</div>
                  <div className="event-name">{event.name}</div>
                  {event.location && <div className="event-meta">📍 {event.location}</div>}
                  {event.description && <div className="event-meta" style={{ marginTop: '0.5rem' }}>{event.description}</div>}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>🏁 {event.stages?.length || 0} etapas</span>
                    <span>👥 {event.squads?.length || 0} escuadras</span>
                    {event.registrationDeadline && (
                      <span style={{ color: isDeadlinePassed(event) ? 'var(--red)' : 'var(--gold)' }}>
                        {isDeadlinePassed(event) ? '🔒 Inscripciones cerradas' : `📅 Cierre: ${new Date(event.registrationDeadline).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`}
                      </span>
                    )}
                  </div>

                  {/* Registration area */}
                  {!finished && isDeadlinePassed(event) && !isRegistered(event) && (
                    <div style={{ marginTop: '0.875rem', fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>
                      🔒 El plazo de inscripción cerró
                    </div>
                  )}
                  {!finished && !isDeadlinePassed(event) && (
                    <div style={{ marginTop: '0.875rem' }}>
                      {registered ? (
                        <div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span className="badge badge-active">✓ Inscripto</span>
                            <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{myReg.categoria}</span>
                            <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>{myReg.division}</span>
                            {myReg.isOC && <span className="badge" style={{ background: '#d97706', color: '#fff' }}>🏅 OC</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ flex: 1 }}
                              onClick={(e) => handleRegisterClick(e, event)}
                            >
                              Cambiar cat/div
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={(e) => handleUnregister(e, event)}
                            >
                              Cancelar inscripción
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                          onClick={(e) => handleRegisterClick(e, event)}
                        >
                          + Inscribirme
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
