import React, { useState, useRef } from 'react';
import {
  Activity, ArrowRight, Check, Clock, Copy, Eye,
  MoreHorizontal,
} from 'lucide-react';
import { USERS } from '../../constants/users';
import useClickOutside from '../../hooks/useClickOutside';
import API from '../../api';

/**
 * Individual task card with waveform, transcript, status tags,
 * inline complete form, and a functional three-dots dropdown menu.
 */
export default function TaskCard({
  task, currentUser, completeTask, openWorkflow, onConfirm,
  activeCompleteTaskId, setActiveCompleteTaskId,
  completeText, setCompleteText, notify,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  const bars = Array.from({ length: 28 });
  const myFirstName = currentUser.name.split(' ')[0].toLowerCase();
  const isAssignee = (task.assignee || '').toLowerCase().includes(myFirstName);
  const isCreator = task.capture_speaker === currentUser.name;
  const creatorEmail = USERS.find((u) => u.name === task.capture_speaker)?.email || 'system';
  const isCompleting = activeCompleteTaskId === task.id;

  // Status badge logic
  let statusLabel, statusClass;
  switch (task.status) {
    case 'assigned': statusLabel = 'ASSIGNED'; statusClass = 'blue'; break;
    case 'blocked':  statusLabel = 'BLOCKED';  statusClass = 'grey-tag'; break;
    case 'done':     statusLabel = 'DONE';     statusClass = 'green'; break;
    case 'open':     statusLabel = 'NEEDS ASSIGNMENT'; statusClass = 'orange-tag'; break;
    default:         statusLabel = task.status?.toUpperCase() || 'UNKNOWN'; statusClass = 'grey-tag';
  }
  if (task.needsReview) { statusLabel = 'NEEDS CONFIRMATION'; statusClass = 'purple'; }

  /* ── Three-dots menu actions ── */
  const handleCopyTitle = () => {
    navigator.clipboard.writeText(task.title).then(
      () => notify?.('Task title copied to clipboard', 'success'),
      () => notify?.('Failed to copy', 'error'),
    );
    setMenuOpen(false);
  };

  const handleQuickDone = async () => {
    setMenuOpen(false);
    try {
      const res = await API.resolveTask(task.id, 'Marked as done via quick action', currentUser);
      if (res.ok) notify?.('Task marked as done!', 'success');
      else notify?.('Failed to mark done', 'error');
    } catch (e) {
      notify?.('Error: ' + e.message, 'error');
    }
  };

  return (
    <article className={`capture ${task.status === 'blocked' ? 'blocked' : ''}`}>
      {/* Header */}
      <div className="capture-head">
        <span className={`speaker-avatar ${USERS.find((u) => u.name === task.capture_speaker)?.tone || 'grey'}`}>
          {task.capture_initials || task.initials || 'UN'}
        </span>
        <div className="capture-meta">
          <div>
            <strong>{task.capture_speaker || 'Unknown'}</strong>
            <span className="time">
              {creatorEmail} ·{' '}
              {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="tag-row">
            <span className={`tag ${statusClass}`}>{statusLabel}</span>
            {task.prior_context && <span className="tag green">HAS PRIOR DATA</span>}
          </div>
        </div>

        {/* Three-dots dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="more-button"
            aria-label="More options"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="dropdown-menu fade-in">
              <button onClick={() => { openWorkflow(task.capture_id); setMenuOpen(false); }}>
                <Eye size={14} /> View Workflow
              </button>
              <button onClick={handleCopyTitle}>
                <Copy size={14} /> Copy Title
              </button>
              {isAssignee && task.status === 'assigned' && (
                <button onClick={handleQuickDone} className="dropdown-danger">
                  <Check size={14} /> Mark as Done
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Waveform */}
      <div className="waveform">
        {bars.map((_, i) => (
          <span key={i} style={{ height: `${12 + ((i * 17) % 28)}px` }} />
        ))}
      </div>

      {/* Transcript */}
      <div className="transcript">
        <span className="quote">"</span>
        <p>{task.title}</p>
      </div>

      {/* Prior context data */}
      {task.prior_context && (
        <div className="data-box fade-in">
          <strong>📋 Data from previous step:</strong> {task.prior_context}
        </div>
      )}

      {/* Inline complete form */}
      {isCompleting && (
        <div className="inline-form fade-in">
          <span className="mini-label" style={{ marginBottom: '12px', display: 'block' }}>
            PROVIDE YOUR DATA TO COMPLETE THIS TASK
          </span>
          <textarea
            value={completeText}
            onChange={(e) => setCompleteText(e.target.value)}
            placeholder="Enter your response / data here..."
            autoFocus
          />
          <div className="inline-form-actions">
            <button
              className="secondary-button"
              onClick={() => { setActiveCompleteTaskId(null); setCompleteText(''); }}
            >
              Cancel
            </button>
            <button className="primary-button" onClick={() => completeTask(task.id)}>
              Submit &amp; Done <Check size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="capture-footer">
        <div className="action-preview">
          <span className={`check-box ${task.status === 'done' ? 'done' : ''}`}>
            {task.status === 'done' ? <Check size={16} strokeWidth={3} /> : ''}
          </span>
          <div>
            <span className="mini-label">
              ASSIGNEE: {(task.assignee || 'Unassigned').toUpperCase()}
            </span>
            <strong>{task.title}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {isCreator && (
            <button className="secondary-button" onClick={() => openWorkflow(task.capture_id)}>
              <Activity size={16} /> Status
            </button>
          )}

          {task.needsReview && onConfirm ? (
            <button className="review-button" onClick={onConfirm}>
              Confirm <ArrowRight size={16} />
            </button>
          ) : task.status === 'assigned' && isAssignee && !isCompleting ? (
            <button
              className="primary-button"
              onClick={() => { setActiveCompleteTaskId(task.id); setCompleteText(''); }}
            >
              Complete Task <Check size={16} />
            </button>
          ) : task.status === 'blocked' ? (
            <span className="assigned-label" style={{ color: '#94a3b8' }}>
              <Clock size={14} /> Waiting on prior step
            </span>
          ) : task.status === 'assigned' && !isAssignee ? (
            <span className="assigned-label">Assigned to {task.assignee}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
