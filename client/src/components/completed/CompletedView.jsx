import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { USERS } from '../../constants/users';
import API from '../../api';
import Heading from '../layout/Heading';
import SkeletonCards from '../common/SkeletonCards';

/**
 * Lists all completed (status='done') tasks for the current user.
 */
export default function CompletedView({ currentUser }) {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.fetchCompletedTasks(currentUser)
      .then((data) => { setCompletedTasks(data.tasks || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser]);

  if (loading) {
    return (
      <section className="view">
        <Heading eyebrow="LOADING…" title="Loading completed tasks…" copy="" />
        <SkeletonCards count={3} />
      </section>
    );
  }

  return (
    <section className="view">
      <Heading
        eyebrow={`COMPLETED TASKS · ${completedTasks.length} TOTAL`}
        title="Completed."
        copy="Tasks that have been finished by you or your team."
      />

      {completedTasks.length === 0 ? (
        <div className="empty-state fade-in">
          <Check size={64} strokeWidth={1.5} color="#10b981" />
          <h3>No completed tasks yet</h3>
          <p>Tasks will appear here once they are marked as done.</p>
        </div>
      ) : (
        <div className="capture-list fade-in" style={{ maxWidth: '800px' }}>
          {completedTasks.map((t) => (
            <article className="capture" key={t.id} style={{ opacity: 0.85 }}>
              <div className="capture-head">
                <span className={`speaker-avatar ${USERS.find((u) => u.name === t.capture_speaker)?.tone || 'grey'}`}>
                  {t.capture_initials || 'UN'}
                </span>
                <div className="capture-meta">
                  <div>
                    <strong>{t.capture_speaker || 'Unknown'}</strong>
                    <span className="time">
                      {new Date(t.updated_at || t.created_at).toLocaleDateString()} ·{' '}
                      {new Date(t.updated_at || t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="tag-row">
                    <span className="tag green">✓ DONE</span>
                    <span className="tag grey-tag">Assignee: {t.assignee || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 0 0' }}>
                <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>{t.title}</strong>
                {t.prior_context && (
                  <div className="data-box" style={{ margin: '12px 0 0' }}>
                    <strong>Data provided:</strong> {t.prior_context}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
