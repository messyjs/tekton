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

,alignItems:'center',justifyContent:'center',padding:20}}, [0,1,2].map(function(i) { return e('div', {key:i, style:{width:8,height:8,borderRadius:'50%',background:'var(--neon)',animation:'breathe 1.4s ease-in-out infinite',animationDelay:(i*0.2)+'s'}}); }));
}

function AnalysisPage(props) {
  var ds = S(null); var data = ds[0]; var setData = ds[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var es = S(null); var error = es[0]; var setError = es[1];
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
    e('div', {className:'hero'}, e('div', null, e('div', {className:'hero-score'}, '!'), e('div', {className:'hero-bias', style:{color:'var(--red)'}}, 'ERROR'))),
    e('div', {className:'gcard', style:{marginTop:16,borderColor:'var(--red)'}}, String(error))
  );
  if (!data) return e('div', {className:'empty'}, e(LoadingDots));
  var isGann = (data.engine || eng) === 'gann';
  function safe(nm, comp) { try { return comp(); } catch(err) { return e('div', {className:'gcard', style:{borderColor:'var(--red)',marginTop:8}}, e('div', {style:{color:'#f43f5e',fontWeight:600,fontSize:11}}, nm + ' Error: ' + err.message)); } }
  return e('div', {className:'page', style:{overflowY:'auto'}},
    safe('HeroBlock', function() { return e(HeroBlock, {data:data, engine:eng}); }),
    isGann ? e('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}},
      safe('TimeSection', function() { return e('div', null, e(TimeSection, {data:data})); }),
      safe('PriceSection', function() { return e('div', null, e(PriceSection, {data:data})); })
    ) : safe('EngineSignals', function() { return e(EngineSignals, {data:data, engine:eng}); }),
    safe('PredictionsSection', function() { return e(PredictionsSection, {ticker:props.ticker}); }),
    safe('BacktestSection', function() { return e(BacktestSection); })
  );
}





function HeroBlock(props) {
  var d = props.data;
  if (!d) return e('div', {className:'hero'}, e('div', {className:'hero-score'}, '--'));
  var engine = props.engine || d.engine || 'gann';
  var score = d.gannScore != null ? d.gannScore : (d.score != null ? d.score : 0);
  var bias = d.gannBias || d.bias || 'NEUTRAL';
  var biasShort = bias.replace(/_/g, ' ');
  if (biasShort.length > 24) biasShort = biasShort.substring(0, 24);
  var price = d.currentPrice || d.price || 0;
  var ticker = d.symbol || d.ticker || 'BTCUSDT';
  var engineColor = ENGINE_COLORS[engine] || '#6366f1';
  var biasColor = bias.indexOf('BULL') >= 0 ? 'var(--green)' : bias.indexOf('BEAR') >= 0 ? 'var(--rose)' : 'var(--amber)';
  var engineNames = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT / Smart Money',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades',dtr:'DayTrader',reece:'Ultimate Scalper'};
  var engineName = engineNames[engine] || engine.toUpperCase();
  return e('div', {className:'hero'},
    e('div', null,
      e('div', {className:'hero-score'}, String(score)),
      e('div', {className:'hero-bias', style:{color:biasColor, textShadow:'0 0 12px ' + biasColor}}, biasShort),
      e('div', {style:{fontSize:8,fontWeight:700,color:engineColor,fontFamily:'var(--mono)',letterSpacing:1.5,textTransform:'uppercase',marginTop:4}}, engineName + ' ENGINE')
    ),
    e('div', null,
      e('div', {className:'hero-price'}, fmtPrice(price)),
      e('div', {className:'hero-meta'}, ticker + ' Analysis')
    )
  );
}

