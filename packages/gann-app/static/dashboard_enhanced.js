/* ── Enhanced Dashboard Pages ── */
/* These replace basic pages with richer, Tekton-branded versions */

function TradingPageEnhanced() {
  var ms = S(null); var market = ms[0]; var setMarket = ms[1];
  var es = S(null); var engines = es[0]; var setEngines = es[1];
  var ls = S(''); var livePrice = ls[0]; var setLivePrice = ls[1];
  var lo = S(false); var loading = lo[0]; var setLoading = lo[1];
  var tk = S('BTCUSDT'); var ticker = tk[0]; var setTicker = tk[1];
  
  E(function() {
    // Fetch engines from command center
    fetch('http://localhost:7799/api/engines').then(function(r){return r.json();}).then(setEngines).catch(function(){});
  }, []);
  
  E(function() {
    if (!ticker) return;
    setLoading(true);
    // Fetch market data from command center
    fetch('http://localhost:7799/api/market/' + ticker).then(function(r){return r.json();}).then(function(d){
      setMarket(d);
      if (d && d.price) setLivePrice(d.price);
      setLoading(false);
    }).catch(function(){setLoading(false);});
  }, [ticker]);
  
  var tickers = ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','BNBUSDT','AVAXUSDT','DOTUSDT','LINKUSDT'];
  
  return e('div', {className:'page-enter'},
    e('div', {className:'page-header'}, e('h2', null, 'Trading')),
    // Ticker selector
    e('div', {style:{display:'flex',flexWrap:'wrap',gap:4,marginBottom:16}},
      tickers.map(function(t) {
        return e('button', {
          key: t,
          style: {
            padding: '5px 10px',
            borderRadius: 6,
            border: '1px solid ' + (ticker===t ? 'var(--indigo)' : 'var(--border2)'),
            background: ticker===t ? 'var(--indigo-dim)' : 'transparent',
            color: ticker===t ? 'var(--indigo)' : 'var(--text2)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: ticker===t ? 600 : 400,
            fontFamily: 'JetBrains Mono, monospace',
            transition: 'all 0.15s'
          },
          onClick: function(){setTicker(t);}
        }, t.replace('USDT','/USDT'));
      })
    ),
    // Live price display
    livePrice ? e('div', {className:'card card-indigo', style:{marginBottom:14}},
      e('div', {style:{display:'flex',alignItems:'baseline',gap:12}},
        e('span', {style:{fontSize:36,fontWeight:700,fontFamily:'Sora,sans-serif',letterSpacing:-1,color:'var(--text)',textShadow:'0 2px 12px rgba(0,0,0,0.3)'}}, 
          typeof livePrice === 'number' ? livePrice.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:livePrice<1?8:livePrice<100?4:2}) : livePrice),
        e('span', {style:{fontSize:11,color:'var(--text2)',fontFamily:'JetBrains Mono,monospace',letterSpacing:1}}, ticker.replace('USDT','/USDT'))
      ),
      market && market.source ? e('span', {style:{fontSize:9,color:'var(--text3)',fontFamily:'JetBrains Mono,monospace',letterSpacing:0.5,marginTop:4,display:'block'}}, 'via ' + market.source) : null
    ) : null,
    // Engine grid
    engines && engines.engines ? e('div', {style:{marginBottom:16}},
      e('div', {style:{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1.5,fontWeight:600,marginBottom:8}}, 'Analysis Engines'),
      e('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}},
        engines.engines.map(function(eng) {
          return e('div', {key:eng.id, className:'card', style:{padding:10,cursor:'pointer',animationDelay:(engines.engines.indexOf(eng)*0.03)+'s'}},
            e('div', {style:{display:'flex',alignItems:'center',gap:6,marginBottom:4}},
              e('span', {style:{width:6,height:6,borderRadius:'50%',background:eng.color||'var(--indigo)',boxShadow:'0 0 6px '+(eng.color||'var(--indigo)')}}, ''),
              e('span', {style:{fontSize:12,fontWeight:600,color:eng.color||'var(--text)'}}, eng.name||eng.id)
            ),
            e('div', {style:{fontSize:9,color:'var(--text3)',lineHeight:1.4}}, eng.description ? eng.description.slice(0,60)+'...' : 'Analysis engine')
          );
        })
      )
    ) : loading ? e(LoadingDots) : e('div', {className:'card'}, e('p', {style:{color:'var(--text2)'}}, 'Connect to Command Center (port 7799) for live data')),
    // Market data detail
    market ? e('div', {className:'card card-emerald'},
      e('div', {style:{fontWeight:600,marginBottom:10,fontSize:13,color:'var(--text2)'}}, 'Market Data'),
      e('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        market.change_24h !== undefined ? e('div', {style:{padding:8,borderRadius:6,background:'rgba(255,255,255,0.02)'}},
          e('div', {style:{fontSize:9,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:3}}, '24h Change'),
          e('div', {style:{fontSize:16,fontWeight:700,color:market.change_24h>=0?'var(--emerald)':'var(--rose)'}}, 
            (market.change_24h>=0?'+':'') + market.change_24h.toFixed(2) + '%')
        ) : null,
        market.volume_24h ? e('div', {style:{padding:8,borderRadius:6,background:'rgba(255,255,255,0.02)'}},
          e('div', {style:{fontSize:9,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:3}}, '24h Volume'),
          e('div', {style:{fontSize:16,fontWeight:700,color:'var(--text)'}}, 
            typeof market.volume_24h === 'number' ? '$' + (market.volume_24h/1e6).toFixed(1) + 'M' : market.volume_24h)
        ) : null,
        market.high_24h ? e('div', {style:{padding:8,borderRadius:6,background:'rgba(255,255,255,0.02)'}},
          e('div', {style:{fontSize:9,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:3}}, '24h High'),
          e('div', {style:{fontSize:16,fontWeight:700,color:'var(--emerald)'}}, 
            typeof market.high_24h === 'number' ? market.high_24h.toLocaleString(undefined,{maximumFractionDigits:2}) : market.high_24h)
        ) : null,
        market.low_24h ? e('div', {style:{padding:8,borderRadius:6,background:'rgba(255,255,255,0.02)'}},
          e('div', {style:{fontSize:9,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:3}}, '24h Low'),
          e('div', {style:{fontSize:16,fontWeight:700,color:'var(--rose)'}}, 
            typeof market.low_24h === 'number' ? market.low_24h.toLocaleString(undefined,{maximumFractionDigits:2}) : market.low_24h)
        ) : null
      )
    ) : null
  );
}

