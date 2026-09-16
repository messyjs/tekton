/**
 * Dashboard SPA — Self-contained HTML with inline React/ReactDOM via CDN.
 * Upgraded: Chat, Terminal, Files, Kanban, Swarm, Documents, Models pages.
 * No build step required; React + xterm.js loaded from CDN.
 */
import type { DashboardConfig } from "./types.js";
import { DASHBOARD_PAGES } from "./types.js";

export function generateDashboardHTML(config: DashboardConfig): string {
  const wsPort = (config as any).wsPort ?? config.port + 1;
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Tekton Dashboard</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#000000">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5/css/xterm.css">
  <script src="https://cdn.jsdelivr.net/npm/xterm@5/lib/xterm.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0/lib/xterm-addon-fit.js"><\/script>
  <style>
    :root {
      --bg-primary: #000000;
      --bg-secondary: #0a0a0a;
      --bg-tertiary: #141414;
      --bg-card: #0d0d0d;
      --border: #1a1a1a;
      --border-hover: #2a2a2a;
      --text-primary: #FFFFFF;
      --text-secondary: #b0b0b0;
      --text-muted: #808080;
      --accent: #32CD32;
      --accent-hover: #28a828;
      --green: #32CD32;
      --yellow: #cccc32;
      --red: #CE2029;
      --purple: #999999;
      --cyan: #40cccc;
      --orange: #cc8032;
      --sidebar-w: 220px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg-primary); color: var(--text-primary); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; line-height: 1.5; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 3px; }

    /* Layout */
    .app { display: flex; min-height: 100vh; }
    .sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: var(--sidebar-w); background: var(--bg-secondary); border-right: 1px solid var(--border); display: flex; flex-direction: column; z-index: 50; }
    .main { margin-left: var(--sidebar-w); flex: 1; min-height: 100vh; }
    .page { padding: 24px; max-width: 1400px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-title { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px; }

    /* Sidebar */
    .sidebar-brand { padding: 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
    .sidebar-brand h1 { font-size: 16px; font-weight: 800; }
    .sidebar-brand .logo { font-size: 22px; }
    .sidebar-nav { flex: 1; overflow-y: auto; padding: 8px; }
    .nav-section { margin-bottom: 12px; }
    .nav-section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px 4px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; text-decoration: none; }
    .nav-item:hover { background: var(--bg-tertiary); color: var(--text-primary); }
    .nav-item.active { background: var(--accent); color: white; }
    .nav-icon { font-size: 16px; width: 20px; text-align: center; }
    .sidebar-footer { padding: 12px; border-top: 1px solid var(--border); }
    .ws-indicator { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); }

    /* Cards */
    .cards { display: grid; gap: 16px; }
    .cards-2 { grid-template-columns: repeat(2, 1fr); }
    .cards-3 { grid-template-columns: repeat(3, 1fr); }
    .cards-4 { grid-template-columns: repeat(4, 1fr); }
    .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; transition: border-color 0.2s; }
    .card:hover { border-color: var(--border-hover); }
    .stat-card { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .stat-value { font-size: 24px; font-weight: 800; color: var(--text-primary); }
    .stat-detail { font-size: 11px; color: var(--text-secondary); }

    /* Tables */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
    .data-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
    .data-table tr:hover td { background: rgba(255,255,255,0.02); }

    /* Badges */
    .badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .badge-green { background: rgba(34,197,94,0.15); color: var(--green); }
    .badge-red { background: rgba(239,68,68,0.15); color: var(--red); }
    .badge-yellow { background: rgba(234,179,8,0.15); color: var(--yellow); }
    .badge-blue { background: rgba(59,130,246,0.15); color: var(--accent); }
    .badge-purple { background: rgba(168,85,247,0.15); color: var(--purple); }
    .badge-gray { background: rgba(100,116,139,0.15); color: var(--text-secondary); }

    /* Dot */
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background: var(--green); }
    .dot-red { background: var(--red); }
    .dot-yellow { background: var(--yellow); }
    .dot-gray { background: var(--text-muted); }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); transition: all 0.15s; }
    .btn:hover { background: var(--border-hover); }
    .btn-primary { background: var(--accent); border-color: var(--accent); color: white; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-danger { border-color: rgba(239,68,68,0.4); color: var(--red); }
    .btn-danger:hover { background: rgba(239,68,68,0.15); }
    .btn-sm { padding: 4px 10px; font-size: 11px; }

    /* Inputs */
    .input { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; color: var(--text-primary); font-size: 13px; font-family: inherit; width: 100%; transition: border-color 0.15s; }
    .input:focus { outline: none; border-color: var(--accent); }
    .textarea { resize: vertical; min-height: 60px; font-family: 'SF Mono', 'Cascadia Code', monospace; }
    select.input { appearance: auto; }
    .input-group { display: flex; gap: 8px; align-items: center; }

    /* Code */
    pre, .code-block { background: var(--bg-primary); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; font-family: 'SF Mono', 'Cascadia Code', monospace; border: 1px solid var(--border); }

    /* Chat */
    .chat-container { display: flex; flex-direction: column; height: calc(100vh - 48px); }
    .chat-messages { flex: 1; overflow-y: auto; padding: 16px 0; }
    .chat-msg { padding: 12px 0; display: flex; gap: 12px; }
    .chat-msg.user { }
    .chat-msg.assistant { background: rgba(255,255,255,0.02); margin: 0 -24px; padding-left: 24px; padding-right: 24px; }
    .msg-avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .msg-avatar.user-av { background: var(--bg-tertiary); }
    .msg-avatar.ai-av { background: var(--accent); }
    .msg-body { flex: 1; min-width: 0; }
    .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .msg-name { font-weight: 600; font-size: 13px; }
    .msg-time { font-size: 11px; color: var(--text-muted); }
    .msg-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .chat-input-bar { padding: 12px 0; border-top: 1px solid var(--border); }
    .chat-input-row { display: flex; gap: 8px; align-items: flex-end; }
    .chat-input-row .textarea { min-height: 44px; max-height: 200px; flex: 1; }

    /* Terminal */
    .term-container { background: #000; border-radius: 8px; border: 1px solid var(--border); overflow: hidden; }
    .term-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border); font-size: 12px; }
    .term-body { padding: 4px; height: 500px; }
    .term-body .xterm { height: 100%; }

    /* Files */
    .file-grid { display: grid; gap: 4px; }
    .file-entry { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
    .file-entry:hover { background: var(--bg-tertiary); }
    .file-icon { font-size: 18px; width: 24px; text-align: center; }
    .file-name { flex: 1; font-size: 13px; }
    .file-size { font-size: 11px; color: var(--text-muted); font-family: monospace; }
    .file-modified { font-size: 11px; color: var(--text-muted); }
    .file-breadcrumb { display: flex; gap: 4px; align-items: center; font-size: 13px; margin-bottom: 16px; flex-wrap: wrap; }
    .file-breadcrumb span { color: var(--text-secondary); cursor: pointer; }
    .file-breadcrumb span:hover { color: var(--accent); }
    .file-breadcrumb .sep { color: var(--text-muted); cursor: default; }
    .file-editor { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; }
    .file-editor-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 12px; }
    .file-editor textarea { width: 100%; min-height: 400px; background: transparent; border: none; color: var(--text-primary); font-family: 'SF Mono', 'Cascadia Code', monospace; font-size: 13px; padding: 12px; resize: vertical; outline: none; line-height: 1.6; }

    /* Kanban */
    .kanban-board { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 16px; }
    .kanban-lane { min-width: 260px; flex: 1; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; max-height: calc(100vh - 200px); }
    .lane-header { padding: 12px 16px; border-bottom: 1px solid var(--border); font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: space-between; }
    .lane-count { font-size: 11px; color: var(--text-muted); font-weight: 500; }
    .lane-cards { flex: 1; overflow-y: auto; padding: 8px; }
    .kanban-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.15s; }
    .kanban-card:hover { border-color: var(--accent); }
    .card-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    .card-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
    .card-meta { display: flex; gap: 6px; flex-wrap: wrap; }

    /* Swarm */
    .swarm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .worker-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 14px; position: relative; border-left: 3px solid var(--text-muted); transition: all 0.2s; }
    .worker-card.spawned { border-left-color: var(--yellow); }
    .worker-card.running { border-left-color: var(--accent); }
    .worker-card.idle { border-left-color: var(--green); }
    .worker-card.completed { border-left-color: var(--text-secondary); }
    .worker-card.failed { border-left-color: var(--red); }
    .worker-id { font-family: monospace; font-size: 11px; color: var(--text-muted); }
    .worker-role { font-size: 12px; margin: 4px 0; }
    .worker-task { font-size: 12px; color: var(--text-secondary); }

    /* Animations */
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-in { animation: fadeIn 0.2s ease-out; }
    .loading-pulse { animation: pulse 2s ease-in-out infinite; }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main { margin-left: 0; }
      .cards-4 { grid-template-columns: repeat(2, 1fr); }
      .cards-3 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div id="root"></div>
