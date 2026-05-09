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

function GannWheel(props) {
  var levels = props.levels || [];
  if (!levels.length) return null;
  var spokes = [];
  for (var i = 0; i < 24; i++) {
    var angle = i * 15;
    var isCard = angle % 90 === 0;
    var matching = null;
    for (var j = 0; j < levels.length; j++) { if (levels[j].spoke === i) { matching = levels[j]; break; } }
    var cls = 'spoke' + (isCard ? ' spoke-hl' : '');
    spokes.push(e('div', {key:'s'+i, className:cls, style:{transform:'rotate('+angle+'deg)'}}));
    if (matching) {
      var rad = (angle - 90) * Math.PI / 180;
      var r = 85;
      var x = Math.cos(rad) * r;
      var y = Math.sin(rad) * r;
      spokes.push(e('div', {key:'p'+i, className:'wheel-lbl', style:{left:'calc(50% + '+(x-16)+'px)',top:'calc(50% + '+(y-4)+'px)',color:isCard?'var(--neon)':'var(--text3)',fontWeight:isCard?700:400}}, fmtPrice(matching.priceLevel)));
    }
  }
  return e('div', {className:'wheel-wrap'}, e('div', {className:'wheel'}, e('div', {className:'wheel-ct pulse'}), spokes));
}

function TickerDropdown(props) {
  var open = S(false); var isOpen = open[0]; var setOpen = open[1];
  var ref = R(null);
  E(function() {
    function handler(ev) { if (ref.current && !ref.current.contains(ev.target)) setOpen(false); }
    document.addEventListener('click', handler);
    return function() { document.removeEventListener('click', handler); };
  }, []);
  var assetColor = function(a) { return a === 'crypto' ? 'tick-asset-crypto' : a === 'futures' ? 'tick-asset-futures' : 'tick-asset-stock'; };
  return e('div', {className:'tick-wrap', ref:ref},
    e('div', {className:'tick-btn', onClick:function(ev){ev.stopPropagation();setOpen(!isOpen);}},
      e('span', null, props.ticker || 'BTCUSDT'),
      e('span', {style:{fontSize:8,opacity:.5}}, '\u25BC')
    ),
    e('div', {className:'tick-dd' + (isOpen ? ' show' : '')},
      Object.keys(TICKER_CATEGORIES).map(function(cat) {
        return e('div', {key:cat},
          e('div', {className:'tick-cat'}, cat),
          TICKER_CATEGORIES[cat].map(function(t) {
            return e('div', {key:t.sym, className:'tick-item' + (props.ticker===t.sym?' sel':''), onClick:function(){props.onChange(t.sym);setOpen(false);}},
              e('span', {className:'tick-asset ' + assetColor(t.asset)}, t.asset.toUpperCase().slice(0,4)),
              e('span', {className:'tick-name'}, t.name),
              e('span', {style:{color:'var(--text3)',fontSize:10}}, t.sym)
            );
          })
        );
      })
    )
  );
}

function handler(ev) { if (ref.current && !ref.current.contains(ev.target)) setOpen(false); }

function EngineSelector(props) {
  var engines = props.engines || [];
  var active = props.active;
  var onChange = props.onChange;
  return e('div', {className:'eng-sel'},
    engines.map(function(eng) {
      var isAct = eng.id === active;
      var label = eng.name.split(' ')[0].substring(0, 6).toUpperCase();
      if (eng.id === 'gann') label = 'GANN';
      if (eng.id === 'mj') label = 'MJ';
      if (eng.id === 'ict') label = 'ICT';
      if (eng.id === 'rumors') label = 'RUMORS';
      if (eng.id === 'geo') label = 'GEO';
      if (eng.id === 'franky') label = 'FRANKY';
      if (eng.id === 'cryptoface') label = 'CFACE';
      if (eng.id === 'buffett') label = 'BUFF';
      if (eng.id === 'quant') label = 'QUANT';
      if (eng.id === 'tori') label = 'TORI';
      if (eng.id === 'dtr') label = 'DTR';
      if (eng.id === 'reece') label = 'REECE';
      return e('button', {key:eng.id, className:'eng-btn' + (isAct?' active':''), style:{color:isAct?eng.color:'var(--text2)',background:isAct?eng.color+'15':'none',borderColor:isAct?eng.color+'40':'transparent'}, onClick:function(){onChange(eng.id);}, title:eng.name + '\n' + (eng.subtitle||'')}, label);
    })
  );
}

