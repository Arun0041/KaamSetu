/**
 * Centralised API layer.
 * Every fetch goes through here so auth, error handling, and base URL
 * are configured in one place.
 */

const API_URL = import.meta.env.VITE_API_URL || '';

async function getToken(user) {
  if (!user) return 'mock_default';
  const storedKey = `kaamsetu_token_${user.id}`;
  const stored = localStorage.getItem(storedKey);
  if (stored && !stored.startsWith('mock_')) return stored;

  const { email, name } = user;
  const password = 'demo-password-123';

  // Try login first, then register
  let res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem(storedKey, data.accessToken);
    return data.accessToken;
  }

  res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem(storedKey, data.accessToken);
    return data.accessToken;
  }

  return `mock_${user.id}`;
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function handle401(user) {
  localStorage.removeItem(`kaamsetu_token_${user?.id}`);
}

const API = {
  /** Ingest a text transcript and create tasks. */
  async ingestText(transcript, user) {
    const token = await getToken(user);
    const res = await fetch(`${API_URL}/api/ingest/text`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { handle401(user); throw new Error('Token expired. Please click send again.'); }
    if (!res.ok) throw new Error(data.error || 'Processing failed');
    return Array.isArray(data) ? data : [data];
  },

  /** Fetch active (non-done) tasks. */
  async fetchTasks(user) {
    const token = await getToken(user);
    const res = await fetch(`${API_URL}/api/tasks`, { headers: authHeaders(token) });
    if (res.status === 401) { handle401(user); throw new Error('Token expired'); }
    if (!res.ok) throw new Error('Failed to load tasks');
    return res.json();
  },

  /** Fetch completed tasks. */
  async fetchCompletedTasks(user) {
    const token = await getToken(user);
    const res = await fetch(`${API_URL}/api/tasks/completed`, { headers: authHeaders(token) });
    if (!res.ok) return { tasks: [] };
    return res.json();
  },

  /** Resolve/complete a task and unblock dependents. */
  async resolveTask(taskId, resolutionText, user) {
    const token = await getToken(user);
    return fetch(`${API_URL}/api/tasks/${taskId}/resolve`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ resolutionText }),
    });
  },

  /** Fetch the full workflow chain for a capture. */
  async fetchWorkflow(captureId, user) {
    const token = await getToken(user);
    const res = await fetch(`${API_URL}/api/tasks/workflow/${captureId}`, { headers: authHeaders(token) });
    if (!res.ok) return { tasks: [] };
    return res.json();
  },

  /** Approve / resolve a review item (human confirmation). */
  async confirmReview(reviewId, user) {
    const token = await getToken(user);
    return fetch(`${API_URL}/api/review/${reviewId}/resolve`, {
      method: 'POST',
      headers: authHeaders(token),
    });
  },

  /** PATCH a task (update title, assignee, status). */
  async updateTask(taskId, patch, user) {
    const token = await getToken(user);
    return fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(patch),
    });
  },

  /** Check server health. */
  async checkHealth() {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      return res.ok;
    } catch { return false; }
  },
};

export default API;