<script>
const e = React.createElement;
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const PAGES = ${JSON.stringify(DASHBOARD_PAGES)};
const REFRESH_MS = ${config.refreshIntervalMs};
const WS_PORT = ${wsPort};

// ── API Helper ──────────────────────────────────────────────────────
async function api(path, opts) {
  try { const r = await fetch('/api' + path, opts); return await r.json(); }
  catch(err) { console.error('API:', path, err); return null; }
}
async function apiRaw(path, opts) {
  try { return await fetch('/api' + path, opts); }
  catch(err) { console.error('API:', path, err); return null; }
}

// ── WebSocket Hook ──────────────────────────────────────────────────
let _ws = null;
let _wsListeners = [];

function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    function connect() {
      _ws = new WebSocket('ws://localhost:' + WS_PORT);
      _ws.onopen = () => setConnected(true);
      _ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
      _ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          setEvents(prev => [data, ...prev].slice(0, 200));
          _wsListeners.forEach(fn => fn(data));
        } catch {}
      };
      _ws.onerror = () => {};
    }
    if (!_ws || _ws.readyState === WebSocket.CLOSED) connect();
    return () => {};
  }, []);

  const send = useCallback((data) => { if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify(data)); }, []);
  const subscribe = useCallback((fn) => { _wsListeners.push(fn); return () => { _wsListeners = _wsListeners.filter(f => f !== fn); }; }, []);

  return { connected, events, send, subscribe };
}

