import React, { useState } from 'react';

const CATEGORIAS = ['Junior', 'General', 'Senior', 'Semi Senior', 'Super Senior', 'Lady'];
const DIVISIONES = ['Custom', 'Stock', 'Optic'];

export default function RegistrationModal({ onConfirm, onCancel, loading, existing }) {
  const [categoria, setCategoria] = useState(existing?.categoria || '');
  const [division, setDivision] = useState(existing?.division || '');

  const handleSubmit = () => {
    if (!categoria || !division) return alert('Seleccioná categoría y división');
    onConfirm({ categoria, division });
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ borderRadius: 'var(--radius-lg)', maxWidth: '400px', margin: '1rem' }}>
        <div className="modal-header">
          <div className="modal-title">🎯 Inscripción al Evento</div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Seleccioná tu categoría y división para inscribirte.
          </p>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {CATEGORIAS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(c)}
                  style={{
                    padding: '0.625rem',
                    border: `2px solid ${categoria === c ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    background: categoria === c ? 'var(--primary)' : '#fff',
                    color: categoria === c ? '#fff' : 'var(--text)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">División</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {DIVISIONES.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDivision(d)}
                  style={{
                    padding: '0.625rem',
                    border: `2px solid ${division === d ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    background: division === d ? 'var(--accent)' : '#fff',
                    color: division === d ? '#fff' : 'var(--text)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !categoria || !division}
          >
            {loading ? <><span className="spinner"></span> Inscribiendo...</> : 'Confirmar inscripción'}
          </button>
        </div>
      </div>
    </div>
  );
}
