import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminUsers from './AdminUsers';

export default function AdminPanel() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Panel de Administración</div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" style={{ padding: '1rem 1.5rem', fontSize: '1rem' }} onClick={() => navigate('/events')}>
          🎯 Ver Eventos
        </button>
        <button className="btn btn-accent" style={{ padding: '1rem 1.5rem', fontSize: '1rem' }} onClick={() => navigate('/admin/events/new')}>
          + Crear Nuevo Evento
        </button>
      </div>

      <AdminUsers />
    </div>
  );
}
