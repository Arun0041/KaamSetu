import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Dark-themed sidebar panel listing tasks that need human confirmation.
 * Clicking an item navigates to the ConfirmationView.
 */
export default function ReviewQueue({ tasks, setActiveConfirmation, setView }) {
  return (
    <div className="review-panel fade-in">
      <div className="panel-label">
        <span className="pulse-dot" /> PENDING CONFIRMATIONS{' '}
        <span className="queue-count">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="review-item" style={{ borderTop: 0, paddingBottom: 0 }}>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            No pending confirmations
          </p>
        </div>
      ) : (
        tasks.slice(0, 3).map((t) => (
          <div
            className="review-item"
            key={t.id}
            onClick={() => { setActiveConfirmation(t); setView('confirmations'); }}
          >
            <span className="review-icon orange-bg">!</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                {t.title}
              </strong>
              <small>{t.capture_speaker}</small>
            </div>
            <ArrowRight size={16} />
          </div>
        ))
      )}

      {tasks.length > 0 && (
        <button className="panel-link" onClick={() => setView('completed')}>
          View completed tasks <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
