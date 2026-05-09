var e = React.createElement;
var S = React.useState;
var E = React.useEffect;
var R = React.useRef;

var API = window.location.origin;
var ENGINE_COLORS = {gann:'#6366f1',casper:'#a855f7',mj:'#f59e0b',ict:'#10b981',rumors:'#f97316',geo:'#3b82f6',franky:'#f59e0b',cryptoface:'#a855f7',buffett:'#3b82f6',quant:'#f43f5e',tori:'#14b8a6'};

function api(path, opts) {
  return fetch(API + path, opts).then(function(r) { return r.json(); }).catch(function() { return null; });
}
function apiPost(path, body) {
  return fetch(API + path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)}).then(function(r){return r.json();}).catch(function(){return null;});
}
function fmtPrice(p) {
  if (typeof p !== 'number') return '-';
  if (p < 1) return p.toFixed(8);
  if (p < 100) return p.toFixed(4);
  return p.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtDateShort(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', {month:'short', day:'numeric'});
}
function daysFromNow(days) {
  var d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0];
}

function LoadingDots() {
  return e('div', {style:{display:'flex',gap:4,alignItems:'center',justifyContent:'center',padding:20}}, [0,1,2].map(function(i) { return e('div', {key:i, style:{width:8,height:8,borderRadius:'50%',background:'var(--neon)',animation:'breathe 1.4s ease-in-out infinite',animationDelay:(i*0.2)+'s'}}); }));
}

