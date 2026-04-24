/**
 * Dashboard SPA — Self-contained HTML with inline React/ReactDOM via CDN and Tailwind.
 * No build step required; React loaded from CDN.
 */
import type { DashboardConfig } from "./types.js";
import { DASHBOARD_PAGES } from "./types.js";

export function generateDashboardHTML(config: DashboardConfig): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tekton Dashboard</title>
  <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body { background: #0f172a; color: #e2e8f0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    .sidebar { background: #1e293b; border-right: 1px solid #334155; min-height: 100vh; width: 220px; }
    .sidebar a { display: flex; align-items: center; gap: 8px; padding: 10px 16px; color: #94a3b8; text-decoration: none; font-size: 14px; transition: all 0.15s; }
    .sidebar a:hover { background: #334155; color: #e2e8f0; }
    .sidebar a.active { background: #3b82f6; color: white; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #f1f5f9; }
    .stat-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #22c55e; }
    .dot-yellow { background: #eab308; }
    .dot-red { background: #ef4444; }
    .dot-gray { background: #64748b; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px; font-size: 12px; color: #94a3b8; border-bottom: 1px solid #334155; }
    td { padding: 8px; font-size: 13px; border-bottom: 1px solid #1e293b; }
    pre { background: #0f172a; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
    h1 { font-size: 20px; font-weight: 600; margin: 0; }
    h2 { font-size: 16px; font-weight: 600; margin: 0 0 12px 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
const e = React.createElement;
const { useState, useEffect } = React;
const PAGES = ${JSON.stringify(DASHBOARD_PAGES)};
const REFRESH_MS = ${config.refreshIntervalMs};

async function api(path) {
  try { const res = await fetch('/api' + path); return await res.json(); }
  catch(err) { console.error('API error:', path, err); return null; }
}

function Sidebar({ page, setPage }) {
  return e('div', { className: 'sidebar fixed left-0 top-0' },
    e('div', { className: 'p-4 border-b border-gray-700' }, e('h1', { className: 'text-white' }, '⚡ Tekton')),
    e('nav', null, PAGES.map(p =>
      e('a', { key: p.id, className: page === p.id ? 'active' : '', onClick: () => setPage(p.id), href: '#' },
        e('span', null, p.icon), e('span', null, p.label)))
    )
  );
}

function StatusPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/status').then(setData); const iv = setInterval(() => api('/status').then(setData), REFRESH_MS); return () => clearInterval(iv); }, []);
  if (!data) return e('div', null, 'Loading...');
  const fmt = (ms) => { const s = Math.floor(ms/1000); return s < 60 ? s+'s' : Math.floor(s/60)+'m '+(s%60)+'s'; };
  const dot = (c) => e('span', { className: 'status-dot '+(c?'dot-green':'dot-gray') });
  return e('div', null,
    e('h2', null, 'System Status'),
    e('div', { className: 'grid grid-cols-4 gap-4 mt-4' },
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Uptime'), e('div', { className: 'stat-value' }, fmt(data.uptimeMs))),
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Total Tokens'), e('div', { className: 'stat-value' }, (data.tokens?.total??0).toLocaleString()))),
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Compression'), e('div', { className: 'stat-value' }, (data.compression?.ratio??0).toFixed(2)+'x'))),
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Skills'), e('div', { className: 'stat-value' }, data.skills?.total??0)))
    ),
    e('div', { className: 'grid grid-cols-3 gap-4 mt-4' },
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Model'), e('div', { className: 'font-mono mt-1' }, data.model?.current??'unknown'), e('div', { className: 'text-xs text-gray-500' }, data.model?.provider??''))),
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Agents'), e('div', { className: 'stat-value' }, (data.agents?.active??0)+' / '+(data.agents?.max??4)))),
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Voice'), e('div', null, dot(data.voice?.enabled), ' STT: '+(data.voice?.sttProvider??'local')+' | TTS: '+(data.voice?.ttsProvider??'edge'))))
    ),
    data.gateway && Object.keys(data.gateway).length > 0
      ? e('div', { className: 'card mt-4' }, e('h2', null, 'Gateway Platforms'),
          e('table', null,
            e('thead', null, e('tr', null, e('th', null, 'Platform'), e('th', null, 'Status'), e('th', null, 'In'), e('th', null, 'Out'))),
            e('tbody', null, Object.entries(data.gateway).map(([name, p]) =>
              e('tr', { key: name }, e('td', null, name), e('td', null, dot(p.connected), ' ', p.connected?'Connected':'Disconnected'), e('td', null, p.messagesIn), e('td', null, p.messagesOut))
            ))))
      : null
  );
}

function SessionsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/sessions').then(setData); const iv = setInterval(() => api('/sessions').then(setData), REFRESH_MS); return () => clearInterval(iv); }, []);
  if (!data) return e('div', null, 'Loading...');
  return e('div', null, e('h2', null, 'Sessions ('+data.total+')'),
    e('table', { className: 'mt-4' },
      e('thead', null, e('tr', null, e('th', null, 'ID'), e('th', null, 'Name'), e('th', null, 'State'), e('th', null, 'Tokens'), e('th', null, 'Tasks'), e('th', null, 'Last Activity'))),
      e('tbody', null, (data.sessions||[]).map((s,i) =>
        e('tr', { key: i }, e('td', { className: 'font-mono text-xs' }, s.id.slice(0,8)+'...'), e('td', null, s.name), e('td', null, s.state), e('td', null, (s.tokensUsed??0).toLocaleString()), e('td', null, s.tasksCompleted), e('td', null, new Date(s.lastActivityAt).toLocaleTimeString())))
    ));
}

function SkillsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/skills').then(setData); }, []);
  if (!data) return e('div', null, 'Loading...');
  return e('div', null, e('h2', null, 'Skills ('+data.total+')'),
    e('table', { className: 'mt-4' },
      e('thead', null, e('tr', null, e('th', null, 'Name'), e('th', null, 'Category'), e('th', null, 'Confidence'), e('th', null, 'Usage'), e('th', null, 'Enabled'))),
      e('tbody', null, (data.skills||[]).map((s,i) =>
        e('tr', { key: i }, e('td', null, s.name), e('td', null, s.category), e('td', null, (s.confidence*100).toFixed(0)+'%'), e('td', null, s.usageCount), e('td', null, e('span', { className: 'status-dot '+(s.enabled?'dot-green':'dot-red') }), ' ', s.enabled?'Yes':'No')))
    ));
}

function RoutingPage() {
  const [log, setLog] = useState(null);
  const [rules, setRules] = useState(null);
  useEffect(() => { api('/routing/log').then(setLog); api('/routing/rules').then(setRules); }, []);
  return e('div', null, e('h2', null, 'Routing Decisions'),
    log ? e('table', { className: 'mt-4' },
      e('thead', null, e('tr', null, e('th', null, 'Time'), e('th', null, 'Model'), e('th', null, 'Provider'), e('th', null, 'Outcome'), e('th', null, 'Latency'), e('th', null, 'Cost'))),
      e('tbody', null, (log.entries||[]).map((r,i) =>
        e('tr', { key: i }, e('td', null, r.timestamp), e('td', null, r.modelChosen), e('td', null, r.provider), e('td', null, r.outcome), e('td', null, r.latencyMs+'ms'), e('td', null, '$'+(r.costEstimate??0).toFixed(6)))))
    ) : e('div', null, 'Loading...'),
    e('h2', { className: 'mt-6' }, 'Routing Rules'),
    rules ? e('table', { className: 'mt-4' },
      e('thead', null, e('tr', null, e('th', null, 'Priority'), e('th', null, 'Name'), e('th', null, 'Enabled'), e('th', null, 'Condition'), e('th', null, 'Action'))),
      e('tbody', null, (rules.rules||[]).map((r,i) =>
        e('tr', { key: i }, e('td', null, r.priority), e('td', null, r.name), e('td', null, r.enabled?'✓':'✗'), e('td', { className: 'text-xs font-mono' }, r.condition.slice(0,60)), e('td', { className: 'text-xs font-mono' }, r.action.slice(0,60)))))
    ) : e('div', null, 'Loading...')
  );
}

function AnalyticsPage() {
  const [tokens, setTokens] = useState(null);
  const [cost, setCost] = useState(null);
  const [comp, setComp] = useState(null);
  useEffect(() => { api('/analytics/tokens').then(setTokens); api('/analytics/cost').then(setCost); api('/analytics/compression').then(setComp); }, []);
  return e('div', null, e('h2', null, 'Analytics'),
    e('div', { className: 'grid grid-cols-3 gap-4 mt-4' },
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Total Tokens'), e('div', { className: 'stat-value' }, (tokens?.totalTokens??0).toLocaleString()))),
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Total Cost'), e('div', { className: 'stat-value' }, '$'+(cost?.totalCost??0).toFixed(4)))),
      e('div', { className: 'card' }, e('div', { className: 'stat-label' }, 'Tokens Saved'), e('div', { className: 'stat-value' }, (comp?.totalTokensSaved??0).toLocaleString())))
    ),
    tokens && tokens.entries && tokens.entries.length > 0
      ? e('div', { className: 'card mt-4' }, e('h3', { className: 'text-sm font-semibold mb-2' }, 'Token Usage by Model'),
          e('table', null,
            e('thead', null, e('tr', null, e('th', null, 'Time'), e('th', null, 'Model'), e('th', null, 'Input'), e('th', null, 'Output'), e('th', null, 'Cost'))),
            e('tbody', null, tokens.entries.slice(0,50).map((t,i) =>
              e('tr', { key: i }, e('td', null, t.timestamp), e('td', null, t.model), e('td', null, t.inputTokens), e('td', null, t.outputTokens), e('td', null, '$'+t.cost.toFixed(6)))))
        )) : e('div', { className: 'card mt-4 text-gray-500' }, 'No token data yet.')
  );
}

function SCPTrafficPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/scp/traffic').then(setData); const iv = setInterval(() => api('/scp/traffic').then(setData), REFRESH_MS); return () => clearInterval(iv); }, []);
  return e('div', null, e('h2', null, 'SCP Traffic'),
    data && data.entries && data.entries.length > 0
      ? e('table', { className: 'mt-4' },
          e('thead', null, e('tr', null, e('th', null, 'Time'), e('th', null, 'From'), e('th', null, 'To'), e('th', null, 'Type'), e('th', null, 'Status'))),
          e('tbody', null, data.entries.map((t,i) => e('tr', { key: i }, e('td', null, t.timestamp), e('td', null, t.from), e('td', null, t.to), e('td', null, t.taskType), e('td', null, t.status))))
        ) : e('div', { className: 'card mt-4 text-gray-500' }, 'No SCP traffic recorded.'));
}

function ConfigPage() {
  const [config, setConfig] = useState(null);
  useEffect(() => { api('/config').then(setConfig); }, []);
  if (!config) return e('div', null, 'Loading...');
  return e('div', null, e('h2', null, 'Configuration'), e('pre', { className: 'mt-4' }, JSON.stringify(config.config, null, 2)));
}

function TrainingPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/training/status').then(setData); }, []);
  if (!data) return e('div', null, 'Loading...');
  return e('div', null, e('h2', null, 'Training'),
    data.running ? e('div', { className: 'card mt-4' }, 'Training in progress...') : e('div', { className: 'card mt-4 text-gray-500' }, 'No training jobs running.'));
}

function MemoryPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/memory').then(setData); }, []);
  if (!data) return e('div', null, 'Loading...');
  return e('div', null, e('h2', null, 'Memory'),
    e('div', { className: 'grid grid-cols-2 gap-4 mt-4' },
      e('div', { className: 'card' }, e('h3', { className: 'text-sm font-semibold mb-2 text-gray-400' }, 'MEMORY.md'), e('pre', null, data.memory || 'Empty')),
      e('div', { className: 'card' }, e('h3', { className: 'text-sm font-semibold mb-2 text-gray-400' }, 'USER.md'), e('pre', null, data.userModel || 'Empty'))
    ));
}

function GatewayPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/gateway/status').then(setData); const iv = setInterval(() => api('/gateway/status').then(setData), REFRESH_MS); return () => clearInterval(iv); }, []);
  if (!data) return e('div', null, 'Loading...');
  const dot = (c) => e('span', { className: 'status-dot '+(c?'dot-green':'dot-gray') });
  return e('div', null, e('h2', null, 'Gateway'),
    e('div', { className: 'card mt-4' },
      e('div', { className: 'flex gap-2 mb-4' }, dot(data.running), e('span', null, data.running?'Running':'Stopped'), e('span', { className: 'text-xs text-gray-500 ml-auto' }, 'Messages: '+(data.totalMessagesIn??0)+' in / '+(data.totalMessagesOut??0)+' out')),
      data.platforms && Object.keys(data.platforms).length > 0
        ? e('table', null,
            e('thead', null, e('tr', null, e('th', null, 'Platform'), e('th', null, 'Connected'), e('th', null, 'In'), e('th', null, 'Out'), e('th', null, 'Errors'))),
            e('tbody', null, Object.entries(data.platforms).map(([name, p]) =>
              e('tr', { key: name }, e('td', null, name), e('td', null, dot(p.connected), ' ', p.connected?'Yes':'No'), e('td', null, p.messagesIn??0), e('td', null, p.messagesOut??0), e('td', null, p.errors??0)))
          )) : e('div', { className: 'text-gray-500' }, 'No platforms configured.')
    )
  );
}

function ForgePage() {
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState(null);
  useEffect(() =\u003e { api('/forge/status').then(d =\u003e { setData(d); if (d && d.projects) setProjects(d.projects); }); }, []);
  if (!data) return e('div', null, 'Loading...');
  if (data.error) return e('div', { className: 'card' }, e('h2', null, 'Forge'), e('p', { className: 'text-gray-500' }, data.error));
  return e('div', null,
    e('h2', null, 'Forge Projects'),
    e('div', { className: 'card mt-4' },
      e('div', { className: 'grid grid-cols-3 gap-4' },
        e('div', null, e('div', { className: 'stat-label' }, 'Enabled'), e('div', { className: 'stat-value' }, data.enabled ? '✅ Yes' : '❌ No')),
        e('div', null, e('div', { className: 'stat-label' }, 'Projects'), e('div', { className: 'stat-value' }, data.projectCount ?? 0)),
      )
    ),
    projects \u0026\u0026 projects.length \u003e 0
      ? e('table', { className: 'mt-4' },
          e('thead', null, e('tr', null, e('th', null, 'ID'), e('th', null, 'Title'), e('th', null, 'Phase'), e('th', null, 'Status'))),
          e('tbody', null, projects.map((p, i) =\u003e e('tr', { key: i }, e('td', { className: 'font-mono text-xs' }, p.id), e('td', null, p.title || '–'), e('td', null, p.status || p.phase || '–'), e('td', null, p.error ? '⚠️ ' + p.error : '✓'))))
        )
      : e('div', { className: 'card mt-4 text-gray-500' }, 'No Forge projects yet. Use /tekton:forge new to start one.')
  );
}

function App() {
  const [page, setPage] = useState('status');
  const renderPage = () => {
    switch(page) {
      case 'status': return e(StatusPage);
      case 'sessions': return e(SessionsPage);
      case 'skills': return e(SkillsPage);
      case 'routing': return e(RoutingPage);
      case 'analytics': return e(AnalyticsPage);
      case 'scp-traffic': return e(SCPTrafficPage);
      case 'config': return e(ConfigPage);
      case 'training': return e(TrainingPage);
      case 'memory': return e(MemoryPage);
      case 'gateway': return e(GatewayPage);
      case 'forge': return e(ForgePage);
      default: return e(StatusPage);
    }
  };
  return e('div', { className: 'flex' },
    e(Sidebar, { page, setPage }),
    e('main', { className: 'ml-[220px] p-6 w-full' }, renderPage())
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
  </script>
</body>
</html>`;
}