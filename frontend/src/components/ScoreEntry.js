import React, { useState } from 'react';

function Counter({ label, labelClass, value, onChange, multiplier, description, color, disabled, disabledPlus }) {
  const subtotal = value * multiplier;
  return (
    <div className="score-row">
      <div style={{ flex: 1 }}>
        <div className={`score-label ${labelClass || ''}`} style={color ? { color } : {}}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <div className="score-counter">
        <button className="btn btn-red" onClick={() => onChange(Math.max(0, value - 1))} disabled={disabled || value === 0}>−</button>
        <span className="score-value">{value}</span>
        <button className="btn btn-green" onClick={() => onChange(value + 1)} disabled={disabled || disabledPlus}>+</button>
      </div>
      <div className="score-subtotal">{multiplier > 0 ? `+${subtotal}` : '—'}</div>
    </div>
  );
}

function DQModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '2px solid #dc2626',
        borderRadius: '12px',
        padding: '1.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 0 40px rgba(220,38,38,0.4)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '2rem' }}>🟥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fca5a5', letterSpacing: '0.04em' }}>
              DESCALIFICACIÓN MANUAL
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(252,165,165,0.6)', marginTop: '0.1rem' }}>
              Esta acción bloqueará al tirador en todas las etapas
            </div>
          </div>
        </div>

        {/* Reason input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Causa de la descalificación
          </label>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: Arma apuntando fuera de zona segura, violación de reglas de seguridad..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#2a2a2a', border: '1px solid #dc2626',
              borderRadius: '8px', padding: '0.75rem',
              color: '#f9fafb', fontSize: '0.9rem',
              resize: 'vertical', outline: 'none',
              fontFamily: 'inherit', lineHeight: 1.5
            }}
          />
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.35rem' }}>
            Opcional — quedará registrada junto con la descalificación
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '0.75rem',
              background: 'transparent', border: '1px solid #4b5563',
              borderRadius: '8px', color: '#9ca3af',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            style={{
              flex: 1, padding: '0.75rem',
              background: '#dc2626', border: '2px solid #ef4444',
              borderRadius: '8px', color: '#fff',
              fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
              letterSpacing: '0.04em'
            }}
          >
            🟥 CONFIRMAR DQ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScoreEntry({ shooters, scoredShooterIds = [], dqShooterIds = [], stageId, onSave, saving, impactosPuntuables = 0 }) {
  const [selectedShooter, setSelectedShooter] = useState('');
  const [a, setA] = useState(0);
  const [metal, setMetal] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [noShoot, setNoShoot] = useState(0);
  const [miss, setMiss] = useState(0);
  const [procedural, setProcedural] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [manualDQ, setManualDQ] = useState(false);
  const [dqReason, setDqReason] = useState('');
  const [showDQModal, setShowDQModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [time, setTime] = useState('');

  const warningsDQ = warnings >= 2;
  const isDQ = warningsDQ || manualDQ;

  const timeNum = parseFloat(time) || 0;
  const penalties = (noShoot + miss + procedural) * 5;
  const total = timeNum + (b * 1) + (c * 3) + penalties;

  const handleTimeChange = (e) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setTime(val);
  };

  const handleContinue = () => {
    if (!selectedShooter) return alert('Seleccioná un tirador');
    if (!isDQ && (time === '' || isNaN(parseFloat(time)))) return alert('Ingresá el tiempo');
    if (impactosPuntuables > 0 && !isDQ) {
      const totalImpactos = a + b + c + metal + miss;
      if (totalImpactos > impactosPuntuables) {
        return alert(`Los impactos (${totalImpactos}) superan el máximo puntuable (${impactosPuntuables})`);
      }
    }
    setShowSummary(true);
  };

  const handleSave = () => {
    const finalTime = parseFloat(time) || 0;
    onSave({
      shooter: selectedShooter, a, b, c, metal, noShoot, miss, procedural,
      warnings, dq: isDQ, time: finalTime,
      manualDQ, dqReason
    });
  };

  const handleShooterChange = (e) => {
    setSelectedShooter(e.target.value);
    setA(0); setB(0); setC(0);
    setNoShoot(0); setMiss(0); setProcedural(0);
    setMetal(0); setWarnings(0); setManualDQ(false); setDqReason(''); setTime('');
  };

  const handleCheckboxClick = () => {
    if (manualDQ) {
      // Uncheck: remove DQ directly
      setManualDQ(false);
      setDqReason('');
    } else {
      // Check: open modal for reason
      setShowDQModal(true);
    }
  };

  const handleDQModalConfirm = (reason) => {
    setManualDQ(true);
    setDqReason(reason);
    setShowDQModal(false);
  };

  const availableShooters = shooters.filter(s => !scoredShooterIds.includes(s._id));
  const selectedShooterName = shooters.find(s => s._id === selectedShooter)?.name || '';
  const dqShooters = shooters.filter(s => dqShooterIds.includes(s._id) && !scoredShooterIds.filter(id => !dqShooterIds.includes(id)).includes(s._id));
  const scoredShooters = shooters.filter(s => scoredShooterIds.includes(s._id) && !dqShooterIds.includes(s._id));

  return (
    <>
      {showDQModal && (
        <DQModal
          onConfirm={handleDQModalConfirm}
          onCancel={() => setShowDQModal(false)}
        />
      )}

      <div>
        {/* Shooter selector */}
        <div className="shooter-selector">
          <label className="form-label">Tirador</label>
          <select className="form-control" value={selectedShooter} onChange={handleShooterChange}>
            <option value="">— Seleccionar tirador —</option>
            {availableShooters.length > 0 && (
              <optgroup label="Pendientes">
                {availableShooters.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </optgroup>
            )}
            {scoredShooters.length > 0 && (
              <optgroup label="✓ Ya puntuados (bloqueados)" disabled>
                {scoredShooters.map(s => <option key={s._id} value={s._id} disabled>✓ {s.name}</option>)}
              </optgroup>
            )}
            {dqShooters.length > 0 && (
              <optgroup label="🟥 Descalificados (bloqueados)" disabled>
                {dqShooters.map(s => <option key={s._id} value={s._id} disabled>🟥 {s.name}</option>)}
              </optgroup>
            )}
          </select>
          {availableShooters.length === 0 && shooters.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
              ✓ Todos los tiradores ya tienen puntuación en esta etapa
            </div>
          )}
        </div>

        {/* DQ Banner - warnings */}
        {warningsDQ && (
          <div style={{
            background: '#7f1d1d', border: '2px solid #ef4444',
            borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
            marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.625rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🟥</span>
            <div>
              <div style={{ fontWeight: 800, color: '#fca5a5', fontSize: '0.9rem' }}>DESCALIFICADO — 2 ADVERTENCIAS</div>
              <div style={{ fontSize: '0.75rem', color: '#fca5a5', opacity: 0.8 }}>Podés guardar para registrar las advertencias.</div>
            </div>
          </div>
        )}

        {/* DQ Banner - manual */}
        {manualDQ && (
          <div style={{
            background: '#450a0a', border: '3px solid #dc2626',
            borderRadius: 'var(--radius)', padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: dqReason ? '0.625rem' : 0 }}>
              <span style={{ fontSize: '1.75rem' }}>🟥</span>
              <div>
                <div style={{ fontWeight: 800, color: '#fca5a5', fontSize: '0.95rem', letterSpacing: '0.04em' }}>DESCALIFICACIÓN MANUAL</div>
                <div style={{ fontSize: '0.75rem', color: '#fca5a5', opacity: 0.7 }}>El tirador quedará bloqueado en todas las etapas</div>
              </div>
            </div>
            {dqReason && (
              <div style={{
                background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '6px', padding: '0.5rem 0.75rem',
                fontSize: '0.82rem', color: '#fca5a5', fontStyle: 'italic'
              }}>
                📋 {dqReason}
              </div>
            )}
          </div>
        )}

        {/* Time field */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">Tiempo (segundos)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="text" inputMode="decimal" className="time-input"
              placeholder={isDQ ? '0.00 (opcional si DQ)' : '0.00'}
              value={time} onChange={handleTimeChange}
              style={isDQ ? { opacity: 0.5 } : {}}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>seg</span>
          </div>
        </div>

        <hr className="divider" />

        {/* Impact counters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>Impactos</div>
          {impactosPuntuables > 0 && (() => {
            const totalImpactos = a + b + c + metal + miss;
            const over = totalImpactos > impactosPuntuables;
            const exact = totalImpactos === impactosPuntuables;
            return (
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: over ? '#ef4444' : exact ? '#2a7d4f' : 'var(--text-muted)' }}>
                {totalImpactos} / {impactosPuntuables}
                {over && ' ⚠️'}{exact && ' ✓'}
              </div>
            );
          })()}
        </div>
        <Counter label="A" labelClass="label-a" value={a} onChange={setA} multiplier={0} description="× 0 pts" disabledPlus={impactosPuntuables > 0 && (a + b + c + metal + miss) >= impactosPuntuables} />
        <Counter label="B" labelClass="label-b" value={b} onChange={setB} multiplier={1} description="× 1 pt" disabledPlus={impactosPuntuables > 0 && (a + b + c + metal + miss) >= impactosPuntuables} />
        <Counter label="C" labelClass="label-c" value={c} onChange={setC} multiplier={3} description="× 3 pts" disabledPlus={impactosPuntuables > 0 && (a + b + c + metal + miss) >= impactosPuntuables} />
        <Counter label="Metal" value={metal} onChange={setMetal} multiplier={0} description="× 0 pts" color="#6b7280" disabledPlus={impactosPuntuables > 0 && (a + b + c + metal + miss) >= impactosPuntuables} />

        <hr className="divider" />

        {/* Penalty counters */}
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
          Penalizaciones — cada una suma 5 pts
        </div>
        <Counter label="No Shoot" value={noShoot} onChange={setNoShoot} multiplier={5} description="× 5 pts" color="#ef4444" />
        <Counter label="Miss" value={miss} onChange={setMiss} multiplier={5} description="× 5 pts — cuenta como impacto" color="#f97316" disabledPlus={impactosPuntuables > 0 && (a + b + c + metal + miss) >= impactosPuntuables} />
        <Counter label="Falta de Procedimiento" value={procedural} onChange={setProcedural} multiplier={5} description="× 5 pts" color="#eab308" />

        <hr className="divider" />

        {/* Warnings */}
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Advertencias</div>
        <div className="score-row" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Advertencias</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No suma pts — 2 = DQ automático</div>
          </div>
          <div className="score-counter">
            <button className="btn btn-red" onClick={() => setWarnings(Math.max(0, warnings - 1))} disabled={warnings === 0}>−</button>
            <span className="score-value">{warnings}</span>
            <button className="btn btn-green" onClick={() => setWarnings(Math.min(2, warnings + 1))}>+</button>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', width: '56px', justifyContent: 'center' }}>
            {[0, 1].map(i => <span key={i} style={{ fontSize: '1.2rem' }}>{warnings > i ? '🟨' : '⬜'}</span>)}
            {warningsDQ && <span style={{ fontSize: '1.2rem' }}>🟥</span>}
          </div>
        </div>

        <hr className="divider" />

        {/* Manual DQ Checkbox */}
        {selectedShooter && (
          <div style={{
            border: `2px solid ${manualDQ ? '#dc2626' : '#374151'}`,
            borderRadius: 'var(--radius)',
            background: manualDQ ? '#450a0a' : '#111',
            padding: '0.875rem 1rem',
            marginBottom: '1rem',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }} onClick={handleCheckboxClick}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', pointerEvents: 'none' }}>
              <input
                type="checkbox"
                checked={manualDQ}
                readOnly
                style={{ width: '22px', height: '22px', accentColor: '#dc2626', flexShrink: 0, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: manualDQ ? '#fca5a5' : '#d1d5db', letterSpacing: '0.03em' }}>
                  🟥 DESCALIFICAR AL TIRADOR
                </div>
                <div style={{ fontSize: '0.75rem', color: manualDQ ? '#fca5a5' : '#6b7280', marginTop: '0.15rem' }}>
                  {manualDQ ? 'Hacé click para quitar la descalificación' : 'DQ manual — independiente de advertencias'}
                </div>
              </div>
            </div>
          </div>
        )}

        <hr className="divider" />

        {/* Total */}
        <div className="total-box" style={isDQ ? { background: '#7f1d1d', borderColor: '#dc2626' } : {}}>
          <div>
            <div className="total-label">TOTAL</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>
              {isDQ ? 'Tirador descalificado' : `${timeNum.toFixed(2)}s + B(${b}) + C(${c * 3}) + Pen(${penalties})`}
            </div>
          </div>
          <div className="total-value">{isDQ ? 'DQ' : total.toFixed(2)}</div>
        </div>

        <button
          className="btn btn-save"
          onClick={handleContinue}
          disabled={saving || !selectedShooter || scoredShooterIds.includes(selectedShooter)}
          style={isDQ ? { background: '#dc2626', borderColor: '#b91c1c' } : {}}
        >
          {isDQ ? '🟥 Continuar' : '➡️ Continuar'}
        </button>
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg, #f4f1ec)', border: `2px solid ${isDQ ? '#dc2626' : '#2a7d4f'}`, borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: isDQ ? '#dc2626' : 'var(--text, #1a1a1a)', marginBottom: '0.3rem', letterSpacing: '-0.01em' }}>
                {isDQ ? '🟥 Resumen — Descalificado' : '📋 Resumen de puntuación'}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted, #6b7280)', fontWeight: 700 }}>{selectedShooterName}</div>
            </div>

            {/* Score detail */}
            {!isDQ && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                {/* Desktop: horizontal table */}
                <table className="summary-table-desktop" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      {['Tiempo', 'A', 'Metal', 'B', 'C', 'Miss', 'NS', 'F.P.', 'Total'].map(h => (
                        <th key={h} style={{ color: '#6b7280', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', padding: '0 0.5rem 0.625rem', textAlign: 'center', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[
                        { val: `${timeNum.toFixed(2)}s`, color: '#111827' },
                        { val: a, color: '#16a34a' },
                        { val: metal, color: '#6b7280' },
                        { val: b, color: '#ca8a04' },
                        { val: c, color: '#d97706' },
                        { val: miss, color: '#dc2626' },
                        { val: noShoot, color: '#dc2626' },
                        { val: procedural, color: '#d97706' },
                        { val: total.toFixed(2), color: '#2a7d4f' },
                      ].map(({ val, color }, i) => (
                        <td key={i} style={{ color, fontWeight: 900, textAlign: 'center', padding: '0.375rem 0.5rem', fontSize: '1rem' }}>{val}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                {/* Mobile: vertical list */}
                <div className="summary-list-mobile">
                  {[
                    { label: 'Tiempo', val: `${timeNum.toFixed(2)}s`, color: '#111827' },
                    { label: 'A', val: a, color: '#16a34a' },
                    { label: 'B', val: b, color: '#ca8a04' },
                    { label: 'C', val: c, color: '#d97706' },
                    { label: 'Miss', val: miss, color: '#dc2626' },
                    { label: 'No Shoot', val: noShoot, color: '#dc2626' },
                    { label: 'Falta Proc.', val: procedural, color: '#d97706' },
                    { label: 'Total', val: total.toFixed(2), color: '#2a7d4f' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color }}>{val}</span>
                    </div>
                  ))}
                </div>
                {warnings > 0 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.82rem', color: '#dc2626', fontWeight: 700 }}>
                    ⚠️ {warnings} advertencia{warnings > 1 ? 's' : ''}{warningsDQ ? ' — DQ por advertencias' : ''}
                  </div>
                )}
              </div>
            )}

            {isDQ && dqReason && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#dc2626', fontWeight: 700, fontStyle: 'italic' }}>
                📋 {dqReason}
              </div>
            )}

            {/* Total highlight */}
            <div style={{ background: isDQ ? '#fef2f2' : '#f0fdf4', border: `2px solid ${isDQ ? '#dc2626' : '#2a7d4f'}`, borderRadius: '8px', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: isDQ ? '#dc2626' : '#2a7d4f', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: '1.75rem', color: isDQ ? '#dc2626' : '#2a7d4f' }}>
                {isDQ ? 'DQ' : total.toFixed(2)}
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowSummary(false)}
                style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                ← Volver
              </button>
              <button
                onClick={() => { setShowSummary(false); handleSave(); }}
                disabled={saving}
                style={{ flex: 1, padding: '0.75rem', background: isDQ ? '#dc2626' : '#2a7d4f', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', letterSpacing: '0.02em' }}
              >
                {saving ? 'Guardando...' : isDQ ? '🟥 Confirmar DQ' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
