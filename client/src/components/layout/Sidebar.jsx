import React, { useState, useRef } from 'react';
import { Activity, Check, ChevronDown, Inbox, MoreHorizontal, Users } from 'lucide-react';
import { USERS } from '../../constants/users';
import useClickOutside from '../../hooks/useClickOutside';

/**
 * App sidebar with navigation, workspace switcher, offline indicator,
 * and user account switcher that persists selection.
 */
export default function Sidebar({
  view, setView, offline, currentUser, setCurrentUser,
  myTasksCount, confirmationsCount,
}) {
  const [showUsers, setShowUsers] = useState(false);
  const dropRef = useRef(null);
  useClickOutside(dropRef, () => setShowUsers(false));

  const items = [
    ['inbox',      'Inbox',          Inbox,    myTasksCount > 0 ? myTasksCount.toString() : ''],
    ['completed',  'Completed',      Check,    ''],
    ['people',     'Team Directory', Users,    ''],
    ['evaluation', 'Evaluation',     Activity, ''],
  ];

  return (
    <aside className="sidebar fade-in">
      <div className="brand">
        <span className="brand-mark">क</span> kaamsetu
      </div>

      <button className="workspace">
        <span className="workspace-dot" /> Mehta Traders <ChevronDown size={14} />
      </button>

      <nav>
        {items.map(([id, label, Icon, count]) => (
          <button
            key={id}
            className={`nav-item ${view === id ? 'active' : ''}`}
            onClick={() => setView(id)}
          >
            <Icon size={18} strokeWidth={view === id ? 2.5 : 2} /> {label}
            {count && <span className="nav-count">{count}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {/* Offline / local-mode indicator */}
        <div className="offline-card">
          <span className="offline-dot" />
          <div>
            <strong>{offline ? 'Local mode active' : 'Local mode ready'}</strong>
            <p>Works without network</p>
          </div>
        </div>

        {/* Profile & account switcher */}
        <div
          className="profile"
          ref={dropRef}
          onClick={() => setShowUsers(!showUsers)}
          style={{ position: 'relative' }}
        >
          <span className={`avatar ${currentUser.tone}`}>{currentUser.initials}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.email}</small>
          </div>
          <MoreHorizontal size={16} />

          {showUsers && (
            <div className="user-switcher fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="user-switcher-label">Switch Account</div>
              {USERS.map((u) => (
                <div
                  key={u.id}
                  className={`user-switcher-item ${u.id === currentUser.id ? 'active' : ''}`}
                  onClick={() => { setCurrentUser(u); setShowUsers(false); }}
                >
                  <span className={`avatar ${u.tone}`} style={{ width: 28, height: 28, fontSize: '11px' }}>
                    {u.initials}
                  </span>
                  <div style={{ lineHeight: 1.2 }}>
                    <span style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 500, display: 'block' }}>
                      {u.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{u.role}</span>
                  </div>
                  {u.id === currentUser.id && (
                    <Check size={14} color="#10b981" style={{ marginLeft: 'auto' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
