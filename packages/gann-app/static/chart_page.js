// ── Chart Page v2 ───────────────────────────────────────────────────

function ChartPage(props) {
  var cs = S(null); var chartData = cs[0]; var setChartData = cs[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var es2 = S(null); var error = es2[0]; var setError = es2[1];
  var tfs = S('1h'); var timeframe = tfs[0]; var setTimeframe = tfs[1];
  var eng = props.engine || 'gann';
  var containerRef = React.useRef(null);
  var chartRef = React.useRef(null);
  var tradesRef = React.useRef([]);

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

    // Clear previous
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    containerRef.current.innerHTML = '';

    // Lazy-load
    function init() {
      var container = containerRef.current;
      var calcHeight = Math.min(window.innerHeight - 200, 600);
      if (calcHeight < 300) calcHeight = 300;

      var chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: calcHeight,
        layout: {background:{type:'solid',color:'#0a0e1a'}, textColor:'#4a6a88', fontSize:11, fontFamily:'JetBrains Mono, monospace'},
        grid: {vertLines:{color:'#0d204030'}, horzLines:{color:'#0d204030'}},
        crosshair: {mode:0},
        rightPriceScale: {borderColor:'#0d2040', scaleMargins:{top:0.1, bottom:0.2}},
        timeScale: {borderColor:'#0d2040', timeVisible:true, secondsVisible:false},
        watermark: {visible:true, text:(analysis.engine || eng).toUpperCase() + ' Analysis', fontSize:36, color:'rgba(0,212,255,0.04)', horzAlign:'center', vertAlign:'center'},
        handleScroll: {mouseWheel:true, pressedMouseMove:true, horzTouchDrag:true, vertTouchDrag:true},
        handleScale: {mouseWheel:true, pinch:true, axisPressedMouseMove:true}
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
        priceFormat:{type:'volume'},
        priceScaleId:'volume',
        scaleMargins:{top:0.85, bottom:0}
      });
      volume.setData(candles.map(function(c){
        return {time:c.time, value:c.volume || 1000, color: c.close >= c.open ? '#00ff8820' : '#ff335520'};
      }));

      // Calculate EMAs from candle data
      function calcEMA(data, period) {
        var result = [];
        var k = 2 / (period + 1);
        for (var i = 0; i < data.length; i++) {
          if (i === 0) { result.push({time:data[i].time, value:data[i].close}); }
          else {
            var prev = result[i-1].value;
            result.push({time:data[i].time, value: data[i].close * k + prev * (1-k)});
          }
        }
        return result;
      }

      // Engine-specific overlay lines
      var engineId = analysis.engine || eng;

      // EMA lines (traditional curved, for Reece and general)
      var ema9 = calcEMA(candles, 9);
      var ema20 = calcEMA(candles, 20);
      var ema50 = calcEMA(candles, 50);

      // Always show EMA 9, 20, 50 (curved lines)
      var emaLine = chart.addLineSeries({color:'#ffeb3b', lineWidth:1, priceLineVisible:false, lastValueVisible:false, title:'EMA9'});
      emaLine.setData(ema9);
      var ema20Line = chart.addLineSeries({color:'#2196f3', lineWidth:1, priceLineVisible:false, lastValueVisible:false, title:'EMA20'});
      ema20Line.setData(ema20);
      var ema50Line = chart.addLineSeries({color:'#ff9800', lineWidth:1, priceLineVisible:false, lastValueVisible:false, title:'EMA50'});
      ema50Line.setData(ema50);

      // DTR overlay: Stochastics as separate pane
      if (engineId === 'dtr') {
        var stoch9 = calcStoch(candles, 9, 3);
        var stoch60 = calcStoch(candles, 60, 10);
        // Show stochastics in separate histogram
        var stochSeries = chart.addLineSeries({
          priceScaleId:'stoch', color:'#ff4757', lineWidth:1,
          priceLineVisible:false, lastValueVisible:false, title:'Stoch 9-3'
        });
        stochSeries.setData(stoch9.map(function(s){return {time:s.time, value:s.value};}));
        // Oversold (20) and Overbought (80) lines
        series.createPriceLine({price:20, color:'#00ff8840', lineWidth:1, lineStyle:2, axisLabelVisible:false, title:'OS'});
      }

      // Key levels as price lines (straight lines - these are correct)
      levels.forEach(function(lev, i) {
        var price = typeof lev.price === 'number' ? lev.price : parseFloat(lev.price);
        if (isNaN(price) || price <= 0) return;
        var color = lev.type === 'support' ? '#00ff88' : lev.type === 'resistance' ? '#ff3355' : lev.type === 'decision' ? '#00d4ff' : '#4a6a88';
        series.createPriceLine({price:price, color:color, lineWidth:lev.type==='support'||lev.type==='resistance' ? 2 : 1, lineStyle:lev.type==='support'||lev.type==='resistance' ? 0 : 2, axisLabelVisible:true, title:lev.name||('L'+i)});
      });

      // VWAP line if present
      if (analysis.signals && (analysis.signals.vwap || analysis.signals.vwap_approx)) {
        var vw = analysis.signals.vwap || analysis.signals.vwap_approx;
        if (typeof vw === 'number' && vw > 0) {
          series.createPriceLine({price:vw, color:'#22d3ee', lineWidth:2, lineStyle:0, axisLabelVisible:true, title:'VWAP'});
        }
      }

      // Trade markers on chart (always show)
