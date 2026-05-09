/* Enhanced Models Page with details */
function ModelsPageEnhanced() {
  var st = S(null); var models = st[0]; var setModels = st[1];
  var gm = S(null); var geminiModels = gm[0]; var setGeminiModels = gm[1];
  var lo = S(false); var loading = lo[0]; var setLoading = lo[1];
  
  E(function() { 
    setLoading(true);
    api('/models').then(function(d){setModels(d);setLoading(false);}).catch(function(){setLoading(false);}); 
    fetch('http://localhost:7799/api/gemini/models').then(function(r){return r.json();}).then(function(d){
      if (d && d.models) setGeminiModels(d.models);
    }).catch(function(){});
  }, []);
  
  if (!models && !loading) return e('div',{className:'page-enter'}, e(LoadingDots));
  
  var errorEl = models && models.error ? e('div', {className:'card card-rose'}, 
    e('div', {style:{display:'flex',alignItems:'center',gap:8,color:'var(--rose)'}}, 
      e('span', {className:'dot dot-red'}),
      'Ollama: ' + models.error
    )
  ) : null;
  
  // Format model size
  function fmtSize(name) {
    var match = name.match(/:(\d+\.?\d*)b/);
    if (match) return match[1] + 'B';
    return '';
  }
  
  // Categorize models
  function modelCategory(name) {
    if (name.includes('coder') || name.includes('code')) return {cat:'Code',cls:'badge-blue'};
    if (name.includes('r1') || name.includes('reason') || name.includes('deepseek')) return {cat:'Reasoning',cls:'badge-amber'};
    if (name.includes('gemma') || name.includes('qwen') || name.includes('hermes')) return {cat:'General',cls:'badge-accent'};
    if (name.includes('granite') || name.includes('llama') || name.includes('phi')) return {cat:'Base',cls:'badge-accent'};
    return {cat:'Model',cls:'badge-accent'};
  }
  
  var cloudEl = null;
  if (models && models.cloud && models.cloud.length > 0) {
    cloudEl = e('div', {className:'card card-indigo'},
      e('div', {style:{display:'flex',alignItems:'center',gap:8,marginBottom:14}},
        e('span', {className:'dot dot-green'}),
        e('span', {style:{fontWeight:600,color:'var(--indigo)',fontSize:13,letterSpacing:0.3}}, 'Cloud Models')
      ),
      models.cloud.map(function(m) {
        var isDefault = m === models.chatDefault;
        return e('div', {key:m, style:{padding:'8px 0',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}},
          e('span', {style:{color:isDefault?'var(--emerald)':'var(--text)',fontWeight:isDefault?600:400,fontSize:13}}, m),
          e('span', {className:'badge badge-amber', style:{fontSize:8}}, 'CLOUD'),
          isDefault ? e('span', {className:'badge badge-green', style:{fontSize:8}}, 'DEFAULT') : null
        );
      })
    );
  }
  
  var localEl = null;
  if (models && models.local && models.local.length > 0) {
    localEl = e('div', {className:'card'},
      e('div', {style:{display:'flex',alignItems:'center',gap:8,marginBottom:14}},
        e('span', {className:'dot dot-green'}),
        e('span', {style:{fontWeight:600,color:'var(--text2)',fontSize:13,letterSpacing:0.3}}, 'Local Models (' + models.local.length + ')')
      ),
      e('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:6}},
        models.local.map(function(m) {
          var cat = modelCategory(m);
          var size = fmtSize(m);
          return e('div', {key:m, style:{padding:'8px 10px',borderRadius:6,background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',transition:'all 0.15s'}},
            e('div', {style:{display:'flex',alignItems:'center',gap:6,marginBottom:2}},
              e('span', {style:{fontSize:12,fontWeight:500,color:'var(--text)'}}, m.split(':')[0]),
              size ? e('span', {style:{fontSize:11,fontWeight:700,color:'var(--indigo)',fontFamily:'Sora,sans-serif'}}, size) : null
            ),
            e('div', {style:{display:'flex',gap:4}},
              e('span', {className:'badge '+cat.cls, style:{fontSize:8}}, cat.cat),
              e('span', {className:'badge badge-accent', style:{fontSize:8}}, 'LOCAL')
            )
          );
        })
      )
    );
  }
  
  // Gemini models section
  var geminiEl = null;
  if (geminiModels && geminiModels.length > 0) {
    geminiEl = e('div', {className:'card card-indigo'},
      e('div', {style:{display:'flex',alignItems:'center',gap:8,marginBottom:14}},
        e('span', {className:'dot dot-green'}),
        e('span', {style:{fontWeight:600,color:'var(--indigo)',fontSize:13,letterSpacing:0.3}}, 'Gemini Models (' + geminiModels.length + ')')
      ),
      e('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:6}},
        geminiModels.slice(0,12).map(function(m) {
          var name = typeof m === 'string' ? m : (m.name || m.id || 'unknown');
          var isFlash = name.includes('flash');
          var isPro = name.includes('pro');
          var badge = isFlash ? 'badge-blue' : isPro ? 'badge-amber' : 'badge-accent';
          return e('div', {key:name, style:{padding:'8px 10px',borderRadius:6,background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)'}},
            e('div', {style:{fontSize:11,fontWeight:500,color:'var(--text)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}, name.replace('models/','')),
            e('span', {className:'badge '+badge, style:{fontSize:8}}, isPro?'PRO':isFlash?'FLASH':'MODEL')
          );
        })
      )
    );
  }
  
  if (loading) return e('div',{className:'page-enter'}, e(LoadingDots));
  
  return e('div', {className:'page-enter'},
    e('div', {className:'page-header'}, e('h2',null,'Available Models')),
    errorEl,
    cloudEl,
    localEl,
    geminiEl
  );
}
