import React, { useState, useEffect } from 'react';
import { calcCategoria as calcCategoriaUtil } from '../utils/calcCategoria';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ScoreEntry from '../components/ScoreEntry';
import ResultsTab from '../components/ResultsTab';
import RegistrationModal from '../components/RegistrationModal';
import PowerFactorTab from '../components/PowerFactorTab';

// Seeded pseudo-random shuffle — same stageId always produces same order
function seededShuffle(arr, seed) {
  const result = [...arr];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function stageToSeed(stageId) {
  if (!stageId) return 1;
  return stageId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

// Distribute unassigned shooters evenly across squads
function autoFillSquads(squads, unassigned) {
  if (!squads.length || !unassigned.length) return {};
  // Shuffle unassigned randomly
  const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
  // Build a map of squadId -> new members to add
  const additions = {};
  squads.forEach(s => { additions[s._id] = []; });
  // Distribute round-robin to keep squads balanced
  const counts = squads.map(s => s.members?.length || 0);
  shuffled.forEach(shooter => {
    // Find squad with fewest members (including pending additions)
    const idx = squads.reduce((minIdx, _, i) =>
      (counts[i] + additions[squads[i]._id].length) <
      (counts[minIdx] + additions[squads[minIdx]._id].length) ? i : minIdx, 0);
    additions[squads[idx]._id].push(shooter._id);
  });
  return additions;
}

export default function EventDetail() {
  const { id } = useParams();
  const { user, isAdmin, isOC } = useAuth();
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
  const [stageCartones, setStageCartones] = useState('');
  const [stageMetales, setStageMetales] = useState('');
  const [stagePdf, setStagePdf] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [editingStagePdf, setEditingStagePdf] = useState(null);
  const [showStageFile, setShowStageFile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAddSquad, setShowAddSquad] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [squadMembers, setSquadMembers] = useState([]);
  const [editingSquadId, setEditingSquadId] = useState(null);
  const [addMemberIds, setAddMemberIds] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [resultsTab, setResultsTab] = useState('general');
  const [registering, setRegistering] = useState(false);
  const [editingReg, setEditingReg] = useState(null);
  const [editingScore, setEditingScore] = useState(null);
  const [autoFilling, setAutoFilling] = useState(false);

  const getMyRegistration = (ev) =>
    ev?.registrations?.find(r => (r.user?._id || r.user) === user._id);

  const isRegistered = (ev) => Boolean(getMyRegistration(ev));

  const calcCategoria = () => calcCategoriaUtil(user?.genero, user?.fechaNacimiento, event?.date);

  const endOfDayUTC3 = (date) => {
    const d = new Date(date);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 3, 0, 0, 0);
  };

  const isLocked = (ev) => {
    if (!ev) return false;
    if (ev.status === 'finished') return true;
    return Date.now() > endOfDayUTC3(ev.date);
  };

  const isDeadlinePassed = (ev) => {
    if (!ev?.registrationDeadline) return false;
    return Date.now() > endOfDayUTC3(ev.registrationDeadline);
  };

  const getAssignedIds = (excludeSquadId = null) => {
    const ids = new Set();
    event.squads.forEach(s => {
      if (excludeSquadId && s._id === excludeSquadId) return;
      s.members?.forEach(m => ids.add(m._id || m));
    });
    return ids;
  };

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

  const handleSaveScore = async (scoreData) => {
    setSaving(true);
    try {
      const { manualDQ, ...scorePayload } = scoreData;
      await API.post(`/events/${id}/stages/${activeStage}/scores`, scorePayload);
      if (manualDQ) {
        await API.put(`/events/${id}/registrations/${scoreData.shooter}/dq`, { dq: true, dqReason: scoreData.dqReason || '' });
      }
      await fetchEvent();
      await fetchRankings();
      setMessage(scoreData.dq ? '🟥 Tirador descalificado y puntuación guardada' : '✅ Puntuación guardada correctamente');
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
      const formData = new FormData();
      formData.append('name', stageName);
      formData.append('cartones', stageCartones || 0);
      formData.append('metales', stageMetales || 0);
      if (stagePdf) formData.append('archivoPdf', stagePdf);
      const res = await API.post(`/events/${id}/stages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEvent(res.data);
      const newStage = res.data.stages[res.data.stages.length - 1];
      setActiveStage(newStage._id);
      setStageName(''); setStageCartones(''); setStageMetales(''); setStagePdf(null);
      setShowAddStage(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al crear etapa');
    }
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

  // Auto-fill squads with unassigned shooters
  const handleAutoFill = async () => {
    if (!event.squads.length) return alert('Primero creá las escuadras');
    const assignedIds = getAssignedIds();
    const allShootersLocal = event.registrations?.map(r => r.user).filter(Boolean) || [];
    const unassigned = allShootersLocal.filter(s => !assignedIds.has(s._id));
    if (!unassigned.length) return alert('Todos los tiradores ya están asignados a una escuadra');

    const additions = autoFillSquads(event.squads, unassigned);
    setAutoFilling(true);
    try {
      for (const squad of event.squads) {
        const newIds = additions[squad._id];
        if (!newIds?.length) continue;
        const currentIds = squad.members?.map(m => m._id) || [];
        await API.put(`/events/${id}/squads/${squad._id}`, { members: [...currentIds, ...newIds] });
      }
      await fetchEvent();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al autocompletar escuadras');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleAdminEditReg = async ({ categoria, division }) => {
    if (!editingReg) return;
    try {
      await API.put(`/events/${id}/registrations/${editingReg.userId}/categoria`, { categoria, division });
      await fetchEvent();
      await fetchRankings();
      setEditingReg(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar inscripción');
    }
  };

  const handleConfirmRegister = async ({ division, divisionAlternativa }) => {
    setRegistering(true);
    try {
      await API.post(`/events/${id}/register`, { division, divisionAlternativa: divisionAlternativa || null });
      await fetchEvent();
      setShowRegModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al inscribirse');
    } finally {
      setRegistering(false);
    }
  };

  const handleSaveEditedScore = async () => {
    if (!editingScore) return;
    setSaving(true);
    try {
      const { score } = editingScore;
      await API.post(`/events/${id}/stages/${activeStage}/scores`, {
        shooter: score.shooter?._id || score.shooter,
        time: parseFloat(score.time) || 0,
        a: score.a || 0, b: score.b || 0, c: score.c || 0, metal: score.metal || 0,
        noShoot: score.noShoot || 0, miss: score.miss || 0, procedural: score.procedural || 0,
        warnings: score.warnings || 0, dq: score.dq || false, division: score.division || null,
      });
      await fetchEvent();
      await fetchRankings();
      setEditingScore(null);
      setMessage('✅ Puntaje actualizado correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Error al actualizar: ' + (err.response?.data?.message || err.message));
    } finally { setSaving(false); }
  };

  const handleUnregister = async () => {
    if (!window.confirm('¿Cancelar inscripción?')) return;
    try {
      await API.delete(`/events/${id}/register/${user._id}`);
      await fetchEvent();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDeleteStage = async () => {
    if (!confirmDelete || confirmDelete.type !== 'stage') return;
    try {
      const res = await API.delete(`/events/${id}/stages/${confirmDelete.id}`);
      setEvent(res.data);
      setConfirmDelete(null);
      if (activeStage === confirmDelete.id) setActiveStage(res.data.stages[0]?._id || null);
    } catch (err) { alert(err.response?.data?.message || 'Error al eliminar etapa'); }
  };

  const handleDeleteSquad = async () => {
    if (!confirmDelete || confirmDelete.type !== 'squad') return;
    try {
      const res = await API.delete(`/events/${id}/squads/${confirmDelete.id}`);
      setEvent(res.data);
      setConfirmDelete(null);
    } catch (err) { alert(err.response?.data?.message || 'Error al eliminar escuadra'); }
  };

  const handleEditStage = async () => {
    if (!editingStage || !editingStage.name.trim()) return;
    try {
      const formData = new FormData();
      formData.append('name', editingStage.name);
      formData.append('cartones', editingStage.cartones || 0);
      formData.append('metales', editingStage.metales || 0);
      if (editingStagePdf) formData.append('archivoPdf', editingStagePdf);
      const res = await API.put(`/events/${id}/stages/${editingStage._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEvent(res.data);
      setEditingStage(null);
      setEditingStagePdf(null);
    } catch (err) { alert(err.response?.data?.message || 'Error al editar etapa'); }
  };

  const handleToggleDQ = async (userId, currentDq) => {
    const action = currentDq ? 'quitar la descalificación de' : 'descalificar a';
    const shooter = allShooters.find(s => s._id === userId);
    if (!window.confirm(`¿Querés ${action} ${shooter?.name || 'este tirador'}?`)) return;
    try {
      const res = await API.put(`/events/${id}/registrations/${userId}/dq`, { dq: !currentDq });
      setEvent(res.data);
      await fetchRankings();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar DQ');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const statusLabel = { upcoming: 'Próximo', active: 'En curso', finished: 'Finalizado' };

  if (loading) return <div className="loading-center"><span className="spinner"></span></div>;
  if (!event) return <div className="page"><div className="alert alert-error">Evento no encontrado</div></div>;

  const currentStage = event.stages.find(s => s._id === activeStage);
  const canScore = (isAdmin || isOC) && !isLocked(event);
  const allShooters = event.registrations?.map(r => r.user).filter(Boolean) || [];

  const CATEGORIAS = ['Junior', 'General', 'Senior', 'Super Senior', 'Grand Senior', 'Lady'];
  const DIVISIONES = ['Custom', 'Stock', 'Optic'];

  const adminEditModal = editingReg && (
    <div className="modal-overlay">
      <div className="modal" style={{ borderRadius: 'var(--radius-lg)', maxWidth: '420px', margin: '1rem' }}>
        <div className="modal-header">
          <div className="modal-title">✏️ Editar inscripción</div>
          <button className="modal-close" onClick={() => setEditingReg(null)}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Modificando inscripción de <strong>{allShooters.find(s => s._id === editingReg.userId)?.name}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {CATEGORIAS.map(c => (
                <button key={c} type="button" onClick={() => setEditingReg({ ...editingReg, categoria: c })}
                  style={{ padding: '0.625rem', border: `2px solid ${editingReg.categoria === c ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', background: editingReg.categoria === c ? 'var(--primary)' : '#fff', color: editingReg.categoria === c ? '#fff' : 'var(--text)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">División</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {DIVISIONES.map(d => (
                <button key={d} type="button" onClick={() => setEditingReg({ ...editingReg, division: d })}
                  style={{ padding: '0.625rem', border: `2px solid ${editingReg.division === d ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', background: editingReg.division === d ? 'var(--accent)' : '#fff', color: editingReg.division === d ? '#fff' : 'var(--text)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setEditingReg(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => handleAdminEditReg({ categoria: editingReg.categoria, division: editingReg.division })}
            disabled={!editingReg.categoria || !editingReg.division}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );

  const myReg = getMyRegistration(event);

  const baseShooters = selectedSquadFilter === 'all'
    ? allShooters
    : (event.squads.find(s => s._id === selectedSquadFilter)?.members || []);

  const shootersForEntry = seededShuffle(baseShooters, stageToSeed(activeStage));

  const scoredDivisionKeys = new Set(
    (currentStage?.scores || [])
      .filter(s => s.saved)
      .flatMap(s => {
        const uid = s.shooter?._id || s.shooter;
        if (s.division) return [`${uid}_${s.division}`];
        const reg = (event.registrations || []).find(r => (r.user?._id || r.user) === uid);
        if (reg?.division) return [`${uid}_${reg.division}`];
        return [uid];
      })
  );

  const scoredShooterIds = (() => {
    if (!currentStage?.scores) return [];
    const savedScores = currentStage.scores.filter(s => s.saved);
    return (event.registrations || [])
      .filter(reg => {
        const uid = reg.user?._id || reg.user;
        const shooterScores = savedScores.filter(s => (s.shooter?._id || s.shooter) === uid);
        if (shooterScores.length === 0) return false;
        if (!reg.divisionAlternativa) return true;
        const hasPrimary = shooterScores.some(s => s.division === reg.division || !s.division);
        const hasAlternative = shooterScores.some(s => s.division === reg.divisionAlternativa);
        return hasPrimary && hasAlternative;
      })
      .map(reg => reg.user?._id || reg.user);
  })();

  const dqShooterIds = new Set([
    ...event.stages.flatMap(stage =>
      stage.scores.filter(s => s.dq).map(s => s.shooter?._id || s.shooter)
    ),
    ...(event.registrations?.filter(r => r.dq).map(r => r.user?._id || r.user) || [])
  ]);

  const blockedShooterIds = [...new Set([...scoredShooterIds, ...dqShooterIds])];

  // Unassigned shooters count for autofill button
  const assignedAllIds = getAssignedIds();
  const unassignedCount = allShooters.filter(s => !assignedAllIds.has(s._id)).length;

  return (
    <div className="page">
      {/* Stage file viewer modal */}
      {showStageFile && currentStage?.archivoPdf && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '860px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>📄 {currentStage.name}</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a href={currentStage.archivoPdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>↗ Abrir en nueva pestaña</a>
                <button onClick={() => setShowStageFile(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {/\.(jpg|jpeg|png)$/i.test(currentStage.archivoPdf) ? (
                <img src={currentStage.archivoPdf} alt="Archivo de etapa" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              ) : (
                <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentStage.archivoPdf)}&embedded=true`} style={{ width: '100%', height: '75vh', border: 'none' }} title="Archivo de etapa" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit score modal */}
      {editingScore && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '1.5rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              ✏️ Editar puntaje — {editingScore.score.shooter?.name}
            </div>
            <div className="grid-2">
              {[
                { label: 'Tiempo (s)', field: 'time', step: '0.01' },
                { label: 'A', field: 'a' }, { label: 'B', field: 'b' }, { label: 'C', field: 'c' },
                { label: 'Metal', field: 'metal' }, { label: 'Miss', field: 'miss' },
                { label: 'No Shoot', field: 'noShoot' }, { label: 'F. Proc.', field: 'procedural' },
                { label: 'Advertencias', field: 'warnings' },
              ].map(({ label, field, step }) => (
                <div className="form-group" key={field}>
                  <label className="form-label">{label}</label>
                  <input type="text" inputMode={step ? 'decimal' : 'numeric'} className="form-control"
                    value={editingScore.score[field] ?? ''} onFocus={e => e.target.select()}
                    onChange={e => { const val = e.target.value; setEditingScore(prev => ({ ...prev, score: { ...prev.score, [field]: val === '' ? '' : (parseFloat(val) || 0) } })); }}
                    onBlur={e => { const val = parseFloat(e.target.value); setEditingScore(prev => ({ ...prev, score: { ...prev.score, [field]: isNaN(val) ? 0 : val } })); }}
                  />
                </div>
              ))}
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.875rem' }}>Total calculado</span>
              <strong style={{ color: '#166534', fontSize: '1.1rem' }}>
                {((parseFloat(editingScore.score.time) || 0) + ((editingScore.score.b || 0) * 1) + ((editingScore.score.c || 0) * 3) + (((editingScore.score.noShoot || 0) + (editingScore.score.miss || 0) + (editingScore.score.procedural || 0)) * 5)).toFixed(2)}
              </strong>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setEditingScore(null)} style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveEditedScore} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Guardando...' : '💾 Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}

      {adminEditModal}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.5rem' }}>🗑️ Eliminar {confirmDelete.type === 'stage' ? 'etapa' : 'escuadra'}</div>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 1.25rem', lineHeight: 1.5 }}>¿Eliminar <strong style={{ color: '#111827' }}>"{confirmDelete.name}"</strong>? Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmDelete.type === 'stage' ? handleDeleteStage : handleDeleteSquad} style={{ flex: 1, padding: '0.75rem', background: '#dc2626', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {editingStage && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', maxWidth: '480px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '1.25rem' }}>✏️ Editar etapa</div>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-control" value={editingStage.name} onChange={e => setEditingStage({ ...editingStage, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tarjetas</label>
                <input type="number" min="0" className="form-control" value={editingStage.cartones} onChange={e => setEditingStage({ ...editingStage, cartones: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Metales</label>
                <input type="number" min="0" className="form-control" value={editingStage.metales} onChange={e => setEditingStage({ ...editingStage, metales: e.target.value })} />
              </div>
            </div>
            {(editingStage.cartones || editingStage.metales) ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Impactos puntuables: <strong style={{ color: 'var(--primary)' }}>{(parseInt(editingStage.cartones) || 0) * 2 + (parseInt(editingStage.metales) || 0)}</strong>
              </div>
            ) : null}
            <div className="form-group">
              <label className="form-label">Archivo de etapa (PDF, JPG, PNG)</label>
              {editingStage.archivoPdf && !editingStagePdf && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>📎 Ya tiene archivo cargado — subí uno nuevo para reemplazarlo</div>
              )}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-control" style={{ padding: '0.4rem' }} onChange={e => setEditingStagePdf(e.target.files[0] || null)} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setEditingStage(null); setEditingStagePdf(null); }} style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleEditStage} disabled={!editingStage.name.trim()} style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {showRegModal && (
        <RegistrationModal existing={myReg} loading={registering} onConfirm={handleConfirmRegister} categoria={calcCategoria()} onCancel={() => setShowRegModal(false)} />
      )}

      {/* Event header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/events')} style={{ marginBottom: '0.75rem' }}>← Volver</button>
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
            {event.registrationDeadline && !myReg && (
              <span style={{ fontSize: '0.8rem', color: isDeadlinePassed(event) ? 'var(--red)' : 'var(--gold)', fontWeight: 600 }}>
                {isDeadlinePassed(event) ? '🔒 Inscripciones cerradas' : `📅 Cierre: ${new Date(event.registrationDeadline).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`}
              </span>
            )}
            {event.status !== 'finished' && (
              myReg ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-active">✓ Inscripto</span>
                  <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{myReg.categoria}</span>
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>{myReg.division}</span>
                  {!isDeadlinePassed(event) && <button className="btn btn-outline btn-sm" onClick={() => setShowRegModal(true)}>Cambiar</button>}
                  {!isDeadlinePassed(event) && <button className="btn btn-danger btn-sm" onClick={handleUnregister}>Cancelar</button>}
                  {isDeadlinePassed(event) && !isAdmin && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔒 Cambios solo por admin</span>}
                </div>
              ) : (
                !isDeadlinePassed(event) && <button className="btn btn-primary btn-sm" onClick={() => setShowRegModal(true)}>+ Inscribirme al evento</button>
              )
            )}
            {isAdmin && !isLocked(event) && <button className="btn btn-accent btn-sm" onClick={() => navigate(`/admin/events/${id}/edit`)}>Editar Evento</button>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[{ label: 'Tiradores', value: event.registrations?.length || 0 }, { label: 'Etapas', value: event.stages?.length || 0 }, { label: 'Escuadras', value: event.squads?.length || 0 }].map(stat => (
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
        <button className={`tab ${activeTab === 'stages' ? 'active' : ''}`} onClick={() => setActiveTab('stages')}>🏁 Etapas {canScore && '/ Puntuación'}</button>
        <button className={`tab ${activeTab === 'squads' ? 'active' : ''}`} onClick={() => setActiveTab('squads')}>👥 Escuadras</button>
        <button className={`tab ${activeTab === 'rankings' ? 'active' : ''}`} onClick={() => setActiveTab('rankings')}>🏆 Resultados</button>
        {(isAdmin || isOC) && <button className={`tab ${activeTab === 'powerfactor' ? 'active' : ''}`} onClick={() => setActiveTab('powerfactor')}>⚖️ Factor de Potencia</button>}
      </div>

      {/* ==================== STAGES TAB ==================== */}
      {activeTab === 'stages' && (
        <div>
          <div className="stage-buttons">
            {event.stages.map((stage, i) => (
              <div key={stage._id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button className={`btn ${activeStage === stage._id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveStage(stage._id)}>{stage.name}</button>
                {isAdmin && !isLocked(event) && (
                  <>
                    <button onClick={() => { setEditingStage({ _id: stage._id, name: stage.name, cartones: stage.cartones || 0, metales: stage.metales || 0, archivoPdf: stage.archivoPdf }); setEditingStagePdf(null); }} title="Editar etapa" style={{ padding: '0.3rem 0.5rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>✏️</button>
                    <button onClick={() => setConfirmDelete({ type: 'stage', id: stage._id, name: stage.name })} title="Eliminar etapa" style={{ padding: '0.3rem 0.5rem', background: 'transparent', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>🗑️</button>
                  </>
                )}
              </div>
            ))}
            {isAdmin && !isLocked(event) && <button className="btn btn-gold btn-sm" onClick={() => setShowAddStage(true)}>+ Agregar Etapa</button>}
          </div>

          {showAddStage && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0, minWidth: '200px' }}>
                    <label className="form-label">Nombre de la Etapa</label>
                    <input className="form-control" value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Ej: Pistola, Rifle, Larga distancia..." autoFocus />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '90px' }}>
                    <label className="form-label">Tarjetas</label>
                    <input type="number" min="0" className="form-control" value={stageCartones} onChange={e => setStageCartones(e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '90px' }}>
                    <label className="form-label">Metales</label>
                    <input type="number" min="0" className="form-control" value={stageMetales} onChange={e => setStageMetales(e.target.value)} placeholder="0" />
                  </div>
                </div>
                {(stageCartones || stageMetales) ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                    Impactos puntuables: <strong style={{ color: 'var(--primary)' }}>{(parseInt(stageCartones) || 0) * 2 + (parseInt(stageMetales) || 0)}</strong>
                    <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>({stageCartones || 0} tarjetas × 2 + {stageMetales || 0} metales × 1)</span>
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0, minWidth: '200px' }}>
                    <label className="form-label">Archivo de etapa (PDF, JPG, PNG)</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-control" onChange={e => setStagePdf(e.target.files[0] || null)} style={{ padding: '0.4rem' }} />
                  </div>
                  <button className="btn btn-primary" onClick={handleAddStage} disabled={!stageName.trim()}>Crear</button>
                  <button className="btn btn-outline" onClick={() => { setShowAddStage(false); setStagePdf(null); }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {event.stages.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🏁</div><div className="empty-state-text">No hay etapas creadas aún</div></div>
          ) : !currentStage ? null : !canScore ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">📄 {currentStage.name}</div>
                {currentStage.archivoPdf && <a href={currentStage.archivoPdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>↗ Abrir en nueva pestaña</a>}
              </div>
              <div className="card-body" style={{ padding: currentStage.archivoPdf ? '0' : '2rem', textAlign: 'center' }}>
                {currentStage.archivoPdf ? (
                  /\.(jpg|jpeg|png)$/i.test(currentStage.archivoPdf) ? (
                    <img src={currentStage.archivoPdf} alt="Archivo de etapa" style={{ width: '100%', borderRadius: '0 0 var(--radius) var(--radius)', display: 'block' }} />
                  ) : (
                    <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentStage.archivoPdf)}&embedded=true`} style={{ width: '100%', height: '600px', border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }} title="Archivo de etapa" />
                  )
                ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay archivo disponible para esta etapa.</p>}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                {currentStage.cartones > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📋 <strong style={{ color: 'var(--text)' }}>{currentStage.cartones}</strong> tarjetas</span>}
                {currentStage.metales > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🎯 <strong style={{ color: 'var(--text)' }}>{currentStage.metales}</strong> metales</span>}
                {currentStage.impactosPuntuables > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>✓ {currentStage.impactosPuntuables} impactos puntuables</span>}
                {currentStage.archivoPdf && <button onClick={() => setShowStageFile(true)} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>📄 Ver etapa</button>}
              </div>
              <div className="grid-2">
                {canScore && !isLocked(event) && (
                  <div className="card">
                    <div className="card-header"><div className="card-title">📝 Cargar Puntuación — {currentStage.name}</div></div>
                    <div className="card-body">
                      {message && <div className={`alert ${message.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{message}</div>}
                      {event.squads.length > 0 && (
                        <div className="form-group">
                          <label className="form-label">Filtrar por escuadra</label>
                          <select className="form-control" value={selectedSquadFilter} onChange={e => setSelectedSquadFilter(e.target.value)}>
                            <option value="all">Todos los tiradores</option>
                            {event.squads.map((sq, i) => <option key={sq._id} value={sq._id}>Escuadra {i + 1}: {sq.name}</option>)}
                          </select>
                        </div>
                      )}
                      <ScoreEntry impactosPuntuables={currentStage?.impactosPuntuables || 0} key={`${activeStage}-${selectedSquadFilter}`} shooters={shootersForEntry} scoredShooterIds={blockedShooterIds} dqShooterIds={[...dqShooterIds]} stageId={activeStage} onSave={handleSaveScore} saving={saving} stageName={currentStage?.name} stageIndex={event.stages.findIndex(s => s._id === activeStage)} registrations={event.registrations || []} scoredDivisionKeys={scoredDivisionKeys} />
                    </div>
                  </div>
                )}
                <div className="card">
                  <div className="card-header"><div className="card-title">📊 Resultados — {currentStage.name}</div></div>
                  <div className="table-container">
                    {currentStage.scores.length === 0 ? (
                      <div className="empty-state" style={{ padding: '2rem' }}><div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay puntuaciones cargadas aún</div></div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Tirador</th><th>Tiempo</th><th>A</th><th>B</th><th>C</th>
                            <th title="No Shoot">NS</th><th title="Miss">Miss</th><th title="Falta de Procedimiento">FP</th>
                            <th title="Advertencias">Adv</th><th>Total</th>
                            {canScore && !isLocked(event) && <th></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {currentStage.scores.filter(s => isAdmin || (s.shooter?._id || s.shooter) === user._id).sort((a, b) => a.total - b.total).map(score => (
                            <tr key={score._id}>
                              <td><strong>{score.shooter?.name || '—'}</strong></td>
                              <td>{parseFloat(score.time).toFixed(2)}</td>
                              <td>{score.a}</td><td>{score.b}</td><td>{score.c}</td>
                              <td>{score.noShoot ?? 0}</td><td>{score.miss ?? 0}</td><td>{score.procedural ?? 0}</td>
                              <td>{score.warnings > 0 ? (score.dq ? '🟥' : '🟨'.repeat(score.warnings)) : '—'}</td>
                              <td><strong style={score.dq ? { color: 'var(--red)' } : {}}>{score.dq ? 'DQ' : parseFloat(score.total).toFixed(2)}</strong></td>
                              {canScore && !isLocked(event) && (
                                <td><button onClick={() => setEditingScore({ score: { ...score } })} style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }} title="Editar puntaje">✏️</button></td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== SQUADS TAB ==================== */}
      {activeTab === 'squads' && (
        <div>
          {isAdmin && !isLocked(event) && (
            <div className="section-header">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Autofill button — only when there are squads and unassigned shooters */}
                {event.squads.length > 0 && unassignedCount > 0 && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleAutoFill}
                    disabled={autoFilling}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    title={`${unassignedCount} tirador${unassignedCount !== 1 ? 'es' : ''} sin escuadra`}
                  >
                    {autoFilling ? <><span className="spinner"></span> Asignando...</> : `🔀 Autocompletar (${unassignedCount})`}
                  </button>
                )}
              </div>
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
                          <div key={s._id} className={`user-item ${squadMembers.includes(s._id) ? 'selected' : ''}`}
                            onClick={() => setSquadMembers(prev => prev.includes(s._id) ? prev.filter(id => id !== s._id) : [...prev, s._id])}>
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
            <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">No hay escuadras creadas</div></div>
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
                          <button className="btn btn-gold btn-sm" onClick={() => { setEditingSquadId(squad._id); setAddMemberIds([]); }}>+ Agregar tirador</button>
                        )}
                        {isAdmin && !isLocked(event) && (
                          <button onClick={() => setConfirmDelete({ type: 'squad', id: squad._id, name: squad.name })} title="Eliminar escuadra" style={{ padding: '0.2rem 0.4rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>🗑️</button>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      {squad.members?.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Sin miembros asignados</div>
                      ) : (
                        squad.members?.map(m => (
                          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>{m.name?.[0]?.toUpperCase() || '?'}</div>
                            <span style={{ fontSize: '0.9rem' }}>{m.name}</span>
                            {isAdmin && !isLocked(event) && (
                              <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleUpdateSquadMembers(squad._id, currentMemberIds.filter(mid => mid !== m._id))}>✕</button>
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
                                <div key={s._id} className={`user-item ${addMemberIds.includes(s._id) ? 'selected' : ''}`}
                                  onClick={() => setAddMemberIds(prev => prev.includes(s._id) ? prev.filter(id => id !== s._id) : [...prev, s._id])}>
                                  <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>{s.name?.[0]?.toUpperCase() || '?'}</div>
                                  <span style={{ fontSize: '0.875rem' }}>{s.name}</span>
                                  {addMemberIds.includes(s._id) && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontWeight: 700 }}>✓</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <button className="btn btn-primary btn-sm" disabled={addMemberIds.length === 0} onClick={() => handleUpdateSquadMembers(squad._id, [...currentMemberIds, ...addMemberIds])}>Guardar</button>
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

      {/* ==================== POWER FACTOR TAB ==================== */}
      {activeTab === 'powerfactor' && (
        <PowerFactorTab
          event={event}
          isAdmin={isAdmin}
          isOC={isOC}
          onEventUpdate={fetchEvent}
        />
      )}

      {/* ==================== RESULTS TAB ==================== */}
      {activeTab === 'rankings' && (
        <ResultsTab event={event} rankings={rankings} user={user} isAdmin={isAdmin} resultsTab={resultsTab} setResultsTab={setResultsTab} setEditingReg={setEditingReg} />
      )}
    </div>
  );
}
