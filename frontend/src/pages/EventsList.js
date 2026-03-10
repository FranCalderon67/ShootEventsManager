import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import RegistrationModal from '../components/RegistrationModal';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEvent, setModalEvent] = useState(null); // event being registered to
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

  const isDeadlinePassed = (event) => {
    if (!event.registrationDeadline) return false;
    const d = new Date(event.registrationDeadline);
    d.setHours(23, 59, 59, 999);
    return new Date() > d;
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
                    <span className={`badge badge-${event.status}`}>{statusLabel[event.status]}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalShooters} tiradores</span>
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
                              Cancelar
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
