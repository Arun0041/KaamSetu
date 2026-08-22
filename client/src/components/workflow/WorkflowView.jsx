import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Mic } from 'lucide-react';
import API from '../../api';
import Heading from '../layout/Heading';

/**
 * Workflow timeline view — shows the full execution chain for a capture
 * with a progress bar and step-by-step status.
 */
export default function WorkflowView({ captureId, currentUser, setView }) {
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!captureId) return;
    setLoading(true);
    API.fetchWorkflow(captureId, currentUser)
      .then((data) => { setChain(data.tasks || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [captureId, currentUser]);

  /* Loading skeleton */
  if (loading) {
    return (
      <section className="view">
        <Heading eyebrow="LOADING…" title="Fetching workflow…" copy="">
          <button className="secondary-button" onClick={() => setView('inbox')}>Back to Inbox</button>
        </Heading>
        <div className="skeleton-card fade-in" style={{ maxWidth: '800px' }}>
          <div className="skeleton-row">
            <div className="skeleton skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-text short" style={{ width: '30%', marginTop: 8 }} />
            </div>
          </div>
          <div className="skeleton skeleton-bar" style={{ marginTop: 24 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row" style={{ marginTop: 24, gap: 24 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* Empty state */
  if (!chain.length) {
    return (
      <section className="view">
        <Heading eyebrow="WORKFLOW STATUS" title="Workflow not found" copy="">
          <button className="secondary-button" onClick={() => setView('inbox')}>Back to Inbox</button>
        </Heading>
        <div className="empty-state">
          <h3>We couldn't find this workflow.</h3>
        </div>
      </section>
    );
  }

  const speaker = chain[0]?.capture_speaker || 'Unknown';
  const doneCount = chain.filter((t) => t.status === 'done').length;
  const totalCount = chain.length;

  return (
    <section className="view">
      <Heading
        eyebrow={`WORKFLOW · INITIATED BY ${speaker.toUpperCase()} · ${doneCount}/${totalCount} COMPLETE`}
        title="Chain Status"
        copy="Track sequential and parallel execution of actions."
      >
        <button className="secondary-button" onClick={() => setView('inbox')}>
          <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Inbox
        </button>
      </Heading>

      <div className="conflict-detail fade-in">
        {/* Original voice note */}
        <div className="conflict-title">
          <div className="review-icon" style={{ background: '#e2e8f0', color: '#475569' }}>
            <Mic size={16} />
          </div>
          <div>
            <span className="mini-label">ORIGINAL VOICE NOTE</span>
            <h2>"{chain[0].capture_transcript}"</h2>
            <p>Captured {new Date(chain[0].created_at).toLocaleString()}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '32px 32px 0' }}>
          <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(doneCount / totalCount) * 100}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>

        {/* Timeline steps */}
        <div className="workflow-timeline">
          <span className="mini-label" style={{ margin: '32px 0 16px', display: 'block' }}>
            ACTION CHAIN ({doneCount}/{totalCount} complete)
          </span>

          {chain.map((task, index) => {
            let statusColor, statusLabel, bgColor, borderColor;
            switch (task.status) {
              case 'done':
                statusColor = 'var(--primary)'; statusLabel = '✓ DONE';
                bgColor = 'var(--primary-soft)'; borderColor = '#6ee7b7'; break;
              case 'assigned':
                statusColor = '#3b82f6'; statusLabel = '⏳ WAITING FOR RESPONSE';
                bgColor = '#eff6ff'; borderColor = '#93c5fd'; break;
              case 'blocked':
                statusColor = '#94a3b8'; statusLabel = '🔒 BLOCKED';
                bgColor = '#f8fafc'; borderColor = '#cbd5e1'; break;
              case 'open':
                statusColor = '#f59e0b'; statusLabel = '📋 NEEDS ASSIGNMENT';
                bgColor = '#fffbeb'; borderColor = '#fcd34d'; break;
              default:
                statusColor = '#94a3b8'; statusLabel = task.status?.toUpperCase();
                bgColor = '#f8fafc'; borderColor = '#cbd5e1';
            }

            return (
              <div key={task.id} className="timeline-item">
                <div className="timeline-line-wrap">
                  <div
                    className="timeline-dot"
                    style={{
                      background: task.status === 'done' ? statusColor : '#fff',
                      borderColor: statusColor,
                      color: task.status === 'done' ? '#fff' : statusColor,
                    }}
                  >
                    {task.status === 'done' ? <Check size={20} strokeWidth={3} /> : index + 1}
                  </div>
                  {index < chain.length - 1 && (
                    <div className="timeline-line" style={{ background: task.status === 'done' ? statusColor : '#e2e8f0' }} />
                  )}
                </div>

                <div className="timeline-card" style={{ background: bgColor, borderColor }}>
                  <div className="timeline-card-header">
                    <h3>{task.title}</h3>
                    <span
                      className="timeline-badge"
                      style={{ color: statusColor, background: '#fff', border: `1px solid ${borderColor}` }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="timeline-meta">
                    Assignee: <strong style={{ color: '#0f172a' }}>{task.assignee || 'Unassigned'}</strong>
                    {task.depends_on && (
                      <span style={{ marginLeft: '12px', color: '#94a3b8' }}>
                        · Depends on step {chain.findIndex((c) => c.id === task.depends_on) + 1}
                      </span>
                    )}
                  </div>
                  {task.prior_context && task.status === 'done' && (
                    <div className="data-box" style={{ background: '#fff', margin: '16px 0 0' }}>
                      <strong>Data provided:</strong> {task.prior_context}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