// ── Number formatting ───────────────────────────────────────────────
function fmtNum(n) { return n == null ? '–' : Number(n).toLocaleString(); }
function fmtTime(ms) { if (!ms) return '–'; const s = Math.floor(ms/1000); return s < 60 ? s+'s' : Math.floor(s/60)+'m '+s%60+'s'; }
function fmtDate(d) { return d ? new Date(d).toLocaleString() : '–'; }
function fmtRelative(d) {
  if (!d) return '–';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIDEBAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NAV_GROUPS = [
  { label: 'Core', pages: ['chat', 'status', 'sessions', 'terminal'] },
  { label: 'Workspace', pages: ['files', 'kanban', 'documents'] },
  { label: 'Intelligence', pages: ['pi', 'trading', 'models'] },
  { label: 'Swarm', pages: ['swarm', 'conductor'] },
  { label: 'System', pages: ['rules', 'skills', 'routing', 'analytics', 'memory', 'gateway', 'config', 'forge', 'training'] },
];

function Sidebar({ page, setPage }) {
  const { connected } = useWebSocket();
  return e('div', { className: 'sidebar' },
    e('div', { className: 'sidebar-brand' },
      e('span', { className: 'logo' }, 'T'),
      e('h1', null, 'Tekton')
    ),
    e('nav', { className: 'sidebar-nav' },
      NAV_GROUPS.map(g => e('div', { key: g.label, className: 'nav-section' },
        e('div', { className: 'nav-section-label' }, g.label),
        g.pages.map(pid => {
          const pg = PAGES.find(p => p.id === pid);
          if (!pg) return null;
          const icons = {
            chat: 'Chat', status: 'Stat', sessions: 'Sess', terminal: 'Term',
            files: 'Dir', kanban: 'Kbd', documents: 'Docs', pi: 'Pi',
            trading: 'Trade', models: 'AI', swarm: 'Swrm', conductor: 'Cond',
            skills: 'Skl', routing: 'Rte', analytics: 'Anlt', memory: 'Mem',
            gateway: 'GW', config: 'Cfg', forge: 'Frg', training: 'Trn',
            'scp-traffic': 'SCP',
            rules: 'Rul',
          };
          return e('div', {
            key: pid, className: 'nav-item' + (page === pid ? ' active' : ''),
            onClick: () => setPage(pid),
          },
            e('span', { className: 'nav-icon' }, icons[pid] || '...'),
            e('span', null, pg.label)
          );
        })
      ))
    ),
    e('div', { className: 'sidebar-footer' },
      e('div', { className: 'ws-indicator' },
        e('span', { className: 'dot ' + (connected ? 'dot-green' : 'dot-red') }),
        connected ? 'Connected' : 'Reconnecting...'
      )
    )
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATUS PAGE (upgraded)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StatusPage() {
  const [data, setData] = useState(null);
  const { subscribe } = useWebSocket();
  useEffect(() => {
    api('/status').then(setData);
    const iv = setInterval(() => api('/status').then(setData), REFRESH_MS);
    const unsub = subscribe(ev => { if (ev.type?.includes('status') || ev.type?.includes('health')) api('/status').then(setData); });
    return () => { clearInterval(iv); unsub(); };
  }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'System Status')),
    e('div', { className: 'cards cards-4' },
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Uptime'), e('div', { className: 'stat-value' }, fmtTime(data.uptimeMs))),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Total Tokens'), e('div', { className: 'stat-value' }, fmtNum(data.tokens?.total))),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Compression'), e('div', { className: 'stat-value' }, (data.compression?.ratio??0).toFixed(2)+'x'), e('div', { className: 'stat-detail' }, fmtNum(data.compression?.tokensSaved)+' saved')),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Skills'), e('div', { className: 'stat-value' }, data.skills?.total??0))
    ),
    e('div', { className: 'cards cards-3', style: { marginTop: 16 } },
      e('div', { className: 'card stat-card' },
        e('div', { className: 'stat-label' }, 'Model'),
        e('div', { className: 'stat-value', style: { fontSize: 14 } }, data.model?.current?.split('/').pop()?.replace(/:latest$/,'') ?? 'unknown'),
        e('div', { className: 'stat-detail' }, data.model?.provider ?? '')
      ),
      e('div', { className: 'card stat-card' },
        e('div', { className: 'stat-label' }, 'Agents'),
        e('div', { className: 'stat-value' }, (data.agents?.active??0)+' / '+(data.agents?.max??4)),
        e('div', { className: 'stat-detail' }, 'Active / Max')
      ),
      e('div', { className: 'card stat-card' },
        e('div', { className: 'stat-label' }, 'Learning'),
        e('div', { className: 'stat-value', style: { color: data.learning?.enabled ? 'var(--green)' : 'var(--text-muted)' } }, data.learning?.enabled ? 'Active' : 'Paused'),
        e('div', { className: 'stat-detail' }, (data.learning?.totalEvaluations??0) + ' evaluations')
      )
    ),
    data.gateway && Object.keys(data.gateway).length > 0
      ? e('div', { className: 'card', style: { marginTop: 16 } },
          e('div', { style: { fontWeight: 700, marginBottom: 12, fontSize: 14 } }, 'Gateway Platforms'),
          e('table', { className: 'data-table' },
            e('thead', null, e('tr', null, e('th', null, 'Platform'), e('th', null, 'Status'), e('th', null, 'In'), e('th', null, 'Out'))),
            e('tbody', null, Object.entries(data.gateway).map(([name, p]) =>
              e('tr', { key: name },
                e('td', null, name),
                e('td', null, e('span', { className: 'badge ' + (p.connected ? 'badge-green' : 'badge-gray') }, p.connected ? 'Connected' : 'Offline')),
                e('td', null, fmtNum(p.messagesIn)),
                e('td', null, fmtNum(p.messagesOut))
              ))
            )
          )
        ) : null
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHAT PAGE (NEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const msgEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { api('/chat/conversations').then(d => { if (d) setConversations(d.conversations || []); }); }, []);

  function selectConv(conv) {
    setActiveConv(conv);
    api('/chat/conversations/' + conv.id).then(d => { if (d) setMessages(d.messages || []); });
  }

  async function newConversation() {
    const conv = await api('/chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New Chat' }) });
    if (conv) {
      setConversations(prev => [conv, ...prev]);
      selectConv(conv);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !activeConv || streaming) return;
    const content = input.trim();
    setInput('');
    const userMsg = { id: 'u_'+Date.now(), role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamText('');

    try {
      const res = await fetch('/api/chat/conversations/' + activeConv.id + '/stream?content=' + encodeURIComponent(content), { method: 'GET' });
      if (!res.ok) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'token' && event.data?.text) {
              fullText += event.data.text;
              setStreamText(fullText);
            } else if (event.type === 'done') {
              setMessages(prev => [...prev, { id: 'a_'+Date.now(), role: 'assistant', content: fullText, timestamp: Date.now(), model: event.data?.model, tokens: { output: event.data?.outputTokens } }]);
              fullText = '';
            } else if (event.type === 'error') {
              setMessages(prev => [...prev, { id: 'e_'+Date.now(), role: 'assistant', content: 'Error: ' + (event.data?.error || 'Unknown'), timestamp: Date.now() }]);
            }
          } catch {}
        }
      }
    } catch (err) {
      // Fallback to non-streaming
      try {
        const resp = await api('/chat/conversations/' + activeConv.id + '/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        if (resp) setMessages(prev => [...prev, { id: 'a_'+Date.now(), role: 'assistant', content: resp.content || resp.message?.content || 'No response', timestamp: Date.now() }]);
      } catch (e2) {
        setMessages(prev => [...prev, { id: 'e_'+Date.now(), role: 'assistant', content: 'Failed to get response: ' + e2.message, timestamp: Date.now() }]);
      }
    }
    setStreaming(false);
    setStreamText('');
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleKeyDown(ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendMessage(); } }

  return e('div', { className: 'page', style: { padding: 0, maxHeight: '100vh' } },
    e('div', { className: 'chat-container' },
      e('div', { style: { display: 'flex', gap: 0, height: '100%' } },
        // Conversation sidebar
        e('div', { style: { width: 240, borderRight: '1px solid var(--border)', padding: 12, overflowY: 'auto', flexShrink: 0 } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
            e('span', { style: { fontWeight: 700, fontSize: 14 } }, 'Conversations'),
            e('button', { className: 'btn btn-sm btn-primary', onClick: newConversation }, '+ New')
          ),
          conversations.map(c => e('div', {
            key: c.id,
            className: 'nav-item' + (activeConv?.id === c.id ? ' active' : ''),
            onClick: () => selectConv(c),
            style: { fontSize: 12, padding: '6px 10px', marginBottom: 2 }
          }, c.title || c.id.slice(0, 12)))
        ),
        // Chat area
        e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } },
          activeConv ? e(React.Fragment, null,
            e('div', { className: 'chat-messages' },
              messages.map(m => e('div', { key: m.id, className: 'chat-msg ' + m.role },
                e('div', { className: 'msg-avatar ' + (m.role === 'user' ? 'user-av' : 'ai-av') }, m.role === 'user' ? 'U' : 'T'),
                e('div', { className: 'msg-body' },
                  e('div', { className: 'msg-header' },
                    e('span', { className: 'msg-name' }, m.role === 'user' ? 'You' : 'Tekton'),
                    e('span', { className: 'msg-time' }, fmtRelative(m.timestamp))
                  ),
                  e('div', { className: 'msg-content' }, m.content)
                )
              )),
              streaming && streamText ? e('div', { className: 'chat-msg assistant' },
                e('div', { className: 'msg-avatar ai-av' }, 'T'),
                e('div', { className: 'msg-body' },
                  e('div', { className: 'msg-header' }, e('span', { className: 'msg-name' }, 'Tekton'), e('span', { className: 'badge badge-blue' }, 'streaming...')),
                  e('div', { className: 'msg-content' }, streamText)
                )
              ) : null,
              e('div', { ref: msgEndRef })
            ),
            e('div', { className: 'chat-input-bar' },
              e('div', { className: 'chat-input-row' },
                e('textarea', {
                  className: 'input textarea', value: input, placeholder: 'Message Tekton...', rows: 1,
                  onChange: ev => setInput(ev.target.value), onKeyDown: handleKeyDown,
                  disabled: streaming, ref: inputRef
                }),
                e('button', { className: 'btn btn-primary', onClick: sendMessage, disabled: streaming || !input.trim() }, '\>')
              )
            )
          ) : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' },
            e('div', { style: { textAlign: 'center' } },
              e('div', { style: { fontSize: 48, marginBottom: 16 } }, 'Chat'),
              e('div', { style: { fontSize: 16, fontWeight: 600, marginBottom: 8 } }, 'Start a conversation'),
              e('button', { className: 'btn btn-primary', onClick: newConversation }, 'New Chat')
            )
          )
        )
      )
    )
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TERMINAL PAGE (NEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TerminalPage() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const fitRef = useRef(null);
  const { subscribe } = useWebSocket();

  useEffect(() => { loadSessions(); }, []);

  function loadSessions() {
    api('/terminal/sessions').then(d => { if (d) setSessions(d.sessions || []); });
  }

  async function createSession() {
    const result = await api('/terminal/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cols: 80, rows: 24 })
    });
    if (result && !result.error) {
      setActiveId(result.id);
      loadSessions();
      initXterm(result.id);
    }
  }

  function initXterm(sessionId) {
    setTimeout(() => {
      if (!termRef.current) return;
      if (xtermRef.current) xtermRef.current.dispose();
      const term = new Terminal({ theme: { background: '#000000', foreground: '#FFFFFF', cursor: '#32CD32' }, fontSize: 13, fontFamily: 'SF Mono, Cascadia Code, monospace', cursorBlink: true });
      const fit = new FitAddon.FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();
      xtermRef.current = term;
      fitRef.current = fit;

      term.onData(data => {
        api('/terminal/sessions/' + sessionId + '/input', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      });

      term.onResize(({ cols, rows }) => {
        api('/terminal/sessions/' + sessionId + '/resize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cols, rows }) });
      });

      const unsub = subscribe(ev => {
        if (ev.type === 'terminal_output' && ev.data?.sessionId === sessionId) {
          term.write(ev.data.output);
        }
        if (ev.type === 'terminal_exit' && ev.data?.sessionId === sessionId) {
          term.write('\\r\\n[Process exited with code ' + (ev.data.exitCode ?? 0) + ']\\r\\n');
          loadSessions();
        }
      });

      const resizeObs = new ResizeObserver(() => { try { fit.fit(); } catch {} });
      resizeObs.observe(termRef.current);

      term.focus();
    }, 100);
  }

  async function killSession(id) {
    await api('/terminal/sessions/' + id, { method: 'DELETE' });
    if (activeId === id) { setActiveId(null); if (xtermRef.current) xtermRef.current.dispose(); }
    loadSessions();
  }

  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' },
      e('div', { className: 'page-title' }, '\Term Terminal'),
      e('div', { className: 'input-group' },
        e('button', { className: 'btn btn-primary', onClick: createSession }, '+ New Session'),
        activeId ? e('button', { className: 'btn btn-danger btn-sm', onClick: () => killSession(activeId) }, 'Kill') : null
      )
    ),
    sessions.length > 0 && e('div', { style: { marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' } },
      sessions.map(s => e('span', {
        key: s.id,
        className: 'badge ' + (activeId === s.id ? 'badge-blue' : 'badge-gray'),
        style: { cursor: 'pointer', padding: '4px 12px' },
        onClick: () => { setActiveId(s.id); initXterm(s.id); }
      }, s.id.slice(0, 8) + ' ' + s.shell?.split('/').pop()))
    ),
    activeId
      ? e('div', { className: 'term-container' },
          e('div', { className: 'term-header' },
            e('span', null, 'Session: ', activeId.slice(0, 12)),
            e('span', { style: { color: 'var(--text-muted)' } }, 'xterm.js')
          ),
          e('div', { className: 'term-body', ref: termRef })
        )
      : e('div', { className: 'card', style: { textAlign: 'center', padding: 60, color: 'var(--text-muted)' } },
          e('div', { style: { fontSize: 36, marginBottom: 12 } }, '\Term'),
          e('div', { style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, 'No terminal session'),
          e('div', null, 'Click "+ New Session" to start')
        )
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILES PAGE (NEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function FilesPage() {
  const [path, setPath] = useState('.');
  const [entries, setEntries] = useState([]);
  const [fileContent, setFileContent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [viewingDir, setViewingDir] = useState(true);

  useEffect(() => { loadDir(path); }, []);

  function loadDir(p) {
    setViewingDir(true);
    setFileContent(null);
    api('/files/list?path=' + encodeURIComponent(p)).then(d => { if (d && d.entries) { setEntries(d.entries); setPath(d.path || p); } });
  }

  function openEntry(entry) {
    if (entry.type === 'directory') {
      loadDir(entry.path);
    } else {
      setViewingDir(false);
      api('/files/read?path=' + encodeURIComponent(entry.path)).then(d => { if (d) { setFileContent(d); setEditContent(d.content || ''); } });
    }
  }

  function saveFile() {
    if (!fileContent) return;
    api('/files/write', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fileContent.path, content: editContent })
    }).then(() => { setEditing(false); setFileContent(prev => ({ ...prev, content: editContent })); });
  }

  function goUp() {
    const parent = path.split(/[\\/]/).slice(0, -1).join('/') || '.';
    loadDir(parent);
  }

  const parts = path.split(/[\\/]/);
  const fileIcons = { directory: 'DIR', file: 'FILE', symlink: 'SYM' };
  const extIcons = { '.ts': 'TS', '.js': 'JS', '.json': '{ }', '.md': 'MD', '.py': 'PY', '.rs': 'RS' };

  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' },
      e('div', { className: 'page-title' }, 'Files'),
      !viewingDir && e('button', { className: 'btn btn-sm', onClick: () => loadDir(path) }, '\\u2190 Back')
    ),
    e('div', { className: 'file-breadcrumb' },
      parts.map((part, i) => e(React.Fragment, { key: i },
        i > 0 && e('span', { className: 'sep' }, '/'),
        e('span', { onClick: () => loadDir(parts.slice(0, i + 1).join('/') || '.') }, part || '/')
      ))
    ),
    viewingDir ? e('div', { className: 'card' },
      path !== '.' && e('div', { className: 'file-entry', onClick: goUp, style: { color: 'var(--text-muted)' } },
        e('span', { className: 'file-icon' }, '\..'),
        e('span', { className: 'file-name' }, '..'),
        e('span', null)
      ),
      entries.sort((a, b) => (a.type === 'directory' ? 0 : 1) - (b.type === 'directory' ? 0 : 1) || a.name.localeCompare(b.name)).map(entry =>
        e('div', { key: entry.name, className: 'file-entry', onClick: () => openEntry(entry) },
          e('span', { className: 'file-icon' }, extIcons[entry.extension] || fileIcons[entry.type] || 'FILE'),
          e('span', { className: 'file-name' }, entry.name),
          e('span', { className: 'file-size' }, entry.type === 'file' ? (entry.size > 1024 ? (entry.size / 1024).toFixed(1) + 'k' : entry.size + 'b') : ''),
          e('span', { className: 'file-modified' }, fmtRelative(entry.modified))
        )
      )
    ) : fileContent && e('div', { className: 'file-editor' },
      e('div', { className: 'file-editor-header' },
        e('span', null, fileContent.path),
        e('div', { style: { display: 'flex', gap: 6 } },
          editing
            ? e(React.Fragment, null,
                e('button', { className: 'btn btn-primary btn-sm', onClick: saveFile }, 'Save'),
                e('button', { className: 'btn btn-sm', onClick: () => { setEditContent(fileContent.content || ''); setEditing(false); } }, 'Cancel')
              )
            : e('button', { className: 'btn btn-sm', onClick: () => setEditing(true) }, 'Edit')
        )
      ),
      e('textarea', {
        value: editing ? editContent : (fileContent.content || ''),
        onChange: ev => setEditContent(ev.target.value),
        readOnly: !editing,
        style: { background: editing ? 'rgba(59,130,246,0.03)' : 'transparent' }
      })
    )
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KANBAN PAGE (NEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function KanbanPage() {
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => { api('/kanban/boards').then(d => { if (d) setBoards(d.boards || []); }); }, []);

  function loadBoard(id) {
    setActiveBoard(id);
    api('/kanban/boards/' + id).then(d => { if (d) setBoardData(d); });
  }

  async function createBoard() {
    if (!newTitle.trim()) return;
    const board = await api('/kanban/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) });
    if (board) { setBoards(prev => [...prev, board]); setNewTitle(''); loadBoard(board.id); }
  }

  async function addCard(lane) {
    const title = prompt('Card title:');
    if (!title || !activeBoard) return;
    const card = await api('/kanban/boards/' + activeBoard + '/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, lane }) });
    if (card) loadBoard(activeBoard);
  }

  async function moveCard(cardId, targetLane) {
    if (!activeBoard) return;
    await api('/kanban/boards/' + activeBoard + '/cards/' + cardId + '/move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lane: targetLane }) });
    loadBoard(activeBoard);
  }

  const lanes = ['backlog', 'ready', 'running', 'review', 'done'];
  const laneColors = { backlog: 'var(--text-muted)', ready: 'var(--cyan)', running: 'var(--accent)', review: 'var(--yellow)', done: 'var(--green)' };
  const laneCards = {};
  lanes.forEach(l => { laneCards[l] = (boardData?.cards || []).filter(c => c.lane === l); });

  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' },
      e('div', { className: 'page-title' }, 'Kanban'),
      e('div', { className: 'input-group' },
        e('input', { className: 'input', style: { width: 200 }, placeholder: 'New board title', value: newTitle, onChange: ev => setNewTitle(ev.target.value), onKeyDown: ev => ev.key === 'Enter' && createBoard() }),
        e('button', { className: 'btn btn-primary', onClick: createBoard }, 'Create')
      )
    ),
    boards.length > 0 && e('div', { style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' } },
      boards.map(b => e('span', {
        key: b.id,
        className: 'badge ' + (activeBoard === b.id ? 'badge-blue' : 'badge-gray'),
        style: { cursor: 'pointer', padding: '4px 12px', fontSize: 12 },
        onClick: () => loadBoard(b.id)
      }, b.title))
    ),
    activeBoard && boardData ? e('div', { className: 'kanban-board' },
      lanes.map(lane => e('div', { key: lane, className: 'kanban-lane' },
        e('div', { className: 'lane-header', style: { borderBottomColor: laneColors[lane] } },
          e('span', { style: { color: laneColors[lane] } }, lane.charAt(0).toUpperCase() + lane.slice(1)),
          e('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
            e('span', { className: 'lane-count' }, laneCards[lane].length),
            e('button', { className: 'btn btn-sm', onClick: () => addCard(lane), style: { padding: '2px 6px' } }, '+')
          )
        ),
        e('div', { className: 'lane-cards' },
          laneCards[lane].map(card => e('div', { key: card.id, className: 'kanban-card' },
            e('div', { className: 'card-title' }, card.title),
            card.description && e('div', { className: 'card-desc' }, card.description.slice(0, 100)),
            e('div', { className: 'card-meta' },
              card.priority >= 2 && e('span', { className: 'badge badge-red' }, 'High'),
              card.assigneeId && e('span', { className: 'badge badge-purple' }, card.assigneeId.slice(0, 8)),
              lanes.filter(l => l !== lane).map(targetLane =>
                e('button', { key: targetLane, className: 'btn btn-sm', style: { fontSize: 10, padding: '1px 6px' }, onClick: () => moveCard(card.id, targetLane) }, '\\u2192 ' + targetLane.slice(0, 3))
              )
            )
          ))
        )
      ))
    ) : e('div', { className: 'card', style: { textAlign: 'center', padding: 60, color: 'var(--text-muted)' } },
        e('div', { style: { fontSize: 36, marginBottom: 12 } }, 'Kbd'),
        e('div', { style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, 'No board selected'),
        e('div', null, 'Create a board or select one above')
      )
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SWARM PAGE (NEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SwarmPage() {
  const [roster, setRoster] = useState(null);
  const [missions, setMissions] = useState([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    api('/swarm/roster').then(setRoster);
    api('/swarm/missions').then(d => { if (d) setMissions(d.missions || []); });
    const unsub = subscribe(ev => {
      if (ev.type?.includes('swarm') || ev.type?.includes('pool') || ev.type?.includes('agent')) {
        api('/swarm/roster').then(setRoster);
        api('/swarm/missions').then(d => { if (d) setMissions(d.missions || []); });
      }
    });
    return unsub;
  }, []);

  const workers = roster?.workers || [];
  const workerStats = { spawned: 0, running: 0, idle: 0, completed: 0, failed: 0 };
  workers.forEach(w => { workerStats[w.status || 'idle'] = (workerStats[w.status || 'idle'] || 0) + 1; });

  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' },
      e('div', { className: 'page-title' }, 'Swarm'),
      e('div', { style: { display: 'flex', gap: 8 } },
        e('span', { className: 'badge badge-yellow' }, workerStats.spawned + ' spawning'),
        e('span', { className: 'badge badge-blue' }, workerStats.running + ' running'),
        e('span', { className: 'badge badge-green' }, workerStats.idle + ' idle'),
        e('span', { className: 'badge badge-red' }, workerStats.failed + ' failed'),
      )
    ),
    e('div', { className: 'cards cards-4', style: { marginBottom: 16 } },
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Workers'), e('div', { className: 'stat-value' }, workers.length)),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Missions'), e('div', { className: 'stat-value' }, missions.length)),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Active'), e('div', { className: 'stat-value' }, workerStats.running + workerStats.spawned)),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Completed'), e('div', { className: 'stat-value' }, workerStats.completed))
    ),
    workers.length > 0 && e('div', { className: 'swarm-grid' },
      workers.map(w => e('div', { key: w.id, className: 'worker-card ' + (w.status || 'idle') },
        e('div', { className: 'worker-id' }, w.id?.slice(0, 12)),
        e('div', { className: 'worker-role' }, w.role || w.name || 'Worker'),
        e('div', { className: 'worker-task' }, w.currentTask || w.task || 'Idle'),
        e('div', { style: { marginTop: 8, display: 'flex', gap: 4 } },
          e('span', { className: 'badge ' + ({ spawned: 'badge-yellow', running: 'badge-blue', idle: 'badge-green', completed: 'badge-gray', failed: 'badge-red' }[w.status] || 'badge-gray') }, w.status || 'idle')
        )
      ))
    ),
    missions.length > 0 && e('div', { className: 'card', style: { marginTop: 16 } },
      e('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Missions'),
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'ID'), e('th', null, 'Description'), e('th', null, 'Status'), e('th', null, 'Workers'))),
        e('tbody', null, missions.map(m => e('tr', { key: m.id },
          e('td', { style: { fontFamily: 'monospace', fontSize: 11 } }, m.id?.slice(0, 8)),
          e('td', null, m.description?.slice(0, 60) || '–'),
          e('td', null, e('span', { className: 'badge badge-blue' }, m.status || 'pending')),
          e('td', null, m.workerCount || m.briefs?.length || 0)
        )))
      )
    )
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOCUMENTS PAGE (NEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DocumentsPage() {
  const [health, setHealth] = useState(null);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/docling/health').then(setHealth);
    api('/docling/recent').then(d => { if (d) setRecent(d.documents || d.recent || []); });
    api('/docling/stats').then(setStats);
  }, []);

  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Documents')),
    e('div', { className: 'cards cards-3', style: { marginBottom: 16 } },
      e('div', { className: 'card stat-card' },
        e('div', { className: 'stat-label' }, 'Docling Service'),
        e('div', { className: 'stat-value', style: { fontSize: 14, color: health?.status === 'ok' ? 'var(--green)' : 'var(--text-muted)' } }, health?.status === 'ok' ? 'Online' : 'Offline')
      ),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Documents'), e('div', { className: 'stat-value' }, stats?.total ?? recent.length ?? 0)),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Formats'), e('div', { className: 'stat-value', style: { fontSize: 14 } }, (health?.formats || []).slice(0, 5).join(', ') || 'N/A'))
    ),
    recent.length > 0 ? e('div', { className: 'card' },
      e('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Recent Documents'),
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Name'), e('th', null, 'Format'), e('th', null, 'Size'), e('th', null, 'Date'))),
        e('tbody', null, recent.map((d, i) => e('tr', { key: i },
          e('td', null, d.name || d.filename || '–'),
          e('td', null, e('span', { className: 'badge badge-blue' }, d.format || d.type || '–')),
          e('td', null, d.size ? fmtNum(d.size) : '–'),
          e('td', null, fmtRelative(d.timestamp || d.created))
        )))
      )
    ) : e('div', { className: 'card', style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' } }, 'No documents ingested yet.')
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODELS PAGE (NEW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ModelsPage() {
  const [models, setModels] = useState([]);

  useEffect(() => { api('/models').then(d => { if (d) setModels(d.models || []); }); }, []);

  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Models')),
    models.length > 0 ? e('div', { className: 'card' },
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Model'), e('th', null, 'Provider'), e('th', null, 'Context'), e('th', null, 'Type'))),
        e('tbody', null, models.map((m, i) => e('tr', { key: i },
          e('td', { style: { fontFamily: 'monospace', fontSize: 11 } }, m.id || m.name),
          e('td', null, e('span', { className: 'badge badge-purple' }, m.provider || '–')),
          e('td', null, m.contextWindow ? fmtNum(m.contextWindow) : '–'),
          e('td', null, e('span', { className: 'badge badge-gray' }, m.type || '–'))
        )))
      )
    ) : e('div', { className: 'card', style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' } }, 'No models discovered yet.')
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXISTING PAGES (upgraded styling)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SessionsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/sessions').then(setData); const iv = setInterval(() => api('/sessions').then(setData), REFRESH_MS); return () => clearInterval(iv); }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Sessions (' + data.total + ')')),
    e('div', { className: 'card' },
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'ID'), e('th', null, 'Name'), e('th', null, 'State'), e('th', null, 'Tokens'), e('th', null, 'Tasks'), e('th', null, 'Last Activity'))),
        e('tbody', null, (data.sessions||[]).map((s,i) => e('tr', { key: i },
          e('td', { style: { fontFamily: 'monospace', fontSize: 11 } }, s.id.slice(0,8)+'...'),
          e('td', null, s.name || '–'),
          e('td', null, e('span', { className: 'badge ' + (s.state === 'active' ? 'badge-green' : 'badge-gray') }, s.state)),
          e('td', null, fmtNum(s.tokensUsed)),
          e('td', null, s.tasksCompleted || 0),
          e('td', null, fmtRelative(s.lastActivityAt))
        )))
      )
    )
  );
}

function SkillsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/skills').then(setData); }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, '\Skill Skills (' + data.total + ')')),
    e('div', { className: 'card' },
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Name'), e('th', null, 'Category'), e('th', null, 'Confidence'), e('th', null, 'Usage'), e('th', null, 'Status'))),
        e('tbody', null, (data.skills||[]).map((s,i) => e('tr', { key: i },
          e('td', { style: { fontWeight: 600 } }, s.name),
          e('td', null, e('span', { className: 'badge badge-purple' }, s.category)),
          e('td', null, e('span', { style: { color: s.confidence > 0.7 ? 'var(--green)' : 'var(--yellow)' } }, (s.confidence*100).toFixed(0)+'%')),
          e('td', null, s.usageCount || 0),
          e('td', null, e('span', { className: 'dot ' + (s.enabled ? 'dot-green' : 'dot-red') }))
        )))
      )
    )
  );
}

function RoutingPage() {
  const [log, setLog] = useState(null);
  const [rules, setRules] = useState(null);
  useEffect(() => { api('/routing/log').then(setLog); api('/routing/rules').then(setRules); }, []);
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Routing')),
    e('div', { className: 'card', style: { marginBottom: 16 } },
      e('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Recent Decisions'),
      log ? e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Time'), e('th', null, 'Model'), e('th', null, 'Provider'), e('th', null, 'Outcome'), e('th', null, 'Latency'))),
        e('tbody', null, (log.entries||[]).map((r,i) => e('tr', { key: i },
          e('td', { style: { fontSize: 11 } }, r.timestamp?.slice(11,19)),
          e('td', { style: { fontFamily: 'monospace' } }, r.modelChosen?.split('/').pop()),
          e('td', null, e('span', { className: 'badge badge-purple' }, r.provider)),
          e('td', null, e('span', { className: 'badge ' + (r.outcome === 'success' ? 'badge-green' : 'badge-red') }, r.outcome)),
          e('td', null, r.latencyMs + 'ms')
        ))
      ) : 'Loading...'
    ),
    e('div', { className: 'card' },
      e('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Rules'),
      rules ? e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Priority'), e('th', null, 'Name'), e('th', null, 'Enabled'), e('th', null, 'Condition'), e('th', null, 'Action'))),
        e('tbody', null, (rules.rules||[]).map((r,i) => e('tr', { key: i },
          e('td', null, r.priority),
          e('td', { style: { fontWeight: 600 } }, r.name),
          e('td', null, r.enabled ? e('span', { className: 'badge badge-green' }, 'On') : e('span', { className: 'badge badge-gray' }, 'Off')),
          e('td', { style: { fontFamily: 'monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.condition),
          e('td', { style: { fontFamily: 'monospace', fontSize: 11 } }, r.action)
        ))
      ) : 'Loading...'
    )
  );
}

function AnalyticsPage() {
  const [tokens, setTokens] = useState(null);
  const [cost, setCost] = useState(null);
  const [comp, setComp] = useState(null);
  useEffect(() => { api('/analytics/tokens').then(setTokens); api('/analytics/cost').then(setCost); api('/analytics/compression').then(setComp); }, []);
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Analytics')),
    e('div', { className: 'cards cards-3' },
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Total Tokens'), e('div', { className: 'stat-value' }, fmtNum(tokens?.totalTokens))),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Total Cost'), e('div', { className: 'stat-value' }, '$' + (cost?.totalCost??0).toFixed(4))),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Tokens Saved'), e('div', { className: 'stat-value' }, fmtNum(comp?.totalTokensSaved)))
    ),
    e('div', { className: 'card', style: { marginTop: 16 } },
      e('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Token Usage Log'),
      tokens?.entries?.length > 0 ? e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Time'), e('th', null, 'Model'), e('th', null, 'Input'), e('th', null, 'Output'), e('th', null, 'Cost'))),
        e('tbody', null, tokens.entries.slice(0,30).map((t,i) => e('tr', { key: i },
          e('td', { style: { fontSize: 11 } }, t.timestamp?.slice(11,19)),
          e('td', { style: { fontFamily: 'monospace' } }, t.model?.split('/').pop()),
          e('td', null, fmtNum(t.inputTokens)),
          e('td', null, fmtNum(t.outputTokens)),
          e('td', null, '$' + (t.cost||0).toFixed(6))
        )))
      ) : e('div', { style: { color: 'var(--text-muted)' } }, 'No data yet.')
    )
  );
}

function SCPTrafficPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/scp/traffic').then(setData); const iv = setInterval(() => api('/scp/traffic').then(setData), REFRESH_MS); return () => clearInterval(iv); }, []);
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'SCP Traffic')),
    data?.entries?.length > 0 ? e('div', { className: 'card' },
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Time'), e('th', null, 'From'), e('th', null, 'To'), e('th', null, 'Type'), e('th', null, 'Status'))),
        e('tbody', null, data.entries.map((t,i) => e('tr', { key: i },
          e('td', { style: { fontSize: 11 } }, t.timestamp?.slice(11,19)),
          e('td', null, t.from),
          e('td', null, t.to),
          e('td', null, e('span', { className: 'badge badge-blue' }, t.taskType)),
          e('td', null, e('span', { className: 'badge ' + (t.status === 'completed' ? 'badge-green' : 'badge-yellow') }, t.status))
        )))
      )
    ) : e('div', { className: 'card', style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' } }, 'No SCP traffic recorded.')
  );
}

function ConfigPage() {
  const [config, setConfig] = useState(null);
  useEffect(() => { api('/config').then(setConfig); }, []);
  if (!config) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Configuration')),
    e('div', { className: 'code-block' }, JSON.stringify(config.config, null, 2))
  );
}

function TrainingPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/training/status').then(setData); }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Training')),
    data.running ? e('div', { className: 'card', style: { textAlign: 'center', padding: 30 } }, e('div', { className: 'loading-pulse' }, 'Training in progress...')) : e('div', { className: 'card', style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' } }, 'No training jobs running.')
  );
}

function MemoryPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/memory').then(setData); }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Memory')),
    e('div', { className: 'cards cards-2' },
      e('div', { className: 'card' }, e('div', { style: { fontWeight: 700, marginBottom: 8, fontSize: 13 } }, 'MEMORY.md'), e('pre', { style: { margin: 0, background: 'transparent', border: 'none', padding: 0 } }, data.memory || 'Empty')),
      e('div', { className: 'card' }, e('div', { style: { fontWeight: 700, marginBottom: 8, fontSize: 13 } }, 'USER.md'), e('pre', { style: { margin: 0, background: 'transparent', border: 'none', padding: 0 } }, data.userModel || 'Empty'))
    )
  );
}

function GatewayPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/gateway/status').then(setData); const iv = setInterval(() => api('/gateway/status').then(setData), REFRESH_MS); return () => clearInterval(iv); }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Gateway')),
    e('div', { className: 'card' },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 } },
        e('span', { className: 'dot ' + (data.running ? 'dot-green' : 'dot-red') }),
        e('span', { style: { fontWeight: 600 } }, data.running ? 'Running' : 'Stopped'),
        e('span', { style: { marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' } }, fmtNum(data.totalMessagesIn) + ' in / ' + fmtNum(data.totalMessagesOut) + ' out')
      ),
      data.platforms && Object.keys(data.platforms).length > 0 ? e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Platform'), e('th', null, 'Status'), e('th', null, 'In'), e('th', null, 'Out'), e('th', null, 'Errors'))),
        e('tbody', null, Object.entries(data.platforms).map(([name, p]) => e('tr', { key: name },
          e('td', null, name),
          e('td', null, e('span', { className: 'badge ' + (p.connected ? 'badge-green' : 'badge-gray') }, p.connected ? 'Connected' : 'Offline')),
          e('td', null, fmtNum(p.messagesIn)),
          e('td', null, fmtNum(p.messagesOut)),
          e('td', null, p.errors || 0)
        )))
      ) : e('div', { style: { color: 'var(--text-muted)' } }, 'No platforms configured.')
    )
  );
}

function TradingPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/trading/data').then(setData); const iv = setInterval(() => api('/trading/data').then(setData), 15000); return () => clearInterval(iv); }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  if (data.error) return e('div', { className: 'page' }, e('div', { className: 'card', style: { color: 'var(--text-muted)' } }, data.error));
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Trading')),
    e('div', { className: 'cards cards-4' },
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Total PnL'), e('div', { className: 'stat-value', style: { color: data.total_pnl >= 0 ? 'var(--green)' : 'var(--red)' } }, '$' + (data.total_pnl||0).toFixed(2))),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Trades'), e('div', { className: 'stat-value' }, data.trades_placed||0)),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Open'), e('div', { className: 'stat-value' }, (data.positions||[]).length)),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Closed'), e('div', { className: 'stat-value' }, (data.closed||[]).length))
    ),
    data.positions?.length > 0 ? e('div', { className: 'card', style: { marginTop: 16 } },
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'Trader'), e('th', null, 'Symbol'), e('th', null, 'Side'), e('th', null, 'Qty'), e('th', null, 'Entry'), e('th', null, 'PnL'))),
        e('tbody', null, data.positions.map((p,i) => e('tr', { key: i },
          e('td', null, p.trader_name || p.trader_id),
          e('td', { style: { fontWeight: 600 } }, p.symbol),
          e('td', null, e('span', { className: 'badge ' + (p.side === 'long' ? 'badge-green' : 'badge-red') }, p.side)),
          e('td', null, p.qty),
          e('td', { style: { fontFamily: 'monospace' } }, '$'+p.entry?.toFixed(2)),
          e('td', { style: { color: p.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 } }, '$'+p.pnl?.toFixed(2))
        )))
      )
    ) : e('div', { className: 'card', style: { marginTop: 16, textAlign: 'center', padding: 40, color: 'var(--text-muted)' } }, 'No open positions.')
  );
}

function PIAgentPage() {
  const [signals, setSignals] = useState([]);
  const [engines, setEngines] = useState(null);
  useEffect(() => {
    api('/pi/signals').then(d => { if (d) setSignals(d.signals || []); });
    api('/pi/engines').then(d => { if (d) setEngines(d); });
    const iv = setInterval(() => {
      api('/pi/signals').then(d => { if (d) setSignals(d.signals || []); });
      api('/pi/engines').then(d => { if (d) setEngines(d); });
    }, 10000);
    return () => clearInterval(iv);
  }, []);
  const engineList = engines ? Object.entries(engines).filter(([k]) => !['status','uptime','error'].includes(k)).map(([name, status]) => ({ name, status })) : [];
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, '\Pi PI Agent')),
    e('div', { className: 'cards cards-3' },
      ...engineList.map((eng, i) => e('div', { key: i, className: 'card stat-card' },
        e('div', { className: 'stat-label' }, eng.name),
        e('div', { className: 'stat-value', style: { fontSize: 14, color: eng.status === 'online' ? 'var(--green)' : eng.status === 'offline' ? 'var(--red)' : 'var(--text-muted)' } }, eng.status || 'unknown')
      )),
      e('div', { key: 'sig', className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Signals'), e('div', { className: 'stat-value' }, Array.isArray(signals) ? signals.length : 0))
    ),
    e('div', { className: 'card', style: { marginTop: 16 } },
      e('div', { style: { fontWeight: 700, marginBottom: 12 } }, 'Recent Signals'),
      Array.isArray(signals) && signals.length > 0
        ? e('div', { style: { maxHeight: 360, overflowY: 'auto' } },
            signals.slice(0, 30).map((sig, i) => {
              const action = sig.action || sig.signal || 'WAIT';
              const color = action === 'BUY' ? 'var(--green)' : action === 'SELL' ? 'var(--red)' : 'var(--text-muted)';
              const bg = action === 'BUY' ? 'rgba(34,197,94,0.05)' : action === 'SELL' ? 'rgba(239,68,68,0.05)' : 'transparent';
              return e('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 6, borderBottom: '1px solid var(--border)', background: bg, marginBottom: 2 } },
                e('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
                  e('span', { style: { fontWeight: 700, fontSize: 13, color } }, action),
                  e('span', { style: { fontWeight: 600, fontSize: 12 } }, sig.symbol || sig.ticker || '–'),
                  e('span', { style: { fontSize: 11, color: 'var(--text-muted)' } }, sig.timeframe || '')
                ),
                e('div', { style: { display: 'flex', gap: 10, alignItems: 'center', fontSize: 11 } },
                  sig.confidence && e('span', { style: { color: 'var(--text-muted)' } }, sig.confidence + '%'),
                  sig.price && e('span', { style: { fontFamily: 'monospace' } }, sig.price),
                  sig.score && e('span', { style: { color: 'var(--cyan)' } }, 'S:' + sig.score)
                )
              );
            })
          )
        : e('div', { style: { color: 'var(--text-muted)', padding: 20, textAlign: 'center' } }, 'No signals yet.')
    )
  );
}

