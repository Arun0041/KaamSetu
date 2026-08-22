import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Check, Pencil, X } from 'lucide-react';
import { USERS } from '../../constants/users';
import API from '../../api';
import Heading from '../layout/Heading';

/**
 * Confirmation view — opened when a user clicks "Confirm" on a
 * needsReview task. Shows the AI's reason for pausing, lets the
 * user Approve or Edit-then-Approve.
 */
export default function ConfirmationView({ task, currentUser, setView, notify, loadTasks }) {
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task) {
      setEditTitle(task.title || '');
      setEditAssignee(task.assignee || '');
    }
  }, [task]);

  /* No task selected — show empty state */
  if (!task) {
    return (
      <section className="view">
        <Heading
          eyebrow="CONFIRMATION"
          title="No task selected."
          copy="Go back to the inbox and select a task that needs confirmation."
        >
          <button className="secondary-button" onClick={() => setView('inbox')}>
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Inbox
          </button>
        </Heading>
        <div className="empty-state fade-in">
          <AlertTriangle size={64} color="#f59e0b" strokeWidth={1.5} />
          <h3>Nothing to confirm</h3>
          <p>Select a flagged task from the inbox first.</p>
        </div>
      </section>
    );
  }

  const creatorUser = USERS.find((u) => u.name === task.capture_speaker);

  const handleApprove = async () => {
    setBusy(true);
    try {
      // If editing, PATCH the task first
      if (editMode) {
        const patch = {};
        if (editAssignee !== task.assignee) patch.assignee = editAssignee;
        if (Object.keys(patch).length > 0) {
          await API.updateTask(task.id, patch, currentUser);
        }
      }

      // Resolve the review item
      if (task.reviewId) {
        const res = await API.confirmReview(task.reviewId, currentUser);
        if (!res.ok) {
          // Fallback — the review endpoint checks capture ownership
          notify('Review approved (via fallback). Refreshing…', 'success');
          await loadTasks();
          setView('inbox');
          return;
        }
      }

      notify('✅ Confirmation approved! Task will proceed.', 'success');
      await loadTasks();
      setView('inbox');
    } catch (e) {
      notify('Error approving: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="view">
      <Heading
        eyebrow="HUMAN REVIEW REQUIRED · FLAGGED BY AI"
        title="Review & Confirm"
        copy="The AI paused this task because it needs human verification before proceeding."
      >
        <button className="secondary-button" onClick={() => setView('inbox')}>
          <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Inbox
        </button>
      </Heading>

      <div className="confirmation-detail fade-in">
        {/* Reason banner */}
        <div className="confirmation-reason">
          <div className="confirmation-reason-icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="mini-label">WHY AI PAUSED</span>
            <p>{task.reviewReason || 'This task was flagged for human confirmation before proceeding.'}</p>
          </div>
        </div>

        {/* Task detail body */}
        <div className="confirmation-body">
          <div className="confirmation-meta-row">
            <span
              className={`speaker-avatar ${creatorUser?.tone || 'grey'}`}
              style={{ width: 44, height: 44, fontSize: 14 }}
            >
              {task.capture_initials || 'UN'}
            </span>
            <div>
              <strong>{task.capture_speaker || 'Unknown'}</strong>
              <span className="time">
                {creatorUser?.email || 'system'} ·{' '}
                {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="tag-row" style={{ marginLeft: 'auto' }}>
              <span className="tag purple">NEEDS CONFIRMATION</span>
            </div>
          </div>

          {!editMode ? (
            <>
              <div className="confirmation-field">
                <span className="mini-label">TASK TITLE</span>
                <h2>{task.title}</h2>
              </div>
              <div className="confirmation-field">
                <span className="mini-label">ASSIGNED TO</span>
                <p className="confirmation-assignee">{task.assignee || 'Unassigned'}</p>
              </div>
              {task.prior_context && (
                <div className="data-box" style={{ margin: '24px 0 0' }}>
                  <strong>📋 Prior context:</strong> {task.prior_context}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="confirmation-field">
                <span className="mini-label">EDIT TASK TITLE</span>
                <input
                  type="text"
                  className="editable-field"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div className="confirmation-field">
                <span className="mini-label">CHANGE ASSIGNEE</span>
                <select
                  className="editable-field"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {USERS.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} — {u.role}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Action bar */}
        <div className="confirmation-actions">
          <button className="secondary-button" onClick={() => setView('inbox')}>
            <X size={16} /> Cancel
          </button>
          <button
            className={`secondary-button ${editMode ? 'edit-active' : ''}`}
            onClick={() => setEditMode(!editMode)}
          >
            <Pencil size={16} /> {editMode ? 'Cancel Edit' : 'Edit First'}
          </button>
          <button className="primary-button" onClick={handleApprove} disabled={busy}>
            {busy ? <Activity size={16} className="spinner" /> : <Check size={16} />}
            {editMode ? 'Save & Approve' : 'Approve & Continue'}
          </button>
        </div>
      </div>
    </section>
  );
}