function AnalysisPage(props) {
  var ds = S(null); var data = ds[0]; var setData = ds[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var es2 = S(null); var error = es2[0]; var setError = es2[1];
  var eng = props.engine || 'gann';
  var name = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades'}[eng] || eng;
  var color = ENGINE_COLORS[eng] || '#6366f1';

  function analyze(t, engineId) {
    setLoading(true); setError(null);
    fetch(API + '/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticker:t, engine:engineId || eng})})
      .then(function(r) { return r.json(); })
      .then(function(d) { setData(d); setLoading(false); if (d && d.error) setError(d.error); })
      .catch(function(er) { setError(er.message); setLoading(false); });
  }

  E(function() { analyze(props.ticker || 'BTCUSDT', eng); }, [props.ticker, eng]);

  if (loading && !data) return e('div', {className:'page', style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:40}},
    e('div', {style:{fontSize:12,fontWeight:700,color:color,letterSpacing:1.5,textTransform:'uppercase',fontFamily:'Sora,sans-serif'}}, name + ' Analyzing...'),
    e(LoadingDots)
  );

  if (error) return e('div', {className:'page'},
    e('div', {className:'hero'},
      e('div', null,
        e('div', {className:'hero-score', style:{background:'#f43f5e',WebkitBackgroundClip:'unset',WebkitTextFillColor:'unset',color:'#fff'}}, '!'),
        e('div', {className:'hero-bias', style:{color:'var(--red)'}}, 'ERROR')
      )
    ),
    e('div', {className:'gcard', style:{marginTop:16,borderColor:'var(--red)'}},
      e('div', {style:{color:'var(--red)',fontWeight:600}}, 'Analysis Error'),
      e('div', {style:{color:'var(--text2)',marginTop:8,fontSize:12}}, String(error))
    )
  );

  if (!data) return e('div', {className:'empty'}, e(LoadingDots));

  var score = data.score || 0;
  var bias = data.bias || data.marketBias || 'neutral';
  var biasColor = bias === 'bullish' ? 'var(--green)' : bias === 'bearish' ? 'var(--red)' : 'var(--amber)';

  return e('div', {className:'page', style:{overflowY:'auto'}},
    e('div', {className:'hero'},
      e('div', null,
        e('div', {className:'hero-score'}, String(score)),
        e('div', {className:'hero-bias', style:{color:biasColor}}, String(bias).toUpperCase())
      ),
      e('div', null,
        e('div', {className:'hero-price'}, (data.price && typeof data.price === 'number') ? fmtPrice(data.price) : (data.ticker || 'BTCUSDT')),
        e('div', {className:'hero-meta'}, name + ' Engine')
      )
    ),
    e('div', {className:'gcard', style:{marginTop:16}},
      e('div', {className:'sec-title'}, 'Analysis Data'),
      e('pre', {style:{background:'rgba(255,255,255,0.02)',padding:16,borderRadius:8,overflow:'auto',fontSize:11,fontFamily:'JetBrains Mono,monospace',border:'1px solid var(--border2)',maxHeight:400}}, JSON.stringify(data, null, 2).substring(0, 2000))
    )
  );
}

function ChatPage(props) {
  var ms = S([]); var messages = ms[0]; var setMessages = ms[1];
  var is2 = S(''); var input = is2[0]; var setInput = is2[1];
  var ls2 = S('none'); var loading = ls2[0]; var setLoading = ls2[1];

  function send2() {
    if (!input.trim()) return;
    var msg = input;
    setInput('');
    setMessages(messages.concat([{role:'user',content:msg}]));
    setLoading('ollama');
    fetch(API + '/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:[{role:'user',content:msg}],ticker:props.ticker,engine:props.engine||'gann'})})
      .then(function(r){return r.json();})
      .then(function(d) {
        setMessages(function(p){return p.concat([{role:'assistant',content:d.response||d.message||'No response'}]);});
        setLoading('none');
      })
      .catch(function(){setLoading('none');});
  }

  return e('div', {className:'page'},
    e('h2', {style:{marginBottom:16}}, 'Chat'),
    e('div', {style:{display:'flex',flexDirection:'column',height:'calc(100vh - 100px)',border:'1px solid var(--border2)',borderRadius:10,overflow:'hidden'}},
      e('div', {style:{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:10}},
        messages.length === 0 ? e('div', {style:{color:'var(--text3)',textAlign:'center',padding:40}}, 'Send a message') : null,
        messages.map(function(m,i) {
          return e('div', {key:i, className:m.role==='user'?'chat-msg chat-msg-user':'chat-msg chat-msg-ai'}, String(m.content));
        })
      ),
      e('div', {style:{display:'flex',gap:8,padding:8,borderTop:'1px solid var(--border2)'}},
        e('input', {value:input, onChange:function(ev){setInput(ev.target.value);}, onKeyDown:function(ev){if(ev.key==='Enter')send2();}, placeholder:'Message...', style:{flex:1}}),
        e('button', {onClick:send2, className:'btn btn-neon'}, 'Send')
      )
    )
  );
}

function App() {
  var ps = S('analysis'); var page = ps[0]; var setPage = ps[1];
  var ts = S('BTCUSDT'); var ticker = ts[0]; var setTicker = ts[1];
  var es = S(null); var engines = es[0]; var setEngines = es[1];
  var as2 = S('gann'); var activeEngine = as2[0]; var setActiveEngine = as2[1];
  E(function() {
    api('/api/engines').then(function(d) {
      if (d && d.engines) { setEngines(d.engines); setActiveEngine(d.default || 'gann'); }
    });
  }, []);

  var navItems = [
    {id:'analysis',icon:'\u25A6',label:'Analysis'},
    {id:'chat',icon:'\u2751',label:'Chat'},
    {id:'design',icon:'\u25CE',label:'Design'}
  ];

  function renderPage() {
    if (page === 'chat') return e(ChatPage, {ticker:ticker, engine:activeEngine});
    if (page === 'design') return e('div', {className:'page'}, e('div', {className:'gcard'}, e('a', {href:'http://localhost:7799/?page=design', target:'_blank', style:{color:'var(--neon)'}}, 'Open Design Tool \u2192')));
    return e(AnalysisPage, {ticker:ticker, engine:activeEngine});
  }

  return e('div', {className:'app'},
    e('div', {className:'sidebar'},
      e('div', {className:'sidebar-brand'},
        e('div', {className:'brand-logo'}, 'TK'),
        e('div', {className:'brand-label'},
          e('div', {className:'brand-name'}, 'TEKTON'),
          e('div', {className:'brand-sub'}, 'Command Center')
        )
      ),
      e('div', {className:'nav-list'},
        navItems.map(function(pg) {
          return e('div', {key:pg.id, className:'nav-item'+(page===pg.id?' active':''), onClick:function(){setPage(pg.id);}},
            e('span', {className:'nav-icon'}, pg.icon),
            e('span', {className:'nav-label'}, pg.label)
          );
        })
      )
    ),
    e('div', {className:'main'}, renderPage())
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));