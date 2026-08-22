import React, { useEffect, useState } from 'react';
import { CircleHelp, Search, WifiOff } from 'lucide-react';
import { USERS, getStoredUser, saveStoredUser } from './constants/users';
import API from './api';

import Sidebar from './components/layout/Sidebar';
import InboxView from './components/inbox/InboxView';
import CompletedView from './components/completed/CompletedView';
import WorkflowView from './components/workflow/WorkflowView';
import PeopleView from './components/people/PeopleView';
import EvaluationView from './components/evaluation/EvaluationView';
import ConfirmationView from './components/confirmation/ConfirmationView';

/**
 * Root application component.
 *
 * Manages global state: current user, tasks, view routing,
 * toast notifications, and offline detection.
 */
export default function App() {
  const [view, setView] = useState('inbox');
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [activeConfirmation, setActiveConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [offline, setOffline] = useState(false);
  const [inputMode, setInputMode] = useState('text');
  const [textDraft, setTextDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [workflowCaptureId, setWorkflowCaptureId] = useState(null);
  const [activeCompleteTaskId, setActiveCompleteTaskId] = useState(null);
  const [completeText, setCompleteText] = useState('');

  /* ── Persist selected user to localStorage ── */
  useEffect(() => {
    saveStoredUser(currentUser.id);
  }, [currentUser]);

  /* ── Task loading ── */
  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await API.fetchTasks(currentUser);
      setTasks(data.tasks || []);
    } catch (e) {
      console.error('loadTasks error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear tokens for other users on switch
    USERS.forEach((u) => {
      if (u.id !== currentUser.id) localStorage.removeItem(`kaamsetu_token_${u.id}`);
    });
    setTasks([]);
    setView('inbox');
    setTextDraft('');
    loadTasks();
  }, [currentUser]);

  /* ── Health check ── */
  useEffect(() => {
    API.checkHealth().then((ok) => { if (!ok) setOffline(true); });
  }, []);

  /* ── Toast helper ── */
  const notify = (message, type = 'info') => {
    setToast({ message, type });
    window.clearTimeout(window.__toast);
    window.__toast = window.setTimeout(() => setToast({ message: '', type: 'info' }), 4000);
  };

  /* ── Actions ── */
  const submitText = async () => {
    const text = textDraft.trim();
    if (!text) { notify('Type the instruction first', 'error'); return; }
    setBusy(true);
    try {
      await API.ingestText(text, currentUser);
      notify('Tasks extracted and workflow created!', 'success');
      setTextDraft('');
      await loadTasks();
    } catch (e) {
      notify(e.message || 'Processing failed', 'error');
    } finally {
      setBusy(false);
    }
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
    } catch (e) {
      notify('Error: ' + e.message, 'error');
    }
  };

  const openWorkflow = (captureId) => {
    setWorkflowCaptureId(captureId);
    setView('workflow');
  };

  /* ── Derived task lists ── */
  const myFirstName = currentUser.name.split(' ')[0].toLowerCase();
  const myFullName = currentUser.name.toLowerCase();
  const isAssignedToMe = (t) => {
    const a = (t.assignee || '').toLowerCase();
    return a.includes(myFirstName) || a.includes(myFullName);
  };

  const myTasks = tasks.filter((t) => isAssignedToMe(t) && t.status === 'assigned');
  const myCreatedTasks = tasks.filter((t) => t.capture_speaker === currentUser.name && !isAssignedToMe(t));
  const confirmationTasks = tasks.filter((t) => t.needsReview);

  /* ── View label for breadcrumb ── */
  const viewLabel = view === 'confirmations'
    ? 'Confirmation'
    : view.charAt(0).toUpperCase() + view.slice(1);

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        setView={setView}
        offline={offline}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        myTasksCount={myTasks.length}
        confirmationsCount={confirmationTasks.length}
      />

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Mehta Traders <b>/</b> <span>{viewLabel}</span>
          </div>
          <div className="top-actions">
            {offline
              ? <span className="sync-status offline"><WifiOff size={14} /> Local mode</span>
              : <span className="sync-status"><i /> Synced</span>}
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button>
          </div>
        </header>

        {view === 'inbox' && (
          <InboxView
            tasks={tasks} myTasks={myTasks} myCreatedTasks={myCreatedTasks}
            confirmationTasks={confirmationTasks}
            inputMode={inputMode} setInputMode={setInputMode}
            textDraft={textDraft} setTextDraft={setTextDraft}
            submitText={submitText} busy={busy} currentUser={currentUser}
            completeTask={completeTask} openWorkflow={openWorkflow}
            setActiveConfirmation={setActiveConfirmation} setView={setView}
            activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId}
            completeText={completeText} setCompleteText={setCompleteText}
            loading={loading} notify={notify}
          />
        )}

        {view === 'completed' && <CompletedView currentUser={currentUser} />}
        {view === 'workflow' && <WorkflowView captureId={workflowCaptureId} currentUser={currentUser} setView={setView} />}
        {view === 'people' && <PeopleView />}
        {view === 'evaluation' && <EvaluationView />}
        {view === 'confirmations' && (
          <ConfirmationView
            task={activeConfirmation} currentUser={currentUser}
            setView={setView} notify={notify} loadTasks={loadTasks}
          />
        )}
      </main>

      {/* Toast notification */}
      <div
        className={`toast ${toast.message ? 'show' : ''} ${toast.type === 'error' ? 'error' : toast.type === 'success' ? 'success' : ''}`}
        role="status"
      >
        {toast.message}
      </div>
    </div>
  );
}