function ForgePage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/forge/status').then(d => { setData(d); }); }, []);
  if (!data) return e('div', { className: 'page loading-pulse' }, 'Loading...');
  if (data.error) return e('div', { className: 'page' }, e('div', { className: 'card', style: { color: 'var(--text-muted)' } }, data.error));
  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' }, e('div', { className: 'page-title' }, 'Forge')),
    e('div', { className: 'cards cards-2', style: { marginBottom: 16 } },
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Enabled'), e('div', { className: 'stat-value', style: { fontSize: 14 } }, data.enabled ? '\Yes Yes' : '\No No')),
      e('div', { className: 'card stat-card' }, e('div', { className: 'stat-label' }, 'Projects'), e('div', { className: 'stat-value' }, data.projectCount ?? 0))
    ),
    data.projects && data.projects.length > 0 ? e('div', { className: 'card' },
      e('table', { className: 'data-table' },
        e('thead', null, e('tr', null, e('th', null, 'ID'), e('th', null, 'Title'), e('th', null, 'Phase'), e('th', null, 'Status'))),
        e('tbody', null, data.projects.map((p,i) => e('tr', { key: i },
          e('td', { style: { fontFamily: 'monospace', fontSize: 11 } }, p.id),
          e('td', null, p.title || '–'),
          e('td', null, e('span', { className: 'badge badge-blue' }, p.status || p.phase || '–')),
          e('td', null, p.error ? e('span', { className: 'badge badge-red' }, p.error) : e('span', { className: 'dot dot-green' }))
        )))
      )
    ) : e('div', { className: 'card', style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)' } }, 'No Forge projects yet.')
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONDUCTOR (iframe link)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ConductorPage() {
  return e('div', { className: 'page', style: { padding: 0 } },
    e('iframe', { src: '/conductor', style: { width: '100%', height: 'calc(100vh - 0px)', border: 'none' } })
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULES PAGE (Manage Extension Rules)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RulesPage() {
  const [rules, setRules] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [log, setLog] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    api('/rules').then(d => { if (d) { setRules(d); setEditContent(d.content || ''); } });
    api('/files/read?path=' + encodeURIComponent('D:\\AI Drive\\scripts\\enforce_rules_log.txt')).then(d => { if (d && d.content) setLog(d.content); });
  }, []);

  async function saveRules() {
    setSaveStatus('Saving...');
    const result = await api('/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent })
    });
    if (result && result.success) {
      setRules(prev => ({ ...prev, content: editContent }));
      setEditing(false);
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } else {
      setSaveStatus('Error saving: ' + (result?.error || 'Unknown'));
    }
  }

  async function refreshLog() {
    const d = await api('/files/read?path=' + encodeURIComponent('D:\\AI Drive\\scripts\\enforce_rules_log.txt'));
    if (d && d.content) setLog(d.content);
  }

  return e('div', { className: 'page animate-in' },
    e('div', { className: 'page-header' },
      e('div', { className: 'page-title' }, 'Rules'),
      e('div', { className: 'input-group' },
        saveStatus && e('span', { style: { fontSize: 12, color: saveStatus === 'Saved' ? '#32CD32' : '#CE2029' } }, saveStatus),
        editing
          ? e(React.Fragment, null,
              e('button', { className: 'btn btn-primary btn-sm', onClick: saveRules }, 'Save'),
              e('button', { className: 'btn btn-sm', onClick: () => { setEditContent(rules?.content || ''); setEditing(false); } }, 'Cancel')
            )
          : e('button', { className: 'btn btn-primary btn-sm', onClick: () => setEditing(true) }, 'Edit Rules')
      )
    ),
    e('div', { className: 'cards cards-2' },
      e('div', { className: 'card' },
        e('div', { style: { fontWeight: 700, marginBottom: 12, fontSize: 14 } }, 'Active Rules'),
        e('div', { style: { fontSize: 13, lineHeight: 1.8, color: '#b0b0b0' } },
          e('div', null, e('span', { style: { color: '#32CD32', fontWeight: 700 } }, 'RULE 1:'), ' Play Pizza.wav before every response'),
          e('div', null, e('span', { style: { color: '#32CD32', fontWeight: 700 } }, 'RULE 2:'), ' All files must be saved to D:\\AI Drive (C: drive blocked)'),
          e('div', null, e('span', { style: { color: '#32CD32', fontWeight: 700 } }, 'RULE 3:'), ' Edited files auto-opened in Notepad'),
          e('div', null, e('span', { style: { color: '#32CD32', fontWeight: 700 } }, 'RULE 4:'), ' No emojis in code, UI, tables, or output'),
          e('div', null, e('span', { style: { color: '#32CD32', fontWeight: 700 } }, 'RULE 5:'), ' Dark mode design system only')
        )
      ),
      e('div', { className: 'card' },
        e('div', { style: { fontWeight: 700, marginBottom: 12, fontSize: 14 } }, 'Design System'),
        e('table', { className: 'data-table' },
          e('thead', null, e('tr', null, e('th', null, 'Role'), e('th', null, 'Color'), e('th', null, 'Hex'))),
          e('tbody', null,
            e('tr', null, e('td', null, 'Background'), e('td', null, e('span', { style: { display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#000000', border: '1px solid #808080' } })), e('td', { style: { fontFamily: 'monospace' } }, '#000000')),
            e('tr', null, e('td', null, 'Primary Text'), e('td', null, e('span', { style: { display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#FFFFFF' } })), e('td', { style: { fontFamily: 'monospace' } }, '#FFFFFF')),
            e('tr', null, e('td', null, 'Green Accent'), e('td', null, e('span', { style: { display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#32CD32' } })), e('td', { style: { fontFamily: 'monospace' } }, '#32CD32')),
            e('tr', null, e('td', null, 'Red Accent'), e('td', null, e('span', { style: { display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#CE2029' } })), e('td', { style: { fontFamily: 'monospace' } }, '#CE2029')),
            e('tr', null, e('td', null, 'Grey Accent'), e('td', null, e('span', { style: { display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#808080' } })), e('td', { style: { fontFamily: 'monospace' } }, '#808080'))
          )
        )
      )
    ),
    e('div', { className: 'card', style: { marginTop: 16 } },
      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
        e('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Extension Source'),
        editing
          ? null
          : e('button', { className: 'btn btn-sm', onClick: () => setEditing(true) }, 'Edit')
      ),
      editing
        ? e('textarea', {
            value: editContent,
            onChange: ev => setEditContent(ev.target.value),
            style: { width: '100%', minHeight: 300, background: '#000000', color: '#32CD32', border: '1px solid #1a1a1a', borderRadius: 6, padding: 12, fontFamily: 'SF Mono, Cascadia Code, monospace', fontSize: 12, resize: 'vertical' }
          })
        : e('pre', { style: { margin: 0, background: '#000000', border: '1px solid #1a1a1a', borderRadius: 6, padding: 12, maxHeight: 400, overflow: 'auto', color: '#32CD32', fontFamily: 'SF Mono, Cascadia Code, monospace', fontSize: 12, whiteSpace: 'pre-wrap' } }, rules?.content || 'Loading...')
    ),
    e('div', { className: 'card', style: { marginTop: 16 } },
      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
        e('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Enforcement Log'),
        e('button', { className: 'btn btn-sm', onClick: refreshLog }, 'Refresh')
      ),
      e('pre', { style: { margin: 0, background: '#000000', border: '1px solid #1a1a1a', borderRadius: 6, padding: 12, maxHeight: 300, overflow: 'auto', color: '#808080', fontFamily: 'SF Mono, Cascadia Code, monospace', fontSize: 11, whiteSpace: 'pre-wrap' } }, log || 'No log entries yet')
    )
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APP (router)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function App() {
  const [page, setPage] = useState('status');
  const renderPage = () => {
    switch(page) {
      case 'chat': return e(ChatPage);
      case 'status': return e(StatusPage);
      case 'sessions': return e(SessionsPage);
      case 'skills': return e(SkillsPage);
      case 'terminal': return e(TerminalPage);
      case 'files': return e(FilesPage);
      case 'kanban': return e(KanbanPage);
      case 'swarm': return e(SwarmPage);
      case 'routing': return e(RoutingPage);
      case 'analytics': return e(AnalyticsPage);
      case 'scp-traffic': return e(SCPTrafficPage);
      case 'config': return e(ConfigPage);
      case 'training': return e(TrainingPage);
      case 'memory': return e(MemoryPage);
      case 'gateway': return e(GatewayPage);
      case 'trading': return e(TradingPage);
      case 'pi': return e(PIAgentPage);
      case 'forge': return e(ForgePage);
      case 'conductor': return e(ConductorPage);
      case 'documents': return e(DocumentsPage);
      case 'models': return e(ModelsPage);
      case 'rules': return e(RulesPage);
      default: return e(StatusPage);
    }
  };
  return e('div', { className: 'app' },
    e(Sidebar, { page, setPage }),
    e('main', { className: 'main' }, renderPage())
  );
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(e(App));
} catch(err) {
  document.getElementById('root').innerHTML = '<div style="color:red;padding:40px;font-family:monospace;white-space:pre-wrap"><h2>Dashboard Error</h2>' + err.message + '\n\n' + err.stack + '</div>';
  console.error('Dashboard render error:', err);
}
<\/script>
</body>
</html>`;
}