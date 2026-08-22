import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Check, ChevronDown, CircleHelp, Clock, FileWarning, FileText, Inbox, Menu, Mic, MoreHorizontal, Play, Search, ShieldCheck, Users, WifiOff, X } from 'lucide-react';
import './styles.css';

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
    let res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(storedKey, data.accessToken);
      return data.accessToken;
    }
    res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(storedKey, data.accessToken);
      return data.accessToken;
    }
    return `mock_${user.id}`;
  },
  async ingestText(transcript, user) {
    const token = await this.token(user);
    const res = await fetch('/api/ingest/text', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ transcript }) });
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
    const res = await fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      localStorage.removeItem(`kaamsetu_token_${user?.id}`);
      throw new Error('Token expired');
    }
    if (!res.ok) throw new Error('Failed to load tasks');
    return res.json();
  },
  async fetchCompletedTasks(user) {
    const token = await this.token(user);
    const res = await fetch('/api/tasks/completed', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { tasks: [] };
    return res.json();
  },
  async resolveTask(taskId, resolutionText, user) {
    const token = await this.token(user);
    return fetch(`/api/tasks/${taskId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resolutionText })
    });
  },
  async fetchWorkflow(captureId, user) {
    const token = await this.token(user);
    const res = await fetch(`/api/tasks/workflow/${captureId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { tasks: [] };
    return res.json();
  }
};

function App() {
  const [view, setView] = useState('inbox');
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [activeConfirmation, setActiveConfirmation] = useState(null);
  const [toast, setToast] = useState('');
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

  // Switch user = hard relogin
  useEffect(() => {
    USERS.forEach(u => {
      if (u.id !== currentUser.id) localStorage.removeItem(`kaamsetu_token_${u.id}`);
    });
    setTasks([]);
    setView('inbox');
    setTextDraft('');
    loadTasks();
  }, [currentUser]);

  useEffect(() => { fetch('/api/health').then(r => { if (!r.ok) setOffline(true); }).catch(() => setOffline(true)); }, []);
  
  const notify = (message) => { setToast(message); window.clearTimeout(window.__toast); window.__toast = window.setTimeout(() => setToast(''), 3000); };
  
  const submitText = async () => {
    const text = textDraft.trim();
    if (!text) { notify('Type the instruction first'); return; }
    setBusy(true);
    try {
      await API.ingestText(text, currentUser);
      notify('Tasks extracted and workflow created!');
      setTextDraft('');
      await loadTasks(); // Reload from DB to get accurate state
    } catch (e) { notify(e.message || 'Processing failed'); } finally { setBusy(false); }
  };

  const completeTask = async (taskId) => {
    if (!completeText.trim()) { notify('Please provide data to complete the task'); return; }
    try {
      const res = await API.resolveTask(taskId, completeText.trim(), currentUser);
      if (!res.ok) { notify('Failed to complete task'); return; }
      notify('Task completed! Next step in chain has been unblocked.');
      setActiveCompleteTaskId(null);
      setCompleteText('');
      await loadTasks();
    } catch (e) { notify('Error: ' + e.message); }
  };

  const openWorkflow = (captureId) => {
    setWorkflowCaptureId(captureId);
    setView('workflow');
  };

  // Categorize tasks for the current user
  const myFirstName = currentUser.name.split(' ')[0].toLowerCase();
  const myFullName = currentUser.name.toLowerCase();

  const isAssignedToMe = (t) => {
    const a = (t.assignee || '').toLowerCase();
    return a.includes(myFirstName) || a.includes(myFullName);
  };
  const isCreatedByMe = (t) => t.capture_user_id === undefined ? t.capture_speaker === currentUser.name : false;

  // Tasks assigned to me that I need to work on
  const myTasks = tasks.filter(t => isAssignedToMe(t) && t.status === 'assigned');
  // Tasks I created (delegated to others)
  const myCreatedTasks = tasks.filter(t => t.capture_speaker === currentUser.name && !isAssignedToMe(t));
  // Tasks needing review/confirmation
  const confirmationTasks = tasks.filter(t => t.needsReview);

  return <div className="app-shell">
    <Sidebar view={view} setView={setView} offline={offline} currentUser={currentUser} setCurrentUser={setCurrentUser} 
      myTasksCount={myTasks.length} confirmationsCount={confirmationTasks.length} totalCount={tasks.length} />
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">Mehta Traders <b>/</b> <span>{view[0].toUpperCase() + view.slice(1)}</span></div><div className="top-actions">{offline ? <span className="sync-status offline"><WifiOff size={12}/> Local mode</span> : <span className="sync-status"><i/> Synced 2m ago</span>}<button className="icon-button" aria-label="Search"><Search size={18}/></button><button className="icon-button" aria-label="Notifications"><CircleHelp size={18}/></button></div></header>
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
    <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
  </div>;
}

function Sidebar({ view, setView, offline, currentUser, setCurrentUser, myTasksCount, confirmationsCount, totalCount }) { 
  const [showUsers, setShowUsers] = useState(false); 
  const items = [
    ['inbox','Inbox',Inbox, myTasksCount > 0 ? myTasksCount.toString() : ''],
    ['completed','Completed',Check, ''],
    ['people','People',Users,''],
    ['evaluation','Evaluation',Activity,'']
  ]; 
  return <aside className="sidebar"><div className="brand"><span className="brand-mark">क</span> kaamsetu</div><button className="workspace"><span className="workspace-dot"/> Mehta Traders <ChevronDown size={14}/></button><nav>{items.map(([id,label,Icon,count]) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={17}/>{label}{count && <span className="nav-count">{count}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="offline-card"><span className="offline-dot"/><div><strong>{offline ? 'Local mode active' : 'Local mode ready'}</strong><p>Works without network</p></div></div><div className="profile" onClick={() => setShowUsers(!showUsers)} style={{cursor: 'pointer', position: 'relative'}}><span className={`avatar ${currentUser.tone}`}>{currentUser.initials}</span><div><strong>{currentUser.name}</strong><small>{currentUser.email}</small></div><MoreHorizontal size={16}/>{showUsers && (<div className="user-dropdown" style={{position: 'absolute', bottom: '100%', left: 0, width: '100%', background: 'white', border: '1px solid #dfe5df', borderRadius: '5px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>{USERS.map(u => (<div key={u.id} style={{padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f0f0f0'}} onClick={() => { setCurrentUser(u); setShowUsers(false); }}><span className={`avatar ${u.tone}`} style={{width: 24, height: 24, fontSize: 10}}>{u.initials}</span><div style={{lineHeight: 1.3}}><span style={{fontSize: 13, color: '#20302c', display: 'block'}}>{u.name}</span><span style={{fontSize: 10, color: '#8d9996'}}>{u.email}</span></div></div>))}</div>)}</div></div></aside>; 
}

function Heading({ eyebrow, title, children, copy }) { return <div className="view-heading"><div><div className="eyebrow">{eyebrow}<span className="eyebrow-line"/></div><h1>{title}</h1><p>{copy}</p></div>{children}</div>; }

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
    <div className="voice-input-options" style={{flexDirection: 'column', alignItems: 'stretch', gap: '15px'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <span className="mini-label">VOICE NOTE INPUT</span>
        <button type="button" className={`secondary-button ${recording ? 'recording-active' : ''}`} onClick={toggle}><Mic size={14}/> {recording ? 'Stop recording' : 'Record voice note'}</button>
      </div>
      {(textDraft || interim) && <div style={{background: '#fbfcfa', padding: '12px 14px', borderRadius: '5px', border: '1px solid #dfe5df', fontSize: '14px', color: '#20302c'}}><strong>Transcript: </strong>{textDraft} <span style={{color: '#8d9996', fontStyle: 'italic'}}>{interim}</span></div>}
    </div>
  );
}

function InboxView({ tasks, myTasks, myCreatedTasks, confirmationTasks, inputMode, setInputMode, textDraft, setTextDraft, submitText, busy, currentUser, completeTask, openWorkflow, setActiveConfirmation, setView, activeCompleteTaskId, setActiveCompleteTaskId, completeText, setCompleteText }) { 
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  
  return <section className="view">
    <Heading eyebrow={`${today}  ·  ${currentUser.email}`} title={`Good morning, ${currentUser.name.split(' ')[0]}.`} copy="Turn the voice notes your team already sends into work that actually moves."></Heading>
    
    <div className="capture-compose">
      <div className="segmented">
        <button className={inputMode === 'voice' ? 'active' : ''} onClick={() => setInputMode('voice')}><Mic size={14}/> Voice note</button>
        <button className={inputMode === 'text' ? 'active' : ''} onClick={() => setInputMode('text')}><FileText size={14}/> Text command</button>
      </div>
      {inputMode === 'text' ? <div className="text-input">
        <textarea value={textDraft} onChange={e => setTextDraft(e.target.value)} placeholder='e.g. "Ravi Mehta se bolo ki vah Apne Sare employee detail De aur FIR Mohan se bolo vah Sare data portal per update Karke"' rows={3}/>
        <button className="primary-button" onClick={submitText} disabled={busy}><ArrowRight size={13}/> {busy ? 'Processing…' : 'Send to KaamSetu'}</button>
      </div> : <div className="voice-input-wrapper"><VoiceRecorder onText={setTextDraft} textDraft={textDraft} />{textDraft && <button className="primary-button" onClick={submitText} disabled={busy} style={{marginTop: '0px'}}><Play size={12} fill="currentColor"/> {busy ? 'Processing…' : 'Process Voice Note'}</button>}</div>}
    </div>

    <Stats myTasks={myTasks.length} created={myCreatedTasks.length} confirmations={confirmationTasks.length} total={tasks.length} />

    <div className="content-grid"><div>

    {/* Section 1: Tasks assigned to me */}
    {myTasks.length > 0 && (
      <div style={{marginBottom: '40px'}}>
        <div className="section-header"><div><h2>🔴 Assigned to you</h2><p>Complete these tasks and provide your data.</p></div></div>
        <div className="capture-list">
          {myTasks.map(t => <TaskCard key={t.id} task={t} currentUser={currentUser} completeTask={completeTask} openWorkflow={openWorkflow} activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId} completeText={completeText} setCompleteText={setCompleteText} />)}
        </div>
      </div>
    )}

    {/* Section 2: Confirmations */}
    {confirmationTasks.length > 0 && (
      <div style={{marginBottom: '40px'}}>
        <div className="section-header"><div><h2>⚠️ Needs confirmation</h2><p>AI paused these for human review.</p></div></div>
        <div className="capture-list">
          {confirmationTasks.map(t => <TaskCard key={t.id} task={t} currentUser={currentUser} completeTask={completeTask} openWorkflow={openWorkflow} 
            onConfirm={() => { setActiveConfirmation(t); setView('confirmations'); }}
            activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId} completeText={completeText} setCompleteText={setCompleteText} />)}
        </div>
      </div>
    )}

    {/* Section 3: Tasks I created / delegated */}
    <div className="section-header"><div><h2>📤 Workflows you initiated</h2><p>Track what you delegated.</p></div></div>
    <div className="capture-list">
      {myCreatedTasks.length === 0 ? <p style={{color: '#666', fontSize: 14}}>No delegated workflows yet. Send a command above to get started.</p> : 
        myCreatedTasks.map(t => <TaskCard key={t.id} task={t} currentUser={currentUser} completeTask={completeTask} openWorkflow={openWorkflow} activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId} completeText={completeText} setCompleteText={setCompleteText} />)}
    </div>

    </div><aside>
      <div className="section-header"><div><h2>Needs your eye</h2><p>AI paused these on purpose.</p></div></div>
      <ReviewQueue tasks={confirmationTasks} setActiveConfirmation={setActiveConfirmation} setView={setView} />
      <div className="evidence-note"><span className="quote">"</span><div><strong>The model should know when to stop.</strong><p>KaamSetu never silently averages conflicting instructions.</p><small>— Your team's private intelligence layer</small></div></div>
    </aside></div>
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
function Stat({ label, value, note, orange }) { return <div className="stat"><span className="stat-label">{label}</span><strong className={orange ? 'orange' : ''}>{value}</strong><span className="stat-note">{note}</span></div>; }

