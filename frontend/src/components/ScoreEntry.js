import React, { useState } from 'react';

function Counter({ label, labelClass, value, onChange, multiplier, description }) {
  const subtotal = value * multiplier;
  return (
    <div className="score-row">
      <div>
        <div className={`score-label ${labelClass}`}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <div className="score-counter">
        <button className="btn btn-red" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}>−</button>
        <span className="score-value">{value}</span>
        <button className="btn btn-green" onClick={() => onChange(value + 1)}>+</button>
      </div>
      <div className="score-subtotal">{multiplier > 0 ? `+${subtotal}` : '0'}</div>
    </div>
  );
}

export default function ScoreEntry({ shooters, scoredShooterIds = [], stageId, onSave, saving }) {
  const [selectedShooter, setSelectedShooter] = useState('');
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [time, setTime] = useState('');

  const timeNum = parseFloat(time) || 0;
  const total = timeNum + (b * 1) + (c * 3) + (penalty * 5);

  const handleTimeChange = (e) => {
    // Replace comma with dot for decimal support on mobile keyboards
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setTime(val);
  };

  const handleSave = () => {
    if (!selectedShooter) return alert('Seleccioná un tirador');
    if (time === '' || isNaN(parseFloat(time))) return alert('Ingresá el tiempo');
    onSave({ shooter: selectedShooter, a, b, c, penalty, time: parseFloat(time) });
  };

  const handleShooterChange = (e) => {
    setSelectedShooter(e.target.value);
    setA(0); setB(0); setC(0); setPenalty(0); setTime('');
  };

  // Separate available and already scored shooters
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
            ✓ Todos los tiradores de esta escuadra ya tienen puntuación en esta etapa
          </div>
        )}
      </div>

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

      <Counter label="A" labelClass="label-a" value={a} onChange={setA} multiplier={0} description="× 0 pts" />
      <Counter label="B" labelClass="label-b" value={b} onChange={setB} multiplier={1} description="× 1 pt" />
      <Counter label="C" labelClass="label-c" value={c} onChange={setC} multiplier={3} description="× 3 pts" />
      <Counter label="PEN" labelClass="label-pen" value={penalty} onChange={setPenalty} multiplier={5} description="× 5 pts" />

      <hr className="divider" />

      <div className="total-box">
        <div>
          <div className="total-label">TOTAL</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>
            {timeNum.toFixed(2)}s + B({b}) + C({c * 3}) + Pen({penalty * 5})
          </div>
        </div>
        <div className="total-value">{total.toFixed(2)}</div>
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
