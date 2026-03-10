import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ScoreEntry from '../components/ScoreEntry';
import RegistrationModal from '../components/RegistrationModal';

export default function EventDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stages');
  const [activeStage, setActiveStage] = useState(null);
  const [selectedSquadFilter, setSelectedSquadFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [rankings, setRankings] = useState([]);
  const [showAddStage, setShowAddStage] = useState(false);
  const [stageName, setStageName] = useState('');
  const [showAddSquad, setShowAddSquad] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [squadMembers, setSquadMembers] = useState([]);
  const [editingSquadId, setEditingSquadId] = useState(null);
  const [addMemberIds, setAddMemberIds] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [registering, setRegistering] = useState(false);

  // ---- helpers ----
  const getMyRegistration = (ev) =>
    ev?.registrations?.find(r => (r.user?._id || r.user) === user._id);

  const isRegistered = (ev) => Boolean(getMyRegistration(ev));

  const isLocked = (ev) => {
    if (!ev) return false;
    const d = new Date(ev.date);
    d.setHours(23, 59, 59, 999);
    return new Date() > d;
  };

  const isDeadlinePassed = (ev) => {
    if (!ev?.registrationDeadline) return false;
    const d = new Date(ev.registrationDeadline);
    d.setHours(23, 59, 59, 999);
    return new Date() > d;
  };

  const getAssignedIds = (excludeSquadId = null) => {
    const ids = new Set();
    event.squads.forEach(s => {
      if (excludeSquadId && s._id === excludeSquadId) return;
      s.members?.forEach(m => ids.add(m._id || m));
    });
    return ids;
  };

  // ---- data fetching ----
  const fetchEvent = async () => {
    const res = await API.get(`/events/${id}`);
    setEvent(res.data);
    if (res.data.stages.length > 0 && !activeStage) {
      setActiveStage(res.data.stages[0]._id);
    }
  };

  const fetchRankings = async () => {
    const res = await API.get(`/events/${id}/rankings`);
    setRankings(res.data);
  };

  useEffect(() => {
    Promise.all([fetchEvent(), fetchRankings()]).finally(() => setLoading(false));
  }, [id]);

  // ---- handlers ----
  const handleSaveScore = async (scoreData) => {
    setSaving(true);
    try {
      await API.post(`/events/${id}/stages/${activeStage}/scores`, scoreData);
      await fetchEvent();
      await fetchRankings();
      setMessage('✅ Puntuación guardada correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Error al guardar: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleAddStage = async () => {
    if (!stageName.trim()) return;
    try {
      const res = await API.post(`/events/${id}/stages`, { name: stageName });
      setEvent(res.data);
      const newStage = res.data.stages[res.data.stages.length - 1];
      setActiveStage(newStage._id);
      setStageName('');
      setShowAddStage(false);
    } catch (err) { alert('Error al crear etapa'); }
  };

  const handleAddSquad = async () => {
    if (!squadName.trim()) return;
    try {
      await API.post(`/events/${id}/squads`, { name: squadName, members: squadMembers });
      await fetchEvent();
      setSquadName(''); setSquadMembers([]); setShowAddSquad(false);
    } catch (err) { alert(err.response?.data?.message || 'Error al crear escuadra'); }
  };

  const handleUpdateSquadMembers = async (squadId, newMembers) => {
    try {
      await API.put(`/events/${id}/squads/${squadId}`, { members: newMembers });
      await fetchEvent();
      setEditingSquadId(null); setAddMemberIds([]);
    } catch (err) { alert(err.response?.data?.message || 'Error al actualizar escuadra'); }
  };

  const handleConfirmRegister = async ({ categoria, division }) => {
    setRegistering(true);
    try {
      await API.post(`/events/${id}/register`, { categoria, division });
      await fetchEvent();
      setShowRegModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al inscribirse');
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm('¿Cancelar inscripción?')) return;
    try {
      await API.delete(`/events/${id}/register/${user._id}`);
      await fetchEvent();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const statusLabel = { upcoming: 'Próximo', active: 'En curso', finished: 'Finalizado' };

  if (loading) return <div className="loading-center"><span className="spinner"></span></div>;
  if (!event) return <div className="page"><div className="alert alert-error">Evento no encontrado</div></div>;

  const currentStage = event.stages.find(s => s._id === activeStage);
  const allShooters = event.registrations?.map(r => r.user).filter(Boolean) || [];
  const myReg = getMyRegistration(event);
  const visibleRankings = isAdmin ? rankings : rankings.filter(r => r.shooter._id === user._id);

  // Shooters filtered by squad selection for score entry
  const shootersForEntry = selectedSquadFilter === 'all'
    ? allShooters
    : (event.squads.find(s => s._id === selectedSquadFilter)?.members || []);

  // Shooters already scored in current stage (to block them in selector)
  const scoredShooterIds = currentStage?.scores.filter(s => s.saved).map(s => s.shooter?._id || s.shooter) || [];

  return (
    <div className="page">
      {showRegModal && (
        <RegistrationModal
          existing={myReg}
          loading={registering}
          onConfirm={handleConfirmRegister}
          onCancel={() => setShowRegModal(false)}
        />
      )}

      {/* Event header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/events')} style={{ marginBottom: '0.75rem' }}>
          ← Volver
        </button>
        {isAdmin && isLocked(event) && (
          <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
            🔒 <strong>Evento bloqueado</strong> — La fecha del evento ya pasó. No se pueden realizar modificaciones.
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${event.status}`}>{statusLabel[event.status]}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(event.date)}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 }}>{event.name}</h1>
            {event.location && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>📍 {event.location}</div>}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Registration button - for everyone including admin */}
            {event.registrationDeadline && !myReg && (
              <span style={{ fontSize: '0.8rem', color: isDeadlinePassed(event) ? 'var(--red)' : 'var(--gold)', fontWeight: 600 }}>
                {isDeadlinePassed(event)
                  ? '🔒 Inscripciones cerradas'
                  : `📅 Cierre inscripciones: ${new Date(event.registrationDeadline).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`}
              </span>
            )}
            {event.status !== 'finished' && !isDeadlinePassed(event) && (
              myReg ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-active">✓ Inscripto</span>
                  <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{myReg.categoria}</span>
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>{myReg.division}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowRegModal(true)}>Cambiar</button>
                  <button className="btn btn-danger btn-sm" onClick={handleUnregister}>Cancelar</button>
                </div>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => setShowRegModal(true)}>
                  + Inscribirme al evento
                </button>
              )
            )}
            {myReg && event.status !== 'finished' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-active">✓ Inscripto</span>
                <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{myReg.categoria}</span>
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>{myReg.division}</span>
                {!isDeadlinePassed(event) && <button className="btn btn-outline btn-sm" onClick={() => setShowRegModal(true)}>Cambiar</button>}
                <button className="btn btn-danger btn-sm" onClick={handleUnregister}>Cancelar</button>
              </div>
            )}
            {isAdmin && !isLocked(event) && (
              <button className="btn btn-accent btn-sm" onClick={() => navigate(`/admin/events/${id}/edit`)}>
                Editar Evento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Tiradores', value: event.registrations?.length || 0 },
          { label: 'Etapas', value: event.stages?.length || 0 },
          { label: 'Escuadras', value: event.squads?.length || 0 },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ flex: '1', minWidth: '100px' }}>
            <div className="card-body" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'stages' ? 'active' : ''}`} onClick={() => setActiveTab('stages')}>
          🏁 Etapas {isAdmin && '/ Puntuación'}
        </button>
        <button className={`tab ${activeTab === 'squads' ? 'active' : ''}`} onClick={() => setActiveTab('squads')}>
          👥 Escuadras
        </button>
        <button className={`tab ${activeTab === 'rankings' ? 'active' : ''}`} onClick={() => setActiveTab('rankings')}>
          🏆 Clasificación
        </button>
      </div>

      {/* ==================== STAGES TAB ==================== */}
      {activeTab === 'stages' && (
        <div>
          <div className="stage-buttons">
            {event.stages.map((stage, i) => (
              <button
                key={stage._id}
                className={`btn ${activeStage === stage._id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveStage(stage._id)}
              >
                Etapa {i + 1}: {stage.name}
              </button>
            ))}
            {isAdmin && !isLocked(event) && (
              <button className="btn btn-gold btn-sm" onClick={() => setShowAddStage(true)}>
                + Agregar Etapa
              </button>
            )}
          </div>

          {showAddStage && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '200px' }}>
                    <label className="form-label">Nombre de la Etapa</label>
                    <input className="form-control" value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Ej: Pistola, Rifle, Larga distancia..." autoFocus />
                  </div>
                  <button className="btn btn-primary" onClick={handleAddStage}>Crear</button>
                  <button className="btn btn-outline" onClick={() => setShowAddStage(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {event.stages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏁</div>
              <div className="empty-state-text">No hay etapas creadas aún</div>
            </div>
          ) : !currentStage ? null : (
            <div className="grid-2">
              {/* Score entry - admin only, hidden when locked */}
              {isAdmin && !isLocked(event) && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">📝 Cargar Puntuación — {currentStage.name}</div>
                  </div>
                  <div className="card-body">
                    {message && (
                      <div className={`alert ${message.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
                        {message}
                      </div>
                    )}

                    {/* Squad filter */}
                    {event.squads.length > 0 && (
                      <div className="form-group">
                        <label className="form-label">Filtrar por escuadra</label>
                        <select
                          className="form-control"
                          value={selectedSquadFilter}
                          onChange={e => setSelectedSquadFilter(e.target.value)}
                        >
                          <option value="all">Todos los tiradores</option>
                          {event.squads.map((sq, i) => (
                            <option key={sq._id} value={sq._id}>
                              Escuadra {i + 1}: {sq.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <ScoreEntry
                      key={`${activeStage}-${selectedSquadFilter}`}
                      shooters={shootersForEntry}
                      scoredShooterIds={scoredShooterIds}
                      stageId={activeStage}
                      onSave={handleSaveScore}
                      saving={saving}
                    />
                  </div>
                </div>
              )}

              {/* Scores list for this stage */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📊 Resultados — {currentStage.name}</div>
                </div>
                <div className="table-container">
                  {currentStage.scores.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay puntuaciones cargadas aún</div>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Tirador</th>
                          <th>Tiempo</th>
                          <th>A</th>
                          <th>B</th>
                          <th>C</th>
                          <th>Pen</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentStage.scores
                          .filter(s => isAdmin || (s.shooter?._id || s.shooter) === user._id)
                          .sort((a, b) => a.total - b.total)
                          .map(score => (
                            <tr key={score._id}>
                              <td><strong>{score.shooter?.name || '—'}</strong></td>
                              <td>{parseFloat(score.time).toFixed(2)}</td>
                              <td>{score.a}</td>
                              <td>{score.b}</td>
                              <td>{score.c}</td>
                              <td>{score.penalty}</td>
                              <td><strong>{parseFloat(score.total).toFixed(2)}</strong></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SQUADS TAB ==================== */}
      {activeTab === 'squads' && (
        <div>
          {isAdmin && !isLocked(event) && (
            <div className="section-header">
              <div></div>
              <button className="btn btn-accent" onClick={() => setShowAddSquad(true)}>+ Nueva Escuadra</button>
            </div>
          )}

          {showAddSquad && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-header"><div className="card-title">Nueva Escuadra</div></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={squadName} onChange={e => setSquadName(e.target.value)} placeholder="Ej: Escuadra A" />
                </div>
                <div className="form-group">
                  <label className="form-label">Miembros</label>
                  {(() => {
                    const assignedIds = getAssignedIds();
                    const available = allShooters.filter(s => !assignedIds.has(s._id));
                    return available.length === 0 ? (
                      <div className="alert alert-info" style={{ marginBottom: 0 }}>Todos los tiradores inscriptos ya están asignados a una escuadra</div>
                    ) : (
                      <div className="user-list">
                        {available.map(s => (
                          <div
                            key={s._id}
                            className={`user-item ${squadMembers.includes(s._id) ? 'selected' : ''}`}
                            onClick={() => setSquadMembers(prev =>
                              prev.includes(s._id) ? prev.filter(id => id !== s._id) : [...prev, s._id]
                            )}
                          >
                            <div className="user-avatar">{s.name[0].toUpperCase()}</div>
                            <span>{s.name}</span>
                            {squadMembers.includes(s._id) && <span style={{ marginLeft: 'auto', color: 'var(--green)' }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" onClick={handleAddSquad}>Crear Escuadra</button>
                  <button className="btn btn-outline" onClick={() => setShowAddSquad(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {event.squads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">No hay escuadras creadas</div>
            </div>
          ) : (
            <div className="event-grid">
              {event.squads.map((squad, i) => {
                const currentMemberIds = squad.members?.map(m => m._id) || [];
                const assignedElsewhere = getAssignedIds(squad._id);
                const availableToAdd = allShooters.filter(s => !currentMemberIds.includes(s._id) && !assignedElsewhere.has(s._id));
                const isEditingThis = editingSquadId === squad._id;

                return (
                  <div key={squad._id} className="card">
                    <div className="card-header">
                      <div className="card-title">Escuadra {i + 1}: {squad.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{squad.members?.length || 0} miembros</span>
                        {isAdmin && !isLocked(event) && !isEditingThis && availableToAdd.length > 0 && (
                          <button className="btn btn-gold btn-sm" onClick={() => { setEditingSquadId(squad._id); setAddMemberIds([]); }}>
                            + Agregar tirador
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      {squad.members?.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Sin miembros asignados</div>
                      ) : (
                        squad.members?.map(m => (
                          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                              {m.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span style={{ fontSize: '0.9rem' }}>{m.name}</span>
                            {isAdmin && !isLocked(event) && (
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleUpdateSquadMembers(squad._id, currentMemberIds.filter(mid => mid !== m._id))}
                              >✕</button>
                            )}
                          </div>
                        ))
                      )}

                      {isAdmin && !isLocked(event) && isEditingThis && (
                        <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)' }}>
                          <div className="form-label" style={{ marginBottom: '0.5rem' }}>Seleccioná tiradores a agregar:</div>
                          {availableToAdd.length === 0 ? (
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay tiradores disponibles</div>
                          ) : (
                            <div className="user-list" style={{ maxHeight: '180px' }}>
                              {availableToAdd.map(s => (
                                <div
                                  key={s._id}
                                  className={`user-item ${addMemberIds.includes(s._id) ? 'selected' : ''}`}
                                  onClick={() => setAddMemberIds(prev =>
                                    prev.includes(s._id) ? prev.filter(id => id !== s._id) : [...prev, s._id]
                                  )}
                                >
                                  <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>{s.name[0].toUpperCase()}</div>
                                  <span style={{ fontSize: '0.875rem' }}>{s.name}</span>
                                  {addMemberIds.includes(s._id) && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 700 }}>✓</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <button className="btn btn-primary btn-sm" disabled={addMemberIds.length === 0} onClick={() => handleUpdateSquadMembers(squad._id, [...currentMemberIds, ...addMemberIds])}>
                              Guardar
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => { setEditingSquadId(null); setAddMemberIds([]); }}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== RANKINGS TAB ==================== */}
      {activeTab === 'rankings' && (
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">🏆 Clasificación General</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Menor puntaje = mejor posición</div>
            </div>
            {visibleRankings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏆</div>
                <div className="empty-state-text">No hay resultados disponibles aún</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tirador</th>
                      <th>Cat.</th>
                      <th>Div.</th>
                      {event.stages.map((s, i) => <th key={s._id}>Et. {i + 1}</th>)}
                      <th>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRankings.map((r, i) => {
                      const reg = event.registrations?.find(reg => (reg.user?._id || reg.user) === r.shooter._id);
                      return (
                        <tr key={r.shooter._id} style={r.shooter._id === user._id ? { background: 'rgba(42,125,79,0.05)' } : {}}>
                          <td>
                            <span className={`rank ${i < 3 ? `rank-${i + 1}` : ''}`}>
                              {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                            </span>
                          </td>
                          <td>
                            <strong>{r.shooter.name}</strong>
                            {r.shooter._id === user._id && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>YO</span>
                            )}
                          </td>
                          <td><span className="badge" style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.7rem' }}>{reg?.categoria || '—'}</span></td>
                          <td><span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>{reg?.division || '—'}</span></td>
                          {event.stages.map(s => (
                            <td key={s._id}>
                              {r.stageScores[s._id] !== undefined
                                ? parseFloat(r.stageScores[s._id]).toFixed(2)
                                : <span style={{ color: 'var(--text-light)' }}>—</span>}
                            </td>
                          ))}
                          <td>
                            <strong style={{ color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>
                              {r.average !== null ? r.average.toFixed(2) : '—'}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
