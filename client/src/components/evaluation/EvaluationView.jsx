import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import Heading from '../layout/Heading';

/**
 * Evaluation harness view with test-suite scores.
 * Includes a skeleton loading state on first render.
 */
export default function EvaluationView() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  /* Loading skeleton */
  if (loading) {
    return (
      <section className="view">
        <Heading
          eyebrow="EVALUATION HARNESS  ·  LOADING"
          title="We measure when it should stop."
          copy="Twenty test cases keep the model honest after every prompt change."
        />
        <div className="eval-grid fade-in">
          <div className="skeleton-card" style={{ padding: 32 }}>
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton" style={{ width: '50%', height: 56, marginTop: 16, borderRadius: 8 }} />
            <div className="skeleton skeleton-bar" style={{ marginTop: 20 }} />
            <div className="skeleton skeleton-text" style={{ width: '30%', marginTop: 12 }} />
          </div>
          <div className="skeleton-card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 24px' }}>
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ padding: '20px 24px', borderTop: '1px solid var(--line)' }}>
                <div className="skeleton skeleton-text" style={{ width: `${50 + i * 10}%` }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const suites = [
    ['Task extraction',    '96%', '2m ago'],
    ['Citation grounding', '93%', '2m ago'],
    ['Conflict detection', '84%', '2m ago'],
    ['Safe refusal',       '92%', '2m ago'],
  ];

  return (
    <section className="view">
      <Heading
        eyebrow="EVALUATION HARNESS  ·  RUN 08"
        title="We measure when it should stop."
        copy="Twenty test cases keep the model honest after every prompt change."
      >
        <button className="primary-button">
          <Activity size={16} /> Run evaluation
        </button>
      </Heading>

      <div className="eval-grid fade-in">
        {/* Score card */}
        <div className="eval-score" style={{ background: 'var(--sidebar-bg)' }}>
          <span className="stat-label" style={{ color: 'var(--sidebar-muted)' }}>OVERALL SCORE</span>
          <strong
            style={{
              color: '#fff', fontSize: '56px', fontWeight: 600,
              fontFamily: 'var(--serif)', display: 'block', margin: '16px 0',
            }}
          >
            91.4%
          </strong>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
            <span
              style={{
                width: '91.4%', height: '100%', display: 'block',
                background: 'var(--primary)', borderRadius: '999px',
              }}
            />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500, marginTop: '16px' }}>
            +4.2% since yesterday
          </p>
        </div>

        {/* Test suite table */}
        <div className="conflict-detail" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div
            style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr',
              padding: '16px 24px', background: '#f8fafc',
              borderBottom: '1px solid var(--line)',
              font: '600 11px var(--mono)', color: 'var(--muted)', letterSpacing: '0.05em',
            }}
          >
            <span>TEST SUITE</span><span>SCORE</span><span>LAST RUN</span>
          </div>
          {suites.map(([name, score, time]) => (
            <div
              key={name}
              style={{
                display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr',
                padding: '20px 24px', borderBottom: '1px solid var(--line)',
                fontSize: '14px', alignItems: 'center',
              }}
            >
              <strong style={{ color: 'var(--ink)' }}>{name}</strong>
              <span style={{ color: score === '84%' ? '#b45309' : 'var(--primary-dark)', fontWeight: 600 }}>
                {score}
              </span>
              <span style={{ color: 'var(--muted)' }}>{time}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
