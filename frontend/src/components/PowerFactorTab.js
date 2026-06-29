import React, { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

const MIN_PF = 125;

function PowerFactorEntry({ registration, eventId, onSaved, locked }) {
  const user = registration.user;
  const pf = registration.powerFactor || {};

  // Local state — avoids losing data on every keystroke
  const [velocidades, setVelocidades] = useState(
    Array.from({ length: 8 }, (_, i) => pf.velocidades?.[i] ?? '')
  );
  const [peso, setPeso] = useState(pf.pesoProyectil ?? '');
  const [saving, setSaving] = useState(false);
  const [localResult, setLocalResult] = useState(null);

  // Recalculate preview whenever inputs change
  useEffect(() => {
    const vels = velocidades.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
    const p = parseFloat(peso);
    if (vels.length >= 3 && !isNaN(p) && p > 0) {
      const avg = vels.reduce((a, b) => a + b, 0) / vels.length;
      setLocalResult(Math.floor(p * avg / 1000));
    } else {
      setLocalResult(null);
    }
  }, [velocidades, peso]);

  const handleVelocidad = (i, val) => {
    setVelocidades(prev => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const handleSave = async (finalizar = false) => {
    setSaving(true);
    try {
      const vels = velocidades.map(v => parseFloat(v) || 0);
      await API.put(`/events/${eventId}/registrations/${user._id}/powerfactor`, {
        velocidades: vels,
        pesoProyectil: parseFloat(peso) || null,
        finalizar,
      });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const velsFilled = velocidades.filter(v => parseFloat(v) > 0).length;
  const canFinalize = velsFilled >= 3 && parseFloat(peso) > 0;

  const resultColor = localResult === null ? 'var(--text-muted)'
    : localResult >= MIN_PF ? '#166534' : '#dc2626';

  if (pf.medido) {
    return (
      <div style={{
        padding: '0.875rem 1rem',
        background: pf.aprobado ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${pf.aprobado ? '#86efac' : '#fca5a5'}`,
        borderRadius: 'var(--radius)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'
      }}>
        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem', flexShrink: 0 }}>
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {pf.velocidades?.filter(v => v > 0).length} disparos · {pf.pesoProyectil} gr
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: resultColor }}>
            {pf.resultado}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: resultColor }}>
            {pf.aprobado ? '✅ APROBADO' : '❌ REPROBADO — DQ'}
          </div>
        </div>
        {!locked && (
          <button
            onClick={() => { /* reset */ API.put(`/events/${eventId}/registrations/${user._id}/powerfactor`, { velocidades: [], pesoProyectil: null, finalizar: false }).then(onSaved); }}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
          >Rehacer</button>
        )}
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#f9fafb', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem', flexShrink: 0 }}>
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {velsFilled} / 8 disparos cargados
        </span>
      </div>

      <div style={{ padding: '0.875rem 1rem' }}>
        {/* Velocidades grid */}
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Velocidades (pies/seg)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.875rem' }}>
          {Array.from({ length: 8 }, (_, i) => {
            const isDisabled = locked ||
              (i >= 3 && velsFilled < 3) ||   // 4-6 only if first 3 done
              (i >= 6 && velsFilled < 6);      // 7-8 only if first 6 done
            const groupLabel = i === 0 ? '1ª ronda (disparos 1-3)' : i === 3 ? '2ª ronda (disparos 4-6)' : i === 6 ? '3ª ronda (disparos 7-8)' : null;
            return (
              <React.Fragment key={i}>
                {groupLabel && (
                  <div style={{ gridColumn: '1 / -1', fontSize: '0.72rem', fontWeight: 700, color: isDisabled ? '#d1d5db' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: i > 0 ? '0.5rem' : 0, borderTop: i > 0 ? '1px dashed var(--border)' : 'none' }}>
                    {groupLabel}
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isDisabled ? '#d1d5db' : 'var(--text-muted)', minWidth: '20px', textAlign: 'center' }}>{i + 1}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      disabled={isDisabled}
                      value={velocidades[i]}
                      onFocus={e => e.target.select()}
                      onChange={e => handleVelocidad(i, e.target.value)}
                      placeholder={isDisabled ? '—' : '0'}
                      style={{
                        textAlign: 'right', flex: 1,
                        opacity: isDisabled ? 0.4 : 1,
                        background: isDisabled ? '#f9fafb' : '#fff'
                      }}
                    />
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Peso proyectil */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Peso del proyectil (grains)
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="form-control"
              disabled={locked}
              value={peso}
              onFocus={e => e.target.select()}
              onChange={e => setPeso(e.target.value)}
            />
          </div>
          {/* Live result preview */}
          {localResult !== null && (
            <div style={{ textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Factor estimado</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: resultColor, lineHeight: 1 }}>{localResult}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: resultColor }}>
                {localResult >= MIN_PF ? '✅' : '❌'}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!locked && (
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1.5px solid var(--border)', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text)' }}
            >
              💾 Guardar borrador
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !canFinalize}
              style={{
                width: '100%', padding: '0.75rem', border: 'none', borderRadius: '8px',
                fontWeight: 700, fontSize: '0.875rem', cursor: canFinalize ? 'pointer' : 'not-allowed',
                background: canFinalize ? 'var(--primary)' : '#e5e7eb',
                color: canFinalize ? '#fff' : '#9ca3af'
              }}
            >
              {saving ? 'Guardando...' : '✅ Finalizar medición'}
            </button>
          </div>
        )}
        {!canFinalize && velsFilled > 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {velsFilled < 3 ? `Cargá al menos 3 disparos para finalizar` : 'Completá el peso del proyectil'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PowerFactorTab({ event, isAdmin, isOC, onEventUpdate }) {
  const [selectedIds, setSelectedIds] = useState(null); // null = not loaded yet
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const locked = event.status === 'finished';

  // Load suggestions on first render
  useEffect(() => {
    if (!isAdmin && !isOC) return;
    // Pre-populate with already-measured shooters
    const alreadyMeasured = event.registrations
      .filter(r => r.powerFactor?.medido || r.powerFactor?.velocidades?.some(v => v > 0))
      .map(r => r.user?._id || r.user);
    if (alreadyMeasured.length > 0) {
      setSelectedIds(alreadyMeasured);
      return;
    }
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await API.get(`/events/${event._id}/powerfactor/suggestions`);
      setSelectedIds(res.data.suggested);
    } catch (err) {
      setSelectedIds([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const allShooters = event.registrations.filter(r => r.user && !r.dq);
  const selectedRegs = selectedIds
    ? event.registrations.filter(r => selectedIds.includes(r.user?._id || r.user))
    : [];

  const toggleShooter = (uid) => {
    setSelectedIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const measured = selectedRegs.filter(r => r.powerFactor?.medido).length;
  const approved = selectedRegs.filter(r => r.powerFactor?.medido && r.powerFactor?.aprobado).length;
  const failed = selectedRegs.filter(r => r.powerFactor?.medido && !r.powerFactor?.aprobado).length;

  if (!isAdmin && !isOC) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚖️</div>
        <div className="empty-state-text">La medición de factor de potencia es solo visible para el OC y Admin</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      {selectedRegs.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Seleccionados', value: selectedRegs.length, color: 'var(--text)' },
            { label: 'Medidos', value: measured, color: '#1d4ed8' },
            { label: 'Aprobados', value: approved, color: '#166534' },
            { label: 'Reprobados / DQ', value: failed, color: '#dc2626' },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: '1', minWidth: '80px' }}>
              <div className="card-body" style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Left: shooter selector */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚖️ Tiradores a medir</div>
            {!locked && (
              <button onClick={loadSuggestions} disabled={loadingSuggestions}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                🔀 Regenerar
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: '0.75rem' }}>
            {loadingSuggestions ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}><span className="spinner"></span></div>
            ) : (
              <>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  10% de {event.registrations.filter(r => !r.dq).length} inscriptos = {Math.max(1, Math.ceil(event.registrations.filter(r => !r.dq).length * 0.1))} tiradores sugeridos
                </div>
                <div className="user-list" style={{ maxHeight: '50vh' }}>
                  {allShooters.map(reg => {
                    const uid = reg.user?._id || reg.user;
                    const isSelected = selectedIds?.includes(uid);
                    const isMeasured = reg.powerFactor?.medido;
                    return (
                      <div
                        key={uid}
                        className={`user-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => !locked && !isMeasured && toggleShooter(uid)}
                        style={{ cursor: locked || isMeasured ? 'default' : 'pointer', opacity: isMeasured ? 1 : 1 }}
                      >
                        <div className="user-avatar" style={{ width: '26px', height: '26px', fontSize: '0.7rem', flexShrink: 0 }}>
                          {reg.user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontSize: '0.875rem', flex: 1 }}>{reg.user?.name}</span>
                        {isMeasured && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: reg.powerFactor.aprobado ? '#166534' : '#dc2626' }}>
                            {reg.powerFactor.aprobado ? '✅' : '❌'}
                          </span>
                        )}
                        {!isMeasured && isSelected && <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.8rem' }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: measurement forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {selectedRegs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚖️</div>
              <div className="empty-state-text">Seleccioná tiradores de la lista para medir</div>
            </div>
          ) : (
            selectedRegs.map(reg => (
              <PowerFactorEntry
                key={reg.user?._id || reg.user}
                registration={reg}
                eventId={event._id}
                onSaved={onEventUpdate}
                locked={locked}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}