function HeroBlock(props) {
  var d = props.data;
  var m = d.market || {};
  var engine = props.engine || d.engine || 'gann';
  var score = d.gannScore || d.score || 0;
  var bias = d.gannBias || d.bias || 'NEUTRAL';
  var biasShort = bias.replace(/_/g,' ').substring(0, 28);
  var color = score >= 75 ? 'var(--green)' : score >= 60 ? 'var(--neon)' : score <= 25 ? 'var(--red)' : 'var(--amber)';
  var engineColor = '#6366f1';
  var engineNames = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT / Smart Money',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'Aaron/QuantCrawler',tori:'Tori Trades'};
  if (ENGINE_COLORS[engine]) engineColor = ENGINE_COLORS[engine];
  var engineName = engineNames[engine] || engine.toUpperCase();
  return e('div', {className:'hero'},
    e('div', null,
      e('div', {className:'hero-score'}, String(score)),
      e('div', {className:'hero-bias', style:{color:color, textShadow:'0 0 12px ' + color}}, biasShort),
      e('div', {style:{fontSize:9,color:engineColor,fontFamily:'JetBrains Mono,monospace',letterSpacing:1,marginTop:2,textTransform:'uppercase'}}, engineName + ' ENGINE')
    ),
    e('div', null,
      e('div', {className:'hero-price'}, fmtPrice(m.currentPrice || d.currentPrice)),
      e('div', {className:'hero-meta'},
        (m.symbol || d.symbol || ''), ' ',
        m.volatility ? (m.volatility*100).toFixed(1)+'% vol' : '', '\n',
        'H: ', fmtPrice(m.pivotHigh), ' (', fmtDateShort(m.pivotHighTime), ')\n',
        'L: ', fmtPrice(m.pivotLow), ' (', fmtDateShort(m.pivotLowTime), ')'
      )
    )
  );
}

function EngineSignals(props) {
  var d = props.data;
  var engine = props.engine || 'gann';
  var sig = d.signals || {};var m = d.market || {};var levels = d.keyLevels || [];var methods = d.methods || [];var summary = d.summary || '';var color = ENGINE_COLORS[engine] || 'var(--neon)';
  var signalCards = Object.keys(sig).map(function(key) {
    var val = sig[key];var valStr = '';
    if (typeof val === 'object' && val !== null) { valStr = Object.keys(val).map(function(k) { return k + ': ' + (typeof val[k] === 'object' ? JSON.stringify(val[k]) : String(val[k])); }).join('\n'); }
    else if (Array.isArray(val)) { valStr = val.join(', '); }
    else { valStr = String(val); }
    return {key: key, value: valStr};
  });
  var leftCol = e('div', {className:'sec'},
    e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:color,boxShadow:'0 0 6px '+color}}), e('div', {className:'sec-title', style:{color:color}}, 'SIGNALS')),
    e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')}, signalCards.map(function(s, i) {
      return e('div', {key:i, style:{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'1px solid var(--border)',fontSize:11,fontFamily:'JetBrains Mono,monospace'}},
        e('span', {style:{color:color,fontWeight:600,fontSize:10,textTransform:'uppercase',letterSpacing:0.5}}, s.key.replace(/_/g,' ')),
        e('span', {style:{color:'var(--text)',textAlign:'right',maxWidth:'60%',whiteSpace:'pre-wrap'}}, s.value.length > 60 ? s.value.substring(0,60)+'...' : s.value)
      );
    })),
    methods && methods.length > 0 ? e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')},
      e('h3', {style:{color:color}}, 'Methods Used'),
      e('div', {style:{display:'flex',flexWrap:'wrap',gap:4}}, methods.map(function(m2, j) {
        return e('span', {key:j, className:'tag', style:{background:color+'20',color:color,border:'1px solid '+color+'40',fontSize:9}}, m2);
      }))
    ) : null,
    summary ? e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon'), style:{borderLeft:'2px solid '+color,background:color+'08'}},
      e('div', {style:{fontSize:11,color:'var(--text)',lineHeight:1.5}}, summary)
    ) : null
  );
  var rightCol = e('div', {className:'sec'},
    e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:'var(--green)',boxShadow:'0 0 6px var(--green)'}}), e('div', {className:'sec-title sec-title-price'}, 'KEY LEVELS')),
    levels && levels.length > 0 ? e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')},
      e('h3', {style:{color:'var(--green)'}}, 'Price Levels'),
      levels.map(function(lev, i) {
        var typeColor = lev.type === 'support' ? 'var(--green)' : lev.type === 'resistance' ? 'var(--red)' : lev.type === 'decision' ? 'var(--neon)' : lev.type === 'extreme' ? 'var(--purple)' : lev.type === 'gap' ? 'var(--amber)' : 'var(--text2)';
        return e('div', {key:i, style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0',fontSize:10,fontFamily:'JetBrains Mono,monospace'}},
          e('span', {style:{color:typeColor,fontWeight:600,fontSize:9,textTransform:'uppercase'}}, lev.name),
          e('span', {style:{color:'var(--text)',fontWeight:700}}, fmtPrice(lev.price))
        );
      })
    ) : e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')}, e('div', {className:'empty'}, 'No levels')),
    e(HeroBlock, {data:d, engine:engine})
  );
  return e('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}, leftCol, rightCol);
}

