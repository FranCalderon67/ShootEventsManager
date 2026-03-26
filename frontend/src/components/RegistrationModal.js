import React, { useState } from 'react';

const DIVISIONES = ['Custom', 'Stock', 'Optic'];

const DIVISION_INFO = {
  Custom: [
    'Acción Simple',
    'Mínimo calibre 9x19',
    'Máximo 15 municiones en cargador',
  ],
  Stock: [
    'Acción Doble o Aguja Lanzada',
    'Mínimo calibre 9x19',
    'Máximo 15 municiones en cargador',
  ],
  Optic: [
    'Acción Simple, Doble o Aguja Lanzada',
    'Mínimo calibre 9x19',
    'Máximo 15 municiones en cargador',
    'Miras ópticas / Electrónicas',
  ],
};

function InfoTooltip({ division }) {
  const [open, setOpen] = useState(false);
  const items = DIVISION_INFO[division] || [];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: '18px', height: '18px',
          borderRadius: '50%',
          border: '1.5px solid currentColor',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 700,
          lineHeight: 1,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
        aria-label={`Info ${division}`}
      >
        i
      </button>

      {open && (
        <>
          {/* Backdrop to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: '#1a1a1a',
            color: '#f9fafb',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            minWidth: '200px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            fontSize: '0.78rem',
            lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#fff', fontSize: '0.82rem' }}>
              {division}
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 1rem' }}>
              {items.map((item, i) => (
                <li key={i} style={{ marginBottom: '0.2rem' }}>{item}</li>
              ))}
            </ul>
            {/* Arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1a1a1a',
            }} />
          </div>
        </>
      )}
    </div>
  );
}

export default function RegistrationModal({ onConfirm, onCancel, loading, existing, categoria }) {
  const [division, setDivision] = useState(existing?.division || '');

  const handleSubmit = () => {
    if (!division) return alert('Seleccioná una división');
    onConfirm({ division });
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
            Seleccioná tu división para inscribirte.
          </p>

          {/* Categoría asignada automáticamente */}
          {categoria && (
            <div className="form-group">
              <label className="form-label">Categoría asignada</label>
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                background: '#f0fdf4', border: '2px solid var(--primary)',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1rem' }}>🎯</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>{categoria}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Calculada automáticamente</span>
              </div>
            </div>
          )}

          {/* División */}
          <div className="form-group">
            <label className="form-label">División</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {DIVISIONES.map(d => (
                <div key={d} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setDivision(d)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.625rem 0.625rem 0.5rem',
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {d}
                    <span style={{ color: division === d ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                      <InfoTooltip division={d} />
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !division}
          >
            {loading ? <><span className="spinner"></span> Inscribiendo...</> : 'Confirmar inscripción'}
          </button>
        </div>
      </div>
    </div>
  );
}