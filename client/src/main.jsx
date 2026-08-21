import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Check, ChevronDown, CircleHelp, FileWarning, FileText, Inbox, Menu, Mic, MoreHorizontal, Play, Search, ShieldCheck, Users, WifiOff, X } from 'lucide-react';
import './styles.css';

const seedCaptures = [
  { id: 1, speaker: 'Ravi Mehta', initials: 'RM', tone: 'saffron', time: 'Today, 10:42 AM', state: 'conflict', transcript: 'Rahul, kal tak vendor quotation compare kar dena. Finance policy ke according advance 20% se zyada nahi hona chahiye, but latest vendor document says 30%.', action: 'Compare vendor quotations by tomorrow', assignee: 'Rahul Sharma' },
  { id: 2, speaker: 'Priya Shah', initials: 'PS', tone: 'teal', time: 'Today, 9:18 AM', state: 'ready', transcript: 'Aaj 4 baje courier pickup ke liye parcel ready rakhna, Mohan ko bol dena.', action: 'Keep parcel ready for courier pickup', assignee: 'Mohan Verma' }
];

const API = {
  async token() {
    const stored = localStorage.getItem('kaamsetu_token');
    if (stored) return stored;
    const email = 'demo-owner@kaamsetu.in';
    const password = 'demo-password-123';
    const name = 'Demo Owner';
    let res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('kaamsetu_token', data.accessToken);
      return data.accessToken;
    }
    res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('kaamsetu_token', data.accessToken);
      return data.accessToken;
    }
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Unable to authenticate');
  },
  async ingestText(transcript) {
    const token = await this.token();
    const res = await fetch('/api/ingest/text', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ transcript }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Processing failed');
    return data;
  }
};