function TimeSection(props) {
  var d = props.data;
  if (!d) return null;
  var pc = d.planetaryCycles || {};
  var cc = d.cycleConvergence || {};
  var w24 = d.wheelOf24 || {};
  var tps = d.timePriceSquaring || {};
  var planets = (pc.all || []).slice(0, 8);
  var atCard = pc.atCardinal || [];
  var convPts = cc.convergencePoints || [];
  var upcoming = tps.upcomingWithin7Days || [];

  var cardinalEl = null;
  if (atCard.length > 0) {
    cardinalEl = e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon'), style:{borderLeft:'2px solid var(--neon)',paddingLeft:10}},
      e('h3', {style:{color:'var(--neon)'}}, 'At Cardinal'),
      atCard.map(function(p, i) {
        return e('div', {key:i, style:{fontSize:11,padding:'1px 0'}},
          e('span', {style:{color:'var(--neon)',fontWeight:700}}, p.name), ' ',
          e('span', {className:'mono', style:{color:'var(--text)',fontSize:10}}, p.degrees.toFixed(1) + '\u00B0'), ' ',
          e('span', {className:'tag tag-neon'}, p.phase ? p.phase.replace(/_/g,' ') : 'WAXING')
        );
      })
    );
  }

  var planetEl = e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')},
    e('h3', {style:{color:'var(--neon)'}}, 'Planetary Cycles'),
    e('table', {className:'tbl'},
      e('thead', null, e('tr', null, e('th',null,'Planet'), e('th',null,'Cycle'), e('th',null,'Position'), e('th',null,'Next'), e('th',null,'Date'))),
      e('tbody', null, planets.map(function(p, i) {
        var dtc = p.daysToNextCardinal;
        var soon = typeof dtc === 'number' && dtc <= 7;
        var near = typeof dtc === 'number' && dtc <= 30 && dtc > 7;
        return e('tr', {key:i, style:{background:p.isAtCardinal?'var(--neon-dim)':'none'}},
          e('td', null, e('span', {style:{color:p.isAtCardinal?'var(--neon)':'var(--text)'}}, p.name), p.isAtCardinal ? e('span', {className:'tag tag-neon', style:{marginLeft:3}}, 'NOW') : null),
          e('td', {style:{color:'var(--text2)'}}, p.periodDays ? p.periodDays.toFixed(0) + 'd' : '-'),
          e('td', null, e('span', {style:{color:p.isAtCardinal?'var(--neon)':'var(--text2)'}}, p.degrees.toFixed(1) + '\u00B0')),
          e('td', null, typeof dtc === 'number' ? e('span', {style:{color:soon?'var(--red)':near?'var(--amber)':'var(--text2)',fontWeight:soon||near?700:400}}, dtc + 'd') : '-', soon ? e('span', {className:'tag tag-red', style:{marginLeft:3}}, 'SOON') : null),
          e('td', {style:{color:near?'var(--text)':'var(--text2)'}}, typeof dtc === 'number' ? daysFromNow(dtc) : '-')
        );
      }))
    )
  );

  var wheelEl = null;
  if (w24 && w24.levels && w24.levels.length > 0) {
    wheelEl = e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')}, e('h3', {style:{color:'var(--neon)'}}, 'Wheel of 24'), e(GannWheel, {levels:w24.levels}));
  }

  return e('div', {className:'sec'},
    e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:'var(--neon)',boxShadow:'0 0 6px var(--neon)'}}), e('div', {className:'sec-title sec-title-time'}, 'TIME')),
    cardinalEl, planetEl, wheelEl
  );
}

