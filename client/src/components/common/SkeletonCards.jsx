import React from 'react';

/**
 * Skeleton loading placeholder that mimics the shape of task cards.
 * Renders `count` shimmer cards for a polished loading state.
 */
export default function SkeletonCards({ count = 3 }) {
  return (
    <div className="capture-list">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-card fade-in"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="skeleton-row">
            <div className="skeleton skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: '40%' }} />
              <div className="skeleton skeleton-text short" style={{ width: '25%', marginTop: 8 }} />
            </div>
          </div>
          <div className="skeleton skeleton-bar" style={{ marginTop: 20 }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: 16 }} />
          <div className="skeleton skeleton-text" style={{ width: '55%', marginTop: 8 }} />
          <div className="skeleton-row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
            <div className="skeleton skeleton-text" style={{ width: '30%' }} />
            <div className="skeleton skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}
