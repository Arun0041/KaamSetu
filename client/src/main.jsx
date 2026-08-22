import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Check, ChevronDown, CircleHelp, Clock, FileWarning, FileText, Inbox, Menu, Mic, MoreHorizontal, Play, Search, ShieldCheck, Users, WifiOff, X, LayoutDashboard } from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const USERS = [
  { id: 'anika', initials: 'AK', name: 'Anika Kapoor', role: 'Owner', tone: 'blue', email: 'anika@kaamsetu.in' },
  { id: 'ravi', initials: 'RM', name: 'Ravi Mehta', role: 'Owner', tone: 'saffron', email: 'ravi@kaamsetu.in' },
  { id: 'ravi2', initials: 'RK', name: 'Ravi Kumar', nickname: 'RK', role: 'Sales', tone: 'purple', email: 'ravi.k@kaamsetu.in' },
  { id: 'rahul', initials: 'RS', name: 'Rahul Sharma', role: 'Procurement', tone: 'teal', email: 'rahul@kaamsetu.in' },
  { id: 'mohan', initials: 'MV', name: 'Mohan Verma', role: 'Dispatch', tone: 'lilac', email: 'mohan@kaamsetu.in' },
  { id: 'priya', initials: 'PS', name: 'Priya Shah', role: 'Operations', tone: 'saffron', email: 'priya@kaamsetu.in' }
];