function PriceSection(props) {
  var d = props.data;
  if (!d) return null;
  var sq9 = d.squareOf9 || {};
  var rf = d.rangeFinder || {};
  var confs = d.confluenceZones || [];

  var rangeEl = null;
  if (rf && rf.keyRetracements && rf.keyRetracements.length > 0) {
    var pos = rf.currentPositionInRange || 0;
    rangeEl = e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')},
      e('h3', {style:{color:'var(--green)'}}, 'Range Finder'),
      e('div', {style:{fontSize:9,color:'var(--text2)',marginBottom:6,fontFamily:'JetBrains Mono,monospace'}}, fmtPrice(rf.high) + ' \u2192 ' + fmtPrice(rf.low) + ' | ' + (pos*100).toFixed(1) + '%'),
      rf.keyRetracements.map(function(r, idx) {
        var near = Math.abs(r.fraction - pos) < 0.08;
        var pct = r.fraction * 100;
        return e('div', {key:idx, style:{display:'flex',alignItems:'center',gap:6,padding:'2px 0',fontSize:10,fontFamily:'JetBrains Mono,monospace',background:near?'var(--green-dim)':'none',borderRadius:3,paddingLeft:near?4:0}},
          e('span', {style:{width:50,color:near?'var(--green)':'var(--text2)',fontWeight:near?700:400,fontSize:9}}, (r.label||pct.toFixed(1)+'%').replace(/ \(.*\)/,'')),
          e('div', {style:{flex:1,height:2,background:'var(--surface2)',borderRadius:1,position:'relative'}},
            e('div', {style:{height:'100%',width:pct+'%',background:near?'var(--green)':'var(--border)',borderRadius:1}})
          ),
          e('span', {style:{width:70,textAlign:'right',color:near?'var(--green)':'var(--text)',fontWeight:600}}, fmtPrice(r.price))
        );
      })
    );
  }

  var confEl = null;
  if (confs.length > 0) {
    confEl = e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')},
      e('h3', {style:{color:'var(--green)'}}, 'Confluence'),
      confs.slice(0,8).map(function(z, i) {
        return e('div', {key:i, style:{display:'flex',alignItems:'center',gap:6,padding:'3px 0',fontSize:10,fontFamily:'JetBrains Mono,monospace'}},
          e('span', {className:'tag '+(z.side==='SUPPORT'?'tag-green':'tag-red')}, z.side),
          e('span', {style:{flex:1,color:'var(--green)',fontWeight:600}}, fmtPrice(z.price)),
          e('span', {className:'tag '+(z.strength==='CRITICAL'?'tag-red':z.strength==='STRONG'?'tag-neon':'tag-purple')}, z.strength||'Std')
        );
      })
    );
  }

  var sq9El = null;
  if (sq9 && sq9.nearCurrentPrice && sq9.nearCurrentPrice.length > 0) {
    sq9El = e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')},
      e('h3', {style:{color:'var(--green)'}}, 'SQ9 Near Price'),
      e('div', {style:{display:'flex',flexWrap:'wrap',gap:4}}, sq9.nearCurrentPrice.slice(0,8).map(function(n, i) {
        var isC = n.isCardinal;
        return e('div', {key:i, style:{padding:'3px 6px',background:isC?'var(--green-dim)':'var(--surface2)',borderRadius:3,border:'1px solid '+(isC?'var(--green)':'var(--border)'),fontFamily:'JetBrains Mono,monospace',fontSize:9}},
          e('span', {style:{color:isC?'var(--green)':'var(--text)',fontWeight:isC?700:400}}, fmtPrice(n.price)),
          e('span', {style:{color:'var(--text2)',marginLeft:4}}, n.angle + '\u00B0'),
          isC ? e('span', {className:'tag tag-green', style:{marginLeft:3}}, 'C') : null
        );
      }))
    );
  }

  return e('div', {className:'sec'},
    e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:'var(--green)',boxShadow:'0 0 6px var(--green)'}}), e('div', {className:'sec-title sec-title-price'}, 'PRICE')),
    rangeEl, confEl, sq9El
  );
}

