var e = React.createElement;
var S = React.useState;
var E = React.useEffect;
var R = React.useRef;

var API = window.location.origin;
var ENGINE_COLORS = {gann:'#6366f1',casper:'#a855f7',mj:'#f59e0b',ict:'#10b981',rumors:'#f97316',geo:'#3b82f6',franky:'#f59e0b',cryptoface:'#a855f7',buffett:'#3b82f6',quant:'#f43f5e',tori:'#14b8a6'};
var ENGINE_NAMES = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT / Smart Money',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades',dtr:'DayTrader',reece:'Ultimate Scalper'};

function api(path) { return fetch(API + path).then(function(r){return r.json();}).catch(function(){return null;}); }
function apiPost(path, body) { return fetch(API + path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();}).catch(function(){return null;}); }
function fmtPrice(p) { if(typeof p!=='number')return'-'; if(p<1)return p.toFixed(8); if(p<100)return p.toFixed(4); return p.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

function LoadingDots() {
  return e('div', {className:'loading-wrap'},
    e('div', {style:{display:'flex',gap:8}}, [0,1,2].map(function(i){
      return e('div', {key:i, style:{width:10,height:10,borderRadius:'50%',background:'var(--neon)',animation:'breathe 1.4s ease-in-out infinite',animationDelay:(i*0.2)+'s'}});
    })),
    e('div', {className:'loading-text'}, 'ANALYZING')
  );
}

/* === SVG Circular Gauge === */
function ScoreGauge(props) {
  var score = props.score || 0;
  var bias = props.bias || 'NEUTRAL';
  var engineColor = props.color || '#6366f1';
  var size = props.size || 160;
  var strokeWidth = props.strokeWidth || 10;
  var r = (size - strokeWidth * 2) / 2;
  var circumference = 2 * Math.PI * r;
  var offset = circumference * (1 - score / 100);
  var biasColor = bias.indexOf('BULL') >= 0 ? '#22c55e' : bias.indexOf('BEAR') >= 0 ? '#ef4444' : '#f59e0b';
  var biasShort = bias.replace(/_/g, ' ');
  if (biasShort.length > 20) biasShort = biasShort.substring(0, 20);
  var center = size / 2;
  return e('div', {className:'gauge-wrap', style:{width:size,height:size}},
    e('svg', {width:size, height:size, viewBox:'0 0 ' + size + ' ' + size},
      e('defs', null,
        e('linearGradient', {id:'gaugeGrad', x1:'0%', y1:'0%', x2:'100%', y2:'100%'},
          e('stop', {offset:'0%', stopColor:score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'}),
          e('stop', {offset:'100%', stopColor:engineColor})
        )
      ),
      /* Background track */
      e('circle', {cx:center, cy:center, r:r, fill:'none', stroke:'rgba(255,255,255,0.04)', strokeWidth:strokeWidth}),
      /* Score arc */
      e('circle', {cx:center, cy:center, r:r, fill:'none', stroke:'url(#gaugeGrad)', strokeWidth:strokeWidth,
        strokeLinecap:'round', strokeDasharray:circumference, strokeDashoffset:offset,
        transform:'rotate(-90 ' + center + ' ' + center + ')',
        style:{transition:'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)'}}),
      /* Tick marks */
      [0,25,50,75].map(function(tick) {
        var angle = (tick / 100 * 360 - 90) * Math.PI / 180;
        var x1 = center + (r + strokeWidth/2 + 4) * Math.cos(angle);
        var y1 = center + (r + strokeWidth/2 + 4) * Math.sin(angle);
        var x2 = center + (r + strokeWidth/2 + 8) * Math.cos(angle);
        var y2 = center + (r + strokeWidth/2 + 8) * Math.sin(angle);
        return e('line', {key:tick, x1:x1, y1:y1, x2:x2, y2:y2, stroke:'rgba(255,255,255,0.1)', strokeWidth:1.5, strokeLinecap:'round'});
      })
    ),
    e('div', {className:'gauge-score'},
      e('div', {className:'gauge-num'}, String(score)),
      e('div', {className:'gauge-bias', style:{color:biasColor}}, biasShort),
      e('div', {className:'gauge-label'}, 'SCORE')
    )
  );
}

/* === Hero Block (redesigned with gauge) === */
function HeroBlock(props) {
  var d = props.data;
  if (!d) return e('div', {className:'hero'}, e(LoadingDots));
  var eng = props.engine || d.engine || 'gann';
  var score = d.gannScore != null ? d.gannScore : (d.score != null ? d.score : 0);
  var bias = d.gannBias || d.bias || 'NEUTRAL';
  var price = d.currentPrice || d.price || 0;
  var ticker = d.symbol || d.ticker || 'BTCUSDT';
  var engineColor = ENGINE_COLORS[eng] || '#6366f1';
  var engineName = ENGINE_NAMES[eng] || eng.toUpperCase();
  var biasColor = bias.indexOf('BULL') >= 0 ? 'var(--green)' : bias.indexOf('BEAR') >= 0 ? 'var(--red)' : 'var(--amber)';
  var market = d.market || {};

  return e('div', {className:'hero'},
    /* Gauge */
    e(ScoreGauge, {score:score, bias:bias, color:engineColor, size:160, strokeWidth:10}),
    /* Info */
    e('div', {className:'hero-info'},
      e('div', {className:'hero-engine', style:{borderColor:engineColor+'66',background:engineColor+'15',color:engineColor}}, engineName + ' ENGINE'),
      e('div', {className:'hero-price'}, fmtPrice(price)),
      e('div', {className:'hero-meta'}, ticker + '\u00A0\u00A0|\u00A0\u00A0' + (market.exchange || 'OKX') + '\u00A0\u00A0|\u00A0\u00A0' + (d.timeframe || '4H')),
      /* Market stats */
      market.changePercent != null ? e('div', {className:'hero-market'},
        market.changePercent >= 0 ?
          e('div', {className:'hero-stat'}, e('div', {className:'hero-stat-val', style:{color:'var(--green)'}}, '+' + (market.changePercent*100).toFixed(2) + '%'), e('div', {className:'hero-stat-lbl'}, '24H Change')) :
          e('div', {className:'hero-stat'}, e('div', {className:'hero-stat-val', style:{color:'var(--red)'}}, (market.changePercent*100).toFixed(2) + '%'), e('div', {className:'hero-stat-lbl'}, '24H Change')),
        market.volatility != null ? e('div', {className:'hero-stat'}, e('div', {className:'hero-stat-val'}, (market.volatility*100).toFixed(1) + '%'), e('div', {className:'hero-stat-lbl'}, 'Volatility')) : null,
        market.dataPoints != null ? e('div', {className:'hero-stat'}, e('div', {className:'hero-stat-val'}, String(market.dataPoints)), e('div', {className:'hero-stat-lbl'}, 'Data Pts')) : null
      ) : null
    )
  );
}

/* === Signal Tags with staggered animation === */
function SignalTags(props) {
  var signals = props.signals || [];
  if (signals.length === 0) return null;
  return e('div', {style:{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}},
    signals.slice(0, 16).map(function(sig, i) {
      var s = typeof sig === 'string' ? sig : sig.name || sig.key || 'Signal';
      if (s.length > 28) s = s.substring(0, 28);
      s = s.replace(/_/g, ' ');
      var isBull = s.indexOf('BULL') >= 0 || s.indexOf('BUY') >= 0 || s.indexOf('SUPPORT') >= 0;
      var isBear = s.indexOf('BEAR') >= 0 || s.indexOf('SELL') >= 0 || s.indexOf('RESIST') >= 0;
      var cls = isBull ? 'tag tag-green' : isBear ? 'tag tag-red' : 'tag tag-neon';
      return e('span', {key:i, className:cls, style:{animationDelay:(i*0.04)+'s'}}, s);
    })
  );
}

/* === Visual Key Levels (bars instead of table) === */
function KeyLevelBars(props) {
  var levels = props.levels || [];
  var currentPrice = props.currentPrice || 0;
  if (levels.length === 0) return null;
  var maxDist = 0;
  levels.forEach(function(l) { var d = Math.abs((l.price || 0) - currentPrice); if (d > maxDist) maxDist = d; });
  if (maxDist === 0) maxDist = 1;

  return e('div', {className:'gcard', style:{marginBottom:16}},
    e('div', {className:'sec-title'}, 'Key Levels'),
    e('div', {style:{position:'relative'}},
      /* Current price line */
      e('div', {style:{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'var(--neon)',opacity:.3,zIndex:1}}),
      e('div', {style:{position:'absolute',left:'50%',top:-8,transform:'translateX(-50%)',fontSize:8,fontFamily:'var(--mono)',color:'var(--neon)',fontWeight:700}}, 'NOW'),
      levels.slice(0, 8).map(function(lev, i) {
        var price = lev.price || lev.value || 0;
        var tp = (lev.type || '').toLowerCase();
        var isSup = tp === 'support' || tp === 'buy' || tp === 'ssl' || tp === 'demand' || (lev.name || '').toLowerCase().indexOf('support') >= 0 || (lev.name || '').toLowerCase().indexOf('buy') >= 0;
        var isRes = tp === 'resistance' || tp === 'sell' || tp === 'bsl' || tp === 'supply' || (lev.name || '').toLowerCase().indexOf('resist') >= 0 || (lev.name || '').toLowerCase().indexOf('sell') >= 0;
        var dist = (price - currentPrice) / maxDist;
        var barLeft = 50 + (dist * 45);
        barLeft = Math.max(2, Math.min(96, barLeft));
        var color = isSup ? 'var(--green)' : isRes ? 'var(--red)' : 'var(--neon)';
        var bgColor = isSup ? 'var(--green-dim)' : isRes ? 'var(--red-dim)' : 'var(--neon-dim)';
        return e('div', {key:i, style:{display:'flex',alignItems:'center',gap:10,marginBottom:6,animation:'tagSlide .3s ease both',animationDelay:(i*0.06)+'s'}},
          e('div', {style:{width:100,flexShrink:0,textAlign:'right'}},
            e('span', {style:{fontFamily:'var(--mono)',fontSize:11,fontWeight:600,color:color}}, fmtPrice(price))
          ),
          e('div', {style:{flex:1,height:22,position:relative,borderRadius:3,background:'rgba(255,255,255,0.02)'}},
            e('div', {style:{position:'absolute',left:barLeft+'%',top:0,bottom:0,width:2,background:color,borderRadius:1,opacity:.8,boxShadow:'0 0 6px '+color}})
          ),
          e('div', {style:{width:120,flexShrink:0}},
            e('span', {className:isSup?'tag tag-green':isRes?'tag tag-red':'tag tag-neon', style:{fontSize:9}}, (lev.name || lev.type || 'Level').substring(0,20))
          )
        );
      })
    )
  );
}

/* === Confluence Zone Bars === */
function ConfluenceBars(props) {
  var zones = props.zones || [];
  if (zones.length === 0) return null;
  var maxCount = 1;
  zones.forEach(function(z) { if ((z.count || 0) > maxCount) maxCount = z.count; });

  return e('div', {className:'gcard', style:{marginBottom:16}},
    e('div', {className:'sec-title'}, 'Confluence Zones (' + zones.length + ')'),
    zones.slice(0, 8).map(function(z, i) {
      var isSup = (z.side || '').toUpperCase().indexOf('SUP') >= 0;
      var color = isSup ? '#22c55e' : '#ef4444';
      var bgColor = isSup ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
      var width = Math.max(8, ((z.count || 1) / maxCount) * 100);
      var strength = (z.strength || '').toUpperCase();
      var isCrit = strength.indexOf('CRIT') >= 0;
      return e('div', {key:i, style:{marginBottom:8,animation:'tagSlide .3s ease both',animationDelay:(i*0.05)+'s'}},
        e('div', {style:{display:'flex',alignItems:'center',gap:10}},
          e('div', {style:{width:80,flexShrink:0,textAlign:'right'}},
            e('span', {style:{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,color:color}}, fmtPrice(z.price || 0))
          ),
          e('div', {style:{flex:1}},
            e('div', {className:'conf-bar', style:{width:width+'%',background:bgColor,borderLeft:'3px solid '+color,animationDelay:(i*0.08)+'s'}},
              e('span', {style:{fontSize:9,fontWeight:700,letterSpacing:'.5px'}}, z.count + ' methods' + (isCrit ? ' CRITICAL' : ''))
            )
          ),
          e('div', {style:{width:60,flexShrink:0}},
            e('span', {className:isSup?'tag tag-green':'tag tag-red', style:{fontSize:8}}, z.side || '--')
          )
        )
      );
    })
  );
}

/* === Engine Signals (non-Gann) === */
function EngineSignals(props) {
  var d = props.data;
  if (!d) return null;
  var signals = d.signals || [];
  var keyLevels = d.keyLevels || [];
  var methods = d.methods || [];
  var summary = d.summary || '';
  var sigList = [];
  if (typeof signals === 'object' && !Array.isArray(signals)) {
    Object.keys(signals).forEach(function(k) {
      var v = signals[k];
      if (typeof v === 'string') sigList.push(v);
      else if (typeof v === 'number') sigList.push(k + ': ' + v);
    });
  } else if (Array.isArray(signals)) {
    signals.forEach(function(s) {
      if (typeof s === 'string') sigList.push(s);
      else if (s && s.name) sigList.push(s.name);
    });
  }

  return e('div', null,
    sigList.length > 0 ? e('div', {className:'gcard', style:{marginBottom:16}},
      e('div', {className:'sec-title'}, 'Signals (' + sigList.length + ')'),
      e(SignalTags, {signals:sigList})
    ) : null,
    keyLevels.length > 0 ? e(KeyLevelBars, {levels:keyLevels, currentPrice:d.currentPrice || d.price || 0}) : null,
    methods.length > 0 ? e('div', {className:'gcard', style:{marginBottom:16}},
      e('div', {className:'sec-title'}, 'Methods'),
      e('div', {style:{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}},
        methods.map(function(m, i) { return e('span', {key:i, className:'tag tag-purple', style:{fontSize:9,animationDelay:(i*0.04)+'s'}}, m); })
      )
    ) : null,
    summary ? e('div', {className:'gcard', style:{marginBottom:16}},
      e('div', {className:'sec-title'}, 'Summary'),
      e('div', {style:{color:'var(--text)',fontSize:12,lineHeight:1.7,fontFamily:'var(--sans)'}}, summary)
    ) : null
  );
}

/* === Gann Time Section === */
function TimeSection(props) {
  var d = props.data;
  if (!d) return null;
  var items = [];
  if (d.gannAngles && d.gannAngles.length > 0) items.push({title:'Gann Angles (' + d.gannAngles.length + ')', data:d.gannAngles.slice(0,8)});
  if (d.wheelOf24 && d.wheelOf24.levels && d.wheelOf24.levels.length > 0) items.push({title:'Wheel of 24 (' + d.wheelOf24.levels.length + ')', data:d.wheelOf24.levels.slice(0,8).map(function(l){return typeof l==='number'?{price:l}:{price:l.price||l.value||0}})});
  if (d.planetaryCycles && d.planetaryCycles.atCardinal && d.planetaryCycles.atCardinal.length > 0) items.push({title:'Planetary Cycles', data:d.planetaryCycles.atCardinal});
  if (d.timePriceSquaring && d.timePriceSquaring.upcomingWithin7Days && d.timePriceSquaring.upcomingWithin7Days.length > 0) items.push({title:'Time-Price Squaring', data:d.timePriceSquaring.upcomingWithin7Days});
  if (items.length === 0) return null;

  return e('div', {className:'gcard', style:{marginBottom:16}},
    e('div', {className:'sec-title'}, 'Gann Time Analysis'),
    items.map(function(item, idx) {
      return e('div', {key:idx, style:{marginBottom:idx<items.length-1?16:0}},
        e('div', {style:{fontSize:11,fontWeight:600,color:'var(--neon)',marginBottom:8}}, item.title),
        e('div', {style:{display:'flex',flexWrap:'wrap',gap:5}},
          item.data.map(function(d2, i) {
            if (typeof d2 === 'string') return e('span', {key:i, className:'tag tag-blue', style:{fontSize:9}}, d2);
            var price = d2.price || d2.value || 0;
            var name = d2.name || d2.angle || d2.label || '';
            var daysTo = d2.daysToNextCardinal;
            var label = price ? (name ? name + ': ' + fmtPrice(price) : fmtPrice(price)) : name;
            if (daysTo && typeof d2.periodDays === 'number') label = name + ' (' + daysTo + 'd)';
            return e('span', {key:i, className:'tag tag-blue', style:{fontSize:9,animationDelay:(i*0.04)+'s'}}, label);
          })
        )
      );
    })
  );
}

/* === Gann Price Section === */
function PriceSection(props) {
  var d = props.data;
  if (!d) return null;
  return e('div', null,
    d.confluenceZones && d.confluenceZones.length > 0 ? e(ConfluenceBars, {zones:d.confluenceZones}) : null,
    d.rangeFinder ? e('div', {className:'gcard', style:{marginBottom:16}},
      e('div', {className:'sec-title'}, 'Range Finder'),
      e('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}},
        e('div', null, e('div', {style:{fontSize:8,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',fontWeight:700}}, 'Range High'), e('div', {style:{fontSize:14,fontWeight:700,fontFamily:'var(--mono)',color:'var(--green)'}}, fmtPrice(d.rangeFinder.high || 0))),
        e('div', null, e('div', {style:{fontSize:8,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',fontWeight:700}}, 'Range Low'), e('div', {style:{fontSize:14,fontWeight:700,fontFamily:'var(--mono)',color:'var(--red)'}}, fmtPrice(d.rangeFinder.low || 0))),
        e('div', null, e('div', {style:{fontSize:8,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',fontWeight:700}}, 'Position'), e('div', {style:{fontSize:14,fontWeight:700,fontFamily:'var(--mono)'}}, d.rangeFinder.currentPositionInRange || '--')),
        d.rangeFinder.keyRetracements ? d.rangeFinder.keyRetracements.slice(0,4).map(function(r, i) {
          return e('div', {key:i}, e('div', {style:{fontSize:8,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',fontWeight:700}}, r.label), e('div', {style:{fontSize:12,fontWeight:600,fontFamily:'var(--mono)'}}, fmtPrice(r.price || 0)));
        }) : null
      )
    ) : null
  );
}

/* === Predictions === */
function PredictionsSection(props) {
  var ps = S(null); var stats = ps[0]; var setStats = ps[1];
  E(function() {
    api('/predictions/stats?ticker=' + (props.ticker || 'BTCUSDT')).then(function(d) { if (d) setStats(d); }).catch(function(){});
  }, [props.ticker]);
  if (!stats) return null;
  var total = stats.totalPredictions || stats.total || 0;
  var correct = stats.correctPredictions || stats.correct || 0;
  var avg = stats.averageScore || stats.avgScore || 0;
  var acc = total > 0 ? Math.round((correct / total) * 100) : 0;
  return e('div', {className:'gcard', style:{marginBottom:16}},
    e('div', {className:'sec-title'}, 'Prediction Stats'),
    e('div', {className:'grid-stats', style:{marginTop:8}},
      e('div', {className:'stat-card'}, e('div', {className:'stat-val', style:{color:'var(--neon)'}}, String(total)), e('div', {className:'stat-lbl'}, 'Total')),
      e('div', {className:'stat-card'}, e('div', {className:'stat-val', style:{color:acc>=50?'var(--green)':'var(--red)'}}, acc + '%'), e('div', {className:'stat-lbl'}, 'Accuracy')),
      e('div', {className:'stat-card'}, e('div', {className:'stat-val'}, String(avg)), e('div', {className:'stat-lbl'}, 'Avg Score'))
    )
  );
}

/* === Backtest === */
function BacktestSection(props) {
  var bt = S(null); var results = bt[0]; var setResults = bt[1];
  E(function() {
    api('/backtest/results').then(function(d) { if (d && d.results) setResults(d.results); }).catch(function(){});
  }, []);
  if (!results || results.length === 0) return null;
  return e('div', {className:'gcard', style:{marginBottom:16}},
    e('div', {className:'sec-title'}, 'Backtest Results'),
    e('table', {className:'tbl'},
      e('thead', null, e('tr', null, e('th', null, 'Strategy'), e('th', null, 'P&L'), e('th', null, 'Win Rate'))),
      e('tbody', null, results.slice(0, 5).map(function(r, i) {
        var pnl = r.pnl || 0;
        var wr = r.winRate || r.win_rate || 0;
        return e('tr', {key:i},
          e('td', {style:{fontSize:11}}, r.strategy || r.name || '#' + (i+1)),
          e('td', {style:{fontSize:12,fontWeight:600,fontFamily:'var(--mono)',color:pnl>=0?'var(--green)':'var(--red)'}}, (pnl>=0?'+':'') + (typeof pnl==='number'?pnl.toFixed(2):String(pnl))),
          e('td', {style:{fontSize:12,fontFamily:'var(--mono)'}}, typeof wr==='number'?wr.toFixed(1)+'%':String(wr))
        );
      }))
    )
  );
}

/* === Ticker Dropdown === */
function TickerDropdown(props) {
  var os = S(false); var open = os[0]; var setOpen = os[1];
  var ticker = props.ticker || 'BTCUSDT';
  var onChange = props.onChange || function(){};
  var cats = [
    {name:'Crypto', items:['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','DOGE-USD','ADA-USD','AVAX-USD']},
    {name:'Stocks', items:['AAPL','TSLA','MSFT','NVDA','META','SPY']}
  ];
  return e('div', {style:{position:'relative',display:'inline-block'}, onClick:function(ev){ev.stopPropagation();}},
    e('button', {onClick:function(){setOpen(!open);}, style:{padding:'5px 14px',borderRadius:8,border:open?'1px solid var(--neon)':'1px solid var(--border2)',background:open?'var(--neon-dim)':'transparent',color:open?'var(--neon)':'var(--text2)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--mono)',transition:'all .15s',boxShadow:open?'0 0 12px rgba(99,102,241,0.2)':'none'}},
      ticker, ' \u25BC'
    ),
    open ? e('div', {style:{position:'absolute',top:'100%',left:0,marginTop:6,minWidth:180,maxHeight:320,overflow:'auto',background:'rgba(10,15,30,0.95)',backdropFilter:'blur(16px)',border:'1px solid var(--border)',borderRadius:12,padding:8,zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}},
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

/* === Engine Selector === */
function EngineSelector(props) {
  var engines = props.engines || [];
  var active = props.active || 'gann';
  var onChange = props.onChange || function(){};
  return e('div', {className:'engine-pills'},
    engines.map(function(eng) {
      var isActive = eng === active;
      return e('button', {key:eng, className:'pill'+(isActive?' active':''), onClick:function(){onChange(eng);}}, ENGINE_NAMES[eng] || eng);
    })
  );
}

/* === Analysis Page === */
function AnalysisPage(props) {
  var ds = S(null); var data = ds[0]; var setData = ds[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var es = S(null); var error = es[0]; var setError = es[1];
  var eng = props.engine || 'gann';
  var color = ENGINE_COLORS[eng] || '#6366f1';

  function analyze(t, engineId) {
    setLoading(true); setError(null);
    fetch(API + '/api/analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker:t,engine:engineId||eng})})
      .then(function(r){return r.json();})
      .then(function(d){setData(d);setLoading(false);if(d&&d.error)setError(d.error);})
      .catch(function(er){setError(er.message);setLoading(false);});
  }
  E(function(){analyze(props.ticker||'BTCUSDT',eng);},[props.ticker,eng]);

  if (loading && !data) return e('div', {className:'page', style:{display:'flex',alignItems:'center',justifyContent:'center'}}, e(LoadingDots));
  if (error) return e('div', {className:'page'},
    e('div', {className:'gcard', style:{borderColor:'var(--red)',marginBottom:16}},
      e('div', {style:{fontSize:16,fontWeight:700,color:'var(--red)',marginBottom:8}}, 'Analysis Error'),
      e('div', {style:{color:'var(--text2)',fontSize:12}}, String(error))
    )
  );
  if (!data) return e('div', {className:'page', style:{display:'flex',alignItems:'center',justifyContent:'center'}}, e(LoadingDots));

  var isGann = (data.engine || eng) === 'gann';
  function safe(nm, comp) { try { return comp(); } catch(err) { return e('div', {className:'gcard', style:{borderColor:'var(--red)',marginBottom:16}}, e('div', {style:{color:'var(--red)',fontWeight:600,fontSize:11}}, nm + ': ' + err.message)); } }

  return e('div', {className:'page'},
    safe('HeroBlock', function(){ return e(HeroBlock, {data:data, engine:eng}); }),
    isGann ? e('div', {className:'grid-2', style:{marginBottom:16}},
      safe('TimeSection', function(){ return e(TimeSection, {data:data}); }),
      safe('PriceSection', function(){ return e(PriceSection, {data:data}); })
    ) : safe('EngineSignals', function(){ return e(EngineSignals, {data:data, engine:eng}); }),
    e(PredictionsSection, {ticker:props.ticker}),
    e(BacktestSection)
  );
}

/* === Chat Page === */
function ChatPage(props) {
  var ms = S([]); var messages = ms[0]; var setMessages = ms[1];
  var is2 = S(''); var input = is2[0]; var setInput = is2[1];
  var ls2 = S(false); var loading = ls2[0]; var setLoading = ls2[1];
  function send() {
    if (!input.trim()) return;
    var msg = input; setInput('');
    setMessages(function(p){return p.concat([{role:'user',content:msg}]);});
    setLoading(true);
    fetch(API+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:msg}],ticker:props.ticker,engine:props.engine||'gann'})})
      .then(function(r){return r.json();})
      .then(function(d){setMessages(function(p){return p.concat([{role:'assistant',content:d.response||d.message||'No response'}]);});setLoading(false);})
      .catch(function(){setLoading(false);});
  }
  return e('div', {className:'page', style:{display:'flex',flexDirection:'column',height:'calc(100vh - 52px)'}},
    e('div', {style:{flex:1,overflowY:'auto',paddingBottom:8,display:'flex',flexDirection:'column',gap:10}},
      messages.length === 0 ? e('div', {style:{color:'var(--text3)',textAlign:'center',padding:60,fontSize:13}}, 'Send a message to start chatting') : null,
      messages.map(function(m,i){
        return e('div', {key:i, className:m.role==='user'?'chat-msg chat-msg-user':'chat-msg chat-msg-ai'}, String(m.content));
      })
    ),
    e('div', {style:{display:'flex',gap:8,paddingTop:8}},
      e('input', {value:input, onChange:function(ev){setInput(ev.target.value);}, onKeyDown:function(ev){if(ev.key==='Enter')send();}, placeholder:'Ask about the market...', style:{flex:1}}),
      e('button', {onClick:send, className:'btn btn-neon'}, 'Send')
    )
  );
}

/* === App === */
function App() {
  var ps = S('analysis'); var page = ps[0]; var setPage = ps[1];
  var ts = S('BTCUSDT'); var ticker = ts[0]; var setTicker = ts[1];
  var es = S(null); var engines = es[0]; var setEngines = es[1];
  var as2 = S('gann'); var activeEngine = as2[0]; var setActiveEngine = as2[1];
  E(function(){
    api('/api/engines').then(function(d){if(d&&d.engines){setEngines(d.engines);setActiveEngine(d.default||'gann');}});
  },[]);

  var navItems = [
    {id:'analysis',icon:'\u25A6',label:'Analysis'},
    {id:'chat',icon:'\u2751',label:'Chat'},
    {id:'design',icon:'\u25CE',label:'Design'}
  ];

  function renderPage() {
    if (page === 'chat') return e(ChatPage, {ticker:ticker, engine:activeEngine});
    if (page === 'design') return e('div', {className:'page'},
      e('div', {className:'gcard'}, e('a', {href:'http://localhost:7799/?page=design', target:'_blank', style:{color:'var(--neon)',fontWeight:600}}, 'Open Design Tool \u2192'))
    );
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
        navItems.map(function(pg){
          return e('div', {key:pg.id, className:'nav-item'+(page===pg.id?' active':''), onClick:function(){setPage(pg.id);}},
            e('span', {className:'nav-icon'}, pg.icon),
            e('span', {className:'nav-label'}, pg.label)
          );
        })
      )
    ),
    e('div', {className:'main'},
      e('div', {className:'topbar'},
        e('div', {className:'topbar-title'}, 'TEKTON'),
        engines ? e(EngineSelector, {engines:engines.map(function(e){return e.id||e;}), active:activeEngine, onChange:setActiveEngine}) : null,
        e(TickerDropdown, {ticker:ticker, onChange:setTicker})
      ),
      renderPage()
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));