function EngineSignals(props) {
  var d = props.data;
  if (!d) return null;
  var signals = d.signals || [];
  var keyLevels = d.keyLevels || [];
  var methods = d.methods || [];
  return e('div', null,
    signals.length > 0 ? e('div', {className:'gcard', style:{marginBottom:10}},
      e('div', {className:'sec-title'}, 'Signals'),
      e('div', {style:{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}},
        signals.slice(0, 12).map(function(sig, i) {
          var s = typeof sig === 'string' ? sig : sig.name || sig.key || 'Signal';
          if (s.length > 30) s = s.substring(0, 30);
          var isBull = s.indexOf('BULL') >= 0 || s.indexOf('BUY') >= 0 || s.indexOf('SUPPORT') >= 0;
          var isBear = s.indexOf('BEAR') >= 0 || s.indexOf('SELL') >= 0 || s.indexOf('RESIST') >= 0;
          var cls = isBull ? 'tag tag-green' : isBear ? 'tag tag-red' : 'tag tag-blue';
          return e('span', {key:i, className:cls, style:{fontSize:9}}, s.replace(/_/g, ' '));
        })
      )
    ) : null,
    keyLevels.length > 0 ? e('div', {className:'gcard', style:{marginBottom:10}},
      e('div', {className:'sec-title'}, 'Key Levels (' + keyLevels.length + ')'),
      e('table', {className:'tbl'},
        e('thead', null, e('tr', null, e('th', null, 'Level'), e('th', null, 'Price'), e('th', null, 'Type'))),
        e('tbody', null, keyLevels.slice(0, 8).map(function(lev, i) {
          var tp = lev.type || 'level';
          var tpCls = tp === 'support' ? 'tag tag-green' : tp === 'resistance' ? 'tag tag-red' : 'tag tag-blue';
          return e('tr', {key:i},
            e('td', {style:{fontSize:11,color:'var(--text2)'}}, lev.name || 'L' + i),
            e('td', {style:{fontSize:12,fontWeight:600,fontFamily:'var(--mono)',color:tp==='support'?'var(--green)':tp==='resistance'?'var(--rose)':'var(--text)'}}, fmtPrice(lev.price || lev.value || 0)),
            e('td', null, e('span', {className:tpCls, style:{fontSize:8}}, tp))
          );
        }))
      )
    ) : null,
    methods.length > 0 ? e('div', {className:'gcard'},
      e('div', {className:'sec-title'}, 'Methods'),
      e('div', {style:{display:'flex',flexWrap:'wrap',gap:5,marginTop:6}},
        methods.map(function(m, i) { return e('span', {key:i, className:'tag tag-neon', style:{fontSize:9}}, m); })
      )
    ) : null
  );
}

function TimeSection(props) {
  var d = props.data;
  if (!d) return null;
  var items = [];
  if (d.gannAngles && d.gannAngles.length > 0) items.push({title:'Gann Angles', data:d.gannAngles.slice(0,6), label:'angle', value:'price'});
  if (d.wheelOf24 && Object.keys(d.wheelOf24).length > 0) items.push({title:'Wheel of 24', data:Object.entries(d.wheelOf24).slice(0,8)});
  if (d.planetaryCycles && d.planetaryCycles.length > 0) items.push({title:'Planetary Cycles', data:d.planetaryCycles.slice(0,4), label:'name', value:'date'});
  if (items.length === 0) return null;
  return e('div', {className:'gcard'},
    e('div', {className:'sec-title'}, 'Gann Time Analysis'),
    items.map(function(item, idx) {
      return e('div', {key:idx, style:{marginBottom:idx<items.length-1?12:0}},
        e('div', {style:{fontSize:11,fontWeight:600,color:'var(--neon)',marginBottom:6}}, item.title),
        e('div', {style:{display:'flex',flexWrap:'wrap',gap:4}},
          item.data.map(function(d2, i) {
            if (Array.isArray(d2)) {
              return e('span', {key:i, className:'tag tag-blue', style:{fontSize:9}}, d2[0] + ': ' + (typeof d2[1]==='number'?fmtPrice(d2[1]):d2[1]));
            }
            var lbl = d2[item.label] || d2.angle || d2.name || '';
            var val = d2[item.value] || d2.price || d2.value || '';
            return e('span', {key:i, className:'tag tag-blue', style:{fontSize:9}}, val ? lbl + ': ' + fmtPrice(val) : lbl);
          })
        )
      );
    })
  );
}

