import React from 'react';

/**
 * Stats row showing key metrics at a glance.
 */
function Stat({ label, value, note, orange }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className={orange ? 'orange' : ''}>{value}</strong>
      <span className="stat-note">{note}</span>
    </div>
  );
}

export default function Stats({ myTasks, created, confirmations, total }) {
  return (
    <div className="stats-row">
      <Stat
        label="MY ACTIONS"
        value={myTasks.toString().padStart(2, '0')}
        note="Assigned to you"
        orange={myTasks > 0}
      />
      <Stat
        label="CONFIRMATIONS"
        value={confirmations.toString().padStart(2, '0')}
        note={confirmations > 0 ? 'Needs review' : 'All clear'}
        orange={confirmations > 0}
      />
      <Stat
        label="DELEGATED"
        value={created.toString().padStart(2, '0')}
        note="Workflows you started"
      />
      <Stat
        label="TOTAL ACTIVE"
        value={total.toString().padStart(2, '0')}
        note="Across all tasks"
      />
    </div>
  );
}
