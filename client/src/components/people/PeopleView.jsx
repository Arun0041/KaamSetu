import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  USERS, TONE_CYCLE,
  getStoredPeople, saveStoredPeople, autoInitials,
} from '../../constants/users';
import Heading from '../layout/Heading';

/**
 * Team directory with built-in users + custom people stored
 * in localStorage.  Includes an "Add person" modal.
 */
export default function PeopleView() {
  const [customPeople, setCustomPeople] = useState(getStoredPeople);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: '', initials: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const builtInPeople = USERS.map((u) => ({
    initials: u.initials,
    tone: u.tone,
    name: u.name,
    email: u.email,
    role: u.role,
    builtIn: true,
  }));

  const allPeople = [
    ...builtInPeople,
    ...customPeople.map((p) => ({ ...p, builtIn: false })),
  ];

  const handleAdd = () => {
    if (!form.name.trim() || !form.role.trim()) return;
    const newPerson = {
      initials: form.initials.trim() || autoInitials(form.name),
      tone: TONE_CYCLE[customPeople.length % TONE_CYCLE.length],
      name: form.name.trim(),
      email: form.email.trim() || `${form.name.trim().toLowerCase().replace(/\s+/g, '.')}@kaamsetu.in`,
      role: form.role.trim(),
    };
    const updated = [...customPeople, newPerson];
    setCustomPeople(updated);
    saveStoredPeople(updated);
    setForm({ name: '', email: '', role: '', initials: '' });
    setShowModal(false);
  };

  const handleRemove = (customIndex) => {
    const updated = customPeople.filter((_, i) => i !== customIndex);
    setCustomPeople(updated);
    saveStoredPeople(updated);
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <section className="view">
        <Heading eyebrow="TEAM GRAPH  ·  LOADING" title="People behind the work." copy="Assignments stay accountable to the humans who can move them." />
        <div className="people-grid fade-in">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div className="skeleton-card person-skeleton" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="skeleton" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton skeleton-text short" style={{ width: '80%', marginTop: 8 }} />
              </div>
              <div className="skeleton" style={{ width: 56, height: 28, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="view">
      <Heading
        eyebrow={`TEAM GRAPH  ·  ${String(allPeople.length).padStart(2, '0')} MEMBERS`}
        title="People behind the work."
        copy="Assignments stay accountable to the humans who can move them."
      >
        <button className="primary-button" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add person
        </button>
      </Heading>

      <div className="people-grid fade-in">
        {allPeople.map((p, i) => (
          <div className="person" key={p.name + i} style={{ animationDelay: `${i * 0.05}s` }}>
            <span className={`large-avatar ${p.tone}`}>{p.initials}</span>
            <div>
              <h3>{p.name}</h3>
              <p>{p.email} · {p.role}</p>
            </div>
            {p.builtIn ? (
              <span className="person-status">Active</span>
            ) : (
              <button
                className="person-remove"
                title="Remove"
                onClick={() => handleRemove(i - builtInPeople.length)}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Add Person Modal ── */}
      {showModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowModal(false)}>
          <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Team Member</h2>
              <button className="icon-button" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <label className="modal-label">
                <span className="mini-label">FULL NAME *</span>
                <input
                  type="text"
                  className="editable-field"
                  placeholder="e.g. Neha Gupta"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </label>
              <label className="modal-label">
                <span className="mini-label">EMAIL</span>
                <input
                  type="email"
                  className="editable-field"
                  placeholder="e.g. neha@kaamsetu.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label className="modal-label">
                  <span className="mini-label">ROLE *</span>
                  <input
                    type="text"
                    className="editable-field"
                    placeholder="e.g. Finance"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </label>
                <label className="modal-label">
                  <span className="mini-label">INITIALS (auto)</span>
                  <input
                    type="text"
                    className="editable-field"
                    placeholder={form.name ? autoInitials(form.name) : 'NG'}
                    maxLength={3}
                    value={form.initials}
                    onChange={(e) => setForm({ ...form, initials: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={handleAdd}
                disabled={!form.name.trim() || !form.role.trim()}
              >
                <Plus size={16} /> Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
