// ── Chart Page v2 ───────────────────────────────────────────────────
// Features: Timeframe, EMA, trade markers, BOT banner, RISK LEVEL LINES
// Risk level settings persist via localStorage across reloads

var RISK_STORAGE_PREFIX = 'tekton_risk_';
function riskGet(key, fallback) { try { var v = localStorage.getItem(RISK_STORAGE_PREFIX + key); return v !== null ? v : fallback; } catch(e) { return fallback; } }
function riskSet(key, val) { try { localStorage.setItem(RISK_STORAGE_PREFIX + key, String(val)); } catch(e) {} }

function ChartPage(props) {
  var cs = S(null); var chartData = cs[0]; var setChartData = cs[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var es2 = S(null); var error = es2[0]; var setError = es2[1];
  var tfs = S(riskGet('timeframe', '1h')); var timeframe = tfs[0]; var setTimeframe = tfs[1];
  var rls = S(riskGet('showRisk', 'true') === 'true'); var showRiskLevels = rls[0]; var setShowRiskLevels = rls[1];
  var ra = S(riskGet('account', 'apex_100k')); var riskAccount = ra[0]; var setRiskAccount = ra[1];
  var rc = S(parseInt(riskGet('contracts', '1'), 10) || 1); var riskContracts = rc[0]; var setRiskContracts = rc[1];
  var rl = S(parseInt(riskGet('leverage', '10'), 10) || 10); var riskLeverage = rl[0]; var setRiskLeverage = rl[1];
  var rt = S(parseInt(riskGet('tolerance', '50'), 10) || 50); var riskTolerance = rt[0]; var setRiskTolerance = rt[1];
  var rds = S(null); var riskData = rds[0]; var setRiskData = rds[1];
  var accs = S(null); var accountsList = accs[0]; var setAccountsList = accs[1];
  var livePrice = S(null); var currentLivePrice = livePrice[0]; var setLivePrice = livePrice[1];
  var dataSource = S(''); var chartSource = dataSource[0]; var setDataSource = dataSource[1];
  var eng = props.engine || 'gann';
  var containerRef = React.useRef(null);
  var chartRef = React.useRef(null);

  // Persist state changes to localStorage
  E(function(){ riskSet('showRisk', showRiskLevels); }, [showRiskLevels]);
  E(function(){ riskSet('account', riskAccount); }, [riskAccount]);
  E(function(){ riskSet('contracts', riskContracts); }, [riskContracts]);
  E(function(){ riskSet('leverage', riskLeverage); }, [riskLeverage]);
  E(function(){ riskSet('tolerance', riskTolerance); }, [riskTolerance]);
  E(function(){ riskSet('timeframe', timeframe); }, [timeframe]);

  // Fetch accounts list once
  E(function(){
    fetch(API + '/api/trading/accounts').then(function(r){return r.json();}).then(function(d){ setAccountsList(d.accounts || null); }).catch(function(){});
  }, []);

  var TIMEFRAMES = [
    {label:'1m', interval:'1m', period:'5d'},
    {label:'5m', interval:'5m', period:'1mo'},
    {label:'15m', interval:'15m', period:'1mo'},
    {label:'1H', interval:'1h', period:'3mo'},
    {label:'4H', interval:'60m', period:'6mo'},
    {label:'1D', interval:'1d', period:'1y'},
  ];

  var tf = TIMEFRAMES.find(function(t){return t.interval === timeframe;}) || TIMEFRAMES[3];

  function loadData(tk) {
    setLoading(true); setError(null);
    Promise.all([
      fetch(API + '/api/candles/' + (tk || 'BTCUSDT') + '?period=' + tf.period + '&interval=' + tf.interval).then(function(r){return r.json();}),
      fetch(API + '/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticker:tk||'BTCUSDT', engine:eng})}).then(function(r){return r.json();}),
      fetch(API + '/api/trading/accounts').then(function(r){return r.json();}).catch(function(){return {accounts:{}};})
    ]).then(function(results){
      var candles = results[0]; var analysis = results[1]; var accounts = results[2];
      var lastPrice = (candles.candles && candles.candles.length > 0) ? candles.candles[candles.candles.length-1].close : 0;
      setChartData({candles: candles.candles || [], analysis: analysis, accounts: (accounts.accounts || {}), lastPrice: lastPrice, source: candles.source || ''});
      setDataSource(candles.source || '');
      setLivePrice(lastPrice);
      setLoading(false);
    }).catch(function(err){ setError(err.message); setLoading(false); });
  }

  E(function(){
    if (!chartData || !chartData.lastPrice) return;
    fetch(API + '/api/trading/risk-levels', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ticker: props.ticker||'BTCUSDT', entry_price: chartData.lastPrice, contracts:riskContracts, account:riskAccount, leverage:riskLeverage, risk_tolerance:riskTolerance})
    }).then(function(r){return r.json();}).then(function(d){ setRiskData(d); }).catch(function(){});
  }, [chartData && chartData.lastPrice, riskAccount, riskContracts, riskLeverage, riskTolerance]);

  E(function(){ loadData(props.ticker || 'BTCUSDT'); }, [props.ticker, eng, timeframe]);

  // ── Live Price Poller ──
  var pollRef = React.useRef(null);
  var seriesRef = React.useRef(null);
  E(function() {
    var tk = props.ticker || 'BTCUSDT';
    // Poll every 15s for crypto (OKX/Bybit), 60s for stocks/futures (Yahoo)
    var isCrypto = tk.indexOf('USDT') >= 0 || tk.indexOf('-USD') >= 0;
    var interval = isCrypto ? 15000 : 60000;
    function poll() {
      fetch(API + '/api/market/' + tk).then(function(r){return r.json();}).then(function(d) {
        if (d.currentPrice) {
          setLivePrice(d.currentPrice);
          setDataSource(d.source || d.exchange || '');
          // Update chart: update last candle close if series exists
          if (seriesRef.current && chartData && chartData.candles && chartData.candles.length > 0) {
            var lastCandle = chartData.candles[chartData.candles.length - 1];
            seriesRef.current.update({
              time: lastCandle.time,
              open: lastCandle.open,
              high: Math.max(lastCandle.high, d.currentPrice),
              low: Math.min(lastCandle.low, d.currentPrice),
              close: d.currentPrice
            });
          }
          // Update risk levels with new price
          if (showRiskLevels) {
            fetch(API + '/api/trading/risk-levels', {
              method:'POST', headers:{'Content-Type':'application/json'},
              body:JSON.stringify({ticker: tk, entry_price: d.currentPrice, contracts:riskContracts, account:riskAccount, leverage:riskLeverage, risk_tolerance:riskTolerance})
            }).then(function(r2){return r2.json();}).then(function(d2){ setRiskData(d2); }).catch(function(){});
          }
        }
      }).catch(function(){});
    }
    pollRef.current = setInterval(poll, interval);
    return function() { if (pollRef.current) clearInterval(pollRef.current); };
  }, [props.ticker, eng, timeframe, showRiskLevels, riskAccount, riskContracts, riskLeverage, riskTolerance, chartData && chartData.candles && chartData.candles.length]);

  E(function(){
    if (!chartData || !chartData.candles || chartData.candles.length === 0 || !containerRef.current) return;
    var candles = chartData.candles;
    var analysis = chartData.analysis || {};
    var levels = analysis.keyLevels || [];
    var engineColor = ENGINE_COLORS[eng] || '#6366f1';
    var engineId = analysis.engine || eng;

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    // Safe approach: remove inner container and create fresh one
    var innerWrap = containerRef.current.querySelector('.chart-inner');
    if (innerWrap) { innerWrap.remove(); }
    var innerDiv = document.createElement('div');
    innerDiv.className = 'chart-inner';
    innerDiv.style.cssText = 'width:100%;height:100%;';
    containerRef.current.appendChild(innerDiv);

    function drawChart() {
      var container = containerRef.current.querySelector('.chart-inner');
      var calcHeight = Math.max(300, Math.min(window.innerHeight - 180, 550));

      var chart = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: calcHeight,
        layout: {background:{type:'solid',color:'#0a0e1a'}, textColor:'#64748b', fontSize:11, fontFamily:'JetBrains Mono, monospace'},
        grid: {vertLines:{color:'rgba(255,255,255,0.06)30'}, horzLines:{color:'rgba(255,255,255,0.06)30'}},
        crosshair: {mode:0},
        rightPriceScale: {borderColor:'rgba(255,255,255,0.06)', scaleMargins:{top:0.1, bottom:0.15}},
        timeScale: {borderColor:'rgba(255,255,255,0.06)', timeVisible:true, secondsVisible:false},
        watermark: {visible:true, text: engineId.toUpperCase() + ' Analysis', fontSize:36, color:'rgba(0,212,255,0.04)', horzAlign:'center', vertAlign:'center'},
        handleScroll: {mouseWheel:true, pressedMouseMove:true},
        handleScale: {mouseWheel:true, pinch:true, axisPressedMouseMove:{mouseWheel:true, leftButton:true, rightButton:true}}
      });
      chartRef.current = chart;

      var series = chart.addCandlestickSeries({upColor:'#10b981',downColor:'#f43f5e',borderUpColor:'#10b98166',borderDownColor:'#f43f5e66',wickUpColor:'#10b98166',wickDownColor:'#f43f5e66'});
      seriesRef.current = series;
      series.setData(candles.map(function(c){return {time:c.time, open:c.open, high:c.high, low:c.low, close:c.close};}));

      var volume = chart.addHistogramSeries({priceFormat:{type:'volume'}, priceScaleId:'volume', scaleMargins:{top:0.85, bottom:0}});
      volume.setData(candles.map(function(c){return {time:c.time, value:c.volume || Math.abs(c.close - c.open)*100+500, color: c.close>=c.open ? '#10b98120':'#f43f5e20'};}));

      function calcEMA(data, period) {
        var result = []; var k = 2 / (period + 1);
        for (var i = 0; i < data.length; i++) {
          if (i === 0) result.push({time:data[i].time, value:data[i].close});
          else result.push({time:data[i].time, value: data[i].close * k + result[i-1].value * (1-k)});
        }
        return result;
      }

      var ema9 = calcEMA(candles, 9); var ema20 = calcEMA(candles, 20); var ema50 = calcEMA(candles, 50);
      chart.addLineSeries({color:'#ffeb3b',lineWidth:1,priceLineVisible:false,lastValueVisible:true,title:'EMA9'}).setData(ema9);
      chart.addLineSeries({color:'#2196f3',lineWidth:1,priceLineVisible:false,lastValueVisible:true,title:'EMA20'}).setData(ema20);
      chart.addLineSeries({color:'#ff9800',lineWidth:1,priceLineVisible:false,lastValueVisible:true,title:'EMA50'}).setData(ema50);

      levels.forEach(function(lev, i) {
        var price = typeof lev.price === 'number' ? lev.price : parseFloat(lev.price);
        if (isNaN(price) || price <= 0) return;
        var color = lev.type === 'support' ? '#10b981' : lev.type === 'resistance' ? '#f43f5e' : lev.type === 'decision' ? '#6366f1' : '#64748b';
        series.createPriceLine({price:price, color:color, lineWidth:lev.type==='support'||lev.type==='resistance' ? 2 : 1, lineStyle:lev.type==='support'||lev.type==='resistance' ? 0 : 2, axisLabelVisible:true, title:lev.name||('L'+i)});
      });

      if (analysis.signals && (analysis.signals.vwap || analysis.signals.vwap_approx)) {
        var vw = analysis.signals.vwap || analysis.signals.vwap_approx;
        if (typeof vw === 'number' && vw > 0) series.createPriceLine({price:vw, color:'#22d3ee', lineWidth:2, lineStyle:0, axisLabelVisible:true, title:'VWAP'});
      }

      // ── RISK LEVEL LINES ──
      if (showRiskLevels && riskData) {
        var pf = riskData.prop_firm_levels || {};
        var xl = riskData.exchange_liquidation || {};
        if (xl.long_liq_price && xl.long_liq_price > 0) series.createPriceLine({price:xl.long_liq_price, color:'#f43f5e88', lineWidth:1, lineStyle:2, axisLabelVisible:true, title:'Liq(Long)'});
        if (xl.short_liq_price && xl.short_liq_price > 0) series.createPriceLine({price:xl.short_liq_price, color:'#f43f5e88', lineWidth:1, lineStyle:2, axisLabelVisible:true, title:'Liq(Short)'});
        if (pf.long_breach_price && pf.long_breach_price > 0) series.createPriceLine({price:pf.long_breach_price, color:'#f43f5e', lineWidth:2, lineStyle:0, axisLabelVisible:true, title:'Breach(L)'});
        if (pf.long_warning_price && pf.long_warning_price > 0) series.createPriceLine({price:pf.long_warning_price, color:'#f59e0b', lineWidth:1, lineStyle:0, axisLabelVisible:true, title:'Warn(L)'});
        if (pf.short_breach_price && pf.short_breach_price > 0) series.createPriceLine({price:pf.short_breach_price, color:'#10b981', lineWidth:2, lineStyle:0, axisLabelVisible:true, title:'Breach(S)'});
        if (pf.short_warning_price && pf.short_warning_price > 0) series.createPriceLine({price:pf.short_warning_price, color:'#22d3ee', lineWidth:1, lineStyle:0, axisLabelVisible:true, title:'Warn(S)'});
      }

      var markers = [];
      if (analysis.signals && analysis.signals.signal_type) {
        var lastTime = candles[candles.length - 1].time;
        var sigType = analysis.signals.signal_type;
        if (sigType.includes('LONG') || sigType.includes('BULL') || sigType.includes('BUY')) markers.push({time: lastTime, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: sigType.substring(0, 12)});
        else if (sigType.includes('SHORT') || sigType.includes('BEAR') || sigType.includes('SELL')) markers.push({time: lastTime, position: 'aboveBar', color: '#f43f5e', shape: 'arrowDown', text: sigType.substring(0, 12)});
      }
      if (markers.length > 0) series.setMarkers(markers);
      chart.timeScale().fitContent();
    }

    if (typeof LightweightCharts === 'undefined') {
      var sc = document.createElement('script'); sc.src = '/vendor/lightweight-charts.js'; sc.onload = function() { drawChart(); }; document.head.appendChild(sc);
    } else { drawChart(); }

    function handleResize() { if (chartRef.current && containerRef.current) var cw = containerRef.current.querySelector('.chart-inner'); if (cw) chartRef.current.applyOptions({width: cw.clientWidth}); }
    window.addEventListener('resize', handleResize);
    return function() { window.removeEventListener('resize', handleResize); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
  }, [chartData, showRiskLevels, riskData]);

  var hasActiveTrade = false; var activeAccountName = '';
  if (chartData && chartData.accounts) Object.keys(chartData.accounts).forEach(function(aid) { var a = chartData.accounts[aid]; if (a.open_positions > 0) { hasActiveTrade = true; activeAccountName = a.name; } });

  var engineColor = ENGINE_COLORS[eng] || '#6366f1';
  var name = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades',dtr:'Day Trading Radio',reece:'Ultimate Scalper'}[eng] || eng;

  function exportPine() {
    fetch(API + '/api/pine/' + eng + '?ticker=' + (props.ticker||'BTCUSDT')).then(function(r){return r.json();}).then(function(d){ if (d.pine) navigator.clipboard.writeText(d.pine).then(function(){ alert('Pine Script copied!'); }); });
  }

  var sigType = (chartData && chartData.analysis && chartData.analysis.signals && chartData.analysis.signals.signal_type) || '';
  var sigScore = (chartData && chartData.analysis && chartData.analysis.score) || 0;

  return e('div', {className:'page', style:{overflowY:'auto', paddingBottom:'40px'}},
    hasActiveTrade ? e('div', {style:{background:'linear-gradient(90deg, #ff0000, #cc0000, #ff0000)', color:'#fff', padding:'6px 16px', fontWeight:'900', fontSize:'13px', fontFamily:'JetBrains Mono,monospace', textAlign:'center', letterSpacing:'2px', boxShadow:'0 0 15px rgba(255,0,0,0.6)', marginBottom:'4px', borderRadius:'4px', animation:'pulse 1.5s ease-in-out infinite'}}, '\uD83D\uDD34 BOT TRADING ACTIVE \u2014 ' + activeAccountName + ' \uD83D\uDD34') : null,

    e('div', {className:'sec-head', style:{marginBottom:8, display:'flex', alignItems:'center', flexWrap:'wrap', gap:'8px'}},
      e('div', {className:'sec-dot', style:{background:engineColor, boxShadow:'0 0 6px '+engineColor}}),
      e('span', {style:{color:engineColor, fontWeight:700, fontSize:13, fontFamily:'JetBrains Mono,monospace'}}, name + ' CHART'),
      e('span', {style:{color:'var(--text2)', fontSize:10}}, props.ticker || 'BTCUSDT'),
      currentLivePrice ? e('span', {style:{color:currentLivePrice >= (chartData && chartData.lastPrice || 0) ? '#10b981' : '#f43f5e', fontWeight:'700', fontSize:13, fontFamily:'JetBrains Mono,monospace', marginLeft:'4px'}}, (currentLivePrice < 1 ? currentLivePrice.toPrecision(4) : currentLivePrice.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits: currentLivePrice < 100 ? 4 : 2}))) : null,
      chartSource ? e('span', {style:{fontSize:8, color:'var(--text2)', background:'var(--surface2)', padding:'2px 4px', borderRadius:'3px', marginLeft:'2px'}}, chartSource.toUpperCase()) : null,
      e('div', {style:{display:'flex', gap:'2px', marginLeft:'8px', background:'var(--surface)', borderRadius:'4px', padding:'2px'}},
        TIMEFRAMES.map(function(t) { return e('button', {key:t.interval, onClick:function(){setTimeframe(t.interval);}, style:{padding:'3px 8px', border:'none', borderRadius:'3px', cursor:'pointer', fontSize:'10px', fontFamily:'JetBrains Mono,monospace', background:timeframe===t.interval ? engineColor : 'transparent', color:timeframe===t.interval ? '#000' : 'var(--text2)', fontWeight:timeframe===t.interval ? '700' : '400'}}, t.label); })
      ),
      e('button', {onClick:function(){setShowRiskLevels(!showRiskLevels);}, style:{padding:'4px 10px', background:showRiskLevels ? '#f43f5e30' : 'var(--surface2)', border:'1px solid '+(showRiskLevels ? '#f43f5e80' : 'var(--border)'), borderRadius:4, color:showRiskLevels ? '#f43f5e' : 'var(--text2)', fontSize:10, fontFamily:'JetBrains Mono,monospace', cursor:'pointer', fontWeight:showRiskLevels ? '700' : '400'}}, showRiskLevels ? '\u26A0 RISK ON' : 'RISK OFF'),
      showRiskLevels ? e('span', {style:{display:'inline-flex', alignItems:'center', gap:'4px', marginLeft:'4px'}},
        e('select', {value:riskAccount, onChange:function(ev){setRiskAccount(ev.target.value);}, style:{padding:'3px 6px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:3, color:'var(--text)', fontSize:10, fontFamily:'JetBrains Mono,monospace', cursor:'pointer'}},
          accountsList ? Object.keys(accountsList).map(function(aid){ return e('option', {key:aid, value:aid}, (accountsList[aid].name||aid).substring(0,16)); }) : e('option', {value:riskAccount}, riskAccount)
        ),
        e('input', {type:'number', min:1, max:100, value:riskContracts, onChange:function(ev){setRiskContracts(Math.max(1, parseInt(ev.target.value,10)||1));}, style:{width:'42px', padding:'3px 4px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:3, color:'var(--text)', fontSize:10, fontFamily:'JetBrains Mono,monospace', textAlign:'center'}, title:'Contracts'}),
        e('span', {style:{color:'var(--text2)', fontSize:9}}, 'x'),
        e('input', {type:'number', min:1, max:200, value:riskLeverage, onChange:function(ev){setRiskLeverage(Math.max(1, parseInt(ev.target.value,10)||1));}, style:{width:'42px', padding:'3px 4px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:3, color:'var(--text)', fontSize:10, fontFamily:'JetBrains Mono,monospace', textAlign:'center'}, title:'Leverage'}),
        e('span', {style:{color:'var(--text2)', fontSize:9}}, 'ToI'),
        e('input', {type:'number', min:10, max:100, step:10, value:riskTolerance, onChange:function(ev){setRiskTolerance(Math.max(10, Math.min(100, parseInt(ev.target.value,10)||50)));}, style:{width:'38px', padding:'3px 4px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:3, color:'var(--text)', fontSize:10, fontFamily:'JetBrains Mono,monospace', textAlign:'center'}, title:'Risk Tolerance %'})
      ) : null,
      e('button', {onClick:exportPine, style:{marginLeft:'auto', padding:'4px 10px', background:engineColor+'20', border:'1px solid '+engineColor+'60', borderRadius:4, color:engineColor, fontSize:10, fontFamily:'JetBrains Mono,monospace', cursor:'pointer'}}, 'COPY PINE'),
      e('button', {onClick:function(){loadData(props.ticker||'BTCUSDT');}, style:{padding:'4px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:4, color:'var(--text)', fontSize:10, fontFamily:'JetBrains Mono,monospace', cursor:'pointer'}}, 'REFRESH')
    ),

    e('div', {ref:containerRef, style:{width:'100%', minHeight:'500px', background:'var(--bg2)', borderRadius:8, border:'1px solid var(--border)', overflow:'hidden', marginBottom:'8px'}}),

    e('div', {style:{display:'flex', gap:'12px', padding:'4px 12px', fontSize:'10px', fontFamily:'JetBrains Mono,monospace', color:'var(--text2)', flexWrap:'wrap'}},
      e('span', {style:{color:'#ffeb3b'}}, '\u2500 EMA9'),
      e('span', {style:{color:'#2196f3'}}, '\u2500 EMA20'),
      e('span', {style:{color:'#ff9800'}}, '\u2500 EMA50'),
      e('span', {style:{color:'#22d3ee'}}, '\u2500 VWAP'),
      showRiskLevels ? e('span', null, e('span', {style:{color:'#f43f5e88'}}, ' \u2504 Liq'), ' ', e('span', {style:{color:'#f43f5e'}}, '\u2500 Breach'), ' ', e('span', {style:{color:'#f59e0b'}}, '\u2500 Warn')) : null
    ),

    showRiskLevels && riskData ? e('div', {style:{background:'var(--surface)', borderRadius:'6px', padding:'8px 12px', marginBottom:'8px', fontSize:'10px', fontFamily:'JetBrains Mono,monospace', borderLeft:'3px solid #f43f5e'}},
      e('div', {style:{display:'flex', gap:'16px', flexWrap:'wrap'}},
        e('span', {style:{color:'var(--text2)'}}, 'RISK: ' + (riskData.prop_firm || 'None')),
        e('span', {style:{color:'var(--text2)'}}, riskContracts + 'x ' + riskLeverage + ':1 ToI ' + riskTolerance + '%'),
        riskData.exchange_liquidation ? e('span', {style:{color:'#f43f5e'}}, 'Liq(L): $' + (riskData.exchange_liquidation.long_liq_price||0).toLocaleString()) : null,
        riskData.exchange_liquidation ? e('span', {style:{color:'#f43f5e'}}, 'Liq(S): $' + (riskData.exchange_liquidation.short_liq_price||0).toLocaleString()) : null,
        riskData.prop_firm_levels ? e('span', {style:{color:'#f43f5e'}}, 'Breach(L): $' + (riskData.prop_firm_levels.long_breach_price||0).toLocaleString()) : null,
        riskData.prop_firm_levels ? e('span', {style:{color:'#10b981'}}, 'Breach(S): $' + (riskData.prop_firm_levels.short_breach_price||0).toLocaleString()) : null,
        riskData.prop_firm_levels ? e('span', {style:{color:'#f59e0b'}}, 'Warn(L): $' + (riskData.prop_firm_levels.long_warning_price||0).toLocaleString()) : null,
        riskData.prop_firm_levels ? e('span', {style:{color:'#22d3ee'}}, 'Warn(S): $' + (riskData.prop_firm_levels.short_warning_price||0).toLocaleString()) : null
      )
    ) : null,

    chartData && chartData.analysis ? e(EngineSignals, {data:chartData.analysis, engine:eng}) : null,

    e('div', {style:{background:'var(--surface)', borderRadius:'6px', padding:'8px 12px', marginTop:'8px', fontSize:'11px', fontFamily:'JetBrains Mono,monospace'}},
      e('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px'}},
        e('span', {style:{color:'var(--text2)'}}, 'BOT STATUS'),
        hasActiveTrade ? e('span', {style:{color:'#ff0000', fontWeight:'700'}}, '\u25CF LIVE TRADING \u2014 ' + activeAccountName) : e('span', {style:{color:'var(--text2)'}}, '\u25CB Paper Mode'),
        e('span', {style:{color: sigType.includes('LONG') ? '#10b981' : sigType.includes('SHORT') ? '#f43f5e' : 'var(--text2)'}}, 'Signal: ' + (sigType || 'WAIT').replace(/_/g, ' ')),
        e('span', {style:{color: sigScore >= 70 ? '#10b981' : sigScore >= 50 ? '#ffeb3b' : 'var(--text2)'}}, 'Score: ' + sigScore)
      )
    )
  );
}