function App() {
  const [view, setView] = useState('inbox');
  const [captures, setCaptures] = useState(seedCaptures);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState('');
  const [offline, setOffline] = useState(false);
  const [inputMode, setInputMode] = useState('voice');
  const [textDraft, setTextDraft] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/health').catch(() => setOffline(true)); }, []);
  const notify = (message) => { setToast(message); window.clearTimeout(window.__toast); window.__toast = window.setTimeout(() => setToast(''), 3000); };
  const runDemo = async () => { setRunning(true); notify(offline ? 'Local mode · processing with cached models' : 'Listening locally · Whisper transcription started'); await new Promise(r => setTimeout(r, 1300)); notify('Two sources disagree · routing to human review'); await new Promise(r => setTimeout(r, 1100)); setRunning(false); setView('conflicts'); };
  const submitText = async () => {
    const text = textDraft.trim();
    if (!text) { notify('Type the instruction first'); return; }
    setBusy(true);
    try {
      const result = await API.ingestText(text);
      setCaptures(items => [{ id: result.captureId, speaker: 'You', initials: 'YOU', tone: 'blue', time: 'Just now', state: result.needsReview ? 'conflict' : 'ready', transcript: text, action: result.task?.title || 'Needs review', assignee: result.task?.assignee || 'Unassigned' }, ...items]);
      if (result.needsReview) setView('conflicts');
      notify(result.needsReview ? (result.reviewReason || 'Paused for human review') : 'Task extracted and ready to assign');
      setTextDraft('');
    } catch (e) { notify(e.message); } finally { setBusy(false); }
  };
  const assign = async (capture) => { setCaptures(items => items.map(item => item.id === capture.id ? { ...item, state: 'assigned' } : item)); notify(`Action assigned to ${capture.assignee}`); try { await fetch('/api/captures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(capture) }); } catch {} };
  return <div className="app-shell">
    <Sidebar view={view} setView={setView} offline={offline} />
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">Mehta Traders <b>/</b> <span>{view[0].toUpperCase() + view.slice(1)}</span></div><div className="top-actions">{offline ? <span className="sync-status offline"><WifiOff size={12}/> Local mode</span> : <span className="sync-status"><i/> Synced 2m ago</span>}<button className="icon-button" aria-label="Search"><Search size={18}/></button><button className="icon-button" aria-label="Notifications"><CircleHelp size={18}/></button></div></header>
      {view === 'inbox' && <InboxView captures={captures} running={running} runDemo={runDemo} assign={assign} setView={setView} inputMode={inputMode} setInputMode={setInputMode} textDraft={textDraft} setTextDraft={setTextDraft} submitText={submitText} busy={busy} />}
      {view === 'conflicts' && <ConflictView notify={notify} />}
      {view === 'people' && <PeopleView />}
      {view === 'evaluation' && <EvaluationView />}
    </main>
    <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
  </div>;
}

function Sidebar({ view, setView, offline }) { const items = [['inbox','Inbox',Inbox,'4'],['conflicts','Conflicts',FileWarning,'2'],['people','People',Users,''],['evaluation','Evaluation',Activity,'']]; return <aside className="sidebar"><div className="brand"><span className="brand-mark">क</span> kaamsetu</div><button className="workspace"><span className="workspace-dot"/> Mehta Traders <ChevronDown size={14}/></button><nav>{items.map(([id,label,Icon,count]) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={17}/>{label}{count && <span className="nav-count">{count}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="offline-card"><span className="offline-dot"/><div><strong>{offline ? 'Local mode active' : 'Local mode ready'}</strong><p>Works without network</p></div></div><div className="profile"><span className="avatar">AK</span><div><strong>Anika Kapoor</strong><small>Owner</small></div><MoreHorizontal size={16}/></div></div></aside>; }

function Heading({ eyebrow, title, children, copy }) { return <div className="view-heading"><div><div className="eyebrow">{eyebrow}<span className="eyebrow-line"/></div><h1>{title}</h1><p>{copy}</p></div>{children}</div>; }
function InboxView({ captures, running, runDemo, assign, setView, inputMode, setInputMode, textDraft, setTextDraft, submitText, busy }) { return <section className="view"><Heading eyebrow="TUESDAY, 21 MAY 2024  ·  AI FOR BHARAT" title="Good morning, Anika." copy="Turn the voice notes your team already sends into work that actually moves."><button className="primary-button" onClick={runDemo} disabled={running}><Play size={12} fill="currentColor"/> {running ? 'Processing voice note…' : 'Run voice note demo'}</button></Heading><div className="capture-compose"><div className="segmented"><button className={inputMode === 'voice' ? 'active' : ''} onClick={() => setInputMode('voice')}><Mic size={14}/> Voice note</button><button className={inputMode === 'text' ? 'active' : ''} onClick={() => setInputMode('text')}><FileText size={14}/> I won't upload a voice note</button></div>{inputMode === 'text' ? <div className="text-input"><textarea value={textDraft} onChange={e => setTextDraft(e.target.value)} placeholder='Type the instruction, e.g. "Rahul, kal tak vendor quotation compare kar dena. Finance policy ke according advance 20% se zyada nahi hona chahiye, but vendor says 30%."' rows={3}/><button className="primary-button" onClick={submitText} disabled={busy}><ArrowRight size={13}/> {busy ? 'Processing…' : 'Send to KaamSetu'}</button></div> : <p className="hint">Upload a voice note, or choose "I won't upload a voice note" to type the instruction instead.</p>}</div><Stats/><div className="content-grid"><div><div className="section-header"><div><h2>Latest captures</h2><p>Voice notes, transcribed and made accountable.</p></div><button className="text-button">View all <ArrowRight size={13}/></button></div><div className="capture-list">{captures.map(capture => <CaptureCard key={capture.id} capture={capture} assign={assign}/>)}</div></div><aside><div className="section-header"><div><h2>Needs your eye</h2><p>AI paused these on purpose.</p></div></div><ReviewQueue setView={setView}/><div className="evidence-note"><span className="quote">“</span><div><strong>The model should know when to stop.</strong><p>KaamSetu never silently averages conflicting instructions. It surfaces the evidence and hands the decision back.</p><small>— Your team's private intelligence layer</small></div></div></aside></div></section>; }
function Stats() { return <div className="stats-row"><Stat label="OPEN ACTIONS" value="07" note="2 due today"/><Stat label="WAITING FOR REVIEW" value="02" note="1 has a conflict" orange/><Stat label="CAPTURED THIS WEEK" value="18" note="↑ 24% vs last week"/><Stat label="MODEL CONFIDENCE" value="91.4%" note="Across 36 items"/></div>; }
function Stat({ label, value, note, orange }) { return <div className="stat"><span className="stat-label">{label}</span><strong className={orange ? 'orange' : ''}>{value}</strong><span className="stat-note">{note}</span></div>; }
function CaptureCard({ capture, assign }) { const bars = Array.from({ length: 34 }); return <article className={`capture ${capture.state === 'assigned' ? 'assigned' : ''}`}><div className="capture-head"><span className={`speaker-avatar ${capture.tone}`}>{capture.initials}</span><div className="capture-meta"><div><strong>{capture.speaker}</strong><span className="time">{capture.time}</span></div><div className="tag-row"><span className={`tag ${capture.state === 'conflict' ? 'purple' : 'green'}`}>{capture.state === 'assigned' ? 'ASSIGNED' : capture.state === 'conflict' ? 'ACTION EXTRACTED' : 'READY TO ASSIGN'}</span>{capture.state === 'conflict' && <span className="tag orange-tag">CONFLICT FOUND</span>}</div></div><button className="more-button" aria-label="More options"><MoreHorizontal size={17}/></button></div><div className="waveform">{bars.map((_, i) => <span key={i} style={{ height: `${8 + ((i * 17) % 24)}px` }}/>)}</div><div className="transcript"><span className="quote">“</span><p>{capture.transcript}</p></div><div className="capture-footer"><div className="action-preview"><span className={`check-box ${capture.state === 'assigned' ? 'done' : ''}`}>{capture.state === 'assigned' ? <Check size={12}/> : '○'}</span><div><span className="mini-label">SUGGESTED ACTION · ASSIGNEE {capture.assignee.toUpperCase()}</span><strong>{capture.action}</strong></div></div>{capture.state === 'conflict' ? <button className="review-button" onClick={() => window.dispatchEvent(new Event('open-conflict'))}>Review conflict <ArrowRight size={13}/></button> : capture.state === 'assigned' ? <span className="assigned-label">Assigned ✓</span> : <button className="assign-button" onClick={() => assign(capture)}>Assign <ArrowRight size={13}/></button>}</div></article>; }
function ReviewQueue({ setView }) { return <div className="review-panel"><div className="panel-label"><span className="pulse-dot"/> HUMAN REVIEW QUEUE <span className="queue-count">2</span></div><div className="review-item"><span className="review-icon orange-bg">!</span><div><strong>Advance payment policy</strong><p>Two sources disagree</p><small>Captured 8m ago</small></div><ArrowRight size={15}/></div><div className="review-item"><span className="review-icon purple-bg">?</span><div><strong>“Delivery kab hai?”</strong><p>Missing an assignee</p><small>Captured 31m ago</small></div><ArrowRight size={15}/></div><button className="panel-link" onClick={() => setView('conflicts')}>Open review queue <ArrowRight size={13}/></button></div>; }
function ConflictView({ notify }) { return <section className="view"><Heading eyebrow="CONTROLLED UNCERTAINTY  ·  02 OPEN" title="Review what the AI refused to decide." copy="When sources disagree, KaamSetu shows its work instead of guessing."/><div className="conflict-detail"><div className="conflict-title"><span className="review-icon orange-bg">!</span><div><span className="mini-label">CONFLICT · HIGH IMPACT</span><h2>What is the maximum vendor advance?</h2><p>Detected in Ravi Mehta's voice note · Today, 10:42 AM</p></div><span className="confidence-badge">87% conflict confidence</span></div><div className="sources"><Source number="01" kind="FINANCE POLICY · PDF" date="Updated 04 Apr" text="Advance payment must not exceed 20% of the purchase order value." citation="finance-policy-v3.pdf · p. 4"/><span className="versus">VS</span><Source number="02" kind="VENDOR QUOTATION · DOCX" date="Received today" text="For this order, an advance of 30% is requested to begin production." citation="sharma-steels-quote.docx · p. 1" warning/></div><div className="decision-bar"><div><span className="mini-label">SUGGESTED NEXT STEP</span><strong>Ask Ravi to confirm which policy applies before approving.</strong></div><div className="decision-actions"><button className="secondary-button" onClick={() => notify('Conflict kept paused. Nothing was silently approved.')}>Keep paused</button><button className="primary-button" onClick={() => notify('Confirmation request sent to Ravi')}>Send to Ravi <ArrowRight size={13}/></button></div></div></div></section>; }
function Source({ number, kind, date, text, citation, warning }) { return <div className={`source ${warning ? 'source-warning' : ''}`}><div className="source-top"><span className="source-number">{number}</span><span className="source-kind">{kind}</span><span className="source-date">{date}</span></div><p>{text.replace('20%', '').replace('30%', '')}<mark className={warning ? 'orange-mark' : ''}>{warning ? '30%' : '20%'}</mark>{warning ? ' is requested to begin production.' : ' of the purchase order value.'}</p><div className="citation">{citation} <ArrowRight size={12}/></div></div>; }
function PeopleView() { const people = [['RS','saffron','Rahul Sharma','Procurement · 3 open actions'],['MV','teal','Mohan Verma','Dispatch · 2 open actions'],['PS','lilac','Priya Shah','Operations · 2 open actions'],['RM','blue','Ravi Mehta','Owner · 1 review request']]; return <section className="view"><Heading eyebrow="TEAM GRAPH  ·  06 MEMBERS" title="People behind the work." copy="Assignments stay accountable to the humans who can move them."><button className="secondary-button">+ Add person</button></Heading><div className="people-grid">{people.map(([initials,tone,name,detail]) => <div className="person" key={name}><span className={`large-avatar ${tone}`}>{initials}</span><div><h3>{name}</h3><p>{detail}</p></div><span className="person-status">Active</span></div>)}</div></section>; }
function EvaluationView() { return <section className="view"><Heading eyebrow="EVALUATION HARNESS  ·  RUN 08" title="We measure when it should stop." copy="Twenty test cases keep the model honest after every prompt change."><button className="primary-button"><Activity size={14}/> Run evaluation</button></Heading><div className="eval-grid"><div className="eval-score"><span className="stat-label">OVERALL SCORE</span><strong>91.4%</strong><div className="score-bar"><span/></div><p>+4.2% since yesterday</p></div><div className="eval-table"><div className="eval-row eval-header"><span>TEST SUITE</span><span>SCORE</span><span>LAST RUN</span></div>{[['Task extraction','96%','2m ago'],['Citation grounding','93%','2m ago'],['Conflict detection','84%','2m ago'],['Safe refusal','92%','2m ago']].map(([name,score,time]) => <div className="eval-row" key={name}><strong>{name}</strong><span className={score === '84%' ? 'warn' : 'good'}>{score}</span><span>{time}</span></div>)}</div></div></section>; }

window.addEventListener('open-conflict', () => document.querySelector('[data-view="conflicts"]')?.click());
createRoot(document.getElementById('root')).render(<App/>);