const API = {
  async token(user) {
    if (!user) return 'mock_default';
    const storedKey = `kaamsetu_token_${user.id}`;
    const stored = localStorage.getItem(storedKey);
    if (stored && !stored.startsWith('mock_')) return stored;
    
    const email = user.email;
    const password = 'demo-password-123';
    const name = user.name;
    let res = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(storedKey, data.accessToken);
      return data.accessToken;
    }
    res = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(storedKey, data.accessToken);
      return data.accessToken;
    }
    return `mock_${user.id}`;
  },
  async ingestText(transcript, user) {
    const token = await this.token(user);
    const res = await fetch(`${API_URL}/api/ingest/text`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ transcript }) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem(`kaamsetu_token_${user?.id}`);
      throw new Error('Token expired. Please click send again.');
    }
    if (!res.ok) throw new Error(data.error || 'Processing failed');
    return Array.isArray(data) ? data : [data];
  },
  async fetchTasks(user) {
    const token = await this.token(user);
    const res = await fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      localStorage.removeItem(`kaamsetu_token_${user?.id}`);
      throw new Error('Token expired');
    }
    if (!res.ok) throw new Error('Failed to load tasks');
    return res.json();
  },
  async fetchCompletedTasks(user) {
    const token = await this.token(user);
    const res = await fetch(`${API_URL}/api/tasks/completed`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { tasks: [] };
    return res.json();
  },
  async resolveTask(taskId, resolutionText, user) {
    const token = await this.token(user);
    return fetch(`${API_URL}/api/tasks/${taskId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resolutionText })
    });
  },
  async fetchWorkflow(captureId, user) {
    const token = await this.token(user);
    const res = await fetch(`${API_URL}/api/tasks/workflow/${captureId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { tasks: [] };
    return res.json();
  }
};

function App() {
  const [view, setView] = useState('inbox');
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [activeConfirmation, setActiveConfirmation] = useState(null);
  
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [offline, setOffline] = useState(false);
  const [inputMode, setInputMode] = useState('text');
  const [textDraft, setTextDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [workflowCaptureId, setWorkflowCaptureId] = useState(null);
  const [activeCompleteTaskId, setActiveCompleteTaskId] = useState(null);
  const [completeText, setCompleteText] = useState('');
  
  const loadTasks = async () => {
    try {
      const data = await API.fetchTasks(currentUser);
      setTasks(data.tasks || []);
    } catch (e) {
      console.error('loadTasks error:', e);
    }
  };

  useEffect(() => {
    USERS.forEach(u => {
      if (u.id !== currentUser.id) localStorage.removeItem(`kaamsetu_token_${u.id}`);
    });
    setTasks([]);
    setView('inbox');
    setTextDraft('');
    loadTasks();
  }, [currentUser]);

  useEffect(() => { 
    fetch(`${API_URL}/api/health`).then(r => { if (!r.ok) setOffline(true); }).catch(() => setOffline(true)); 
  }, []);
  
  const notify = (message, type = 'info') => { 
    setToast({ message, type }); 
    window.clearTimeout(window.__toast); 
    window.__toast = window.setTimeout(() => setToast({ message: '', type: 'info' }), 4000); 
  };
  
  const submitText = async () => {
    const text = textDraft.trim();
    if (!text) { notify('Type the instruction first', 'error'); return; }
    setBusy(true);
    try {
      await API.ingestText(text, currentUser);
      notify('Tasks extracted and workflow created!', 'success');
      setTextDraft('');
      await loadTasks();
    } catch (e) { notify(e.message || 'Processing failed', 'error'); } finally { setBusy(false); }
  };

  const completeTask = async (taskId) => {
    if (!completeText.trim()) { notify('Please provide data to complete the task', 'error'); return; }
    try {
      const res = await API.resolveTask(taskId, completeText.trim(), currentUser);
      if (!res.ok) { notify('Failed to complete task', 'error'); return; }
      notify('Task completed! Next step in chain has been unblocked.', 'success');
      setActiveCompleteTaskId(null);
      setCompleteText('');
      await loadTasks();
    } catch (e) { notify('Error: ' + e.message, 'error'); }
  };

  const openWorkflow = (captureId) => {
    setWorkflowCaptureId(captureId);
    setView('workflow');
  };

  const myFirstName = currentUser.name.split(' ')[0].toLowerCase();
  const myFullName = currentUser.name.toLowerCase();

  const isAssignedToMe = (t) => {
    const a = (t.assignee || '').toLowerCase();
    return a.includes(myFirstName) || a.includes(myFullName);
  };
  const isCreatedByMe = (t) => t.capture_user_id === undefined ? t.capture_speaker === currentUser.name : false;

  const myTasks = tasks.filter(t => isAssignedToMe(t) && t.status === 'assigned');
  const myCreatedTasks = tasks.filter(t => t.capture_speaker === currentUser.name && !isAssignedToMe(t));
  const confirmationTasks = tasks.filter(t => t.needsReview);

  return <div className="app-shell">
    <Sidebar view={view} setView={setView} offline={offline} currentUser={currentUser} setCurrentUser={setCurrentUser} 
      myTasksCount={myTasks.length} confirmationsCount={confirmationTasks.length} totalCount={tasks.length} />
    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumb">Mehta Traders <b>/</b> <span>{view.charAt(0).toUpperCase() + view.slice(1)}</span></div>
        <div className="top-actions">
          {offline ? <span className="sync-status offline"><WifiOff size={14}/> Local mode</span> : <span className="sync-status"><i/> Synced</span>}
          <button className="icon-button" aria-label="Search"><Search size={18}/></button>
          <button className="icon-button" aria-label="Notifications"><CircleHelp size={18}/></button>
        </div>
      </header>
      
      {view === 'inbox' && <InboxView tasks={tasks} myTasks={myTasks} myCreatedTasks={myCreatedTasks} confirmationTasks={confirmationTasks}
        inputMode={inputMode} setInputMode={setInputMode} textDraft={textDraft} setTextDraft={setTextDraft} 
        submitText={submitText} busy={busy} currentUser={currentUser} completeTask={completeTask} 
        openWorkflow={openWorkflow} setActiveConfirmation={setActiveConfirmation} setView={setView}
        activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId}
        completeText={completeText} setCompleteText={setCompleteText} />}
        
      {view === 'completed' && <CompletedView currentUser={currentUser} />}
      {view === 'workflow' && <WorkflowView captureId={workflowCaptureId} currentUser={currentUser} setView={setView} />}
      {view === 'people' && <PeopleView />}
      {view === 'evaluation' && <EvaluationView />}
      
    </main>
    <div className={`toast ${toast.message ? 'show' : ''} ${toast.type === 'error' ? 'error' : ''}`} role="status">
      {toast.message}
    </div>
  </div>;
}

function Sidebar({ view, setView, offline, currentUser, setCurrentUser, myTasksCount, confirmationsCount, totalCount }) { 
  const [showUsers, setShowUsers] = useState(false); 
  const items = [
    ['inbox', 'Inbox', Inbox, myTasksCount > 0 ? myTasksCount.toString() : ''],
    ['completed', 'Completed', Check, ''],
    ['people', 'Team Directory', Users, ''],
    ['evaluation', 'Evaluation', Activity, '']
  ]; 
  
  return <aside className="sidebar fade-in">
    <div className="brand"><span className="brand-mark">क</span> kaamsetu</div>
    <button className="workspace">
      <span className="workspace-dot"/> Mehta Traders <ChevronDown size={14}/>
    </button>
    <nav>
      {items.map(([id, label, Icon, count]) => 
        <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
          <Icon size={18} strokeWidth={view === id ? 2.5 : 2} /> {label}
          {count && <span className="nav-count">{count}</span>}
        </button>
      )}
    </nav>
    <div className="sidebar-bottom">
      <div className="offline-card">
        <span className="offline-dot"/>
        <div>
          <strong>{offline ? 'Local mode active' : 'Local mode ready'}</strong>
          <p>Works without network</p>
        </div>
      </div>
      <div className="profile" onClick={() => setShowUsers(!showUsers)} style={{ position: 'relative' }}>
        <span className={`avatar ${currentUser.tone}`}>{currentUser.initials}</span>
        <div>
          <strong>{currentUser.name}</strong>
          <small>{currentUser.email}</small>
        </div>
        <MoreHorizontal size={16}/>
        
        {showUsers && (
          <div className="fade-in" style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, width: '100%', 
            background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px', padding: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', zIndex: 50
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', padding: '4px 8px 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Switch Account</div>
            {USERS.map(u => (
              <div key={u.id} style={{
                padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', 
                borderRadius: '8px', transition: '0.2s', background: u.id === currentUser.id ? 'rgba(255,255,255,0.05)' : 'transparent'
              }} 
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = u.id === currentUser.id ? 'rgba(255,255,255,0.05)' : 'transparent'}
              onClick={() => { setCurrentUser(u); setShowUsers(false); }}>
                <span className={`avatar ${u.tone}`} style={{ width: 28, height: 28, fontSize: '11px' }}>{u.initials}</span>
                <div style={{ lineHeight: 1.2 }}>
                  <span style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 500, display: 'block' }}>{u.name}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{u.role}</span>
                </div>
                {u.id === currentUser.id && <Check size={14} color="#10b981" style={{ marginLeft: 'auto' }}/>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </aside>; 
}

function Heading({ eyebrow, title, children, copy }) { 
  return <div className="view-heading fade-in">
    <div>
      <div className="eyebrow">{eyebrow}<span className="eyebrow-line"/></div>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
    {children}
  </div>; 
}

function VoiceRecorder({ onText, textDraft }) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState('');
  
  const toggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { onText('Microphone unavailable. Please type.'); return; }
    if (recording) { window.recognition?.stop(); setRecording(false); setInterim(''); return; }
    
    const r = new SpeechRecognition(); r.lang = 'en-IN'; r.continuous = true; r.interimResults = true;
    r.onresult = e => { 
      let finalT = ''; let interimT = '';
      Array.from(e.results).forEach(res => { if (res.isFinal) finalT += res[0].transcript + ' '; else interimT += res[0].transcript; });
      onText(finalT.trim()); setInterim(interimT);
    };
    r.onend = () => { setRecording(false); setInterim(''); };
    r.onerror = () => { setRecording(false); setInterim(''); };
    r.start(); window.recognition = r; setRecording(true);
  };
  
  return (
    <div className="voice-input-options fade-in">
      <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
        <span className="mini-label">VOICE NOTE INPUT</span>
        <button type="button" className={`secondary-button ${recording ? 'recording-active' : ''}`} onClick={toggle}>
          <Mic size={16}/> {recording ? 'Stop recording' : 'Record voice note'}
        </button>
      </div>
      {(textDraft || interim) && (
        <div className="data-box fade-in" style={{ margin: 0 }}>
          <strong>Transcript: </strong>{textDraft} <span style={{color: '#94a3b8', fontStyle: 'italic'}}>{interim}</span>
        </div>
      )}
    </div>
  );
}

function InboxView({ tasks, myTasks, myCreatedTasks, confirmationTasks, inputMode, setInputMode, textDraft, setTextDraft, submitText, busy, currentUser, completeTask, openWorkflow, setActiveConfirmation, setView, activeCompleteTaskId, setActiveCompleteTaskId, completeText, setCompleteText }) { 
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  
  return <section className="view">
    <Heading eyebrow={`${today}  ·  ${currentUser.email}`} title={`Good morning, ${currentUser.name.split(' ')[0]}.`} copy="Turn the voice notes your team already sends into work that actually moves."></Heading>
    
    <div className="capture-compose fade-in">
      <div className="segmented">
        <button className={inputMode === 'voice' ? 'active' : ''} onClick={() => setInputMode('voice')}><Mic size={16}/> Voice note</button>
        <button className={inputMode === 'text' ? 'active' : ''} onClick={() => setInputMode('text')}><FileText size={16}/> Text command</button>
      </div>
      
      {inputMode === 'text' ? (
        <div className="text-input fade-in">
          <textarea value={textDraft} onChange={e => setTextDraft(e.target.value)} placeholder='e.g. "Ravi Mehta se bolo ki vah Apne Sare employee detail De aur FIR Mohan se bolo vah Sare data portal per update Karke"' rows={3}/>
          <button className="primary-button" onClick={submitText} disabled={busy}>
            {busy ? <Activity size={16} className="spinner" /> : <ArrowRight size={16}/>} 
            {busy ? 'Processing…' : 'Send to KaamSetu'}
          </button>
        </div>
      ) : (
        <div className="voice-input-wrapper fade-in">
          <VoiceRecorder onText={setTextDraft} textDraft={textDraft} />
          {textDraft && (
            <button className="primary-button" onClick={submitText} disabled={busy} style={{marginTop: '16px'}}>
              {busy ? <Activity size={16} className="spinner" /> : <Play size={14} fill="currentColor"/>} 
              {busy ? 'Processing…' : 'Process Voice Note'}
            </button>
          )}
        </div>
      )}
    </div>

    <div className="fade-in" style={{ animationDelay: '0.1s' }}>
      <Stats myTasks={myTasks.length} created={myCreatedTasks.length} confirmations={confirmationTasks.length} total={tasks.length} />
    </div>

    <div className="content-grid fade-in" style={{ animationDelay: '0.2s' }}>
      <div>
        {myTasks.length > 0 && (
          <div style={{marginBottom: '48px'}}>
            <div className="section-header">
              <div><h2>🔴 Assigned to you</h2><p>Complete these tasks and provide your data.</p></div>
            </div>
            <div className="capture-list">
              {myTasks.map(t => <TaskCard key={t.id} task={t} currentUser={currentUser} completeTask={completeTask} openWorkflow={openWorkflow} activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId} completeText={completeText} setCompleteText={setCompleteText} />)}
            </div>
          </div>
        )}

        {confirmationTasks.length > 0 && (
          <div style={{marginBottom: '48px'}}>
            <div className="section-header">
              <div><h2>⚠️ Needs confirmation</h2><p>AI paused these for human review.</p></div>
            </div>
            <div className="capture-list">
              {confirmationTasks.map(t => <TaskCard key={t.id} task={t} currentUser={currentUser} completeTask={completeTask} openWorkflow={openWorkflow} 
                onConfirm={() => { setActiveConfirmation(t); setView('confirmations'); }}
                activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId} completeText={completeText} setCompleteText={setCompleteText} />)}
            </div>
          </div>
        )}

        <div className="section-header">
          <div><h2>📤 Workflows you initiated</h2><p>Track what you delegated.</p></div>
        </div>
        <div className="capture-list">
          {myCreatedTasks.length === 0 ? (
            <div className="empty-state fade-in">
              <LayoutDashboard size={48} color="#cbd5e1" strokeWidth={1.5} style={{ margin: '0 auto 16px', display: 'block' }} />
              <h3>No active workflows</h3>
              <p>Send a voice note or text command above to get started.</p>
            </div>
          ) : (
            myCreatedTasks.map(t => <TaskCard key={t.id} task={t} currentUser={currentUser} completeTask={completeTask} openWorkflow={openWorkflow} activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId} completeText={completeText} setCompleteText={setCompleteText} />)
          )}
        </div>
      </div>
      
      <aside>
        <div className="section-header">
          <div><h2>Needs your eye</h2><p>AI paused these on purpose.</p></div>
        </div>
        <ReviewQueue tasks={confirmationTasks} setActiveConfirmation={setActiveConfirmation} setView={setView} />
        <div className="evidence-note">
          <span className="quote">"</span>
          <div>
            <strong>The model should know when to stop.</strong>
            <p>KaamSetu never silently averages conflicting instructions.</p>
            <small>— Your team's private intelligence layer</small>
          </div>
        </div>
      </aside>
    </div>
  </section>; 
}