function PredictionsSection(props) {
  var stats = S(null); var predStats = stats[0]; var setStats = stats[1];
  var ticker = props.ticker;
  E(function() {
    var path = '/api/predictions';
    if (ticker) path += '?ticker=' + ticker;
    api(path).then(function(d) { if (d) setStats(d); });
  }, [ticker]);

  if (!predStats) return e('div', {className:'sec'}, e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:'var(--purple)',boxShadow:'0 0 6px var(--purple)'}}), e('div', {className:'sec-title sec-title-pred'}, 'PREDICTIONS')), e('div', {className:'empty'}, 'Loading...'));

  var accColor = predStats.accuracy >= 70 ? 'var(--green)' : predStats.accuracy >= 50 ? 'var(--neon)' : 'var(--red)';
  return e('div', {className:'sec'},
    e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:'var(--purple)',boxShadow:'0 0 6px var(--purple)'}}), e('div', {className:'sec-title sec-title-pred'}, 'PREDICTIONS')),
    e('div', {className:'pred-stats'},
      e('div', {className:'pred-stat'}, e('div', {className:'pred-val', style:{color:accColor}}, predStats.accuracy + '%'), e('div', {className:'pred-lbl'}, 'Accuracy')),
      e('div', {className:'pred-stat'}, e('div', {className:'pred-val', style:{color:'var(--green)'}}, String(predStats.hitCount)), e('div', {className:'pred-lbl'}, 'Hits')),
      e('div', {className:'pred-stat'}, e('div', {className:'pred-val', style:{color:'var(--red)'}}, String(predStats.missedCount)), e('div', {className:'pred-lbl'}, 'Missed')),
      e('div', {className:'pred-stat'}, e('div', {className:'pred-val', style:{color:'var(--neon)'}}, String(predStats.activeCount)), e('div', {className:'pred-lbl'}, 'Active')),
      e('div', {className:'pred-stat'}, e('div', {className:'pred-val', style:{color:'var(--amber)'}}, String(predStats.total)), e('div', {className:'pred-lbl'}, 'Total'))
    ),
    predStats.predictions && predStats.predictions.length > 0 ?
      predStats.predictions.slice(0,15).map(function(p, i) {
        var statusTag = p.status === 'HIT' ? 'tag-green' : p.status === 'MISSED' ? 'tag-red' : 'tag-neon';
        var dirIcon = p.direction === 'BULLISH' ? '\u25B2' : p.direction === 'BEARISH' ? '\u25BC' : '\u25CF';
        var dirColor = p.direction === 'BULLISH' ? 'var(--green)' : p.direction === 'BEARISH' ? 'var(--red)' : 'var(--text2)';
        return e('div', {key:i, className:'pred-row'},
          e('span', {className:'pred-id'}, String(i+1).padStart(2,'0')),
          e('span', {className:'pred-type'}, e('span', {className:'tag '+(p.predictionType==='TIME'?'tag-neon':'tag-green')}, p.predictionType)),
          e('span', {className:'pred-dir', style:{color:dirColor}}, dirIcon),
          e('span', {className:'pred-target', style:{color:'var(--text)'}}, p.targetPrice ? fmtPrice(p.targetPrice) : fmtDateShort(p.targetDate)),
          e('span', {className:'pred-date'}, fmtDateShort(p.targetDate)),
          e('span', {className:'pred-status'}, e('span', {className:'tag '+statusTag}, p.status || 'ACTIVE'))
        );
      })
    : e('div', {className:'empty'}, 'No predictions yet. Run analysis to auto-generate.')
  );
}