function PriceSection(props) {
  var d = props.data;
  if (!d) return null;
  var zones = d.confluenceZones || [];
  if (zones.length === 0) return null;
  return e('div', {className:'gcard'},
    e('div', {className:'sec-title'}, 'Price Confluence (' + zones.length + ')'),
    e('table', {className:'tbl'},
      e('thead', null, e('tr', null, e('th', null, 'Price'), e('th', null, 'Side'), e('th', null, 'Strength'))),
      e('tbody', null, zones.slice(0, 8).map(function(z, i) {
        var isSup = (z.side || '').toUpperCase().indexOf('SUP') >= 0;
        return e('tr', {key:i},
          e('td', {style:{fontSize:12,fontWeight:600,fontFamily:'var(--mono)',color:isSup?'var(--green)':'var(--rose)'}}, fmtPrice(z.price || 0)),
          e('td', null, e('span', {className:isSup?'tag tag-green':'tag tag-red', style:{fontSize:8}}, z.side || '--')),
          e('td', null, e('span', {className:String(z.strength||'').toUpperCase().indexOf('CRIT')>=0?'tag tag-amber':'tag tag-neon', style:{fontSize:8}}, z.strength || '--'))
        );
      }))
    )
  );
}

function PredictionsSection(props) {
  var ps = S(null); var stats = ps[0]; var setStats = ps[1];
  E(function() {
    api('/predictions/stats?ticker=' + (props.ticker || 'BTCUSDT')).then(function(d) { if (d) setStats(d); }).catch(function(){});
  }, [props.ticker]);
  if (!stats) return null;
  var total = stats.totalPredictions || stats.total || 0;
  var correct = stats.correctPredictions || stats.correctPredictions || stats.correct || 0;
  var avg = stats.averageScore || stats.avgScore || 0;
  var acc = total > 0 ? Math.round((correct / total) * 100) : 0;
  return e('div', {className:'gcard', style:{marginTop:10}},
    e('div', {className:'sec-title'}, 'Prediction Stats'),
    e('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:8}},
      e('div', null, e('div', {style:{fontSize:24,fontWeight:700,color:'var(--neon)',fontFamily:'Sora,sans-serif'}}, String(total)), e('div', {style:{fontSize:9,color:'var(--text3)',textTransform:'uppercase',fontWeight:600,letterSpacing:1}}, 'Total')),
      e('div', null, e('div', {style:{fontSize:24,fontWeight:700,color:acc>=50?'var(--green)':'var(--rose)',fontFamily:'Sora,sans-serif'}}, acc + '%'), e('div', {style:{fontSize:9,color:'var(--text3)',textTransform:'uppercase',fontWeight:600,letterSpacing:1}}, 'Accuracy')),
      e('div', null, e('div', {style:{fontSize:24,fontWeight:700,color:'var(--text)',fontFamily:'Sora,sans-serif'}}, String(avg)), e('div', {style:{fontSize:9,color:'var(--text3)',textTransform:'uppercase',fontWeight:600,letterSpacing:1}}, 'Avg Score'))
    )
  );
}

