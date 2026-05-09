// ── Trading Page ─────────────────────────────────────────────────────
// Features: Dashboard, Accounts, History, Prop Firms, Pine Export, Import Pine, Transcribe, Cron
// DECODED TERMINAL Aesthetic — Sora + JetBrains Mono, glassmorphism, gradient accents

// ── Equity Curve Component ──
function EquityCurve(props) {
  var trades = props.trades || [];
  var canvasRef = React.useRef(null);
  E(function() {
    if (!canvasRef.current || trades.length === 0) return;
    var canvas = canvasRef.current;
    var ctx = canvas.getContext('2d');
    var w = canvas.parentElement.clientWidth;
    var h = 160;
    canvas.width = w;
    canvas.height = h;

    // Compute cumulative P&L
    var sorted = trades.slice().sort(function(a,b) { return (a.closed_at||'').localeCompare(b.closed_at||''); });
    var cumPnl = 0;
    var points = [{x: 0, y: 0}];
    for (var i = 0; i < sorted.length; i++) {
      cumPnl += (sorted[i].pnl || 0);
      points.push({x: i+1, y: cumPnl});
    }

    var maxPnl = Math.max.apply(null, points.map(function(p){return p.y;}));
    var minPnl = Math.min.apply(null, points.map(function(p){return p.y;}));
    var range = Math.max(maxPnl - minPnl, 1);
    var padY = 20;
    var padX = 40;
    var chartW = w - padX;
    var chartH = h - padY * 2;

    // Clear
    ctx.fillStyle = 'rgba(2,4,8,0.95)';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(99,102,241,0.08)';
    ctx.lineWidth = 1;
    for (var g = 0; g < 5; g++) {
      var gy = padY + (chartH / 4) * g;
      ctx.beginPath(); ctx.moveTo(padX, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    // Zero line
    var zeroY = padY + chartH - ((0 - minPnl) / range) * chartH;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(padX, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '500 9px Sora, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('$' + maxPnl.toLocaleString(), padX - 4, padY + 10);
    ctx.fillText('$' + minPnl.toLocaleString(), padX - 4, h - padY);
    ctx.fillText('$0', padX - 4, zeroY + 4);

    // Draw equity curve
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 8;
    for (var j = 0; j < points.length; j++) {
      var px = padX + (j / (points.length - 1)) * chartW;
      var py = padY + chartH - ((points[j].y - minPnl) / range) * chartH;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(padX + chartW, h - padY);
    ctx.lineTo(padX, h - padY);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, padY, 0, h - padY);
    grad.addColorStop(0, cumPnl >= 0 ? 'rgba(0,212,255,0.15)' : 'rgba(255,51,85,0.15)');
    grad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // End dot with glow
    var lastPx = padX + chartW;
    var lastPy = padY + chartH - ((points[points.length-1].y - minPnl) / range) * chartH;
    ctx.beginPath();
    ctx.arc(lastPx, lastPy, 6, 0, Math.PI * 2);
    ctx.fillStyle = cumPnl >= 0 ? '#10b981' : '#f43f5e';
    ctx.shadowColor = cumPnl >= 0 ? '#10b981' : '#f43f5e';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(lastPx, lastPy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // End label
    ctx.fillStyle = cumPnl >= 0 ? '#10b981' : '#f43f5e';
    ctx.font = '700 11px Sora, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('$' + cumPnl.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}), lastPx + 10, lastPy + 4);
  }, [trades]);

  return e('canvas', {ref: canvasRef, style:{width:'100%', height:'160px', borderRadius:'10px', display:'block', border:'1px solid var(--border2)'}});
}

function TradingPage(props) {
  var ticker = props.ticker || 'BTCUSDT';
  var engine = props.engine || 'gann';
  var [accounts, setAccounts] = React.useState([]);
  var [propFirms, setPropFirms] = React.useState({});
  var [tiers, setTiers] = React.useState({});
  var [selectedAccount, setSelectedAccount] = React.useState('apex_100k');
  var [signal, setSignal] = React.useState(null);
  var [execution, setExecution] = React.useState(null);
  var [pineScript, setPineScript] = React.useState(null);
  var [loading, setLoading] = React.useState(false);
  var [activeTab, setActiveTab] = React.useState('dashboard');
  var [historyData, setHistoryData] = React.useState(null);
  var [historyFilter, setHistoryFilter] = React.useState('all');
  var [historySort, setHistorySort] = React.useState('newest');
  var [historySearch, setHistorySearch] = React.useState('');
  var [importedPine, setImportedPine] = React.useState('');
  var [pineResult, setPineResult] = React.useState(null);
  var [transcribeStatus, setTranscribeStatus] = React.useState(null);
  var [transcribeProgress, setTranscribeProgress] = React.useState(null);
  var [transcribePollId, setTranscribePollId] = React.useState(null);
  var [cronData, setCronData] = React.useState(null);
  var [cronConfig, setCronConfig] = React.useState({accounts:[], engines:[], tickers:[], generate_signals:true, check_stops:true});
  var [cronShowConfig, setCronShowConfig] = React.useState(false);
  var [cronShowLog, setCronShowLog] = React.useState(false);
  var ENGINE_LIST = ['gann','casper','mj','ict','rumors','geo','franky','cryptoface','buffett','quant','tori','dtr','reece'];
  var TICKER_PRESETS = ['BTCUSDT','ETHUSDT','SOLUSDT','ES=F','NQ=F','BTCUSDT,ETHUSDT','ES=F,NQ=F'];

  React.useEffect(function() {
    fetch('/api/trading/accounts').then(function(r) { return r.json(); }).then(function(d) { setAccounts(d.accounts || {}); });
    fetch('/api/trading/prop-firms').then(function(r) { return r.json(); }).then(function(d) { setPropFirms(d.prop_firms || {}); });
    fetch('/api/trading/tiers').then(function(r) { return r.json(); }).then(function(d) { setTiers(d.tiers || {}); });
    fetch('/api/cron/status').then(function(r) { return r.json(); }).then(function(d) { setCronData(d); }).catch(function() {});
  }, []);

  React.useEffect(function() {
    if (activeTab === 'history') {
      fetch('/api/trading/history/' + selectedAccount).then(function(r) { return r.json(); }).then(function(d) { setHistoryData(d); }).catch(function() {});
    }
    if (activeTab === 'transcribe') {
      fetch('/api/transcribe/status').then(function(r) { return r.json(); }).then(function(d) { setTranscribeStatus(d); }).catch(function() {});
    }
  }, [activeTab, selectedAccount]);

  function generateSignal() {
    setLoading(true);
    fetch('/api/trading/signal', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticker:ticker, engine:engine, account:selectedAccount}) })
      .then(function(r){return r.json();}).then(function(d){setSignal(d);setExecution(null);setLoading(false);}).catch(function(){setLoading(false);});
  }

  function executeSignal() {
    if (!signal || !signal.signal) return;
    setLoading(true);
    fetch('/api/trading/execute', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({signal:signal.signal, account:selectedAccount}) })
      .then(function(r){return r.json();}).then(function(d){setExecution(d);fetch('/api/trading/accounts').then(function(r){return r.json();}).then(function(d2){setAccounts(d2.accounts||{});});setLoading(false);}).catch(function(){setLoading(false);});
  }

  function exportPine() {
    setLoading(true);
    fetch('/api/trading/pine-export', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticker:ticker, engine:engine}) })
      .then(function(r){return r.json();}).then(function(d){setPineScript(d.pine_script||'');setLoading(false);}).catch(function(){setLoading(false);});
  }

  function importPineScript() {
    if (!importedPine.trim()) return;
    setLoading(true);
    fetch('/api/trading/pine-import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({script:importedPine}) })
      .then(function(r){return r.json();}).then(function(d){setPineResult(d);setLoading(false);}).catch(function(){setLoading(false);});
  }

  function toggleCron(start) {
    if (start) {
      var cfg = {accounts: cronConfig.accounts, engines: cronConfig.engines, tickers: cronConfig.tickers, generate_signals: cronConfig.generate_signals, check_stops: cronConfig.check_stops};
      fetch('/api/cron/start', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({interval:300, config:cfg}) })
        .then(function(r){return r.json();}).then(function() { fetch('/api/cron/status').then(function(r2){return r2.json();}).then(function(d2){setCronData(d2);}); });
    } else {
      fetch('/api/cron/stop', { method:'POST', headers:{'Content-Type':'application/json'} })
        .then(function(r){return r.json();}).then(function() { fetch('/api/cron/status').then(function(r2){return r2.json();}).then(function(d2){setCronData(d2);}); });
    }
  }

  function startTranscribe(channel) {
    setLoading(true);
    setTranscribeProgress({channel: channel, status: 'starting', progress: 0, total: 0, current: 0, details: []});
    fetch('/api/transcribe/batch', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({channel:channel, max_videos:5}) })
      .then(function(r){return r.json();}).then(function(d) {
        setTranscribeProgress({channel: channel, status: 'done', progress: 100, total: d.videos_processed||0, current: d.videos_processed||0, details: d.details||[], transcripts: d.transcripts_created||0, errors: d.errors||[]});
        setLoading(false);
        // Refresh status
        fetch('/api/transcribe/status').then(function(r2){return r2.json();}).then(function(d2){setTranscribeStatus(d2);});
      }).catch(function(ex){
        setTranscribeProgress({channel: channel, status: 'error', progress: 0, total: 0, current: 0, details: [], error: ex.message||'Failed'});
        setLoading(false);
      });
    // Poll status during transcription
    if (transcribePollId) clearInterval(transcribePollId);
    var pollId = setInterval(function() {
      fetch('/api/transcribe/status').then(function(r){return r.json();}).then(function(d){
        setTranscribeStatus(d);
        if (transcribeProgress && transcribeProgress.status === 'done') {
          clearInterval(pollId);
        }
      }).catch(function(){});
    }, 3000);
    setTranscribePollId(pollId);
  }

  var acct = accounts[selectedAccount] || {};
  var tabs = ['dashboard', 'accounts', 'history', 'prop-firms', 'pine', 'import-pine', 'transcribe'];

  var samplePine = '//@version=5\nindicator("Sample EMA Cross", overlay=true)\nfastEMA = ta.ema(close, 9)\nslowEMA = ta.ema(close, 21)\nplot(fastEMA, "Fast EMA", color=color.yellow)\nplot(slowEMA, "Slow EMA", color=color.blue)\nlongSignal = ta.crossover(fastEMA, slowEMA)\nshortSignal = ta.crossunder(fastEMA, slowEMA)\nplotshape(longSignal, style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)\nplotshape(shortSignal, style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)';

  // ── Pine Script Syntax Highlighter ──
  var PINE_KEYWORDS = ['indicator','strategy','library','study','if','else','for','while','switch','var','varip','import','export','type','method','true','false','na','and','or','not'];
  var PINE_TYPES = ['int','float','bool','string','color','series','simple','const','map','matrix','array','line','label','box','table','polyline'];
  var PINE_BUILTINS = ['close','open','high','low','volume','bar_index','time','timenow','syminfo','strategy','math','ta','input','plot','plotshape','plotchar','bgcolor','fill','alert','alertcondition','request','str','color','label','line','box','array','matrix','hline','dayofweek','dayofmonth','month','year','hour','minute','second','barssince','valuewhen','highest','lowest','stdev','corr','cum','tr','atr','ema','sma','wma','vwap','rsi','macd','bb','kc','atr','crossover','crossunder','change','abs','sqrt','pow','log','exp','round','ceil','floor','max','min','avg','percentrank','stoch','cci','mfi','obv','vwma','swma','linreg','alma','dema','tema','kma','rma','wpr','cog','supertrend','sar','psar','heikinashi','renko','kagi','linebreak','pnf'];
  var PINE_NS = ['ta','math','str','input','request','color','label','line','box','array','matrix','strategy','syminfo','timeframe','session','dayofweek','ticker','exchange','broker','os','timezone','source'];

  function highlightPine(code) {
    if (!code) return '';
    var html = '';
    var i = 0;
    while (i < code.length) {
      // Line comment
      if (code[i] === '/' && code[i+1] === '/') {
        var end = code.indexOf('\n', i);
        if (end === -1) end = code.length;
        html += '<span style="color:#6a9955">' + escHtml(code.substring(i, end)) + '</span>';
        i = end;
        continue;
      }
      // Strings
      if (code[i] === '"') {
        var j = i + 1;
        while (j < code.length && (code[j] !== '"' || (code[j-1] === '\\' && code[j-2] !== '\\'))) j++;
        j++;
        html += '<span style="color:#ce9178">' + escHtml(code.substring(i, j)) + '</span>';
        i = j;
        continue;
      }
      if (code[i] === "'") {
        var j2 = i + 1;
        while (j2 < code.length && (code[j2] !== "'" || (code[j2-1] === '\\' && code[j2-2] !== '\\'))) j2++;
        j2++;
        html += '<span style="color:#ce9178">' + escHtml(code.substring(i, j2)) + '</span>';
        i = j2;
        continue;
      }
      // Version directive
      if (i === 0 && code.substring(0, i+2).match(/\/\/@version/)) {
        var dl = code.indexOf('\n', i);
        if (dl === -1) dl = code.length;
        html += '<span style="color:#569cd6">' + escHtml(code.substring(i, dl)) + '</span>';
        i = dl;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(code[i]) || (code[i] === '.' && i+1 < code.length && /[0-9]/.test(code[i+1]))) {
        var numStart = i;
        if (code[i] === '0' && (code[i+1] === 'x' || code[i+1] === 'X')) { i += 2; while (i < code.length && /[0-9a-fA-F]/.test(code[i])) i++; }
        else { while (i < code.length && /[0-9]/.test(code[i])) i++; if (i < code.length && code[i] === '.') { i++; while (i < code.length && /[0-9]/.test(code[i])) i++; } }
        html += '<span style="color:#b5cea8">' + escHtml(code.substring(numStart, i)) + '</span>';
        continue;
      }
      // Identifiers & keywords
      if (/[a-zA-Z_]/.test(code[i])) {
        var ws = i;
        while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
        var word = code.substring(ws, i);
        // Check namespace.method pattern
        if (PINE_NS.indexOf(word) >= 0 && code[i] === '.') {
          html += '<span style="color:#4ec9b0">' + escHtml(word) + '</span>';
          continue;
        }
        if (PINE_KEYWORDS.indexOf(word) >= 0) {
          html += '<span style="color:#569cd6">' + escHtml(word) + '</span>';
        } else if (PINE_TYPES.indexOf(word) >= 0) {
          html += '<span style="color:#4ec9b0">' + escHtml(word) + '</span>';
        } else if (PINE_BUILTINS.indexOf(word) >= 0) {
          html += '<span style="color:#dcdcaa">' + escHtml(word) + '</span>';
        } else if (word === word.toUpperCase() && word.length > 1) {
          html += '<span style="color:#4fc1ff">' + escHtml(word) + '</span>';
        } else {
          html += escHtml(word);
        }
        continue;
      }
      // Operators
      if ('=<>!+-*/%&|^~?:,.()[]{}'.indexOf(code[i]) >= 0) {
        var opColor = '=' || '+-*/%' ? '#d4d4d4' : '#d4d4d4';
        if (code[i] === '=' || (code[i] === '=' && code[i+1] === '=')) opColor = '#d4d4d4';
        if (code[i] === ':' || code[i] === ',') opColor = '#858585';
        if (code[i] === '(' || code[i] === ')' || code[i] === '[' || code[i] === ']' || code[i] === '{' || code[i] === '}') opColor = '#ffd700';
        // Multi-char operators
        var twoChar = code.substring(i, i+2);
        if (['==','!=','>=','<=','+=','-=','*=','/=',':=','::'].indexOf(twoChar) >= 0) {
          html += '<span style="color:#d4d4d4">' + escHtml(twoChar) + '</span>';
          i += 2;
          continue;
        }
        html += '<span style="color:' + opColor + '">' + escHtml(code[i]) + '</span>';
        i++;
        continue;
      }
      html += escHtml(code[i]);
      i++;
    }
    return html;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return e('div', {className:'page', style:{overflowY:'auto', padding:'20px 24px'}},
    // Header with Cron status
    e('div', {style:{display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', flexWrap:'wrap', position:'relative'}},
      e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, var(--text), var(--neon))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, '\u2696 Trading'),
      cronData ? e('div', {style:{display:'flex', alignItems:'center', gap:'6px', padding:'4px 10px', background:cronData.running?'#10b98120':'var(--surface2)', border:'1px solid '+(cronData.running?'#10b98160':'var(--border)'), borderRadius:'6px', fontSize:'11px', fontFamily:'JetBrains Mono,monospace'}},
        e('span', {style:{color:cronData.running?'#10b981':'var(--text2)'}}, cronData.running ? '\u25CF CRON' : '\u25CB CRON'),
        cronData.running ? e('span', {style:{color:'var(--text2)'}}, cronData.interval_s + 's #' + cronData.run_count) : null,
        e('button', {onClick:function(){toggleCron(!cronData.running);}, style:{marginLeft:'2px', padding:'2px 8px', background:cronData.running?'#f43f5e30':'#10b98130', border:'1px solid '+(cronData.running?'#f43f5e60':'#10b98160'), borderRadius:'4px', color:cronData.running?'#f43f5e':'#10b981', fontSize:'10px', cursor:'pointer', fontFamily:'JetBrains Mono,monospace'}}, cronData.running ? 'STOP' : 'START'),
        e('button', {onClick:function(){setCronShowConfig(!cronShowConfig); setCronShowLog(false);}, style:{padding:'2px 6px', background:cronShowConfig?'var(--surface)':'transparent', border:'1px solid var(--border)', borderRadius:'4px', color:'var(--text2)', fontSize:'10px', cursor:'pointer', fontFamily:'JetBrains Mono,monospace'}}, '\u2699'),
        e('button', {onClick:function(){setCronShowLog(!cronShowLog); setCronShowConfig(false);}, style:{padding:'2px 6px', background:cronShowLog?'var(--surface)':'transparent', border:'1px solid var(--border)', borderRadius:'4px', color:'var(--text2)', fontSize:'10px', cursor:'pointer', fontFamily:'JetBrains Mono,monospace'}}, '\u2630')
      ) : null,
      cronShowConfig ? e('div', {style:{position:'absolute', top:'44px', left:'0', zIndex:100, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'8px', padding:'12px', minWidth:'280px', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', fontSize:'11px', fontFamily:'JetBrains Mono,monospace'}},
        e('div', {style:{fontWeight:'700', marginBottom:'8px', color:'var(--neon)'}}, 'Cron Config'),
        e('div', {style:{marginBottom:'8px'}},
          e('div', {style:{color:'var(--text2)', marginBottom:'4px'}}, 'Accounts'),
          e('div', {style:{display:'flex', flexWrap:'wrap', gap:'4px'}},
            Object.keys(accounts).map(function(aid) {
              var selected = cronConfig.accounts.indexOf(aid) >= 0;
              return e('button', {key:aid, onClick:function() {
                var nc = cronConfig.accounts.slice();
                if (selected) nc = nc.filter(function(a){return a!==aid;}); else nc.push(aid);
                setCronConfig(Object.assign({}, cronConfig, {accounts: nc}));
              }, style:{padding:'3px 8px', background:selected?'var(--neon)':'var(--surface2)', border:'1px solid '+(selected?'var(--neon)':'var(--border)'), borderRadius:'4px', color:selected?'#000':'var(--text2)', fontSize:'10px', cursor:'pointer'}}, (accounts[aid].name||aid).substring(0,12));
            })
          ),
          e('div', {style:{color:'var(--text2)', fontSize:'9px', marginTop:'2px'}}, cronConfig.accounts.length === 0 ? 'All accounts with positions' : cronConfig.accounts.length + ' account(s) selected')
        ),
        e('div', {style:{marginBottom:'8px'}},
          e('div', {style:{color:'var(--text2)', marginBottom:'4px'}}, 'Engines'),
          e('div', {style:{display:'flex', flexWrap:'wrap', gap:'3px'}},
            ENGINE_LIST.map(function(eid) {
              var selected = cronConfig.engines.indexOf(eid) >= 0;
              return e('button', {key:eid, onClick:function() {
                var ne = cronConfig.engines.slice();
                if (selected) ne = ne.filter(function(e){return e!==eid;}); else ne.push(eid);
                setCronConfig(Object.assign({}, cronConfig, {engines: ne}));
              }, style:{padding:'2px 6px', background:selected?'var(--neon)':'var(--surface2)', border:'1px solid '+(selected?'var(--neon)':'var(--border)'), borderRadius:'3px', color:selected?'#000':'var(--text2)', fontSize:'9px', cursor:'pointer'}}, eid);
            })
          ),
          e('div', {style:{color:'var(--text2)', fontSize:'9px', marginTop:'2px'}}, cronConfig.engines.length === 0 ? 'Auto (from position)' : cronConfig.engines.length + ' engine(s)')
        ),
        e('div', {style:{marginBottom:'8px'}},
          e('div', {style:{color:'var(--text2)', marginBottom:'4px'}}, 'Tickers (comma-sep)'),
          e('input', {type:'text', value:cronConfig.tickers.join(','), onChange:function(ev) {
            var val = ev.target.value;
            var tickers = val ? val.split(',').map(function(t){return t.trim();}).filter(Boolean) : [];
            setCronConfig(Object.assign({}, cronConfig, {tickers: tickers}));
          }, placeholder:'BTCUSDT, ETHUSDT', style:{width:'100%', padding:'4px 8px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'4px', color:'var(--text)', fontSize:'10px', fontFamily:'JetBrains Mono,monospace'}}),
          e('div', {style:{color:'var(--text2)', fontSize:'9px', marginTop:'2px'}}, cronConfig.tickers.length === 0 ? 'Auto (from positions)' : cronConfig.tickers.length + ' ticker(s)')
        ),
        e('div', {style:{display:'flex', gap:'8px', marginBottom:'4px'}},
          e('label', {style:{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', color:cronConfig.generate_signals?'var(--neon)':'var(--text2)'}},
            e('input', {type:'checkbox', checked:cronConfig.generate_signals, onChange:function(ev){setCronConfig(Object.assign({}, cronConfig, {generate_signals:ev.target.checked}));}}, 'Signals'),
            'Signals'
          ),
          e('label', {style:{display:'flex', alignItems:'center', gap:'4px', cursor:'pointer', color:cronConfig.check_stops?'var(--neon)':'var(--text2)'}},
            e('input', {type:'checkbox', checked:cronConfig.check_stops, onChange:function(ev){setCronConfig(Object.assign({}, cronConfig, {check_stops:ev.target.checked}));}}, 'Stops'),
            'Stops'
          )
        )
      ) : null,
      cronShowLog && cronData && (cronData.recent_results||[]).length > 0 ? e('div', {style:{position:'absolute', top:'44px', right:'0', zIndex:100, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'8px', padding:'12px', minWidth:'320px', maxHeight:'400px', overflow:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', fontSize:'11px', fontFamily:'JetBrains Mono,monospace'}},
        e('div', {style:{display:'flex', justifyContent:'space-between', marginBottom:'8px'}},
          e('span', {style:{fontWeight:'700', color:'var(--neon)'}}, 'Cron Log'),
          e('span', {style:{color:'var(--text2)', fontSize:'10px'}}, cronData.run_count + ' runs')
        ),
        (cronData.recent_results||[]).slice().reverse().map(function(r, i) {
          var isSignal = r.action === 'signal';
          var isError = r.action === 'signal_error';
          var isCheck = r.action === 'bot_check';
          return e('div', {key:i, style:{padding:'4px 0', borderBottom:'1px solid var(--border2)', fontSize:'10px'}},
            isSignal ? e('span', null,
              e('span', {style:{color:r.direction==='LONG' ? '#10b981' : r.direction==='SHORT' ? '#f43f5e' : 'var(--text2)', fontWeight:'700'}}, r.direction || 'NONE'),
              ' ', e('span', {style:{color:'var(--text)'}}, r.ticker || '?'),
              ' ', e('span', {style:{color:'var(--text2)'}}, r.engine || '?'),
              ' ', e('span', {style:{color:(r.score||0)>=70 ? '#10b981' : (r.score||0)>=50 ? '#ffeb3b' : 'var(--text2)'}}, (r.score||0) + '%')
            ) : isError ? e('span', {style:{color:'#f43f5e80'}}, 'ERR ' + (r.ticker||'?') + ': ' + (r.error||'unknown')) : isCheck ? e('span', {style:{color:'var(--text2)'}}, 'Check: ' + (r.closed||0) + ' closed, ' + (r.positions||0) + ' open') : e('span', {style:{color:'var(--text2)'}}, JSON.stringify(r).substring(0,60))
          );
        })
      ) : cronShowLog ? e('div', {style:{position:'absolute', top:'44px', right:'0', zIndex:100, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'8px', padding:'12px', minWidth:'200px', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', fontSize:'11px', fontFamily:'JetBrains Mono,monospace', color:'var(--text2)'}},
        cronData && cronData.run_count === 0 ? 'No cron runs yet' : 'No recent results'
      ) : null,
      e('select', {value:selectedAccount, onChange:function(ev){setSelectedAccount(ev.target.value);}, style:{background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', fontFamily:'Sora, sans-serif', fontWeight:'600'}},
        Object.keys(accounts).map(function(k){return e('option', {key:k, value:k}, accounts[k].name + ' ($' + (accounts[k].balance||0).toLocaleString() + ')');})
      ),
      e('button', {onClick:generateSignal, disabled:loading, style:{background:loading?'var(--surface2)':'linear-gradient(135deg, #6366f1, #818cf8)', color:loading?'var(--text3)':'#fff', border:'none', borderRadius:'8px', padding:'8px 20px', fontWeight:'700', cursor:loading?'default':'pointer', fontSize:'12px', fontFamily:'Sora, sans-serif', letterSpacing:'0.5px', boxShadow:loading?'none':'0 2px 12px rgba(99,102,241,0.3)', transition:'all .2s ease'}}, loading ? '...' : 'SIGNAL'),
      signal && signal.signal ? e('button', {onClick:executeSignal, disabled:loading, style:{background:signal.signal.direction==='LONG'?'linear-gradient(135deg, #10b981, #34d399)':'linear-gradient(135deg, #f43f5e, #fb7185)', color:'#fff', border:'none', borderRadius:'8px', padding:'8px 20px', fontWeight:'700', cursor:'pointer', fontSize:'12px', fontFamily:'Sora, sans-serif', letterSpacing:'0.5px', boxShadow:'0 2px 12px rgba(0,0,0,0.2)', transition:'all .2s ease'}}, 'EXECUTE ' + signal.signal.direction) : null,
      e('button', {onClick:exportPine, style:{background:'transparent', color:'var(--neon)', border:'1px solid var(--neon-dim)', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontSize:'12px', fontFamily:'Sora, sans-serif', fontWeight:'600', letterSpacing:'0.3px', transition:'all .2s ease'}}, 'Pine Export')
    ),

    // Tab bar
    e('div', {style:{display:'flex', gap:'2px', marginBottom:'20px', borderBottom:'1px solid var(--border)', flexWrap:'wrap'}},
      tabs.map(function(t) { return e('div', {key:t, onClick:function(){setActiveTab(t);}, style:{padding:'8px 14px', cursor:'pointer', fontSize:'11px', fontWeight:activeTab===t?'700':'500', fontFamily:'Sora, sans-serif', letterSpacing:activeTab===t?'1px':'0.3px', textTransform:activeTab===t?'uppercase':'none', color:activeTab===t?'var(--neon)':'var(--text3)', borderBottom:activeTab===t?'2px solid var(--neon)':'2px solid transparent', whiteSpace:'nowrap', transition:'all .15s ease', background:activeTab===t?'var(--neon-dim)':'transparent', borderRadius:'6px 6px 0 0'}}, t.charAt(0).toUpperCase() + t.slice(1).replace('-',' ')); })
    ),

    // ── Dashboard Tab ──
    activeTab === 'dashboard' ? e('div', null,
      e('div', {style:{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'12px', marginBottom:'16px'}},
        e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Balance'), e('div', {style:{fontSize:'24px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-1px', background:'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, '$' + (acct.balance||100000).toLocaleString())),
        e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Return'), e('div', {style:{fontSize:'24px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-1px', background:(acct.return_pct||0)>=0?'linear-gradient(135deg, #10b981, #34d399)':'linear-gradient(135deg, #f43f5e, #fb7185)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, (acct.return_pct||0).toFixed(2) + '%')),
        e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Open Pos'), e('div', {style:{fontSize:'24px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-1px', color:'var(--text)'}}, (acct.open_positions||0))),
        e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Max DD'), e('div', {style:{fontSize:'24px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-1px', background:'linear-gradient(135deg, #f43f5e, #fb7185)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, (acct.max_drawdown||0).toFixed(1) + '%'))
      ),
      signal ? e('div', {className:'gcard' + (signal.signal && signal.signal.direction==='LONG' ? ' gcard-green' : signal.signal && signal.signal.direction==='SHORT' ? ' gcard-red' : ''), style:{marginBottom:'16px'}},
        e('div', {style:{fontSize:'12px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'Sora, sans-serif', color:'var(--text3)', marginBottom:'10px'}}, 'Signal'),
        e('div', {style:{fontSize:'18px', fontWeight:'800', fontFamily:'Sora, sans-serif', marginBottom:'10px', background:signal.signal && signal.signal.direction==='LONG'?'linear-gradient(135deg, #10b981, #34d399)':signal.signal && signal.signal.direction==='SHORT'?'linear-gradient(135deg, #f43f5e, #fb7185)':'linear-gradient(135deg, var(--text), var(--neon))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, signal.signal ? signal.signal.direction : 'No Signal'),
        signal.signal ? e('div', null,
          e('div', {style:{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px', fontSize:'12px'}},
            e('div', null, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'2px'}}, 'Entry'), e('div', {style:{fontWeight:'700', fontFamily:'JetBrains Mono, monospace', fontSize:'13px'}}, '$' + signal.signal.entry_price.toLocaleString())),
            e('div', null, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'2px'}}, 'Stop'), e('div', {style:{color:'#f43f5e', fontWeight:'700', fontFamily:'JetBrains Mono, monospace', fontSize:'13px'}}, '$' + signal.signal.stop_loss.toLocaleString())),
            e('div', null, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'2px'}}, 'Target'), e('div', {style:{color:'#10b981', fontWeight:'700', fontFamily:'JetBrains Mono, monospace', fontSize:'13px'}}, '$' + signal.signal.take_profit.toLocaleString())),
            e('div', null, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'2px'}}, 'R:R'), e('div', {style:{fontWeight:'700', fontFamily:'JetBrains Mono, monospace', fontSize:'13px'}}, '1:' + signal.signal.rr_ratio))
          )
        ) : null
      ) : null,
      execution && execution.execution ? e('div', {className:'gcard', style:{marginBottom:'16px', borderLeft:'3px solid var(--green)'}},
        e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif'}}, 'Executed: ' + execution.execution.status)
      ) : null
    ) : null,

    // ── Accounts Tab ──
    activeTab === 'accounts' ? e('div', null,
      e('div', {style:{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}},
        Object.keys(accounts).map(function(aid) {
          var a = accounts[aid];
          return e('div', {key:aid, className:'gcard' + (aid===selectedAccount ? ' gcard-indigo' : ''), style:{cursor:'pointer', transition:'all .2s ease'}, onClick:function(){setSelectedAccount(aid);}},
            e('div', {style:{display:'flex', justifyContent:'space-between'}}, e('div', {style:{fontWeight:'700', fontSize:'13px', fontFamily:'Sora, sans-serif'}}, a.name), e('div', {style:{fontSize:'9px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif'}}, a.exchange.toUpperCase())),
            e('div', {style:{fontSize:'24px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, '$' + (a.balance||0).toLocaleString()),
            e('div', {style:{display:'flex', gap:'12px', fontSize:'10px', fontFamily:'JetBrains Mono, monospace', color:'var(--text2)'}}, e('span', null, 'Return: ' + (a.return_pct||0).toFixed(2) + '%'), e('span', null, 'DD: ' + (a.max_drawdown||0).toFixed(1) + '%'), e('span', null, 'Open: ' + (a.open_positions||0)))
          );
        })
      )
    ) : null,

    // ── History Tab (with filters/sort) ──
    activeTab === 'history' ? e('div', null,
      e('div', {style:{display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center'}},
        e('input', {type:'text', value:historySearch, onChange:function(ev){setHistorySearch(ev.target.value);}, placeholder:'Search symbol, engine...', style:{background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'8px 12px', color:'var(--text)', fontSize:'11px', fontFamily:'JetBrains Mono, monospace', width:'200px', outline:'none'}}),
        e('select', {value:historyFilter, onChange:function(ev){setHistoryFilter(ev.target.value);}, style:{background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'6px 10px', color:'var(--text)', fontSize:'11px', fontFamily:'JetBrains Mono, monospace', outline:'none'}},
          e('option', {value:'all'}, 'All Sides'),
          e('option', {value:'wins'}, 'Wins Only'),
          e('option', {value:'losses'}, 'Losses Only'),
          e('option', {value:'LONG'}, 'Long Only'),
          e('option', {value:'SHORT'}, 'Short Only')
        ),
        e('select', {value:historySort, onChange:function(ev){setHistorySort(ev.target.value);}, style:{background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'6px 10px', color:'var(--text)', fontSize:'11px', fontFamily:'JetBrains Mono, monospace', outline:'none'}},
          e('option', {value:'newest'}, 'Newest First'),
          e('option', {value:'oldest'}, 'Oldest First'),
          e('option', {value:'pnl_high'}, 'P&L High-Low'),
          e('option', {value:'pnl_low'}, 'P&L Low-High'),
          e('option', {value:'r_high'}, 'R-Multiple High-Low')
        )
      ),
      historyData ? (function() {
        var trades = (historyData.trades||[]).slice();
        if (historyFilter === 'wins') trades = trades.filter(function(t){return (t.pnl||0) > 0;});
        else if (historyFilter === 'losses') trades = trades.filter(function(t){return (t.pnl||0) <= 0;});
        else if (historyFilter === 'LONG' || historyFilter === 'SHORT') trades = trades.filter(function(t){return (t.side||'') === historyFilter;});
        if (historySearch.trim()) {
          var q = historySearch.toLowerCase();
          trades = trades.filter(function(t){
            return ((t.symbol||'').toLowerCase().indexOf(q) >= 0) || ((t.engine_id||'').toLowerCase().indexOf(q) >= 0) || ((t.side||'').toLowerCase().indexOf(q) >= 0);
          });
        }
        if (historySort === 'newest') trades.sort(function(a,b){return (b.closed_at||'').localeCompare(a.closed_at||'');});
        else if (historySort === 'oldest') trades.sort(function(a,b){return (a.closed_at||'').localeCompare(b.closed_at||'');});
        else if (historySort === 'pnl_high') trades.sort(function(a,b){return (b.pnl||0)-(a.pnl||0);});
        else if (historySort === 'pnl_low') trades.sort(function(a,b){return (a.pnl||0)-(b.pnl||0);});
        else if (historySort === 'r_high') trades.sort(function(a,b){return (b.r_multiple||0)-(a.r_multiple||0);});
        var filteredPnl = trades.reduce(function(s,t){return s+(t.pnl||0);}, 0);
        return e('div', null,
          e('div', {style:{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'12px', marginBottom:'16px'}},
            e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Showing'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, trades.length+ '/' + historyData.summary.total_trades)),
            e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Win Rate'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:historyData.summary.win_rate>=50?'linear-gradient(135deg, #10b981, #34d399)':'linear-gradient(135deg, #f43f5e, #fb7185)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, historyData.summary.win_rate + '%')),
            e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Filtered P\u0026L'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:filteredPnl>=0?'linear-gradient(135deg, #10b981, #34d399)':'linear-gradient(135deg, #f43f5e, #fb7185)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, '$' + filteredPnl.toLocaleString())),
            e('div', {className:'gcard gcard-green', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Best'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, '$' + historyData.summary.best_trade.toLocaleString())),
            e('div', {className:'gcard gcard-red', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Worst'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #f43f5e, #fb7185)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, '$' + historyData.summary.worst_trade.toLocaleString()))
          ),
          // ── Equity Curve ──
          e('div', {className:'gcard', style:{marginBottom:'12px', padding:'12px'}},
            e('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}},
              e('span', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif'}}, 'Equity Curve'),
              e('span', {style:{fontSize:'10px', color:'var(--text2)', fontFamily:'JetBrains Mono, monospace'}}, trades.length + ' trades')
            ),
            e(EquityCurve, {trades: trades})
          ),
          e('div', {className:'gcard', style:{overflowX:'auto'}},
            e('table', {style:{width:'100%', borderCollapse:'collapse', fontSize:'11px', fontFamily:'JetBrains Mono,monospace'}},
              e('thead', null, e('tr', {style:{borderBottom:'1px solid var(--border2)'}},
                e('th', {style:{textAlign:'left', padding:'6px', color:'var(--text2)'}}, 'Date'),
                e('th', {style:{textAlign:'left', padding:'6px', color:'var(--text2)'}}, 'Symbol'),
                e('th', {style:{textAlign:'center', padding:'6px', color:'var(--text2)'}}, 'Side'),
                e('th', {style:{textAlign:'right', padding:'6px', color:'var(--text2)'}}, 'Entry'),
                e('th', {style:{textAlign:'right', padding:'6px', color:'var(--text2)'}}, 'Exit'),
                e('th', {style:{textAlign:'right', padding:'6px', color:'var(--text2)'}}, 'P&L'),
                e('th', {style:{textAlign:'right', padding:'6px', color:'var(--text2)'}}, 'R'),
                e('th', {style:{textAlign:'center', padding:'6px', color:'var(--text2)'}}, 'Engine')
              )),
              e('tbody', null, trades.slice(0,100).map(function(t, i) {
                return e('tr', {key:i, style:{borderBottom:'1px solid var(--border2)', background:(t.pnl||0)>=0?'#10b98108':'#f43f5e08'}},
                  e('td', {style:{padding:'6px', color:'var(--text2)'}}, (t.closed_at||'').substring(0,16)),
                  e('td', {style:{padding:'6px', fontWeight:'600', color:'var(--neon)'}}, t.symbol),
                  e('td', {style:{padding:'6px', textAlign:'center', color:(t.side||'')==='LONG'?'#10b981':'#f43f5e'}}, t.side),
                  e('td', {style:{padding:'6px', textAlign:'right'}}, '$' + (t.entry_price||0).toLocaleString()),
                  e('td', {style:{padding:'6px', textAlign:'right'}}, '$' + (t.exit_price||0).toLocaleString()),
                  e('td', {style:{padding:'6px', textAlign:'right', fontWeight:'700', color:(t.pnl||0)>=0?'#10b981':'#f43f5e'}}, '$' + (t.pnl||0).toLocaleString()),
                  e('td', {style:{padding:'6px', textAlign:'right', color:(t.r_multiple||0)>=0?'#10b981':'#f43f5e'}}, (t.r_multiple||0).toFixed(1) + 'R'),
                  e('td', {style:{padding:'6px', textAlign:'center', color:'var(--text2)'}}, t.engine_id || '-')
                );
              }))
            )
          )
        );
      })() : e('div', {style:{color:'var(--text2)', fontSize:'13px'}}, 'Loading trade history...')
    ) : null,

    // ── Prop Firms Tab ──
    activeTab === 'prop-firms' ? e('div', null,
      e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'14px'}}, 'Prop Firm Comparison'),
      e('table', {style:{width:'100%', borderCollapse:'collapse', fontSize:'11px', fontFamily:'JetBrains Mono, monospace'}},
        e('thead', null, e('tr', {style:{borderBottom:'1px solid var(--border2)'}}, ['Firm','Platform','Sizes','Daily Loss','Max DD','Profit Target','Trail','News','Exchange'].map(function(h){return e('th', {key:h, style:{textAlign:h==='Firm'||h==='Platform'?'left':'right', padding:'6px', color:'var(--text2)'}}, h);}))),
        e('tbody', null, Object.keys(propFirms).map(function(fid) { var f=propFirms[fid]; return e('tr', {key:fid, style:{borderBottom:'1px solid var(--border2)'}},
          e('td', {style:{padding:'6px', fontWeight:'600', color:'var(--neon)'}}, f.name),
          e('td', {style:{padding:'6px', color:'var(--text2)'}}, f.platform),
          e('td', {style:{padding:'6px'}}, '$' + f.account_sizes.slice(0,2).map(function(s){return s/1000;}).join('K, ') + 'K'),
          e('td', {style:{padding:'6px', textAlign:'right'}}, f.max_daily_loss_pct[0] + '%'),
          e('td', {style:{padding:'6px', textAlign:'right'}}, f.max_drawdown_pct[0] + '%'),
          e('td', {style:{padding:'6px', textAlign:'right'}}, f.profit_target_pct[0] + '%'),
          e('td', {style:{padding:'6px', textAlign:'center', color:f.trailing_drawdown?'var(--green)':'#ff4757'}}, f.trailing_drawdown ? 'Y' : 'N'),
          e('td', {style:{padding:'6px', textAlign:'center', color:f.can_trade_news?'var(--green)':'#ff4757'}}, f.can_trade_news ? 'Y' : 'N'),
          e('td', {style:{padding:'6px', textAlign:'right', color:'var(--neon)'}}, f.exchange)
        );}))
      )
    ) : null,

    // ── Pine Export Tab (with syntax highlighting) ──
    activeTab === 'pine' ? e('div', null,
      e('div', {style:{display:'flex', justifyContent:'space-between', marginBottom:'12px'}},
        e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif'}}, 'Pine Script Export: ' + engine.toUpperCase() + ' ' + ticker),
        e('div', {style:{display:'flex', gap:'8px'}},
          pineScript ? e('button', {onClick:function(){navigator.clipboard.writeText(pineScript);}, style:{background:'linear-gradient(135deg, #6366f1, #818cf8)', color:'#fff', border:'none', borderRadius:'8px', padding:'8px 20px', fontWeight:'700', cursor:'pointer', fontSize:'12px', fontFamily:'Sora, sans-serif'}}, 'Copy to Clipboard') : null
        )
      ),
      e('div', {style:{background:'rgba(2,4,8,0.95)', borderRadius:'10px', padding:'16px', fontFamily:'JetBrains Mono, monospace', fontSize:'12px', overflow:'auto', maxHeight:'400px', whiteSpace:'pre-wrap', wordWrap:'break-word', border:'1px solid var(--border2)'}},
        pineScript ? e('span', {dangerouslySetInnerHTML:{__html: highlightPine(pineScript)}}) : e('span', {style:{color:'#64748b'}}, 'Click "Pine Export" above to generate a Pine Script for the selected engine and ticker.')
      )
    ) : null,

    // ── Import Pine Tab (NEW) ──
    activeTab === 'import-pine' ? e('div', null,
      e('div', {style:{display:'flex', justifyContent:'space-between', marginBottom:'14px', alignItems:'center'}},
        e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif'}}, 'Import Pine Script'),
        e('div', {style:{display:'flex', gap:'8px'}},
          e('button', {onClick:function(){setImportedPine(samplePine);}, style:{background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontSize:'12px', fontFamily:'Sora, sans-serif', fontWeight:'600'}}, 'Load Example'),
          importedPine ? e('button', {onClick:function(){navigator.clipboard.writeText(importedPine);}, style:{background:'var(--surface2)', color:'var(--text2)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontSize:'12px', fontFamily:'Sora, sans-serif', fontWeight:'600'}}, 'Copy') : null,
          e('button', {onClick:importPineScript, disabled:loading || !importedPine.trim(), style:{background:(loading||!importedPine.trim())?'var(--surface2)':'linear-gradient(135deg, #6366f1, #818cf8)', color:(loading||!importedPine.trim())?'var(--text3)':'#fff', border:'none', borderRadius:'8px', padding:'8px 20px', fontWeight:'700', cursor:(loading||!importedPine.trim())?'default':'pointer', fontSize:'12px', fontFamily:'Sora, sans-serif', letterSpacing:'0.3px', boxShadow:(loading||!importedPine.trim())?'none':'0 2px 12px rgba(99,102,241,0.3)'}}, loading ? 'Parsing...' : 'Import & Parse')
        )
      ),
      // Syntax-highlighted editor: highlighted pre behind transparent textarea
      e('div', {style:{position:'relative', minHeight:'220px'}},
        e('pre', {dangerouslySetInnerHTML:{__html: highlightPine(importedPine) || '<span style="color:#64748b">Paste your Pine Script here...</span>'}, style:{position:'absolute', top:0, left:0, right:0, bottom:0, margin:0, padding:'12px', fontFamily:'JetBrains Mono, monospace', fontSize:'12px', lineHeight:'1.5', whiteSpace:'pre-wrap', wordWrap:'break-word', overflow:'auto', background:'rgba(2,4,8,0.95)', border:'1px solid var(--border)', borderRadius:'8px', color:'#d4d4d4', pointerEvents:'none', zIndex:1}}),
        e('textarea', {value:importedPine, onChange:function(ev){setImportedPine(ev.target.value);}, spellCheck:false, autoComplete:'off', autoCorrect:'off', autoCapitalize:'off', style:{position:'relative', width:'100%', minHeight:'220px', background:'transparent', border:'1px solid var(--border2)', borderRadius:'10px', padding:'12px', fontFamily:'JetBrains Mono, monospace', fontSize:'12px', lineHeight:'1.5', color:'transparent', caretColor:'#6366f1', resize:'vertical', zIndex:2, whiteSpace:'pre-wrap', wordWrap:'break-word', outline:'none'}})
      ),
      pineResult ? e('div', {className:'gcard', style:{marginTop:'12px', borderLeft:'3px solid var(--neon)'}},
        e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'14px'}}, 'Parsed Result'),
        e('div', {style:{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'8px'}},
          pineResult.indicator_name ? e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Name'), e('div', {style:{fontSize:'18px', fontWeight:'800', fontFamily:'Sora, sans-serif', background:'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, pineResult.indicator_name)) : null,
          pineResult.version ? e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Version'), e('div', {style:{fontSize:'18px', fontWeight:'800', fontFamily:'Sora, sans-serif', background:'linear-gradient(135deg, #4ec9b0, #22d3ee)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, pineResult.version)) : null,
          pineResult.overlay ? e('div', {className:'gcard' + (pineResult.overlay ? ' gcard-green' : ' gcard-red'), style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Overlay'), e('div', {style:{fontSize:'18px', fontWeight:'800', fontFamily:'Sora, sans-serif', background:pineResult.overlay?'linear-gradient(135deg, #10b981, #34d399)':'linear-gradient(135deg, #f43f5e, #fb7185)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, pineResult.overlay ? 'Yes' : 'No')) : null
        ),
        pineResult.inputs && pineResult.inputs.length > 0 ? e('div', {style:{marginBottom:'8px'}},
          e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'8px'}}, 'Inputs (' + pineResult.inputs.length + ')'),
          e('div', {style:{display:'flex', flexWrap:'wrap', gap:'4px'}},
            pineResult.inputs.map(function(inp, idx) { return e('span', {key:idx, style:{padding:'3px 8px', background:'#569cd620', border:'1px solid #569cd640', borderRadius:'4px', fontSize:'11px', fontFamily:'JetBrains Mono,monospace', color:'#569cd6'}}, inp.name || inp); })
          )
        ) : null,
        pineResult.plots && pineResult.plots.length > 0 ? e('div', {style:{marginBottom:'8px'}},
          e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'8px'}}, 'Plots (' + pineResult.plots.length + ')'),
          e('div', {style:{display:'flex', flexWrap:'wrap', gap:'4px'}},
            pineResult.plots.map(function(pl, idx) { return e('span', {key:idx, style:{padding:'3px 8px', background:'#dcdcaa20', border:'1px solid #dcdcaa40', borderRadius:'4px', fontSize:'11px', fontFamily:'JetBrains Mono,monospace', color:'#dcdcaa'}}, pl.name || pl); })
          )
        ) : null,
        e('details', {style:{marginTop:'8px'}},
          e('summary', {style:{cursor:'pointer', color:'var(--text2)', fontSize:'11px'}}, 'Raw JSON'),
          e('pre', {style:{fontSize:'10px', color:'var(--text)', overflow:'auto', maxHeight:'200px', whiteSpace:'pre-wrap'}}, JSON.stringify(pineResult, null, 2))
        )
      ) : null
    ) : null,

    // ── Transcribe Tab ──
    activeTab === 'transcribe' ? e('div', null,
      e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'14px'}}, 'Batch Transcribe Videos'),
      e('div', {style:{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}},
        e('button', {onClick:function(){startTranscribe('dtr');}, disabled:loading, style:{background:'#f59e0b20', color:'#f59e0b', border:'1px solid #f59e0b60', borderRadius:'8px', padding:'8px 14px', fontWeight:'700', cursor:'pointer', fontSize:'11px', fontFamily:'Sora, sans-serif', letterSpacing:'0.5px'}}, loading ? '...' : 'DTR'),
        e('button', {onClick:function(){startTranscribe('reece');}, disabled:loading, style:{background:'#22d3ee20', color:'#22d3ee', border:'1px solid #22d3ee60', borderRadius:'8px', padding:'8px 14px', fontWeight:'700', cursor:'pointer', fontSize:'11px', fontFamily:'Sora, sans-serif', letterSpacing:'0.5px'}}, loading ? '...' : 'Reece'),
        e('button', {onClick:function(){startTranscribe('casper');}, disabled:loading, style:{background:'#a855f720', color:'#a855f7', border:'1px solid #a855f760', borderRadius:'8px', padding:'8px 14px', fontWeight:'700', cursor:'pointer', fontSize:'11px', fontFamily:'Sora, sans-serif', letterSpacing:'0.5px'}}, loading ? '...' : 'Casper'),
        e('button', {onClick:function(){startTranscribe('rumors');}, disabled:loading, style:{background:'#f9731620', color:'#f97316', border:'1px solid #f9731660', borderRadius:'8px', padding:'8px 14px', fontWeight:'700', cursor:'pointer', fontSize:'11px', fontFamily:'Sora, sans-serif', letterSpacing:'0.5px'}}, loading ? '...' : 'Rumors'),
        e('button', {onClick:function(){startTranscribe('franky');}, disabled:loading, style:{background:'#ff6b6b20', color:'#ff6b6b', border:'1px solid #ff6b6b60', borderRadius:'8px', padding:'8px 14px', fontWeight:'700', cursor:'pointer', fontSize:'11px', fontFamily:'Sora, sans-serif', letterSpacing:'0.5px'}}, loading ? '...' : 'Franky')
      ),
      // Progress bar during transcription
      transcribeProgress && transcribeProgress.status !== 'done' ? e('div', {className:'gcard', style:{marginBottom:'12px', borderLeft: transcribeProgress.status === 'error' ? '3px solid #f43f5e' : '3px solid var(--neon)'}},
        e('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}},
          e('span', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif'}}, 'Transcribing: ' + (transcribeProgress.channel || '').toUpperCase()),
          e('span', {style:{fontSize:'11px', color:'var(--text2)'}}, transcribeProgress.status === 'starting' ? 'Starting...' : transcribeProgress.status === 'error' ? 'Error' : 'Processing...')
        ),
        e('div', {style:{width:'100%', height:'8px', background:'var(--surface2)', borderRadius:'4px', overflow:'hidden', marginBottom:'8px'}},
          e('div', {style:{width: (transcribeProgress.progress || 0) + '%', height:'100%', background: transcribeProgress.status === 'error' ? '#f43f5e' : 'var(--neon)', borderRadius:'4px', transition:'width 0.3s ease'}})
        )
      ) : null,
      // Completed transcription result
      transcribeProgress && transcribeProgress.status === 'done' ? e('div', {className:'gcard', style:{marginBottom:'12px', borderLeft:'3px solid #10b981'}},
        e('div', {style:{display:'flex', justifyContent:'space-between', marginBottom:'8px'}},
          e('span', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2px', textTransform:'uppercase', fontFamily:'Sora, sans-serif', background:'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, 'Transcription Complete'),
          e('button', {onClick:function(){setTranscribeProgress(null);}, style:{padding:'2px 8px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'4px', color:'var(--text2)', fontSize:'10px', cursor:'pointer'}}, 'Clear')
        ),
        e('div', {style:{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px'}},
          e('div', {className:'gcard', style:{textAlign:'center', padding:'8px'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Processed'), e('div', {style:{fontSize:'20px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, transcribeProgress.total || 0)),
          e('div', {className:'gcard gcard-green', style:{textAlign:'center', padding:'8px'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Transcripts'), e('div', {style:{fontSize:'20px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, transcribeProgress.transcripts || 0)),
          e('div', {className:'gcard gcard-red', style:{textAlign:'center', padding:'8px'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Errors'), e('div', {style:{fontSize:'20px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:(transcribeProgress.errors||[]).length > 0 ? 'linear-gradient(135deg, #f43f5e, #fb7185)' : 'none', WebkitBackgroundClip:(transcribeProgress.errors||[]).length > 0 ? 'text' : 'unset', WebkitTextFillColor:(transcribeProgress.errors||[]).length > 0 ? 'transparent' : 'var(--text2)', backgroundClip:(transcribeProgress.errors||[]).length > 0 ? 'text' : 'unset'}}, (transcribeProgress.errors||[]).length))
        ),
        (transcribeProgress.details||[]).length > 0 ? e('div', {style:{marginTop:'8px', maxHeight:'150px', overflow:'auto'}},
          (transcribeProgress.details||[]).map(function(d, i) { return e('div', {key:i, style:{display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid var(--border2)', fontSize:'11px'}},
            e('span', {style:{color:'var(--text)', maxWidth:'70%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}, d.title || d.video_id || '?'),
            e('span', {style:{color: d.status === 'transcribed' ? '#10b981' : d.status === 'skipped' ? '#ffeb3b' : d.status === 'error' ? '#f43f5e' : '#f59e0b', fontWeight:'600'}}, d.status)
          ); })
        ) : null
      ) : null,
      transcribeStatus ? e('div', null,
        e('div', {style:{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px', marginBottom:'16px'}},
          e('div', {className:'gcard', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Total'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, transcribeStatus.total)),
          e('div', {className:'gcard gcard-green', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Transcribed'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, transcribeStatus.transcribed)),
          e('div', {className:'gcard gcard-amber', style:{textAlign:'center'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'4px'}}, 'Pending'), e('div', {style:{fontSize:'22px', fontWeight:'800', fontFamily:'Sora, sans-serif', letterSpacing:'-0.5px', background:'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, transcribeStatus.pending))
        ),
        (transcribeStatus.channels && Object.keys(transcribeStatus.channels).length > 0) ? e('div', {className:'gcard', style:{marginBottom:'12px'}},
          e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'8px'}}, 'By Channel'),
          e('div', {style:{display:'flex', gap:'8px', flexWrap:'wrap'}},
            Object.keys(transcribeStatus.channels).map(function(ch) { var c = transcribeStatus.channels[ch]; return e('div', {key:ch, className:'gcard', style:{textAlign:'center', padding:'6px 12px'}}, e('div', {style:{fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'2px'}}, ch), e('div', {style:{fontSize:'16px', fontWeight:'800', fontFamily:'Sora, sans-serif', background:'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}, c.transcribed + '/' + c.total)); })
          )
        ) : null,
        (transcribeStatus.recent||[]).length > 0 ? e('div', {className:'gcard'},
          e('div', {style:{fontSize:'10px', fontWeight:'700', letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--text3)', fontFamily:'Sora, sans-serif', marginBottom:'8px'}}, 'Recent Videos'),
          e('div', {style:{maxHeight:'250px', overflow:'auto'}},
          (transcribeStatus.recent||[]).map(function(v, i) { return e('div', {key:i, style:{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid var(--border2)', fontSize:'11px'}},
            e('span', {style:{color:'var(--neon)', maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}, v.title || v.video_id),
            e('div', {style:{display:'flex', alignItems:'center', gap:'6px'}},
              e('span', {style:{fontSize:'9px', color:'var(--text2)'}}, v.engine_id || v.video_id),
              e('span', {style:{padding:'2px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'600', background: v.status==='done' ? '#10b98120' : v.status==='pending' ? '#ffeb3b20' : v.status==='downloaded' ? '#22d3ee20' : '#f43f5e20', color: v.status==='done' ? '#10b981' : v.status==='pending' ? '#ffeb3b' : v.status==='downloaded' ? '#22d3ee' : '#f43f5e'}}, v.status || 'unknown')
            )
          ); })
          )
        ) : null
      ) : e('div', {style:{color:'var(--text2)', fontSize:'13px'}}, 'Loading transcription status...')
    ) : null
  );
}