function BacktestSection(props) {
  var bt = S(null); var results = bt[0]; var setResults = bt[1];
  E(function() { api('/backtest/results').then(function(d) { if (d) setResults(d); }); }, []);
  if (!results) return null;
  var rows = results.results || [];
  if (rows.length === 0) return e('div', {className:'sec'},
    e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:'var(--amber)',boxShadow:'0 0 6px var(--amber)'}}), e('div', {className:'sec-title sec-title-bt'}, 'BACKTEST')),
    e('div', {className:'empty'}, 'No backtest results. Import from TradingView or build strategies in chat.')
  );
  return e('div', {className:'sec'},
    e('div', {className:'sec-head'}, e('div', {className:'sec-dot', style:{background:'var(--amber)',boxShadow:'0 0 6px var(--amber)'}}), e('div', {className:'sec-title sec-title-bt'}, 'BACKTEST')),
    rows.map(function(r, i) {
      var wr = r.win_rate || 0;
      var pf = r.profit_factor || 1;
      var wrColor = wr >= 60 ? 'var(--green)' : wr >= 50 ? 'var(--neon)' : 'var(--red)';
      var pfColor = pf >= 1.5 ? 'var(--green)' : pf >= 1.0 ? 'var(--neon)' : 'var(--red)';
      return e('div', {key:i, className:'bt-row'},
        e('span', {className:'bt-name'}, r.strategy_name || '-'),
        e('span', {className:'bt-sym'}, r.symbol || '-'),
        e('div', {className:'bt-stat'}, e('div', {className:'bt-stat-val', style:{color:wrColor}}, wr.toFixed(1) + '%'), e('div', {className:'bt-stat-lbl'}, 'Win Rate')),
        e('div', {className:'bt-stat'}, e('div', {className:'bt-stat-val', style:{color:'var(--text)'}}, String(r.total_trades || 0)), e('div', {className:'bt-stat-lbl'}, 'Trades')),
        e('div', {className:'bt-stat'}, e('div', {className:'bt-stat-val', style:{color:pfColor}}, pf.toFixed(2)), e('div', {className:'bt-stat-lbl'}, 'PF')),
        e('div', {className:'bt-stat'}, e('div', {className:'bt-stat-val', style:{color:r.max_drawdown > 10 ? 'var(--red)' : 'var(--amber)'}}, (r.max_drawdown || 0).toFixed(1) + '%'), e('div', {className:'bt-stat-lbl'}, 'Max DD')),
        e('div', {className:'bt-prop'}, r.prop_firm_compatible ? e('span', {className:'tag tag-green'}, 'PROP OK') : e('span', {className:'tag tag-amber'}, 'NO PROP'))
      );
    })
  );
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
    e('div', {className:'hero'}, e('div', null, e('div', {className:'hero-score'}, '!'), e('div', {className:'hero-bias', style:{color:'var(--red)'}}, 'ERROR'))),
    e('div', {className:'gcard', style:{marginTop:16,borderColor:'var(--red)'}}, String(error))
  );
  if (!data) return e('div', {className:'empty'}, e(LoadingDots));
  return e('div', {className:'page', style:{overflowY:'auto'}},
    e(HeroBlock, {data:data, engine:eng}),
    e('div', {className:'gcard', style:{marginTop:8}},
      e('div', {className:'sec-title'}, 'Analysis Data'),
      e('pre', {style:{background:'rgba(255,255,255,0.02)',padding:16,borderRadius:8,overflow:'auto',fontSize:11,fontFamily:'JetBrains Mono,monospace',border:'1px solid var(--border2)',maxHeight:500}}, JSON.stringify(data, null, 2).substring(0, 5000))
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
    if (page === 'design') return e('div', {className:'page'}, e('div', {className:'gcard gcard-' + (sig.impact === 'high' ? 'amber' : sig.impact === 'negative' ? 'red' : 'neon')}, e('a', {href:'http://localhost:7799/?page=design', target:'_blank', style:{color:'var(--neon)'}}, 'Open Design Tool \u2192')));
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