import React from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtScore = (v) => v === 'DQ'
  ? <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>DQ</span>
  : v !== undefined
    ? parseFloat(v).toFixed(2)
    : <span style={{ color: 'var(--text-light)' }}>—</span>;

const RankBadge = ({ index, dq }) => {
  if (dq) return <span style={{ fontSize: '1rem' }}>🟥</span>;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <span className={`rank ${index < 3 ? `rank-${index + 1}` : ''}`}>
      {index < 3 ? medals[index] : index + 1}
    </span>
  );
};

// ─── Shared table component ────────────────────────────────────────────────────

function RankingsTable({ rows, stages, isAdmin, setEditingReg, currentUserId, showHeader = true }) {
  const nonDqRows = rows.filter(r => !r.dq);
  // Leader is first non-DQ row with a valid average
  const leaderAverage = nonDqRows.filter(r => r.average !== null && r.average !== undefined).reduce((min, r) => r.average < min ? r.average : min, Infinity) || null;
  const finalLeaderAverage = leaderAverage === Infinity ? null : leaderAverage;

  const calcPct = (r) => {
    if (r.dq || r.average === null || r.average === undefined || finalLeaderAverage === null) return null;
    return (finalLeaderAverage / r.average) * 100;
  };

  return (
    <div className="table-container">
      <table>
        {showHeader && <thead>
          <tr>
            <th>#</th>
            <th>Tirador</th>
            <th>Cat.</th>
            <th>Div.</th>
            {stages.map((s, i) => <th key={s._id}>Et. {i + 1}</th>)}
            <th>Resultado final</th>
            <th>%</th>
          </tr>
        </thead>}
        <tbody>
          {rows.map((r) => {
            const rowDq = r.dq;
            const idx = nonDqRows.indexOf(r);
            return (
              <tr key={r.shooter._id} style={{
                background: rowDq ? '#fef2f2' : r.shooter._id === currentUserId ? 'rgba(42,125,79,0.05)' : '',
                opacity: rowDq ? 0.8 : 1
              }}>
                <td><RankBadge index={idx} dq={rowDq} /></td>
                <td>
                  <strong style={{ color: rowDq ? '#ef4444' : 'inherit', textDecoration: rowDq ? 'line-through' : 'none' }}>
                    {r.shooter.name}
                  </strong>
                  {r.shooter._id === currentUserId && (
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>YO</span>
                  )}
                  {rowDq && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>DQ</span>}
                </td>
                <td>
                  <span className="badge" style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.7rem' }}>{r.categoria || '—'}</span>
                  {isAdmin && !rowDq && setEditingReg && (
                    <button
                      onClick={() => setEditingReg({ userId: r.shooter._id, categoria: r.categoria, division: r.division })}
                      style={{ marginLeft: '0.3rem', fontSize: '0.65rem', padding: '1px 6px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', color: '#6b7280' }}
                    >✏️</button>
                  )}
                </td>
                <td><span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>{r.division || '—'}</span></td>
                {stages.map(s => (
                  <td key={s._id}>{fmtScore(rowDq && r.stageScores[s._id] === undefined ? 'DQ' : r.stageScores[s._id])}</td>
                ))}
                <td>
                  <strong style={{ color: rowDq ? '#ef4444' : idx === 0 ? 'var(--gold)' : 'var(--text)' }}>
                    {rowDq ? 'DQ' : r.average !== null && r.average !== undefined ? r.average.toFixed(2) : '—'}
                  </strong>
                </td>
                <td>
                  {(() => {
                    const pct = calcPct(r);
                    if (pct === null) return <span style={{ color: 'var(--text-light)' }}>—</span>;
                    const isLeader = !rowDq && r.average === finalLeaderAverage;
                    const color = isLeader ? 'var(--primary)' : pct >= 90 ? '#ca8a04' : '#ef4444';
                    return (
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color }}>
                        {isLeader ? '100%' : `${pct.toFixed(1)}%`}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── My Results section (for shooter) ─────────────────────────────────────────

function MyResults({ event, myRanking, rankings }) {
  if (!myRanking) return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-header"><div className="card-title">📊 Mis resultados</div></div>
      <div className="empty-state" style={{ padding: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aún no tenés puntuaciones cargadas</div>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div className="card-header">
        <div className="card-title">📊 Mis resultados</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}></div>
      </div>
      <div className="card-body" style={{ padding: '0' }}>
        {/* Per stage breakdown */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.75rem' }}>
            Resultado por etapa
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {event.stages.map((stage, i) => {
              const score = myRanking.stageScores[stage._id];
              const isDQ = score === 'DQ';
              const hasScore = score !== undefined;
              // Find full score detail from event stages
              const detail = stage.scores?.find(s => (s.shooter?._id || s.shooter) === myRanking.shooter._id);
              return (
                <div key={stage._id} style={{ background: isDQ ? '#fef2f2' : hasScore ? '#f0fdf4' : '#f9fafb', borderRadius: 'var(--radius)', border: `1px solid ${isDQ ? '#fecaca' : hasScore ? '#d1fae5' : 'var(--border)'}`, overflow: 'hidden' }}>
                  {/* Stage header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '60px', fontWeight: 600 }}>Et. {i + 1}</span>
                    <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{stage.name}</span>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: isDQ ? '#ef4444' : hasScore ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {isDQ ? 'DQ' : hasScore ? parseFloat(score).toFixed(2) : '—'}
                    </span>
                  </div>
                  {/* Detail breakdown */}
                  {detail && !isDQ && (
                    <div style={{ borderTop: `1px solid ${hasScore ? '#d1fae5' : 'var(--border)'}`, padding: '0.5rem 0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Tiempo', value: parseFloat(detail.time).toFixed(2) + 's', color: '#374151' },
                        { label: 'A', value: detail.a, color: '#16a34a' },
                        { label: 'B', value: detail.b, color: '#ca8a04' },
                        { label: 'C', value: detail.c, color: '#d97706' },
                        { label: 'Miss', value: detail.miss, color: '#ef4444' },
                        { label: 'No Shoot', value: detail.noShoot, color: '#ef4444' },
                        { label: 'F. Proc.', value: detail.procedural, color: '#eab308' },
                        ...(detail.warnings > 0 ? [{ label: 'Adv.', value: detail.warnings, color: '#f97316' }] : []),
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.2rem 0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* % Comparisons */}
        {!myRanking.dq && myRanking.average !== null && (() => {
          const reg = event.registrations?.find(r => (r.user?._id || r.user) === myRanking.shooter._id);
          const myCategoria = reg?.categoria;
          const myDivision = reg?.division;

          const enriched = rankings.map(r => {
            const rReg = event.registrations?.find(x => (x.user?._id || x.user) === r.shooter._id);
            return { ...r, categoria: rReg?.categoria, division: rReg?.division };
          });

          const leaderGeneral = enriched.filter(r => !r.dq && r.average !== null).sort((a, b) => a.average - b.average)[0];
          const leaderCat = enriched.filter(r => !r.dq && r.average !== null && r.categoria === myCategoria).sort((a, b) => a.average - b.average)[0];
          const leaderDiv = enriched.filter(r => !r.dq && r.average !== null && r.division === myDivision).sort((a, b) => a.average - b.average)[0];

          const pct = (leader) => leader && leader.average ? ((leader.average / myRanking.average) * 100).toFixed(1) + '%' : '—';
          const isMe = (leader) => leader?.shooter._id === myRanking.shooter._id;

          return (
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: '#f9fafb' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.625rem' }}>
                Diferencia porcentual con el líder
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'General', leader: leaderGeneral },
                  { label: `Cat. ${myCategoria || '—'}`, leader: leaderCat },
                  { label: `Div. ${myDivision || '—'}`, leader: leaderDiv },
                ].map(({ label, leader }) => {
                  const p = pct(leader);
                  const me = isMe(leader);
                  return (
                    <div key={label} style={{ flex: 1, minWidth: '100px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: me ? 'var(--primary)' : '#d97706' }}>
                        {me ? '🥇 Líder' : p}
                      </div>
                      {!me && leader && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>vs {leader.shooter.name}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Event total */}
        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 700 }}>Resultado final</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{myRanking.stagesCompleted} / {event.stages.length} etapas completadas</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: myRanking.dq ? '#ef4444' : 'var(--primary)' }}>
            {myRanking.dq ? 'DQ' : myRanking.average !== null && myRanking.average !== undefined ? myRanking.average.toFixed(2) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Results grouped by categoria or division ──────────────────────────────────

function GroupedResults({ rankings, stages, groupBy, isAdmin, setEditingReg, currentUserId }) {
  // Primary group: categoria or division
  // Sub group: the other one
  const primaryKey = groupBy === 'categoria' ? 'categoria' : 'division';
  const subKey = groupBy === 'categoria' ? 'division' : 'categoria';
  const primaryIcon = groupBy === 'categoria' ? '🎯' : '🔧';
  const subIcon = groupBy === 'categoria' ? '🔧' : '🎯';

  // Build nested groups: { primaryValue: { subValue: [rows] } }
  const groups = {};
  rankings.forEach(r => {
    const pk = r[primaryKey] || '—';
    const sk = r[subKey] || '—';
    if (!groups[pk]) groups[pk] = {};
    // Add to own category
    if (!groups[pk][sk]) groups[pk][sk] = [];
    groups[pk][sk].push(r);
    // Also duplicate into General if not already General
    if (groupBy === 'division' && sk !== 'General') {
      if (!groups[pk]['General']) groups[pk]['General'] = [];
      groups[pk]['General'].push({ ...r, _isGeneralDuplicate: true });
    }
    // Also add to alternative division group if shooter has one
    if (groupBy === 'division' && r.divisionAlternativa) {
      const altPk = r.divisionAlternativa;
      if (!groups[altPk]) groups[altPk] = {};
      const altSk = r[subKey] || '—';
      if (!groups[altPk][altSk]) groups[altPk][altSk] = [];
      // Add as alternative entry - won't rank
      groups[altPk][altSk].push({ ...r, _isAlternative: true, division: altPk });
      // Also add to General of alternative division
      if (altSk !== 'General') {
        if (!groups[altPk]['General']) groups[altPk]['General'] = [];
        groups[altPk]['General'].push({ ...r, _isAlternative: true, _isGeneralDuplicate: true, division: altPk });
      }
    }
  });

  // Sort subkeys so General always appears first
  const sortSubKeys = (keys) => {
    const sorted = [...keys].sort();
    if (sorted.includes('General')) {
      return ['General', ...sorted.filter(k => k !== 'General')];
    }
    return sorted;
  };

  const primaryKeys = Object.keys(groups).sort();

  if (primaryKeys.length === 0) return (
    <div className="empty-state"><div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No hay resultados disponibles</div></div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {primaryKeys.map(pk => {
        const subGroups = groups[pk];
        const subKeys = sortSubKeys(Object.keys(subGroups));
        const totalShooters = Object.values(subGroups).reduce((sum, arr) => sum + arr.length, 0);

        return (
          <div key={pk} className="card">
            {/* Primary group header - dark blue */}
            <div className="card-header" style={{ background: '#1e3a5f', borderBottom: '2px solid #1e3a5f' }}>
              <div className="card-title" style={{ fontSize: '1.05rem', color: '#fff' }}>
                {primaryIcon} {pk}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                {totalShooters} tirador{totalShooters !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Single table: one thead + multiple tbody per category */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tirador</th>
                    <th>Cat.</th>
                    <th>Div.</th>
                    {stages.map((s, idx) => <th key={s._id}>Et. {idx + 1}</th>)}
                    <th>Resultado final</th>
                    <th>%</th>
                  </tr>
                </thead>
                {subKeys.map((sk, i) => {
                  const subRows = subGroups[sk];
                  const nonDqSub = subRows.filter(r => !r.dq && !r._isAlternative);
                  const subLeaderRaw = nonDqSub.filter(r => r.average !== null && r.average !== undefined).reduce((min, r) => r.average < min ? r.average : min, Infinity);
                  const subLeader = subLeaderRaw === Infinity ? null : subLeaderRaw;
                  return (
                    <React.Fragment key={sk}>
                      <tbody>
                        <tr>
                          <td colSpan={4 + stages.length + 2} style={{
                            padding: '0.5rem 1rem',
                            background: '#bfdbfe',
                            borderTop: i > 0 ? '2px solid #93c5fd' : '1px solid #93c5fd',
                            borderBottom: '1px solid #93c5fd',
                          }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e3a5f' }}>{subIcon} {sk}</span>
                            <span style={{ fontSize: '0.8rem', color: '#1e40af', marginLeft: '0.5rem' }}>— {subRows.length} tirador{subRows.length !== 1 ? 'es' : ''}</span>
                          </td>
                        </tr>
                      </tbody>
                      <tbody>
                        {subRows.map((r) => {
                          const rowDq = r.dq;
                          const idx = nonDqSub.indexOf(r);
                          const pct = (!rowDq && r.average !== null && r.average !== undefined && subLeader !== null) ? (subLeader / r.average) * 100 : null;
                          const isLeader = !rowDq && r.average === subLeader;
                          const isAlt = r._isAlternative;
                          return (
                            <tr key={r.shooter._id + sk + (isAlt ? '_alt' : '')} style={{
                              background: rowDq ? '#fef2f2' : isAlt ? '#f0f7ff' : r.shooter._id === currentUserId ? 'rgba(42,125,79,0.05)' : '',
                              opacity: rowDq ? 0.8 : isAlt ? 0.85 : 1
                            }}>
                              <td>{rowDq ? <span style={{ fontSize: '1rem' }}>🟥</span> : isAlt ? <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>—</span> : <span className={`rank ${idx < 3 ? `rank-${idx + 1}` : ''}`}>{idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}</span>}</td>
                              <td>
                                <strong style={{ color: rowDq ? '#ef4444' : 'inherit', textDecoration: rowDq ? 'line-through' : 'none' }}>{r.shooter.name}</strong>
                                {r.shooter._id === currentUserId && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>YO</span>}
                                {rowDq && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>DQ</span>}
                                {isAlt && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', background: '#E6F1FB', color: '#185FA5', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>alt.</span>}
                              </td>
                              <td>
                                <span className="badge" style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.7rem' }}>{r.categoria || '—'}</span>
                                {isAdmin && !rowDq && setEditingReg && (
                                  <button onClick={() => setEditingReg({ userId: r.shooter._id, categoria: r.categoria, division: r.division })}
                                    style={{ marginLeft: '0.3rem', fontSize: '0.65rem', padding: '1px 6px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', color: '#6b7280' }}>✏️</button>
                                )}
                              </td>
                              <td><span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>{r.division || '—'}</span></td>
                              {stages.map(s => (
                                <td key={s._id}>{r.stageScores[s._id] === 'DQ' || (rowDq && r.stageScores[s._id] === undefined)
                                  ? <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>DQ</span>
                                  : r.stageScores[s._id] !== undefined ? parseFloat(r.stageScores[s._id]).toFixed(2) : <span style={{ color: 'var(--text-light)' }}>—</span>
                                }</td>
                              ))}
                              <td><strong style={{ color: rowDq ? '#ef4444' : isLeader ? 'var(--gold)' : 'var(--text)' }}>{rowDq ? 'DQ' : r.average !== null && r.average !== undefined ? r.average.toFixed(2) : '—'}</strong></td>
                              <td>{isAlt ? <span style={{ color: 'var(--text-light)' }}>—</span> : pct === null ? <span style={{ color: 'var(--text-light)' }}>—</span> : <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isLeader ? 'var(--primary)' : pct >= 90 ? '#ca8a04' : '#ef4444' }}>{isLeader ? '100%' : `${pct.toFixed(1)}%`}</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </React.Fragment>
                  );
                })}
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ResultsTab ───────────────────────────────────────────────────────────

export default function ResultsTab({ event, rankings, user, isAdmin, resultsTab, setResultsTab, setEditingReg }) {
  const isFinished = event.status === 'finished';
  const myRanking = rankings.find(r => r.shooter._id === user._id);

  // Enrich rankings with registration data
  const enriched = rankings.map(r => {
    const reg = event.registrations?.find(reg => (reg.user?._id || reg.user) === r.shooter._id);
    return { ...r, categoria: reg?.categoria, division: reg?.division, divisionAlternativa: reg?.divisionAlternativa || null };
  });

  const showGeneralTable = isAdmin || isFinished;
  const showGrouped = isAdmin || isFinished;

  const tabs = [
    { key: 'general', label: '🏆 Resultados Generales' },
    ...(showGrouped ? [
      { key: 'division', label: '🔧 Por División' },
    ] : []),
  ];

  return (
    <div>
      {/* Shooter: My Results always visible */}
      {!isAdmin && <MyResults event={event} myRanking={myRanking} rankings={rankings} />}

      {/* Sub-tabs */}
      {showGeneralTable && (
        <>
          <div className="tabs" style={{ marginBottom: '1rem' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={`tab ${resultsTab === t.key ? 'active' : ''}`}
                onClick={() => setResultsTab(t.key)}
                style={{ fontSize: '0.85rem' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {resultsTab === 'general' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">🏆 Resultados Generales</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}></div>
              </div>
              {enriched.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏆</div>
                  <div className="empty-state-text">No hay resultados disponibles aún</div>
                </div>
              ) : (
                <RankingsTable
                  rows={enriched}
                  stages={event.stages}
                  isAdmin={isAdmin}
                  setEditingReg={setEditingReg}
                  currentUserId={user._id}
                />
              )}
            </div>
          )}

          {resultsTab === 'division' && (
            <GroupedResults
              rankings={enriched}
              stages={event.stages}
              groupBy="division"
              isAdmin={isAdmin}
              setEditingReg={setEditingReg}
              currentUserId={user._id}
            />
          )}


        </>
      )}

      {/* Shooter during active event: message if general not available yet */}
      {!isAdmin && !isFinished && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: '#92400e' }}>
          📅 Los resultados generales estarán disponibles una vez que el evento finalice.
        </div>
      )}
    </div>
  );
}