function BacktestSection(props) {
  var bt = S(null); var results = bt[0]; var setResults = bt[1];
  E(function() {
    api('/backtest/results').then(function(d) { if (d && d.results) setResults(d.results); }).catch(function(){});
  }, []);
  if (!results || results.length === 0) return e('div', {className:'gcard', style:{marginTop:10}},
    e('div', {className:'sec-title'}, 'Backtest'),
    e('div', {style:{color:'var(--text3)',fontSize:12,marginTop:8}}, 'No backtest results yet.')
  );
  return e('div', {className:'gcard', style:{marginTop:10}},
    e('div', {className:'sec-title'}, 'Backtest Results'),
    e('table', {className:'tbl'},
      e('thead', null, e('tr', null, e('th', null, 'Strategy'), e('th', null, 'P&L'), e('th', null, 'Win Rate'))),
      e('tbody', null, results.slice(0, 5).map(function(r, i) {
        var pnl = r.pnl || 0;
        var wr = r.winRate || r.win_rate || 0;
        return e('tr', {key:i},
          e('td', {style:{fontSize:11}}, r.strategy || r.name || '#' + (i+1)),
          e('td', {style:{fontSize:12,fontWeight:600,fontFamily:'var(--mono)',color:pnl>=0?'var(--green)':'var(--rose)'}}, (pnl>=0?'+':'') + (typeof pnl==='number'?pnl.toFixed(2):String(pnl))),
          e('td', {style:{fontSize:12,fontFamily:'var(--mono)'}}, typeof wr==='number'?wr.toFixed(1)+'%':String(wr))
        );
      }))
    )
  );
}

function GannWheel(props) {
  var levels = props.levels;
  if (!levels) return null;
  return e('div', {style:{display:'flex',flexWrap:'wrap',gap:4,maxHeight:200,overflow:'auto'}},
    levels.slice(0, 20).map(function(lev, i) {
      var price = typeof lev === 'number' ? lev : lev.price || lev.value || 0;
      return e('span', {key:i, className:'tag tag-blue', style:{fontSize:9}}, fmtPrice(price));
    })
  );
}

function TickerDropdown(props) {
  var os = S(false); var open = os[0]; var setOpen = os[1];
  var ticker = props.ticker || 'BTCUSDT';
  var onChange = props.onChange || function(){};
  var cats = [
    {name:'Crypto', items:['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','DOGE-USD','ADA-USD','AVAX-USD']},
    {name:'Stocks', items:['AAPL','TSLA','MSFT','NVDA','META','SPY']}
  ];
  return e('div', {style:{position:'relative',display:'inline-block'}, onClick:function(ev){ev.stopPropagation();}},
    e('button', {onClick:function(){setOpen(!open);}, style:{padding:'4px 10px',borderRadius:6,border:open?'1px solid var(--neon)':'1px solid var(--border2)',background:open?'var(--neon-dim)':'transparent',color:open?'var(--neon)':'var(--text2)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--sans)',transition:'all .15s'}},
      e('span', {style:{fontFamily:'var(--mono)',fontWeight:700}}, ticker),
      e('span', {style:{fontSize:8,opacity:0.6}}, '\u25BC')
    ),
    open ? e('div', {style:{position:'absolute',top:'100%',left:0,marginTop:4,minWidth:160,maxHeight:300,overflow:'auto',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8,padding:8,zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}},
      cats.map(function(cat) {
        return e('div', {key:cat.name},
          e('div', {className:'tick-cat'}, cat.name),
          cat.items.map(function(t) {
            return e('div', {key:t, className:'tick-item'+(ticker===t?' sel':''), onClick:function(ev){ev.stopPropagation();setOpen(false);onChange(t);}}, t);
          })
        );
      })
    ) : null
  );
}

function EngineSelector(props) {
  var engines = props.engines || [];
  var active = props.active || 'gann';
  var onChange = props.onChange || function(){};
  var engineNames = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades',dtr:'DayTrader',reece:'Ultimate Scalper'};
  return e('div', {style:{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}},
    engines.map(function(eng) {
      var color = ENGINE_COLORS[eng] || '#6366f1';
      var isActive = eng === active;
      return e('button', {key:eng, onClick:function(){onChange(eng);}, style:{padding:'4px 8px',borderRadius:4,border:isActive?'1px solid '+color:'1px solid var(--border2)',background:isActive?color+'20':'transparent',color:isActive?color:'var(--text2)',fontSize:10,fontWeight:isActive?700:500,cursor:'pointer',fontFamily:'var(--sans)',transition:'all .15s'}}, engineNames[eng] || eng);
    })
  );
}

function handler(eng) { setActiveEngine(eng); }


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