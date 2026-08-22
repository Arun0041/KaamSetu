import React from 'react';
import { Activity, ArrowRight, FileText, LayoutDashboard, Mic, Play } from 'lucide-react';
import Heading from '../layout/Heading';
import SkeletonCards from '../common/SkeletonCards';
import VoiceRecorder from '../common/VoiceRecorder';
import TaskCard from './TaskCard';
import Stats from './Stats';
import ReviewQueue from './ReviewQueue';

/**
 * Main inbox view — voice/text capture, stats, task lists, and review queue.
 */
export default function InboxView({
  tasks, myTasks, myCreatedTasks, confirmationTasks,
  inputMode, setInputMode, textDraft, setTextDraft,
  submitText, busy, currentUser, completeTask, openWorkflow,
  setActiveConfirmation, setView,
  activeCompleteTaskId, setActiveCompleteTaskId,
  completeText, setCompleteText, loading, notify,
}) {
  const today = new Date()
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase();

  return (
    <section className="view">
      <Heading
        eyebrow={`${today}  ·  ${currentUser.email}`}
        title={`Good morning, ${currentUser.name.split(' ')[0]}.`}
        copy="Turn the voice notes your team already sends into work that actually moves."
      />

      {/* Capture compose box */}
      <div className="capture-compose fade-in">
        <div className="segmented">
          <button className={inputMode === 'voice' ? 'active' : ''} onClick={() => setInputMode('voice')}>
            <Mic size={16} /> Voice note
          </button>
          <button className={inputMode === 'text' ? 'active' : ''} onClick={() => setInputMode('text')}>
            <FileText size={16} /> Text command
          </button>
        </div>

        {inputMode === 'text' ? (
          <div className="text-input fade-in">
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder='e.g. "Ravi Mehta se bolo ki vah Apne Sare employee detail De aur FIR Mohan se bolo vah Sare data portal per update Karke"'
              rows={3}
            />
            <button className="primary-button" onClick={submitText} disabled={busy}>
              {busy ? <Activity size={16} className="spinner" /> : <ArrowRight size={16} />}
              {busy ? 'Processing…' : 'Send to KaamSetu'}
            </button>
          </div>
        ) : (
          <div className="voice-input-wrapper fade-in">
            <VoiceRecorder onText={setTextDraft} textDraft={textDraft} />
            {textDraft && (
              <button className="primary-button" onClick={submitText} disabled={busy} style={{ marginTop: '16px' }}>
                {busy ? <Activity size={16} className="spinner" /> : <Play size={14} fill="currentColor" />}
                {busy ? 'Processing…' : 'Process Voice Note'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading skeleton OR real content */}
      {loading ? (
        <div className="fade-in">
          <div className="stats-row skeleton-stats">
            {[1, 2, 3, 4].map((i) => (
              <div className="stat" key={i}>
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton" style={{ width: '50%', height: 36, marginTop: 12, borderRadius: 6 }} />
                <div className="skeleton skeleton-text short" style={{ width: '70%', marginTop: 8 }} />
              </div>
            ))}
          </div>
          <div className="content-grid">
            <div>
              <div className="section-header">
                <div><h2>Loading tasks…</h2><p>Fetching your assignments.</p></div>
              </div>
              <SkeletonCards count={3} />
            </div>
            <aside>
              <div className="section-header">
                <div><h2>Needs your eye</h2><p>AI paused these on purpose.</p></div>
              </div>
              <div className="review-panel">
                <div className="panel-label">
                  <span className="pulse-dot" /> PENDING CONFIRMATIONS <span className="queue-count">–</span>
                </div>
                {[1, 2].map((i) => (
                  <div key={i} className="review-item" style={{ borderTop: i === 1 ? 0 : undefined }}>
                    <div className="skeleton skeleton-avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-text" style={{ width: '70%', background: 'rgba(255,255,255,0.08)' }} />
                      <div className="skeleton skeleton-text short" style={{ width: '40%', marginTop: 6, background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <>
          <div className="fade-in" style={{ animationDelay: '0.1s' }}>
            <Stats
              myTasks={myTasks.length}
              created={myCreatedTasks.length}
              confirmations={confirmationTasks.length}
              total={tasks.length}
            />
          </div>

          <div className="content-grid fade-in" style={{ animationDelay: '0.2s' }}>
            <div>
              {/* Assigned to me */}
              {myTasks.length > 0 && (
                <div style={{ marginBottom: '48px' }}>
                  <div className="section-header">
                    <div><h2>🔴 Assigned to you</h2><p>Complete these tasks and provide your data.</p></div>
                  </div>
                  <div className="capture-list">
                    {myTasks.map((t) => (
                      <TaskCard
                        key={t.id} task={t} currentUser={currentUser}
                        completeTask={completeTask} openWorkflow={openWorkflow}
                        activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId}
                        completeText={completeText} setCompleteText={setCompleteText} notify={notify}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Needs confirmation */}
              {confirmationTasks.length > 0 && (
                <div style={{ marginBottom: '48px' }}>
                  <div className="section-header">
                    <div><h2>⚠️ Needs confirmation</h2><p>AI paused these for human review.</p></div>
                  </div>
                  <div className="capture-list">
                    {confirmationTasks.map((t) => (
                      <TaskCard
                        key={t.id} task={t} currentUser={currentUser}
                        completeTask={completeTask} openWorkflow={openWorkflow}
                        onConfirm={() => { setActiveConfirmation(t); setView('confirmations'); }}
                        activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId}
                        completeText={completeText} setCompleteText={setCompleteText} notify={notify}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Workflows I initiated */}
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
                  myCreatedTasks.map((t) => (
                    <TaskCard
                      key={t.id} task={t} currentUser={currentUser}
                      completeTask={completeTask} openWorkflow={openWorkflow}
                      activeCompleteTaskId={activeCompleteTaskId} setActiveCompleteTaskId={setActiveCompleteTaskId}
                      completeText={completeText} setCompleteText={setCompleteText} notify={notify}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right sidebar */}
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
        </>
      )}
    </section>
  );
}
