import React, { useState } from 'react';

function Counter({ label, labelClass, value, onChange, multiplier, description, color }) {
  const subtotal = value * multiplier;
  return (
    <div className="score-row">
      <div style={{ flex: 1 }}>
        <div className={`score-label ${labelClass || ''}`} style={color ? { color } : {}}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <div className="score-counter">
        <button className="btn btn-red" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}>−</button>
        <span className="score-value">{value}</span>
        <button className="btn btn-green" onClick={() => onChange(value + 1)}>+</button>
      </div>
      <div className="score-subtotal">{multiplier > 0 ? `+${subtotal}` : '—'}</div>
    </div>
  );
}

export default function ScoreEntry({ shooters, scoredShooterIds = [], stageId, onSave, saving }) {
  const [selectedShooter, setSelectedShooter] = useState('');
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [noShoot, setNoShoot] = useState(0);
  const [miss, setMiss] = useState(0);
  const [procedural, setProcedural] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [time, setTime] = useState('');

  const dq = warnings >= 2;
  const timeNum = parseFloat(time) || 0;
  const penalties = (noShoot + miss + procedural) * 5;
  const total = timeNum + (b * 1) + (c * 3) + penalties;

  const handleTimeChange = (e) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setTime(val);
  };

  const handleSave = () => {
    if (!selectedShooter) return alert('Seleccioná un tirador');
    if (time === '' || isNaN(parseFloat(time))) return alert('Ingresá el tiempo');
    onSave({ shooter: selectedShooter, a, b, c, noShoot, miss, procedural, warnings, dq, time: parseFloat(time) });
  };

  const handleShooterChange = (e) => {
    setSelectedShooter(e.target.value);
    setA(0); setB(0); setC(0);
    setNoShoot(0); setMiss(0); setProcedural(0);
    setWarnings(0); setTime('');
  };

  const availableShooters = shooters.filter(s => !scoredShooterIds.includes(s._id));
  const scoredShooters = shooters.filter(s => scoredShooterIds.includes(s._id));

  return (
    <div>
      {/* Shooter selector */}
      <div className="shooter-selector">
        <label className="form-label">Tirador</label>
        <select className="form-control" value={selectedShooter} onChange={handleShooterChange}>
          <option value="">— Seleccionar tirador —</option>
          {availableShooters.length > 0 && (
            <optgroup label="Pendientes">
              {availableShooters.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </optgroup>
          )}
          {scoredShooters.length > 0 && (
            <optgroup label="✓ Ya puntuados (bloqueados)" disabled>
              {scoredShooters.map(s => (
                <option key={s._id} value={s._id} disabled>✓ {s.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        {availableShooters.length === 0 && shooters.length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
            ✓ Todos los tiradores ya tienen puntuación en esta etapa
          </div>
        )}
      </div>

      {/* DQ Banner */}
      {dq && (
        <div style={{
          background: '#7f1d1d', border: '2px solid #ef4444',
          borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.625rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🟥</span>
          <div>
            <div style={{ fontWeight: 800, color: '#fca5a5', fontSize: '0.9rem' }}>DESCALIFICADO</div>
            <div style={{ fontSize: '0.75rem', color: '#fca5a5', opacity: 0.8 }}>2 advertencias — el tirador queda fuera de competencia</div>
          </div>
        </div>
      )}

      {/* Time field */}
      <div style={{ marginBottom: '1rem' }}>
        <label className="form-label">Tiempo (segundos)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            inputMode="decimal"
            className="time-input"
            placeholder="0.00"
            value={time}
            onChange={handleTimeChange}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>seg</span>
        </div>
      </div>

      <hr className="divider" />

      {/* Impact counters */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
        Impactos
      </div>
      <Counter label="A" labelClass="label-a" value={a} onChange={setA} multiplier={0} description="× 0 pts" />
      <Counter label="B" labelClass="label-b" value={b} onChange={setB} multiplier={1} description="× 1 pt" />
      <Counter label="C" labelClass="label-c" value={c} onChange={setC} multiplier={3} description="× 3 pts" />

      <hr className="divider" />

      {/* Penalty counters */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
        Penalizaciones — cada una suma 5 pts
      </div>
      <Counter label="No Shoot" value={noShoot} onChange={setNoShoot} multiplier={5} description="× 5 pts" color="#ef4444" />
      <Counter label="Miss" value={miss} onChange={setMiss} multiplier={5} description="× 5 pts" color="#f97316" />
      <Counter label="Falta de Procedimiento" value={procedural} onChange={setProcedural} multiplier={5} description="× 5 pts" color="#eab308" />

      <hr className="divider" />

      {/* Warnings */}
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
        Advertencias
      </div>
      <div className="score-row" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Advertencias</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No suma pts — 2 = DQ</div>
        </div>
        <div className="score-counter">
          <button className="btn btn-red" onClick={() => setWarnings(Math.max(0, warnings - 1))} disabled={warnings === 0}>−</button>
          <span className="score-value">{warnings}</span>
          <button className="btn btn-green" onClick={() => setWarnings(Math.min(2, warnings + 1))}>+</button>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', width: '48px', justifyContent: 'center' }}>
          {[0, 1].map(i => (
            <span key={i} style={{ fontSize: '1.2rem' }}>
              {warnings > i ? '🟨' : '⬜'}
            </span>
          ))}
          {dq && <span style={{ fontSize: '1.2rem' }}>🟥</span>}
        </div>
      </div>

      <hr className="divider" />

      {/* Total */}
      <div className="total-box">
        <div>
          <div className="total-label">TOTAL</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>
            {timeNum.toFixed(2)}s + B({b}) + C({c * 3}) + Pen({penalties})
          </div>
        </div>
        <div className="total-value">{dq ? 'DQ' : total.toFixed(2)}</div>
      </div>

      <button
        className="btn btn-save"
        onClick={handleSave}
        disabled={saving || !selectedShooter || time === '' || scoredShooterIds.includes(selectedShooter)}
      >
        {saving ? <><span className="spinner"></span> Guardando...</> : '💾 Guardar'}
      </button>
    </div>
  );
}
