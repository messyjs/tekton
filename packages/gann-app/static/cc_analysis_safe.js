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