function Stats({ myTasks, created, confirmations, total }) { 
  return <div className="stats-row">
    <Stat label="MY ACTIONS" value={myTasks.toString().padStart(2, '0')} note="Assigned to you" orange={myTasks > 0}/>
    <Stat label="CONFIRMATIONS" value={confirmations.toString().padStart(2, '0')} note={confirmations > 0 ? 'Needs review' : 'All clear'} orange={confirmations > 0}/>
    <Stat label="DELEGATED" value={created.toString().padStart(2, '0')} note="Workflows you started"/>
    <Stat label="TOTAL ACTIVE" value={total.toString().padStart(2, '0')} note="Across all tasks"/>
  </div>; 
}
function Stat({ label, value, note, orange }) { 
  return <div className="stat">
    <span className="stat-label">{label}</span>
    <strong className={orange ? 'orange' : ''}>{value}</strong>
    <span className="stat-note">{note}</span>
  </div>; 
}

function TaskCard({ task, currentUser, completeTask, openWorkflow, onConfirm, activeCompleteTaskId, setActiveCompleteTaskId, completeText, setCompleteText }) { 
  const bars = Array.from({ length: 28 });
  const myFirstName = currentUser.name.split(' ')[0].toLowerCase();
  const isAssignee = (task.assignee || '').toLowerCase().includes(myFirstName);
  const isCreator = task.capture_speaker === currentUser.name;
  const creatorEmail = USERS.find(u => u.name === task.capture_speaker)?.email || 'system';
  const isCompleting = activeCompleteTaskId === task.id;

  let statusLabel, statusClass;
  switch (task.status) {
    case 'assigned': statusLabel = 'ASSIGNED'; statusClass = 'blue'; break;
    case 'blocked': statusLabel = 'BLOCKED'; statusClass = 'grey-tag'; break;
    case 'done': statusLabel = 'DONE'; statusClass = 'green'; break;
    case 'open': statusLabel = 'NEEDS ASSIGNMENT'; statusClass = 'orange-tag'; break;
    default: statusLabel = task.status?.toUpperCase() || 'UNKNOWN'; statusClass = 'grey-tag';
  }
  if (task.needsReview) { statusLabel = 'NEEDS CONFIRMATION'; statusClass = 'purple'; }

  return <article className={`capture ${task.status === 'blocked' ? 'blocked' : ''}`}>
    <div className="capture-head">
      <span className={`speaker-avatar ${USERS.find(u => u.name === task.capture_speaker)?.tone || 'grey'}`}>
        {task.capture_initials || task.initials || 'UN'}
      </span>
      <div className="capture-meta">
        <div>
          <strong>{task.capture_speaker || 'Unknown'}</strong>
          <span className="time">{creatorEmail} · {new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div className="tag-row">
          <span className={`tag ${statusClass}`}>{statusLabel}</span>
          {task.prior_context && <span className="tag green">HAS PRIOR DATA</span>}
        </div>
      </div>
      <button className="more-button" aria-label="More options"><MoreHorizontal size={18}/></button>
    </div>

    <div className="waveform">
      {bars.map((_, i) => <span key={i} style={{ height: `${12 + ((i * 17) % 28)}px` }}/>)}
    </div>
    
    <div className="transcript"><span className="quote">"</span><p>{task.title}</p></div>
    
    {task.prior_context && (
      <div className="data-box fade-in">
        <strong>📋 Data from previous step:</strong> {task.prior_context}
      </div>
    )}

    {isCompleting && (
      <div className="inline-form fade-in">
        <span className="mini-label" style={{marginBottom: '12px', display: 'block'}}>PROVIDE YOUR DATA TO COMPLETE THIS TASK</span>
        <textarea value={completeText} onChange={e => setCompleteText(e.target.value)} 
          placeholder="Enter your response / data here..." autoFocus />
        <div className="inline-form-actions">
          <button className="secondary-button" onClick={() => { setActiveCompleteTaskId(null); setCompleteText(''); }}>Cancel</button>
          <button className="primary-button" onClick={() => completeTask(task.id)}>Submit & Done <Check size={16}/></button>
        </div>
      </div>
    )}

    <div className="capture-footer">
      <div className="action-preview">
        <span className={`check-box ${task.status === 'done' ? 'done' : ''}`}>{task.status === 'done' ? <Check size={16} strokeWidth={3}/> : ''}</span>
        <div>
          <span className="mini-label">ASSIGNEE: {(task.assignee || 'Unassigned').toUpperCase()}</span>
          <strong>{task.title}</strong>
        </div>
      </div>

      <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
        {isCreator && (
          <button className="secondary-button" onClick={() => openWorkflow(task.capture_id)}>
            <Activity size={16}/> Status
          </button>
        )}
        
        {task.needsReview && onConfirm ? (
          <button className="review-button" onClick={onConfirm}>Confirm <ArrowRight size={16}/></button>
        ) : task.status === 'assigned' && isAssignee && !isCompleting ? (
          <button className="primary-button" onClick={() => { setActiveCompleteTaskId(task.id); setCompleteText(''); }}>Complete Task <Check size={16}/></button>
        ) : task.status === 'blocked' ? (
          <span className="assigned-label" style={{color: '#94a3b8'}}><Clock size={14}/> Waiting on prior step</span>
        ) : task.status === 'assigned' && !isAssignee ? (
          <span className="assigned-label">Assigned to {task.assignee}</span>
        ) : null}
      </div>
    </div>
  </article>; 
}

function ReviewQueue({ tasks, setActiveConfirmation, setView }) { 
  return <div className="review-panel fade-in">
    <div className="panel-label"><span className="pulse-dot"/> PENDING CONFIRMATIONS <span className="queue-count">{tasks.length}</span></div>
    
    {tasks.length === 0 ? (
      <div className="review-item" style={{ borderTop: 0, paddingBottom: 0 }}>
        <p style={{fontSize: 13, color: '#94a3b8', margin: 0}}>No pending confirmations</p>
      </div>
    ) : tasks.slice(0, 3).map(t => (
      <div className="review-item" key={t.id} onClick={() => { setActiveConfirmation(t); setView('confirmations'); }}>
        <span className="review-icon orange-bg">!</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block'}}>{t.title}</strong>
          <small>{t.capture_speaker}</small>
        </div>
        <ArrowRight size={16}/>
      </div>
    ))}
    {tasks.length > 0 && <button className="panel-link" onClick={() => setView('completed')}>View completed tasks <ArrowRight size={14}/></button>}
  </div>; 
}

function CompletedView({ currentUser }) { 
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.fetchCompletedTasks(currentUser).then(data => {
      setCompletedTasks(data.tasks || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser]);

  if (loading) return <section className="view">
    <Heading eyebrow="LOADING..." title="Loading completed tasks..." copy="" />
    <div className="capture-list" style={{ maxWidth: '800px' }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />)}
    </div>
  </section>;

  return <section className="view">
    <Heading eyebrow={`COMPLETED TASKS · ${completedTasks.length} TOTAL`} title="Completed." copy="Tasks that have been finished by you or your team." />
    
    {completedTasks.length === 0 ? (
      <div className="empty-state fade-in">
        <Check size={64} strokeWidth={1.5} color="#10b981" />
        <h3>No completed tasks yet</h3>
        <p>Tasks will appear here once they are marked as done.</p>
      </div>
    ) : (
      <div className="capture-list fade-in" style={{maxWidth: '800px'}}>
        {completedTasks.map(t => (
          <article className="capture" key={t.id} style={{opacity: 0.85}}>
            <div className="capture-head">
              <span className={`speaker-avatar ${USERS.find(u => u.name === t.capture_speaker)?.tone || 'grey'}`}>
                {t.capture_initials || 'UN'}
              </span>
              <div className="capture-meta">
                <div>
                  <strong>{t.capture_speaker || 'Unknown'}</strong>
                  <span className="time">{new Date(t.updated_at || t.created_at).toLocaleDateString()} · {new Date(t.updated_at || t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="tag-row">
                  <span className="tag green">✓ DONE</span>
                  <span className="tag grey-tag">Assignee: {t.assignee || 'Unassigned'}</span>
                </div>
              </div>
            </div>
            <div style={{padding: '16px 0 0'}}>
              <strong style={{fontSize: '15px', color: '#0f172a', fontWeight: 500}}>{t.title}</strong>
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
  </section>; 
}

function WorkflowView({ captureId, currentUser, setView }) {
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!captureId) return;
    setLoading(true);
    API.fetchWorkflow(captureId, currentUser).then(data => {
      setChain(data.tasks || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [captureId, currentUser]);

  if (loading) return <section className="view">
    <Heading eyebrow="LOADING..." title="Fetching workflow..." copy="">
      <button className="secondary-button" onClick={() => setView('inbox')}>Back to Inbox</button>
    </Heading>
    <div className="skeleton" style={{ height: '300px', borderRadius: '16px', maxWidth: '800px' }} />
  </section>;
  
  if (!chain.length) return <section className="view">
    <Heading eyebrow="WORKFLOW STATUS" title="Workflow not found" copy="">
      <button className="secondary-button" onClick={() => setView('inbox')}>Back to Inbox</button>
    </Heading>
    <div className="empty-state">
      <h3>We couldn't find this workflow.</h3>
    </div>
  </section>;

  const speaker = chain[0]?.capture_speaker || 'Unknown';
  const doneCount = chain.filter(t => t.status === 'done').length;
  const totalCount = chain.length;

  return <section className="view">
    <Heading eyebrow={`WORKFLOW · INITIATED BY ${speaker.toUpperCase()} · ${doneCount}/${totalCount} COMPLETE`} title="Chain Status" copy="Track sequential and parallel execution of actions.">
      <button className="secondary-button" onClick={() => setView('inbox')}><ArrowRight size={16} style={{transform: 'rotate(180deg)'}}/> Back to Inbox</button>
    </Heading>
    
    <div className="conflict-detail fade-in">
      <div className="conflict-title">
        <div className="review-icon" style={{background: '#e2e8f0', color: '#475569'}}><Mic size={16}/></div>
        <div>
          <span className="mini-label">ORIGINAL VOICE NOTE</span>
          <h2>"{chain[0].capture_transcript}"</h2>
          <p>Captured {new Date(chain[0].created_at).toLocaleString()}</p>
        </div>
      </div>

      <div style={{ padding: '32px 32px 0' }}>
        <div style={{background: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden'}}>
          <div style={{width: `${(doneCount / totalCount) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'}}/>
        </div>
      </div>

      <div className="workflow-timeline">
        <span className="mini-label" style={{ margin: '32px 0 16px', display: 'block' }}>ACTION CHAIN ({doneCount}/{totalCount} complete)</span>
        
        {chain.map((task, index) => {
          let statusColor, statusLabel, bgColor, borderColor;
          switch (task.status) {
            case 'done': statusColor = 'var(--primary)'; statusLabel = '✓ DONE'; bgColor = 'var(--primary-soft)'; borderColor = '#6ee7b7'; break;
            case 'assigned': statusColor = '#3b82f6'; statusLabel = '⏳ WAITING FOR RESPONSE'; bgColor = '#eff6ff'; borderColor = '#93c5fd'; break;
            case 'blocked': statusColor = '#94a3b8'; statusLabel = '🔒 BLOCKED'; bgColor = '#f8fafc'; borderColor = '#cbd5e1'; break;
            case 'open': statusColor = '#f59e0b'; statusLabel = '📋 NEEDS ASSIGNMENT'; bgColor = '#fffbeb'; borderColor = '#fcd34d'; break;
            default: statusColor = '#94a3b8'; statusLabel = task.status?.toUpperCase(); bgColor = '#f8fafc'; borderColor = '#cbd5e1';
          }

          return <div key={task.id} className="timeline-item">
            <div className="timeline-line-wrap">
              <div className="timeline-dot" style={{
                background: task.status === 'done' ? statusColor : '#fff', 
                borderColor: statusColor,
                color: task.status === 'done' ? '#fff' : statusColor
              }}>
                {task.status === 'done' ? <Check size={20} strokeWidth={3}/> : (index + 1)}
              </div>
              {index < chain.length - 1 && <div className="timeline-line" style={{ background: task.status === 'done' ? statusColor : '#e2e8f0' }}/>}
            </div>

            <div className="timeline-card" style={{ background: bgColor, borderColor: borderColor }}>
              <div className="timeline-card-header">
                <h3>{task.title}</h3>
                <span className="timeline-badge" style={{ color: statusColor, background: '#fff', border: `1px solid ${borderColor}` }}>
                  {statusLabel}
                </span>
              </div>
              <div className="timeline-meta">
                Assignee: <strong style={{ color: '#0f172a' }}>{task.assignee || 'Unassigned'}</strong>
                {task.depends_on && <span style={{marginLeft: '12px', color: '#94a3b8'}}>· Depends on step {chain.findIndex(c => c.id === task.depends_on) + 1}</span>}
              </div>
              
              {task.prior_context && task.status === 'done' && (
                <div className="data-box" style={{ background: '#fff', margin: '16px 0 0' }}>
                  <strong>Data provided:</strong> {task.prior_context}
                </div>
              )}
            </div>
          </div>;
        })}
      </div>
    </div>
  </section>;
}

function PeopleView() { 
  const people = [
    ['AK','blue','Anika Kapoor','anika@kaamsetu.in · Owner'],
    ['RM','saffron','Ravi Mehta','ravi@kaamsetu.in · Owner'],
    ['RK','purple','Ravi Kumar','ravi.k@kaamsetu.in · Sales'],
    ['RS','teal','Rahul Sharma','rahul@kaamsetu.in · Procurement'],
    ['MV','lilac','Mohan Verma','mohan@kaamsetu.in · Dispatch'],
    ['PS','saffron','Priya Shah','priya@kaamsetu.in · Operations']
  ]; 
  
  return <section className="view">
    <Heading eyebrow="TEAM GRAPH  ·  06 MEMBERS" title="People behind the work." copy="Assignments stay accountable to the humans who can move them.">
      <button className="secondary-button"><Users size={16}/> Add person</button>
    </Heading>
    <div className="people-grid fade-in">
      {people.map(([initials, tone, name, detail], i) => 
        <div className="person" key={name} style={{ animationDelay: `${i * 0.05}s` }}>
          <span className={`large-avatar ${tone}`}>{initials}</span>
          <div>
            <h3>{name}</h3>
            <p>{detail}</p>
          </div>
          <span className="person-status">Active</span>
        </div>
      )}
    </div>
  </section>; 
}

function EvaluationView() { 
  return <section className="view">
    <Heading eyebrow="EVALUATION HARNESS  ·  RUN 08" title="We measure when it should stop." copy="Twenty test cases keep the model honest after every prompt change.">
      <button className="primary-button"><Activity size={16}/> Run evaluation</button>
    </Heading>
    
    <div className="eval-grid fade-in">
      <div className="eval-score" style={{ background: 'var(--sidebar-bg)' }}>
        <span className="stat-label" style={{ color: 'var(--sidebar-muted)' }}>OVERALL SCORE</span>
        <strong style={{ color: '#fff', fontSize: '56px', fontWeight: 600, fontFamily: 'var(--serif)', display: 'block', margin: '16px 0' }}>91.4%</strong>
        
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
          <span style={{ width: '91.4%', height: '100%', display: 'block', background: 'var(--primary)', borderRadius: '999px' }}/>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500, marginTop: '16px' }}>+4.2% since yesterday</p>
      </div>
      
      <div className="conflict-detail" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid var(--line)', font: '600 11px var(--mono)', color: 'var(--muted)', letterSpacing: '0.05em' }}>
          <span>TEST SUITE</span><span>SCORE</span><span>LAST RUN</span>
        </div>
        {[['Task extraction','96%','2m ago'],['Citation grounding','93%','2m ago'],['Conflict detection','84%','2m ago'],['Safe refusal','92%','2m ago']].map(([name, score, time]) => 
          <div key={name} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', padding: '20px 24px', borderBottom: '1px solid var(--line)', fontSize: '14px', alignItems: 'center' }}>
            <strong style={{ color: 'var(--ink)' }}>{name}</strong>
            <span style={{ color: score === '84%' ? '#b45309' : 'var(--primary-dark)', fontWeight: 600 }}>{score}</span>
            <span style={{ color: 'var(--muted)' }}>{time}</span>
          </div>
        )}
      </div>
    </div>
  </section>; 
}

window.addEventListener('open-confirmation', () => document.querySelector('[data-view="confirmations"]')?.click());
createRoot(document.getElementById('root')).render(<App/>);
