function ChartPage(props) {
  var cs = S(null); var chartData = cs[0]; var setChartData = cs[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var es2 = S(null); var error = es2[0]; var setError = es2[1];
  var eng = props.engine || 'gann';
  var containerRef = React.useRef(null);
  var chartRef = React.useRef(null);

  function loadData(tk) {
    setLoading(true); setError(null);
    Promise.all([
      fetch(API + '/api/candles/' + (tk || 'BTC-USD') + '?period=3mo&interval=1h').then(function(r){return r.json();}),
      fetch(API + '/api/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticker:tk||'BTCUSDT', engine:eng})}).then(function(r){return r.json();})
    ]).then(function(results){
      var candles = results[0]; var analysis = results[1];
      setChartData({candles: candles.candles || [], analysis: analysis});
      setLoading(false);
    }).catch(function(err){ setError(err.message); setLoading(false); });
  }

  E(function(){ loadData(props.ticker || 'BTCUSDT'); }, [props.ticker, eng]);

  E(function(){
    if (!chartData || !chartData.candles || chartData.candles.length === 0 || !containerRef.current) return;
    var candles = chartData.candles;
    var analysis = chartData.analysis || {};
    var levels = analysis.keyLevels || [];
    var engineColor = ENGINE_COLORS[eng] || 'var(--neon)';
    var name = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades'}[eng] || eng;

    // Clear previous chart
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    // React-safe: clear via React's own DOM management
    while (containerRef.current.firstChild) containerRef.current.removeChild(containerRef.current.firstChild);

    // Lazy-load lightweight-charts
    if (typeof LightweightCharts === 'undefined') {
      var sc = document.createElement('script');
      sc.src = '/vendor/lightweight-charts.js';
      sc.onload = function() { drawChart(); };
      document.head.appendChild(sc);
    } else { drawChart(); }

    function drawChart() {
      var chart = LightweightCharts.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 500,
        layout: {background:{type:'solid',color:'#0c1222'}, textColor:'#64748b', fontSize:11, fontFamily:'JetBrains Mono, monospace'},
        grid: {vertLines:{color:'rgba(255,255,255,0.06)'}, horzLines:{color:'rgba(255,255,255,0.06)'}},
        crosshair: {mode:0},
        rightPriceScale: {borderColor:'rgba(255,255,255,0.06)'},
        timeScale: {borderColor:'rgba(255,255,255,0.06)', timeVisible:true},
        watermark: {visible:true, text:name + ' Analysis', fontSize:48, color:'rgba(99,102,241,0.05)', horzAlign:'center', vertAlign:'center'}
      });
      chartRef.current = chart;

      var series = chart.addCandlestickSeries({
        upColor:'#10b981', downColor:'#f43f5e', borderUpColor:'#10b981', borderDownColor:'#f43f5e',
        wickUpColor:'#10b981', wickDownColor:'#f43f5e'
      });
      series.setData(candles.map(function(c){return {time:c.time, open:c.open, high:c.high, low:c.low, close:c.close};}));

      // Draw key levels as price lines
      levels.forEach(function(lev, i) {
        var price = typeof lev.price === 'number' ? lev.price : parseFloat(lev.price);
        if (isNaN(price) || price <= 0) return;
        var color = lev.type === 'support' ? '#10b981' : lev.type === 'resistance' ? '#f43f5e' : lev.type === 'decision' ? 'var(--neon)' : lev.type === 'extreme' ? '#8b5cf6' : lev.type === 'gap' ? '#f59e0b' : '#64748b';
        series.createPriceLine({price:price, color:color, lineWidth:lev.type === 'support' || lev.type === 'resistance' ? 2 : 1, lineStyle:lev.type === 'support' || lev.type === 'resistance' ? 0 : 2, axisLabelVisible:true, title:lev.name || ('L' + i)});
      });

      // Draw VWAP if present
      if (analysis.signals && (analysis.signals.vwap || analysis.signals.vwap_approx)) {
        var vwap = analysis.signals.vwap || analysis.signals.vwap_approx;
        if (typeof vwap === 'number' && vwap > 0) {
          series.createPriceLine({price:vwap, color:'#6366f1', lineWidth:2, lineStyle:0, axisLabelVisible:true, title:'VWAP'});
        }
      }

      chart.timeScale().fitContent();
    }
    return function() { if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
  }, [chartData]);

  if (loading && !chartData) return e('div', {style:{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}, 'Loading chart...');
  if (error) return e('div', {className:'empty'}, 'Chart error: ' + error);

  var engineColor = ENGINE_COLORS[eng] || 'var(--neon)';
  var name = {gann:'W.D. Gann',casper:'Jayson Casper',rumors:'The Rumors',geo:'Trader Geo',ict:'ICT',mj:'Messy Jesse',franky:'Frankie Candles',cryptoface:'CryptoFace',buffett:'Warren Buffett',quant:'QuantCrawler',tori:'Tori Trades'}[eng] || eng;

  // Pine Script export button
  function exportPine() {
    fetch(API + '/api/pine/' + eng + '?ticker=' + (props.ticker||'BTC-USD'))
      .then(function(r){return r.json();})
      .then(function(d){
        if (d.pine) {
          navigator.clipboard.writeText(d.pine).then(function(){
            alert('Pine Script copied to clipboard!\nPaste it into TradingView Pine Editor.');
          });
        }
      });
  }

  return e('div', {className:'page', style:{overflowY:'auto'}},
    e('div', {className:'sec-head', style:{marginBottom:8}},
      e('div', {className:'sec-dot', style:{background:engineColor, boxShadow:'0 0 6px '+engineColor}}),
      e('span', {style:{color:engineColor, fontWeight:700, fontSize:13, fontFamily:'JetBrains Mono,monospace'}}, name + ' CHART'),
      e('span', {style:{color:'var(--text2)', fontSize:10, marginLeft:8}}, props.ticker || 'BTCUSDT'),
      e('button', {onClick:exportPine, style:{marginLeft:'auto',padding:'4px 12px',background:engineColor+'20',border:'1px solid '+engineColor+'60',borderRadius:4,color:engineColor,fontSize:10,fontFamily:'JetBrains Mono,monospace',cursor:'pointer'}}, 'COPY PINE SCRIPT'),
      e('button', {onClick:function(){loadData(props.ticker||'BTC-USD');}, style:{marginLeft:8,padding:'4px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',fontSize:10,fontFamily:'JetBrains Mono,monospace',cursor:'pointer'}}, 'REFRESH')
    ),
    e('div', {ref:containerRef, style:{width:'100%',height:500,background:'var(--bg2)',borderRadius:8,border:'1px solid var(--border)',overflow:'hidden'}}),
    chartData && chartData.analysis ? e(EngineSignals, {data:chartData.analysis, engine:eng}) : null
  );
}