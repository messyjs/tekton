/**
 * Conductor UI — Visual swarm grid for agent orchestration.
 *
 * Renders as a dashboard page showing:
 *   - Agent cards with live status (spawning/working/idle/completed/failed)
 *   - Task queue with progress
 *   - Batch submission UI
 *   - Kill/retry controls per agent
 *   - Real-time event stream
 *
 * This module exports a function that generates the HTML for the Conductor page.
 * It connects to the Dashboard WS server for live updates.
 */
import type { DashboardConfig } from "./types.js";

export function generateConductorHTML(config: DashboardConfig): string {
  const wsPort = (config as any).wsPort ?? 7701;

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tekton Conductor</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0f1a; color: #c9d1d9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; }

  .conductor { padding: 24px; max-width: 1400px; margin: 0 auto; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 700; color: #e6edf3; }
  .header-stats { display: flex; gap: 20px; }
  .stat-box { background: #141a24; border: 1px solid #1b2332; border-radius: 8px; padding: 10px 16px; text-align: center; min-width: 80px; }
  .stat-value { font-size: 20px; font-weight: 700; color: #58a6ff; }
  .stat-label { font-size: 10px; color: #484f58; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Agent Grid */
  .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .agent-card {
    background: #141a24; border: 1px solid #1b2332; border-radius: 8px; padding: 14px;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .agent-card:hover { border-color: #30363d; }
  .agent-card.spawning { border-left: 3px solid #d29922; }
  .agent-card.working { border-left: 3px solid #58a6ff; }
  .agent-card.idle { border-left: 3px solid #238636; }
  .agent-card.completed { border-left: 3px solid #8b949e; }
  .agent-card.failed { border-left: 3px solid #f85149; }
  .agent-card .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .agent-card .agent-id { font-family: 'SF Mono', monospace; font-size: 11px; color: #8b949e; }
  .agent-card .status-badge {
    font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .status-spawning .status-badge { background: #d2992220; color: #d29922; }
  .status-working .status-badge { background: #58a6ff20; color: #58a6ff; }
  .status-idle .status-badge { background: #23863620; color: #238636; }
  .status-completed .status-badge { background: #8b949e20; color: #8b949e; }
  .status-failed .status-badge { background: #f8514920; color: #f85149; }
  .agent-card .task-desc { font-size: 12px; color: #c9d1d9; margin-bottom: 6px; min-height: 18px; }
  .agent-card .card-meta { display: flex; gap: 12px; font-size: 11px; color: #484f58; }
  .agent-card .card-actions { display: none; gap: 6px; margin-top: 8px; }
  .agent-card:hover .card-actions { display: flex; }
  .btn { padding: 3px 10px; border-radius: 4px; border: 1px solid #30363d; background: #0d1117; color: #c9d1d9; cursor: pointer; font-size: 11px; }
  .btn:hover { background: #161b22; }
  .btn-danger { border-color: #f8514940; color: #f85149; }
  .btn-danger:hover { background: #f8514920; }

  /* Submit Task */
  .submit-panel {
    background: #141a24; border: 1px solid #1b2332; border-radius: 8px; padding: 16px;
    margin-bottom: 24px;
  }
  .submit-panel h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #e6edf3; }
  .submit-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  .submit-row label { font-size: 12px; color: #8b949e; min-width: 80px; }
  input, select, textarea {
    background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
    padding: 6px 10px; color: #c9d1d9; font-size: 13px; flex: 1;
  }
  textarea { min-height: 60px; font-family: 'SF Mono', monospace; resize: vertical; }
  .btn-primary { background: #1f6feb; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; }
  .btn-primary:hover { background: #388bfd; }

  /* Event Stream */
  .event-stream {
    background: #0d1117; border: 1px solid #1b2332; border-radius: 8px;
    padding: 12px; max-height: 300px; overflow-y: auto; font-family: 'SF Mono', monospace; font-size: 11px;
  }
  .event-stream .event { padding: 3px 0; border-bottom: 1px solid #141a24; }
  .event .time { color: #484f58; }
  .event .type { color: #58a6ff; font-weight: 600; }
  .event .data { color: #8b949e; }

  /* Empty state */
  .empty-state { text-align: center; padding: 60px 20px; color: #484f58; }
  .empty-state h2 { font-size: 18px; color: #30363d; margin-bottom: 8px; }
  .empty-state p { font-size: 13px; }

  /* Loading spinner */
  @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
  .loading { animation: pulse 2s ease-in-out infinite; }
</style>
</head>
<body>
<div class="conductor">
  <div class="header">
    <h1>⚡ Conductor</h1>
    <div class="header-stats">
      <div class="stat-box"><div class="stat-value" id="stat-total">0</div><div class="stat-label">Agents</div></div>
      <div class="stat-box"><div class="stat-value" id="stat-active">0</div><div class="stat-label">Active</div></div>
      <div class="stat-box"><div class="stat-value" id="stat-tasks">0</div><div class="stat-label">Tasks</div></div>
      <div class="stat-box"><div class="stat-value" id="stat-completed">0</div><div class="stat-label">Done</div></div>
    </div>
  </div>

  <div class="submit-panel">
    <h3>Submit Mission</h3>
    <div class="submit-row">
      <label>Mode</label>
      <select id="task-mode">
        <option value="parallel">Parallel (independent tasks)</option>
        <option value="sequential">Sequential (chained tasks)</option>
      </select>
    </div>
    <div class="submit-row">
      <label>Skill Hint</label>
      <input id="task-skill" placeholder="e.g., code-generation, gann-analysis" />
    </div>
    <div class="submit-row">
      <label>Context</label>
      <input id="task-context" placeholder="Shared context for all tasks" />
    </div>
    <div class="submit-row">
      <label>Tasks (one per line)</label>
      <textarea id="task-list" placeholder="Analyze BTC chart for Gann levels\\nWrite Pine Script strategy\\nBacktest on 4H timeframe"></textarea>
    </div>
    <div class="submit-row" style="justify-content: flex-end;">
      <button class="btn-primary" id="btn-submit">Submit Mission</button>
      <button class="btn btn-danger" id="btn-kill-all">Kill All</button>
    </div>
  </div>

  <div id="agent-grid" class="agent-grid">
    <div class="empty-state">
      <h2>No agents running</h2>
      <p>Submit a mission above to spawn agents.</p>
    </div>
  </div>

  <div class="submit-panel">
    <h3>Event Stream</h3>
    <div class="event-stream" id="event-stream">
      <div class="event"><span class="time">${new Date().toLocaleTimeString()}</span> <span class="type">system</span> <span class="data">Conductor connected</span></div>
    </div>
  </div>
</div>

<script>
const WS_PORT = ${wsPort};
let ws = null;
let agents = {};
let eventLog = [];

function connect() {
  ws = new WebSocket('ws://localhost:' + WS_PORT);
  ws.onopen = () => { addEvent('system', 'WebSocket connected'); };
  ws.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data);
      handleEvent(event);
    } catch(err) {}
  };
  ws.onclose = () => {
    addEvent('system', 'Connection lost — reconnecting...');
    setTimeout(connect, 3000);
  };
  ws.onerror = () => {};

  // Fetch initial state
  fetch('/api/agents').then(r=>r.json()).then(data => {
    agents = {};
    if (data.agents) {
      for (const a of data.agents) {
        agents[a.id || a.agentId] = a;
      }
    }
    renderAgents();
    updateStats();
  }).catch(()=>{});

  // Fetch initial pool status
  fetch('/api/status').then(r=>r.json()).then(data => {
    if (data.agents) {
      document.getElementById('stat-total').textContent = data.agents.max ?? data.agents.active ?? 0;
      document.getElementById('stat-active').textContent = data.agents.active ?? 0;
    }
  }).catch(()=>{});
}

function handleEvent(event) {
  addEvent(event.type, JSON.stringify(event.data).slice(0, 120));

  switch (event.type) {
    case 'pool_agent_spawned':
    case 'agent_spawned':
      const id1 = event.data?.agentId || event.data?.id || 'agent_' + Date.now();
      agents[id1] = { id: id1, status: 'spawning', task: 'Initializing...', skillHint: event.data?.skillHint };
      break;
    case 'pool_task_started':
    case 'task_started':
    case 'task_submitted':
      const id2 = event.data?.agentId || event.data?.taskId || '';
      if (agents[id2]) { agents[id2].status = 'working'; agents[id2].task = event.data?.task || event.data?.description || 'Processing...'; }
      break;
    case 'pool_task_completed':
    case 'task_completed':
      const id3 = event.data?.agentId || '';
      if (agents[id3]) { agents[id3].status = 'completed'; }
      break;
    case 'pool_task_failed':
    case 'task_failed':
      const id4 = event.data?.agentId || '';
      if (agents[id4]) { agents[id4].status = 'failed'; agents[id4].error = event.data?.error; }
      break;
    case 'pool_agent_killed':
    case 'agent_killed':
      const id5 = event.data?.agentId || event.data?.id || '';
      delete agents[id5];
      break;
    case 'pool_killed_all':
      agents = {};
      break;
  }
  renderAgents();
  updateStats();
}

function renderAgents() {
  const grid = document.getElementById('agent-grid');
  const keys = Object.keys(agents);
  if (keys.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h2>No agents running</h2><p>Submit a mission above to spawn agents.</p></div>';
    return;
  }
  grid.innerHTML = keys.map(id => {
    const a = agents[id];
    const status = a.status || 'idle';
    const shortId = id.slice(0, 12);
    return '<div class="agent-card ' + status + '">' +
      '<div class="card-header">' +
        '<span class="agent-id">' + shortId + '</span>' +
        '<span class="status-badge status-' + status + '">' + status + '</span>' +
      '</div>' +
      '<div class="task-desc">' + (a.task || a.description || '—') + '</div>' +
      '<div class="card-meta">' +
        '<span>Skill: ' + (a.skillHint || '—') + '</span>' +
      '</div>' +
      '<div class="card-actions">' +
        (status === 'working' || status === 'spawning' ? '<button class="btn btn-danger" onclick="killAgent(\\''+id+'\\')">Kill</button>' : '') +
        (status === 'failed' ? '<button class="btn" onclick="retryAgent(\\''+id+'\\')">Retry</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function updateStats() {
  const keys = Object.keys(agents);
  document.getElementById('stat-total').textContent = keys.length;
  document.getElementById('stat-active').textContent = keys.filter(id => agents[id].status === 'working' || agents[id].status === 'spawning').length;
  document.getElementById('stat-tasks').textContent = keys.filter(id => agents[id].status === 'working').length;
  document.getElementById('stat-completed').textContent = keys.filter(id => agents[id].status === 'completed').length;
}

function addEvent(type, data) {
  const stream = document.getElementById('event-stream');
  const time = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.className = 'event';
  div.innerHTML = '<span class="time">' + time + '</span> <span class="type">' + type + '</span> <span class="data">' + data + '</span>';
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
  if (stream.children.length > 200) stream.removeChild(stream.firstChild);
}

async function killAgent(id) {
  try {
    await fetch('/api/agents/' + id + '/kill', { method: 'POST' });
  } catch {}
}

async function retryAgent(id) {
  // Resubmit task (would need original task info)
  addEvent('system', 'Retry requested for ' + id.slice(0, 8));
}

document.getElementById('btn-submit').addEventListener('click', async () => {
  const mode = document.getElementById('task-mode').value;
  const skill = document.getElementById('task-skill').value;
  const context = document.getElementById('task-context').value;
  const taskLines = document.getElementById('task-list').value.split('\\n').filter(l => l.trim());

  if (!taskLines.length) { alert('Enter at least one task'); return; }

  const tasks = taskLines.map((desc, i) => ({
    task: desc.trim(),
    skill_hint: skill || undefined,
    timeout_ms: 60000,
  }));

  try {
    const resp = await fetch('/api/agents/delegate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, tasks, context: context || undefined }),
    });
    const result = await resp.json();
    addEvent('mission', 'Submitted ' + tasks.length + ' tasks (' + mode + ')');
    document.getElementById('task-list').value = '';
  } catch (err) {
    addEvent('error', 'Submission failed: ' + err.message);
  }
});

document.getElementById('btn-kill-all').addEventListener('click', async () => {
  if (!confirm('Kill all agents?')) return;
  try {
    await fetch('/api/agents/kill-all', { method: 'POST' });
    agents = {};
    renderAgents();
    addEvent('system', 'All agents killed');
  } catch (err) {
    addEvent('error', 'Kill all failed: ' + err.message);
  }
});

connect();
</script>
</body>
</html>`;
}