function TaskCard({ task, currentUser, completeTask, openWorkflow, onConfirm, activeCompleteTaskId, setActiveCompleteTaskId, completeText, setCompleteText }) { 
  const bars = Array.from({ length: 34 });
  const myFirstName = currentUser.name.split(' ')[0].toLowerCase();
  const isAssignee = (task.assignee || '').toLowerCase().includes(myFirstName);
  const isCreator = task.capture_speaker === currentUser.name;
  const creatorEmail = USERS.find(u => u.name === task.capture_speaker)?.email || 'system';
  const isCompleting = activeCompleteTaskId === task.id;

  // Status display
  let statusLabel, statusClass;
  switch (task.status) {
    case 'assigned': statusLabel = 'ASSIGNED'; statusClass = 'blue'; break;
    case 'blocked': statusLabel = 'BLOCKED'; statusClass = 'grey'; break;
    case 'done': statusLabel = 'DONE'; statusClass = 'green'; break;
    case 'open': statusLabel = 'NEEDS ASSIGNMENT'; statusClass = 'orange'; break;
    default: statusLabel = task.status?.toUpperCase() || 'UNKNOWN'; statusClass = 'grey';
  }
  if (task.needsReview) { statusLabel = 'NEEDS CONFIRMATION'; statusClass = 'purple'; }

  return <article className={`capture ${task.status === 'blocked' ? 'blocked' : ''}`}>
    <div className="capture-head">
      <span className={`speaker-avatar ${USERS.find(u => u.name === task.capture_speaker)?.tone || 'grey'}`}>
        {task.capture_initials || task.initials || 'UN'}
      </span>
      <div className="capture-meta">
        <div><strong>{task.capture_speaker || 'Unknown'}</strong><span className="time">{creatorEmail} · {new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
        <div className="tag-row">
          <span className={`tag ${statusClass}`}>{statusLabel}</span>
          {task.prior_context && <span className="tag green">HAS PRIOR DATA</span>}
        </div>
      </div>
      <button className="more-button" aria-label="More options"><MoreHorizontal size={17}/></button>
    </div>

    <div className="waveform">{bars.map((_, i) => <span key={i} style={{ height: `${8 + ((i * 17) % 24)}px` }}/>)}</div>
    
    <div className="transcript"><span className="quote">"</span><p>{task.title}</p></div>
    
    {task.prior_context && (
      <div style={{background: '#f0f7f2', padding: '10px 14px', borderRadius: '6px', margin: '0 18px 10px', fontSize: '13px', color: '#2a5a3a', border: '1px solid #c8e6d0'}}>
        <strong>📋 Data from previous step:</strong> {task.prior_context}
      </div>
    )}

    {/* Inline complete textbox */}
    {isCompleting && (
      <div style={{margin: '0 18px 12px', padding: '14px', background: '#f8faff', borderRadius: '8px', border: '1px solid #c5d4f0'}}>
        <span className="mini-label" style={{marginBottom: '8px', display: 'block'}}>PROVIDE YOUR DATA TO COMPLETE THIS TASK</span>
        <textarea value={completeText} onChange={e => setCompleteText(e.target.value)} 
          placeholder="Enter your response / data here..." autoFocus
          style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #dfe5df', fontFamily: 'inherit', resize: 'vertical', minHeight: '60px', fontSize: '14px', boxSizing: 'border-box'}}/>
        <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px'}}>
          <button className="secondary-button" onClick={() => { setActiveCompleteTaskId(null); setCompleteText(''); }}>Cancel</button>
          <button className="primary-button" onClick={() => completeTask(task.id)}>Submit & Done <Check size={13}/></button>
        </div>
      </div>
    )}

    <div className="capture-footer">
      <div className="action-preview">
        <span className={`check-box ${task.status === 'done' ? 'done' : ''}`}>{task.status === 'done' ? <Check size={12}/> : '○'}</span>
        <div>
          <span className="mini-label">ASSIGNEE: {(task.assignee || 'Unassigned').toUpperCase()}</span>
          <strong>{task.title}</strong>
        </div>
      </div>

      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
        {/* Workflow status button for creator */}
        {isCreator && <button className="secondary-button" onClick={() => openWorkflow(task.capture_id)}>📊 Status</button>}
        
        {/* Action buttons based on state */}
        {task.needsReview && onConfirm ? (
          <button className="review-button" onClick={onConfirm}>Confirm <ArrowRight size={13}/></button>
        ) : task.status === 'assigned' && isAssignee && !isCompleting ? (
          <button className="primary-button" onClick={() => { setActiveCompleteTaskId(task.id); setCompleteText(''); }}>Complete Task <Check size={13}/></button>
        ) : task.status === 'blocked' ? (
          <span className="assigned-label" style={{color: '#8d9996'}}><Clock size={12}/> Waiting on prior step</span>
        ) : task.status === 'assigned' && !isAssignee ? (
          <span className="assigned-label">Assigned to {task.assignee}</span>
        ) : null}
      </div>
    </div>
  </article>; 
}

function ReviewQueue({ tasks, setActiveConfirmation, setView }) { 
  return <div className="review-panel">
    <div className="panel-label"><span className="pulse-dot"/> PENDING CONFIRMATIONS <span className="queue-count">{tasks.length}</span></div>
    {tasks.length === 0 ? (
      <div className="review-item"><p style={{fontSize: 13, color: '#666'}}>No pending confirmations</p></div>
    ) : tasks.slice(0, 3).map(t => (
      <div className="review-item" key={t.id} style={{cursor: 'pointer'}} onClick={() => { setActiveConfirmation(t); setView('confirmations'); }}>
        <span className="review-icon orange-bg">!</span>
        <div><strong style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px', display: 'block'}}>{t.title}</strong><small>{t.capture_speaker}</small></div>
        <ArrowRight size={15}/>
      </div>
    ))}
    {tasks.length > 0 && <button className="panel-link" onClick={() => setView('completed')}>View completed tasks <ArrowRight size={13}/></button>}
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

  if (loading) return <section className="view"><Heading eyebrow="LOADING..." title="Loading completed tasks..." copy=""/></section>;

  return <section className="view">
    <Heading eyebrow={`COMPLETED TASKS · ${completedTasks.length} TOTAL`} title="Completed." copy="Tasks that have been finished by you or your team." />
    {completedTasks.length === 0 ? (
      <div style={{textAlign: 'center', padding: '60px 20px', color: '#8d9996'}}>
        <Check size={48} style={{marginBottom: '15px', opacity: 0.3}} />
        <h3 style={{color: '#5b6965', marginBottom: '8px'}}>No completed tasks yet</h3>
        <p style={{fontSize: '14px'}}>Tasks will appear here once they are marked as done.</p>
      </div>
    ) : (
      <div className="capture-list" style={{maxWidth: '800px'}}>
        {completedTasks.map(t => (
          <article className="capture" key={t.id} style={{opacity: 0.85}}>
            <div className="capture-head">
              <span className={`speaker-avatar ${USERS.find(u => u.name === t.capture_speaker)?.tone || 'grey'}`}>
                {t.capture_initials || 'UN'}
              </span>
              <div className="capture-meta">
                <div><strong>{t.capture_speaker || 'Unknown'}</strong><span className="time">{new Date(t.updated_at || t.created_at).toLocaleDateString()} · {new Date(t.updated_at || t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                <div className="tag-row">
                  <span className="tag green">✓ DONE</span>
                  <span style={{fontSize: '12px', color: '#5b6965'}}>Assignee: {t.assignee || 'Unassigned'}</span>
                </div>
              </div>
            </div>
            <div style={{padding: '12px 18px'}}>
              <strong style={{fontSize: '14px', color: '#20302c'}}>{t.title}</strong>
              {t.prior_context && (
                <div style={{marginTop: '8px', padding: '8px 12px', background: '#f0f7f2', borderRadius: '5px', fontSize: '13px', color: '#2a5a3a', border: '1px solid #c8e6d0'}}>
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
  }, [captureId]);

  if (loading) return <section className="view"><Heading eyebrow="LOADING..." title="Fetching workflow..." copy=""/></section>;
  if (!chain.length) return <section className="view"><Heading eyebrow="WORKFLOW STATUS" title="Workflow not found" copy=""><button className="secondary-button" onClick={() => setView('inbox')}>Back to Inbox</button></Heading></section>;

  const speaker = chain[0]?.capture_speaker || 'Unknown';
  const doneCount = chain.filter(t => t.status === 'done').length;
  const totalCount = chain.length;

  return <section className="view">
    <Heading eyebrow={`WORKFLOW · INITIATED BY ${speaker.toUpperCase()} · ${doneCount}/${totalCount} COMPLETE`} title="Chain Status" copy="Track sequential and parallel execution of actions.">
      <button className="secondary-button" onClick={() => setView('inbox')}><ArrowRight size={13} style={{transform: 'rotate(180deg)', marginRight: '5px'}}/> Back to Inbox</button>
    </Heading>
    <div className="conflict-detail">
      <div className="conflict-title">
        <span className="review-icon" style={{background: '#e3ebe8', color: '#20302c'}}>#</span>
        <div><span className="mini-label">ORIGINAL VOICE NOTE</span><h2>"{chain[0].capture_transcript}"</h2><p>Captured {new Date(chain[0].created_at).toLocaleString()}</p></div>
      </div>

      {/* Progress bar */}
      <div style={{margin: '20px 0', background: '#e8ede9', borderRadius: '10px', height: '8px', overflow: 'hidden'}}>
        <div style={{width: `${(doneCount / totalCount) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #358c56, #4caf50)', borderRadius: '10px', transition: 'width 0.5s ease'}}/>
      </div>

      <div style={{marginTop: '20px'}}>
        <span className="mini-label" style={{marginBottom: '15px', display: 'block'}}>ACTION CHAIN ({doneCount}/{totalCount} complete)</span>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0'}}>
          {chain.map((task, index) => {
            let statusColor, statusLabel, bgColor;
            switch (task.status) {
              case 'done': statusColor = '#358c56'; statusLabel = '✓ DONE'; bgColor = '#f0f7f2'; break;
              case 'assigned': statusColor = '#2196F3'; statusLabel = '⏳ WAITING FOR RESPONSE'; bgColor = '#f0f4ff'; break;
              case 'blocked': statusColor = '#9e9e9e'; statusLabel = '🔒 BLOCKED'; bgColor = '#f5f5f5'; break;
              case 'open': statusColor = '#ff9800'; statusLabel = '📋 NEEDS ASSIGNMENT'; bgColor = '#fff8e1'; break;
              default: statusColor = '#9e9e9e'; statusLabel = task.status?.toUpperCase(); bgColor = '#f5f5f5';
            }

            return <div key={task.id}>
              <div style={{display: 'flex', gap: '15px', alignItems: 'stretch'}}>
                {/* Timeline dot + line */}
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30px', flexShrink: 0}}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', 
                    background: task.status === 'done' ? '#358c56' : '#fff', 
                    border: `3px solid ${statusColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: task.status === 'done' ? '#fff' : statusColor,
                    fontSize: '12px', fontWeight: 'bold', flexShrink: 0
                  }}>
                    {task.status === 'done' ? <Check size={14}/> : (index + 1)}
                  </div>
                  {index < chain.length - 1 && <div style={{width: '3px', flexGrow: 1, background: task.status === 'done' ? '#358c56' : '#dfe5df', minHeight: '20px'}}/>}
                </div>

                {/* Task card */}
                <div style={{background: bgColor, padding: '15px 18px', borderRadius: '8px', border: `1px solid ${statusColor}30`, flexGrow: 1, marginBottom: '12px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <strong style={{fontSize: '14px', color: '#20302c'}}>{task.title}</strong>
                    <span style={{fontSize: '11px', fontWeight: 600, color: statusColor, background: `${statusColor}15`, padding: '3px 10px', borderRadius: '20px'}}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{fontSize: '13px', color: '#5b6965'}}>
                    Assignee: <strong>{task.assignee || 'Unassigned'}</strong>
                    {task.depends_on && <span style={{marginLeft: '12px', color: '#9e9e9e'}}>· Depends on step {chain.findIndex(c => c.id === task.depends_on) + 1}</span>}
                  </div>
                  {task.prior_context && task.status === 'done' && (
                    <div style={{marginTop: '8px', padding: '8px 12px', background: '#fff', borderRadius: '5px', fontSize: '13px', color: '#2a5a3a', border: '1px solid #c8e6d0'}}>
                      <strong>Data provided:</strong> {task.prior_context}
                    </div>
                  )}
                </div>
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>
  </section>;
}

function PeopleView() { const people = [['AK','blue','Anika Kapoor','anika@kaamsetu.in · Owner'],['RM','saffron','Ravi Mehta','ravi@kaamsetu.in · Owner'],['RK','purple','Ravi Kumar','ravi.k@kaamsetu.in · Sales'],['RS','teal','Rahul Sharma','rahul@kaamsetu.in · Procurement'],['MV','lilac','Mohan Verma','mohan@kaamsetu.in · Dispatch'],['PS','saffron','Priya Shah','priya@kaamsetu.in · Operations']]; return <section className="view"><Heading eyebrow="TEAM GRAPH  ·  06 MEMBERS" title="People behind the work." copy="Assignments stay accountable to the humans who can move them."><button className="secondary-button">+ Add person</button></Heading><div className="people-grid">{people.map(([initials,tone,name,detail]) => <div className="person" key={name}><span className={`large-avatar ${tone}`}>{initials}</span><div><h3>{name}</h3><p>{detail}</p></div><span className="person-status">Active</span></div>)}</div></section>; }
function EvaluationView() { return <section className="view"><Heading eyebrow="EVALUATION HARNESS  ·  RUN 08" title="We measure when it should stop." copy="Twenty test cases keep the model honest after every prompt change."><button className="primary-button"><Activity size={14}/> Run evaluation</button></Heading><div className="eval-grid"><div className="eval-score"><span className="stat-label">OVERALL SCORE</span><strong>91.4%</strong><div className="score-bar"><span/></div><p>+4.2% since yesterday</p></div><div className="eval-table"><div className="eval-row eval-header"><span>TEST SUITE</span><span>SCORE</span><span>LAST RUN</span></div>{[['Task extraction','96%','2m ago'],['Citation grounding','93%','2m ago'],['Conflict detection','84%','2m ago'],['Safe refusal','92%','2m ago']].map(([name,score,time]) => <div className="eval-row" key={name}><strong>{name}</strong><span className={score === '84%' ? 'warn' : 'good'}>{score}</span><span>{time}</span></div>)}</div></div></section>; }

window.addEventListener('open-confirmation', () => document.querySelector('[data-view="confirmations"]')?.click());
createRoot(document.getElementById('root')).render(<App/>);
