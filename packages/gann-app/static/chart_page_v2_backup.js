// ── Chart Page v2 ───────────────────────────────────────────────────
// Features: Timeframe selector, EMA curves, trade markers, BOT ACTIVE banner,
// scroll wheel zoom, engine-specific overlays, always-visible trade history

function ChartPage(props) {
  var cs = S(null); var chartData = cs[0]; var setChartData = cs[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var es2 = S(null); var error = es2[0]; var setError = es2[1];
  var tfs = S('1h'); var timeframe = tfs[0]; var setTimeframe = tfs[1];
  var eng = props.engine || 'gann';
  var containerRef = React.useRef(null);
  var chartRef = React.useRef(null);

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
      fetch(API + '/api/candles/' + (tk || 'BTC-USD') + '?period=' + tf.period + '&interval=' + tf.interval).then(function(r){return r.json();}),
      fetch(API + '/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticker:tk||'BTC-USD', engine:eng})}).then(function(r){return r.json();}),
      fetch(API + '/api/trading/accounts').then(function(r){return r.json();}).catch(function(){return {accounts:{}};})
    ]).then(function(results){
      var candles = results[0]; var analysis = results[1]; var accounts = results[2];
      setChartData({candles: candles.candles || [], analysis: analysis, accounts: (accounts.accounts || {})});
      setLoading(false);
    }).catch(function(err){ setError(err.message); setLoading(false); });
  }

  E(function(){ loadData(props.ticker || 'BTC-USD'); }, [props.ticker, eng, timeframe]);

  E(function(){
    if (!chartData || !chartData.candles || chartData.candles.length === 0 || !containerRef.current) return;
    var candles = chartData.candles;
    var analysis = chartData.analysis || {};
    var levels = analysis.keyLevels || [];
    var accounts = chartData.accounts || {};
    var engineColor = ENGINE_COLORS[eng] || '#00d4ff';
    var engineId = analysis.engine || eng;

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    containerRef.current.innerHTML = '';

    function drawChart() {
      var container = containerRef.current;
      var calcHeight = Math.max(300, Math.min(window.innerHeight - 180, 550));

      var chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: calcHeight,
        layout: {background:{type:'solid',color:'#0a0e1a'}, textColor:'#4a6a88', fontSize:11, fontFamily:'JetBrains Mono, monospace'},
        grid: {vertLines:{color:'#0d204030'}, horzLines:{color:'#0d204030'}},
        crosshair: {mode:0},
        rightPriceScale: {borderColor:'#0d2040', scaleMargins:{top:0.1, bottom:0.15}},
        timeScale: {borderColor:'#0d2040', timeVisible:true, secondsVisible:false},
        watermark: {visible:true, text: engineId.toUpperCase() + ' Analysis', fontSize:36, color:'rgba(0,212,255,0.04)', horzAlign:'center', vertAlign:'center'},
        handleScroll: {mouseWheel:true, pressedMouseMove:true},
        handleScale: {mouseWheel:true, pinch:true, axisPressedMouseMove:{mouseWheel:true, leftButton:true, rightButton:true}}
      });
      chartRef.current = chart;

      // Candlestick series
      var series = chart.addCandlestickSeries({
        upColor:'#00ff88', downColor:'#ff3355', borderUpColor:'#00ff8866', borderDownColor:'#ff335566',
        wickUpColor:'#00ff8866', wickDownColor:'#ff335566'
      });
      series.setData(candles.map(function(c){return {time:c.time, open:c.open, high:c.high, low:c.low, close:c.close};}));

      // Volume histogram
      var volume = chart.addHistogramSeries({
        priceFormat:{type:'volume'}, priceScaleId:'volume',
        scaleMargins:{top:0.85, bottom:0}
      });
      volume.setData(candles.map(function(c){
        return {time:c.time, value:c.volume || Math.abs(c.close - c.open) * 100 + 500, color: c.close >= c.open ? '#00ff8820' : '#ff335520'};
      }));

      // EMA calculation (curved lines)
      function calcEMA(data, period) {
        var result = [];
        var k = 2 / (period + 1);
        for (var i = 0; i < data.length; i++) {
          if (i === 0) { result.push({time:data[i].time, value:data[i].close}); }
          else { result.push({time:data[i].time, value: data[i].close * k + result[i-1].value * (1-k)}); }
        }
        return result;
      }

      // Always show EMA 9, 20, 50 (curved lines)
      var ema9 = calcEMA(candles, 9);
      var ema20 = calcEMA(candles, 20);
      var ema50 = calcEMA(candles, 50);

      var ema9Line = chart.addLineSeries({color:'#ffeb3b', lineWidth:1, priceLineVisible:false, lastValueVisible:true, title:'EMA9'});
      ema9Line.setData(ema9);
      var ema20Line = chart.addLineSeries({color:'#2196f3', lineWidth:1, priceLineVisible:false, lastValueVisible:true, title:'EMA20'});
      ema20Line.setData(ema20);
      var ema50Line = chart.addLineSeries({color:'#ff9800', lineWidth:1, priceLineVisible:false, lastValueVisible:true, title:'EMA50'});
      ema50Line.setData(ema50);

      // Key levels as horizontal price lines
      levels.forEach(function(lev, i) {
        var price = typeof lev.price === 'number' ? lev.price : parseFloat(lev.price);
        if (isNaN(price) || price <= 0) return;
        var color = lev.type === 'support' ? '#00ff88' : lev.type === 'resistance' ? '#ff3355' : lev.type === 'decision' ? '#00d4ff' : '#4a6a88';
        series.createPriceLine({price:price, color:color, lineWidth:lev.type==='support'||lev.type==='resistance' ? 2 : 1, lineStyle:lev.type==='support'||lev.type==='resistance' ? 0 : 2, axisLabelVisible:true, title:lev.name||('L'+i)});
      });

      // VWAP
      if (analysis.signals && (analysis.signals.vwap || analysis.signals.vwap_approx)) {
        var vw = analysis.signals.vwap || analysis.signals.vwap_approx;
        if (typeof vw === 'number' && vw > 0) {
          series.createPriceLine({price:vw, color:'#22d3ee', lineWidth:2, lineStyle:0, axisLabelVisible:true, title:'VWAP'});
        }
      }

      // Trade markers (show last 5 positions)
      var markers = [];
      if (analysis.signals && analysis.signals.signal_type) {
        var lastTime = candles[candles.length - 1].time;
        var sigType = analysis.signals.signal_type;
        if (sigType.includes('LONG') || sigType.includes('BULL') || sigType.includes('BUY')) {
          markers.push({time: lastTime, position: 'belowBar', color: '#00ff88', shape: 'arrowUp', text: sigType.substring(0, 12)});
        } else if (sigType.includes('SHORT') || sigType.includes('BEAR') || sigType.includes('SELL')) {
          markers.push({time: lastTime, position: 'aboveBar', color: '#ff3355', shape: 'arrowDown', text: sigType.substring(0, 12)});
        }
      }
      if (markers.length > 0) series.setMarkers(markers);

      chart.timeScale().fitContent();
    }

    if (typeof LightweightCharts === 'undefined') {
      var sc = document.createElement('script');
      sc.src = '/vendor/lightweight-charts.js';
      sc.onload = function() { drawChart(); };
      document.head.appendChild(sc);
    } else { drawChart(); }

    function handleResize() {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({width: containerRef.current.clientWidth});
      }
    }
    window.addEventListener('resize', handleResize);
    return function() {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [chartData]);

  // Check for active trades
  var hasActiveTrade = false;
  var activeAccountName = '';
  if (chartData && chartData.accounts) {
    Object.keys(chartData.accounts).forEach(function(aid) {
      var a = chartData.accounts[aid];
      if (a.open_positions > 0) { hasActiveTrade = true; activeAccountName = a.name; }
    });
  }

  var engineColor = ENGINE_COLORS[eng] || '#00d4ff';
  var name = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades',dtr:'Day Trading Radio',reece:'Ultimate Scalper'}[eng] || eng;

  function exportPine() {
    fetch(API + '/api/pine/' + eng + '?ticker=' + (props.ticker||'BTC-USD'))
      .then(function(r){return r.json();})
      .then(function(d){
        if (d.pine) { navigator.clipboard.writeText(d.pine).then(function(){ alert('Pine Script copied to clipboard!'); }); }
      });
  }

  var sigType = (chartData && chartData.analysis && chartData.analysis.signals && chartData.analysis.signals.signal_type) || '';
  var sigScore = (chartData && chartData.analysis && chartData.analysis.score) || 0;

  return e('div', {className:'page', style:{overflowY:'auto', paddingBottom:'40px'}},
    // FIRE ENGINE RED BANNER (when bot active)
    hasActiveTrade ? e('div', {style:{
      background:'linear-gradient(90deg, #ff0000, #cc0000, #ff0000)',
      color:'#fff', padding:'6px 16px', fontWeight:'900', fontSize:'13px',
      fontFamily:'JetBrains Mono,monospace', textAlign:'center',
      letterSpacing:'2px', boxShadow:'0 0 15px rgba(255,0,0,0.6)',
      marginBottom:'4px', borderRadius:'4px', animation:'pulse 1.5s ease-in-out infinite'
    }},
      '\uD83D\uDD34 BOT TRADING ACTIVE \u2014 ' + activeAccountName + ' \uD83D\uDD34'
    ) : null,

    // Header with timeframe selector
    e('div', {className:'sec-head', style:{marginBottom:8, display:'flex', alignItems:'center', flexWrap:'wrap', gap:'8px'}},
      e('div', {className:'sec-dot', style:{background:engineColor, boxShadow:'0 0 6px '+engineColor}}),
      e('span', {style:{color:engineColor, fontWeight:700, fontSize:13, fontFamily:'JetBrains Mono,monospace'}}, name + ' CHART'),
      e('span', {style:{color:'var(--text2)', fontSize:10}}, props.ticker || 'BTC-USD'),

      // Timeframe buttons
      e('div', {style:{display:'flex', gap:'2px', marginLeft:'8px', background:'var(--surface)', borderRadius:'4px', padding:'2px'}},
        TIMEFRAMES.map(function(t) {
          return e('button', {key:t.interval, onClick:function(){setTimeframe(t.interval);},
            style:{padding:'3px 8px',border:'none',borderRadius:'3px',cursor:'pointer',fontSize:'10px',fontFamily:'JetBrains Mono,monospace',
              background:timeframe===t.interval ? engineColor : 'transparent',
              color:timeframe===t.interval ? '#000' : 'var(--text2)',
              fontWeight:timeframe===t.interval ? '700' : '400'}
          }, t.label);
        })
      ),

      e('button', {onClick:exportPine, style:{marginLeft:'auto',padding:'4px 10px',background:engineColor+'20',border:'1px solid '+engineColor+'60',borderRadius:4,color:engineColor,fontSize:10,fontFamily:'JetBrains Mono,monospace',cursor:'pointer'}}, 'COPY PINE'),
      e('button', {onClick:function(){loadData(props.ticker||'BTC-USD');}, style:{padding:'4px 10px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',fontSize:10,fontFamily:'JetBrains Mono,monospace',cursor:'pointer'}}, 'REFRESH')
    ),

    // Chart container
    e('div', {ref:containerRef, style:{width:'100%', minHeight:'300px', background:'var(--bg2)', borderRadius:8, border:'1px solid var(--border)', overflow:'hidden', marginBottom:'8px'}}),

    // EMA Legend
    e('div', {style:{display:'flex', gap:'16px', padding:'4px 12px', fontSize:'10px', fontFamily:'JetBrains Mono,monospace', color:'var(--text2)', flexWrap:'wrap'}},
      e('span', {style:{color:'#ffeb3b'}}, '\u2500 EMA9'),
      e('span', {style:{color:'#2196f3'}}, '\u2500 EMA20'),
      e('span', {style:{color:'#ff9800'}}, '\u2500 EMA50'),
      e('span', {style:{color:'#00ff88'}}, '\u2500 Support'),
      e('span', {style:{color:'#ff3355'}}, '\u2500 Resistance'),
      e('span', {style:{color:'#00d4ff'}}, '\u2500 Decision'),
      e('span', {style:{color:'#22d3ee'}}, '\u2500 VWAP')
    ),

    // Signal indicators
    chartData && chartData.analysis ? e(EngineSignals, {data:chartData.analysis, engine:eng}) : null,

    // BOT STATUS BAR (always visible)
    e('div', {style:{background:'var(--surface)', borderRadius:'6px', padding:'8px 12px', marginTop:'8px', fontSize:'11px', fontFamily:'JetBrains Mono,monospace'}},
      e('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px'}},
        e('span', {style:{color:'var(--text2)'}}, 'BOT STATUS'),
        hasActiveTrade ?
          e('span', {style:{color:'#ff0000', fontWeight:'700'}}, '\u25CF LIVE TRADING \u2014 ' + activeAccountName) :
          e('span', {style:{color:'var(--text2)'}}, '\u25CB Paper Mode'),
        e('span', {style:{color: sigType.includes('LONG') ? '#00ff88' : sigType.includes('SHORT') ? '#ff3355' : 'var(--text2)'}}, 'Signal: ' + (sigType || 'WAIT').replace(/_/g, ' ')),
        e('span', {style:{color: sigScore >= 70 ? '#00ff88' : sigScore >= 50 ? '#ffeb3b' : 'var(--text2)'}}, 'Score: ' + sigScore)
      )
    )
  );
}