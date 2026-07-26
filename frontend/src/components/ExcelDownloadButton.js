import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import API from '../utils/api';

const MIN_PF = 125;

async function fetchAllData() {
  const eventsRes = await API.get('/events');
  const events = eventsRes.data;
  const results = [];
  for (const ev of events) {
    const rankRes = await API.get(`/events/${ev._id}/rankings`);
    results.push({ event: ev, rankings: rankRes.data });
  }
  return results;
}

function buildRows(eventsData) {
  // Find max number of stages across all events
  const maxStages = Math.max(...eventsData.map(({ event }) => event.stages?.length || 0), 0);

  const rows = [];
  for (const { event, rankings } of eventsData) {
    const stages = event.stages || [];
    const nonAlt = rankings.filter(r => !r.isAlternative);
    const leaderAvg = nonAlt.filter(r => !r.dq && r.average !== null)
      .reduce((min, r) => r.average < min ? r.average : min, Infinity);

    // Build a lookup of categoria from registrations (more reliable than rankings)
    const regCatMap = {};
    (event.registrations || []).forEach(reg => {
      const uid = reg.user?._id || reg.user;
      if (uid) regCatMap[uid] = reg.categoria;
    });

    for (const r of nonAlt) {
      const pct = (!r.dq && r.average !== null && leaderAvg !== Infinity)
        ? Math.round((leaderAvg / r.average) * 1000) / 10
        : null;

      const shooterId = r.shooter?._id || r.shooter;
      const categoria = regCatMap[shooterId] || r.categoria || '—';

      const row = {
        'Evento': event.name,
        'Fecha': new Date(event.date).toLocaleDateString('es-AR'),
        'Tirador': r.shooter?.name || '—',
        'Categoría': categoria,
        'División': r.division || '—',
      };

      // Use unified column names — Etapa 1, Etapa 2, etc.
      for (let i = 0; i < maxStages; i++) {
        const stage = stages[i];
        const colName = `Etapa ${i + 1}`;
        if (stage) {
          const score = r.stageScores?.[stage._id];
          row[colName] = score === 'DQ' ? 'DQ'
            : score !== undefined && score !== null ? parseFloat(score).toFixed(2) : '—';
        } else {
          row[colName] = '—'; // event has fewer stages than max
        }
      }

      row['Resultado Final'] = r.dq ? 'DQ'
        : r.average !== null ? parseFloat(r.average).toFixed(2) : '—';
      row['%'] = r.dq ? '—'
        : pct !== null ? `${pct}%` : '—';
      row['Estado'] = r.dq ? 'DQ' : 'OK';

      rows.push(row);
    }
  }
  return rows;
}

function downloadExcel(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  const cols = Object.keys(rows[0] || {});
  ws['!cols'] = cols.map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
  XLSX.writeFile(wb, filename);
}

export default function ExcelDownloadButton() {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const handleOpen = async () => {
    setFetching(true);
    try {
      const res = await API.get('/events');
      setEvents(res.data);
      setSelectedEventId('all');
      setShowModal(true);
    } finally {
      setFetching(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      let data;
      if (selectedEventId === 'all') {
        data = await fetchAllData();
      } else {
        const ev = events.find(e => e._id === selectedEventId);
        const rankRes = await API.get(`/events/${selectedEventId}/rankings`);
        data = [{ event: ev, rankings: rankRes.data }];
      }

      const rows = buildRows(data);
      if (rows.length === 0) {
        alert('No hay resultados para descargar');
        return;
      }

      const filename = selectedEventId === 'all'
        ? `resultados_todos_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `resultados_${data[0].event.name.replace(/\s+/g, '_')}.xlsx`;

      downloadExcel(rows, filename);
      setShowModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al generar el Excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-outline"
        onClick={handleOpen}
        disabled={fetching}
        style={{ padding: '1rem 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        {fetching ? <><span className="spinner"></span> Cargando...</> : '📊 Descargar Excel'}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', maxWidth: '460px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>📊 Descargar resultados</div>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.25rem' }}>
              Seleccioná qué resultados querés exportar al Excel.
            </p>

            <div className="form-group">
              <label className="form-label">Evento</label>
              <select
                className="form-control"
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                <option value="all">📋 Todos los eventos</option>
                {events.map(ev => (
                  <option key={ev._id} value={ev._id}>
                    {ev.name} — {new Date(ev.date).toLocaleDateString('es-AR')}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1.25rem', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
              El archivo incluirá: tirador, categoría, división, resultado por etapa, resultado final y porcentaje.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDownload}
                disabled={loading}
                style={{ flex: 1, padding: '0.75rem', background: '#1E3A5F', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                {loading ? <><span className="spinner"></span> Generando...</> : '⬇️ Descargar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}