function StatusPageEnhanced() {
  var st = S(null); var data = st[0]; var setData = st[1];
  var ports = S([]); var livePorts = ports[0]; var setPorts = ports[1];
  E(function() {
    api('/status').then(setData);
    var iv = setInterval(function() { api('/status').then(setData); }, 5000);
    return function() { clearInterval(iv); };
  }, []);
  E(function() {
    api('/system/ports').then(function(d) { if (d && d.ports) setPorts(d.ports); }).catch(function(){});
  }, []);
  if (!data) return e('div', {className:'page-enter'}, e(LoadingDots));
  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60);
    if (m < 60) return m + 'm ' + (s % 60) + 's';
    var h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
  }
  return e('div', {className:'page-enter'},
    e('div', {className:'page-header'}, e('h2', null, 'System Status')),
    e(QuickActions),
    e('div', {className:'stat-grid'},
      e('div', {className:'card card-amber', style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both 0s'}},
        e('div', {className:'stat-label'}, 'Uptime'),
        e('div', {className:'stat-value'}, fmtTime(data.uptimeMs || 0))
      ),
      e('div', {className:'card card-indigo', style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both 0.05s'}},
        e('div', {className:'stat-label'}, 'Tokens Used'),
        e('div', {className:'stat-value'}, (data.tokens && data.tokens.total || 0).toLocaleString())
      ),
      e('div', {className:'card card-emerald', style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both 0.1s'}},
        e('div', {className:'stat-label'}, 'Skills'),
        e('div', {className:'stat-value'}, data.skills && data.skills.total || 0)
      ),
      e('div', {className:'card card-indigo', style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both 0.15s'}},
        e('div', {className:'stat-label'}, 'Active Model'),
        e('div', {className:'stat-value', style:{fontSize:15,letterSpacing:0}}, data.model && data.model.current || 'unknown')
      )
    ),
    livePorts.length > 0 ? e('div', {className:'card', style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both 0.2s'}},
      e('div', {style:{fontWeight:600,marginBottom:12,fontSize:13,color:'var(--text2)'}}, 'Active Ports'),
      e('div', {style:{display:'flex',flexWrap:'wrap',gap:5}},
        livePorts.map(function(p) {
          var isTekton = p === 7700 || p === 7701 || p === 7799;
          var isOllama = p === 11434;
          var cls = isTekton ? 'badge-blue' : isOllama ? 'badge-amber' : 'badge-accent';
          return e('span', {key:p, className:'badge '+cls}, ':' + p);
        })
      )
    ) : null,
    data.model && data.model.available ? e('div', {className:'card card-indigo', style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both 0.25s'}},
      e('div', {style:{fontWeight:600,marginBottom:12,fontSize:13,color:'var(--text2)'}}, 'Model Registry'),
      e('div', {style:{display:'flex',flexWrap:'wrap',gap:5}},
        (data.model.cloudModels || []).map(function(m) { return e('span', {key:m, className:'badge badge-blue'}, m); }),
        (data.model.localModels || []).slice(0,12).map(function(m) { return e('span', {key:m, className:'badge badge-accent'}, m); })
      )
    ) : null,
    data.ollama ? e('div', {className:'card card-' + (data.ollama.error ? 'rose' : 'emerald'), style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both 0.3s'}},
      e('div', {style:{display:'flex',alignItems:'center',fontWeight:600,fontSize:13,gap:8}},
        e('span', {className:'dot dot-' + (data.ollama.error ? 'red' : 'green')}),
        e('span', {style:{color:data.ollama.error?'var(--rose)':'var(--emerald)'}}, data.ollama.error ? 'Ollama Offline' : 'Ollama Connected'),
        !data.ollama.error ? e('span', {style:{color:'var(--text2)',fontWeight:400,fontSize:12}}, '(' + data.ollama.modelCount + ' models)') : null
      )
    ) : null
  );
}
function GatewayPageEnhanced() {
  var ports = S([]); var livePorts = ports[0]; var setPorts = ports[1];
  var checks = S({}); var statusChecks = checks[0]; var setChecks = checks[1];
  
  E(function() {
    api('/system/ports').then(function(d) { if (d && d.ports) setPorts(d.ports); }).catch(function(){});
    
    // Check service health
    var services = [
      {name:'Dashboard', url:'http://localhost:7700/', port:7700},
      {name:'Command Center', url:'http://localhost:7799/api/engines', port:7799},
      {name:'WebSocket', url:null, port:7701},
      {name:'Ollama (Local)', url:'http://localhost:11434/api/version', port:11434},
      {name:'Ollama (Workstation)', url:'http://192.168.68.60:11434/api/version', port:11434},
      {name:'Gemini API', url:null, port:null}
    ];
    
    var newChecks = {};
    var pending = services.filter(function(s){return s.url;}).length;
    services.forEach(function(s) {
      if (s.url) {
        fetch(s.url, {signal: AbortSignal.timeout(5000)}).then(function(r){return r.json();}).then(function(d){
          newChecks[s.name] = {alive:true, data:d, port:s.port};
          pending--;
          if (pending <= 0) setChecks(Object.assign({}, statusChecks, newChecks));
        }).catch(function(){
          newChecks[s.name] = {alive:false, port:s.port};
          pending--;
          if (pending <= 0) setChecks(Object.assign({}, statusChecks, newChecks));
        });
      } else {
        newChecks[s.name] = {alive: livePorts.indexOf(s.port) >= 0, port:s.port};
      }
    });
  }, []);
  
  var tektonServices = [
    {name:'Tekton Dashboard', port:7700, desc:'Main hub - system overview, chat, models', icon:'\u25CF'},
    {name:'Command Center', port:7799, desc:'13 trading engines, analysis, charts', icon:'\u2699', url:'http://localhost:7799'},
    {name:'WebSocket Relay', port:7701, desc:'Real-time event broadcast', icon:'\u26A1'},
    {name:'Ollama (Local)', port:11434, desc:'Local LLM inference', icon:'\u2726', host:'localhost'},
    {name:'Ollama (Workstation)', port:11434, desc:'Dual Xeon E5-2670, 131GB RAM, 11 models', icon:'\u2726', host:'192.168.68.60'},
    {name:'Google Gemini', port:443, desc:'Cloud AI - 49 models via AI Studio', icon:'\u2605'}
  ];
  
  return e('div', {className:'page-enter'},
    e('h2', null, 'Tekton Network'),
    e('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12,marginBottom:20}},
      tektonServices.map(function(svc, idx) {
        var check = statusChecks[svc.name];
        var isAlive = check && check.alive;
        var isLocal = svc.host === 'localhost' || !svc.host;
        var portLabel = svc.host ? svc.host + ':' + svc.port : ':' + svc.port;
        
        return e('div', {key:svc.name, className:'card card-' + (idx%2===0?'indigo':'emerald'), 
          style:{animation:'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both ' + (idx*0.05)+'s', padding:16}},
          e('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}},
            e('div', {style:{display:'flex',alignItems:'center',gap:8}},
              e('span', {style:{fontSize:16,opacity:0.7}}, svc.icon),
              e('span', {style:{fontSize:14,fontWeight:600,color:'var(--text)'}}, svc.name)
            ),
            isAlive !== undefined ? e('span', {className:'dot dot-' + (isAlive?'green':'red')}) : 
              e('span', {className:'dot dot-amber'})
          ),
          e('div', {style:{fontSize:11,color:'var(--text2)',marginBottom:8,lineHeight:1.4}}, svc.desc),
          e('div', {style:{display:'flex',alignItems:'center',gap:6}},
            e('span', {style:{fontSize:10,color:isAlive?'var(--emerald)':'var(--text3)',fontFamily:'JetBrains Mono,monospace',letterSpacing:0.5}}, portLabel),
            svc.url ? e('a', {href:svc.url, target:'_blank', style:{fontSize:9,color:'var(--indigo)',fontFamily:'JetBrains Mono,monospace',cursor:'pointer',textDecoration:'none'}}, 'OPEN') : null
          ),
          check && check.data && check.data.version ? e('div', {style:{fontSize:9,color:'var(--text3)',marginTop:4,fontFamily:'JetBrains Mono,monospace'}}, 'v' + check.data.version) : null
        );
      })
    ),
    // Architecture diagram
    e('div', {className:'card card-indigo'},
      e('div', {style:{fontWeight:600,marginBottom:12,fontSize:13,color:'var(--text2)'}}, 'Architecture'),
      e('div', {style:{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text2)',lineHeight:1.8,whiteSpace:'pre'}},
        '  Browser :7700  \u2500\u2500\u2500  Dashboard (SPA)\n' +
        '       \u2502\n' +
        '       \u251C\u2500\u2500\u2500  :7701  WebSocket Relay\n' +
        '       \u2502\n' +
        '       \u251C\u2500\u2500\u2500  :7799  Command Center\n' +
        '       \u2502        \u251C\u2500  13 Trading Engines\n' +
        '       \u2502        \u251C\u2500  Gemini Sub-Agent\n' +
        '       \u2502        \u2514\u2500  Ollama Chat\n' +
        '       \u2502\n' +
        '       \u251C\u2500\u2500\u2500  :11434 Ollama (Local)\n' +
        '       \u2514\u2500\u2500\u2500  192.168.68.60:11434\n' +
        '                    Ollama (Workstation)\n' +
        '                    11 Models, 24 threads'
      )
    )
  );
}

/* ── Live Clock ── */
function LiveClock() {
  var ts = S(new Date()); var time = ts[0]; var setTime = ts[1];
  E(function() {
    var iv = setInterval(function() { setTime(new Date()); }, 1000);
    return function() { clearInterval(iv); };
  }, []);
  var h = time.getHours().toString().padStart(2,'0');
  var m = time.getMinutes().toString().padStart(2,'0');
  var s = time.getSeconds().toString().padStart(2,'0');
  var dateStr = time.toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric'});
  return e('div', {style:{display:'flex',flexDirection:'column',alignItems:'center',gap:1,padding:'8px 0 4px',borderTop:'1px solid var(--border)',marginTop:'auto'}},
    e('div', {style:{fontSize:13,fontWeight:700,color:'var(--text)',fontFamily:'Sora,sans-serif',letterSpacing:-0.5}}, h + ':' + m),
    e('div', {style:{fontSize:9,color:'var(--text3)',fontFamily:'JetBrains Mono,monospace',letterSpacing:0.5}}, dateStr),
    e('div', {style:{fontSize:8,color:'var(--indigo)',fontFamily:'JetBrains Mono,monospace',opacity:0.4}}, ':' + s)
  );
}

/* ── Quick Actions ── */
function QuickActions() {
  var actions = [
    {label:'Set Checkpoint', icon:'\u25C7', action:'/api/checkpoint/set', method:'POST'},
    {label:'Clear Cache', icon:'\u2726', action:null},
    {label:'Open Command Center', icon:'\u2699', action:null, url:'http://localhost:7799'},
    {label:'Design Tool', icon:'\u25CE', action:null, url:'http://localhost:7799/?page=design'},
    {label:'Refresh Data', icon:'\u21BB', action:null},
  ];
  
  var cs = S(null); var confirm = cs[0]; var setConfirm = cs[1];
  
  function handleClick(action) {
    if (action.url) {
      window.open(action.url, '_blank');
      return;
    }
    if (action.method === 'POST') {
      setConfirm(action.label);
    }
  }
  
  function doConfirm(label) {
    if (label === 'Set Checkpoint') {
      fetch(API + '/api/checkpoint/set', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({label:'dashboard-quick',task:'Quick checkpoint'})})
        .then(function(r){return r.json();}).then(function(d){setConfirm(null);});
    }
  }
  
  return e('div', {style:{marginBottom:18}},
    e('div', {style:{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1.5px,fontWeight:600,marginBottom:8,fontFamily:'Sora,sans-serif'}}, 'Quick Actions'),
    e('div', {style:{display:'flex',flexWrap:'wrap',gap:6}},
      actions.map(function(a) {
        return e('button', {
          key: a.label,
          style: {
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid var(--border2)',
            background: 'rgba(255,255,255,0.02)',
            color: 'var(--text2)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Sora, sans-serif',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          },
          onClick: function(){handleClick(a);},
          onMouseEnter: function(ev){ev.currentTarget.style.borderColor='var(--indigo)';ev.currentTarget.style.color='var(--text)';},
          onMouseLeave: function(ev){ev.currentTarget.style.borderColor='var(--border2)';ev.currentTarget.style.color='var(--text2)';}
        }, e('span', {style:{fontSize:12}}, a.icon), a.label);
      })
    ),
    confirm ? e('div', {style:{marginTop:8,padding:'8px 12px',borderRadius:6,background:'var(--indigo-dim)',border:'1px solid rgba(99,102,241,0.2)',fontSize:12,color:'var(--text2)'}},
      'Confirm: ' + confirm + '? ',
      e('button', {style:{background:'var(--indigo)',color:'#fff',border:'none',borderRadius:4,padding:'3px 10px',fontSize:11,cursor:'pointer',fontFamily:'Sora,sans-serif',fontWeight:600,marginLeft:8}, onClick:function(){doConfirm(confirm);}}, 'Yes'),
      e('button', {style:{background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',borderRadius:4,padding:'3px 10px',fontSize:11,cursor:'pointer',fontFamily:'Sora,sans-serif',marginLeft:4}, onClick:function(){setConfirm(null);}}, 'Cancel')
    ) : null
  );
}
