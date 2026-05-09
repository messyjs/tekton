/* ── Design Page (Gemini frontend-design skill) ── */
function DesignPage() {
  var ds = S('generate'); var mode = ds[0]; var setMode = ds[1];
  var descS = S(''); var description = descS[0]; var setDescription = descS[1];
  var typeS = S('component'); var compType = typeS[0]; var setCompType = typeS[1];
  var styleS = S(''); var styleDir = styleS[0]; var setStyleDir = styleS[1];
  var modelS = S('gemini-2.5-flash'); var model = modelS[0]; var setModel = modelS[1];
  var loadS = S(false); var loading = loadS[0]; var setLoading = loadS[1];
  var resultS = S(null); var result = resultS[0]; var setResult = resultS[1];
  var refCodeS = S(''); var refCode = refCodeS[0]; var setRefCode = refCodeS[1];
  var refImprS = S(''); var improvements = refImprS[0]; var setImprovements = refImprS[1];
  var componentsS = S(null); var components = componentsS[0]; var setComponents = componentsS[1];
  var previewS = S(''); var previewHtml = previewS[0]; var setPreviewHtml = previewS[1];

  // Style directions
  var styles = ['cyberpunk', 'minimalist', 'brutalist', 'retro-futuristic', 'luxury', 'industrial', 'organic', 'editorial', 'maximalist'];
  var compTypes = ['component', 'page', 'layout', 'animation', 'dashboard', 'widget'];

  // Load components on mount
  R.useEffect(function() {
    fetch('/api/design/components').then(function(r){return r.json();}).then(function(d){
      setComponents(d);
    }).catch(function(){});
  }, []);

  function generateDesign() {
    setLoading(true);
    setResult(null);
    var body = {description: description, type: compType, style: styleDir, model: model};
    fetch('/api/design/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    }).then(function(r){return r.json();}).then(function(d){
      setResult(d);
      setLoading(false);
    }).catch(function(err){
      setResult({error: err.message});
      setLoading(false);
    });
  }

  function refineDesign() {
    setLoading(true);
    setResult(null);
    var body = {code: refCode, improvements: improvements, model: model};
    fetch('/api/design/refine', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    }).then(function(r){return r.json();}).then(function(d){
      setResult(d);
      setLoading(false);
    }).catch(function(err){
      setResult({error: err.message});
      setLoading(false);
    });
  }

  function extractCode(content) {
    if (!content) return '';
    // Extract code from markdown code blocks
    var match = content.match(/```(?:javascript|js|jsx|css|html)?\s*\n([\s\S]*?)```/);
    if (match) return match[1];
    return content;
  }

  function buildPreview() {
    var content = '';
    if (result && result.content) {
      content = result.content;
    }
    if (!content) return;
    var code = extractCode(content);
    // Try to inject into a preview iframe
    var html = '<!DOCTYPE html><html><head>' +
      '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
      '<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>' +
      '<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>' +
      '<style>' +
      ':root{--bg:#05070d;--bg2:#0a0f1e;--surface:#0c1222;--surface2:#111a30;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.1);--neon:#6366f1;--neon-dim:rgba(99,102,241,0.1);--green:#10b981;--green-dim:rgba(16,185,129,0.1);--red:#f43f5e;--red-dim:rgba(244,63,94,0.1);--purple:#8b5cf6;--purple-dim:#1a0a40;--amber:#f59e0b;--text:#f0f0f5;--text2:#64748b;--text3:#334155}' +
      'body{background:var(--bg);color:var(--text);font-family:"Sora",sans-serif;margin:0;padding:16px}' +
      '</style></head><body><div id="root"></div>' +
      '<script>var e=React.createElement;' + code +
      '</script></body></html>';
    setPreviewHtml(html);
  }

  // CSS for design page
  var dstyles = `
  .design-shell{display:flex;flex-direction:column;height:100%;gap:0}
  .design-topbar{display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0}
  .design-modes{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:2px}
  .design-mode{padding:4px 12px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;color:var(--text2);transition:all .15s;font-family:'Sora',sans-serif;letter-spacing:.5px;border:none;background:transparent}
  .design-mode:hover{color:var(--text);background:var(--surface2)}
  .design-mode.active{color:var(--neon);background:var(--neon-dim);box-shadow:0 0 6px var(--neon-dim)}
  .design-body{display:flex;flex:1;overflow:hidden}
  .design-input{width:420px;border-right:1px solid var(--border);display:flex;flex-direction:column;padding:12px;overflow-y:auto;flex-shrink:0}
  .design-output{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .design-group{margin-bottom:12px}
  .design-label{font-size:10px;font-weight:700;color:var(--text2);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;font-family:'JetBrains Mono',monospace}
  .design-textarea{width:100%;min-height:120px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'Sora',sans-serif;font-size:12px;padding:8px;resize:vertical;outline:none;transition:border-color .15s}
  .design-textarea:focus{border-color:var(--neon);box-shadow:0 0 8px var(--neon-dim)}
  .design-textarea-lg{min-height:200px}
  .design-pill-row{display:flex;flex-wrap:wrap;gap:4px}
  .design-pill{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;color:var(--text2);background:var(--surface);border:1px solid var(--border);transition:all .15s;font-family:'JetBrains Mono',monospace}
  .design-pill:hover{color:var(--text);border-color:var(--text2)}
  .design-pill.active{color:var(--neon);border-color:var(--neon);background:var(--neon-dim);box-shadow:0 0 4px var(--neon-dim)}
  .design-generate{padding:8px 20px;border-radius:6px;border:1px solid var(--neon);background:var(--neon-dim);color:var(--neon);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;transition:all .15s;text-transform:uppercase}
  .design-generate:hover{background:var(--neon);color:var(--bg);box-shadow:0 0 16px var(--neon-dim)}
  .design-generate:disabled{opacity:.4;cursor:not-allowed}
  .design-model-sel{background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-family:'JetBrains Mono',monospace;font-size:10px;padding:4px 8px;outline:none}
  .design-model-sel:focus{border-color:var(--neon)}
  .design-result{flex:1;overflow-y:auto;padding:12px}
  .design-code{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text);white-space:pre-wrap;overflow-y:auto;max-height:60vh;line-height:1.5}
  .design-preview-bar{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--border);background:var(--bg2)}
  .design-preview-btn{padding:4px 12px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text2);font-size:10px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'JetBrains Mono',monospace}
  .design-preview-btn:hover{color:var(--neon);border-color:var(--neon)}
  .design-preview-btn.active{color:var(--green);border-color:var(--green)}
  .design-iframe{flex:1;border:none;background:var(--bg);width:100%}
  .design-components{border:1px solid var(--border);border-radius:6px;background:var(--surface);max-height:150px;overflow-y:auto}
  .design-comp-item{padding:4px 8px;font-size:11px;color:var(--text2);cursor:pointer;font-family:'Sora',sans-serif;border-bottom:1px solid var(--border);transition:all .1s}
  .design-comp-item:hover{background:var(--neon-dim);color:var(--neon)}
  .design-comp-item:last-child{border-bottom:none}
  .design-comp-size{color:var(--text3);font-size:9px;margin-left:6px}
  .design-loading{display:flex;align-items:center;gap:8px;color:var(--neon);font-family:'JetBrains Mono',monospace;font-size:11px;padding:16px}
  @keyframes designPulse{0%,100%{opacity:.3}50%{opacity:1}}
  .design-pulse{animation:designPulse 1.5s ease-in-out infinite}
  `;

  // View tabs for output
  var viewS = S('code'); var viewMode = viewS[0]; var setViewMode = viewS[1];

  return e('div', {className:'design-shell'},
    e('style', null, dstyles),

    // Top bar
    e('div', {className:'design-topbar'},
      e('div', {className:'topbar-brand', style:{marginRight:8}}, 'DESIGN'),
      e('div', {className:'design-modes'},
        e('div', {className:'design-mode' + (mode==='generate'?' active':''), onClick:function(){setMode('generate');setResult(null);}}, 'Generate'),
        e('div', {className:'design-mode' + (mode==='refine'?' active':''), onClick:function(){setMode('refine');setResult(null);}}, 'Refine')
      ),
      e('div', {style:{flex:1}}),
      e('select', {className:'design-model-sel', value:model, onChange:function(ev){setModel(ev.target.value);}},
        e('option', {value:'gemini-2.5-flash'}, 'Gemini 2.5 Flash'),
        e('option', {value:'gemini-2.5-pro'}, 'Gemini 2.5 Pro')
      )
    ),

    e('div', {className:'design-body'},
      // Input panel
      e('div', {className:'design-input'},
        mode === 'generate' ? [
          // Type selector
          e('div', {className:'design-group', key:'type'},
            e('div', {className:'design-label'}, 'Component Type'),
            e('div', {className:'design-pill-row'},
              compTypes.map(function(t){
                return e('div', {key:t, className:'design-pill'+(compType===t?' active':''), onClick:function(){setCompType(t);}}, t);
              })
            )
          ),
          // Style direction
          e('div', {className:'design-group', key:'style'},
            e('div', {className:'design-label'}, 'Style Direction'),
            e('div', {className:'design-pill-row'},
              e('div', {className:'design-pill'+(styleDir===''?' active':''), onClick:function(){setStyleDir('');}}, 'auto'),
              styles.map(function(s){
                return e('div', {key:s, className:'design-pill'+(styleDir===s?' active':''), onClick:function(){setStyleDir(s);}}, s);
              })
            )
          ),
          // Description
          e('div', {className:'design-group', key:'desc'},
            e('div', {className:'design-label'}, 'Description'),
            e('textarea', {
              className:'design-textarea',
              placeholder:'Describe the component you want... e.g. "A signal feed card showing BUY/SELL signals with pulsing animations"',
              value:description,
              onChange:function(ev){setDescription(ev.target.value);}
            })
          )
        ] : [
          // Refine mode
          e('div', {className:'design-group', key:'code'},
            e('div', {className:'design-label'}, 'Existing Code'),
            e('textarea', {
              className:'design-textarea design-textarea-lg',
              placeholder:'Paste the component code to refine...',
              value:refCode,
              onChange:function(ev){setRefCode(ev.target.value);}
            })
          ),
          e('div', {className:'design-group', key:'impr'},
            e('div', {className:'design-label'}, 'Improvements'),
            e('textarea', {
              className:'design-textarea',
              placeholder:'e.g. "Add hover glow effects, improve spacing, add animation on mount"',
              value:improvements,
              onChange:function(ev){setImprovements(ev.target.value);}
            })
          )
        ],

        // Components list (shared)
        components && components.components ? e('div', {className:'design-group', key:'comps'},
          e('div', {className:'design-label'}, 'Current Components'),
          e('div', {className:'design-components'},
            components.components.map(function(c){
              return e('div', {key:c.file, className:'design-comp-item', onClick:function(){
                fetch('/static/' + c.file).then(function(r){return r.text();}).then(function(t){
                  if (mode === 'refine') {
                    setRefCode(t);
                  } else {
                    setDescription('Redesign the ' + c.file.replace('.js','').replace(/_/g,' ') + ' component with improved aesthetics');
                  }
                });
              }},
                c.file,
                e('span', {className:'design-comp-size'}, (c.size/1024).toFixed(1) + 'KB')
              );
            })
          )
        ) : null,

        // Generate/Refine button
        e('button', {
          className:'design-generate',
          disabled:loading || (mode === 'generate' ? !description : !refCode),
          onClick: mode === 'generate' ? generateDesign : refineDesign
        }, loading ? 'Generating...' : (mode === 'generate' ? 'Generate Design' : 'Refine Design'))
      ),

      // Output panel
      e('div', {className:'design-output'},
        result ? [
          // Preview bar
          e('div', {className:'design-preview-bar', key:'bar'},
            e('div', {className:'design-preview-btn' + (viewMode==='code'?' active':''), onClick:function(){setViewMode('code');}}, 'Code'),
            e('div', {className:'design-preview-btn' + (viewMode==='preview'?' active':''), onClick:function(){setViewMode('preview'); buildPreview();}}, 'Preview'),
            e('div', {className:'design-preview-btn' + (viewMode==='raw'?' active':''), onClick:function(){setViewMode('raw');}}, 'Raw'),
            e('div', {style:{flex:1}}),
            result.model ? e('span', {style:{fontSize:10, color:'var(--text2)', fontFamily:'JetBrains Mono'}}, result.model) : null,
            result.tokens_out ? e('span', {style:{fontSize:10, color:'var(--text3)', fontFamily:'JetBrains Mono', marginLeft:8}}, result.tokens_out + ' tokens') : null
          ),
          // Output content
          viewMode === 'code' ? e('div', {className:'design-result', key:'code_out'},
            e('div', {className:'design-code'}, extractCode(result.content || result.error || 'No result'))
          ) : viewMode === 'preview' ? e('iframe', {
            key:'preview',
            className:'design-iframe',
            srcDoc:previewHtml,
            sandbox:'allow-scripts allow-same-origin'
          }) : e('div', {className:'design-result', key:'raw'},
            e('div', {className:'design-code'}, result.content || result.error || 'No result')
          )
        ] : loading ? e('div', {className:'design-loading'},
          e('span', {className:'design-pulse'}, '\u25CF'),
          'Generating with ' + model + '...'
        ) : e('div', {className:'design-result', style:{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontFamily:'JetBrains Mono',fontSize:12,textAlign:'center',padding:40}},
          mode === 'generate'
            ? 'Describe a component and click Generate.\nPowered by the frontend-design skill adapted from Claude Code.'
            : 'Paste existing code and describe improvements.\nThe design skill will refine it with better aesthetics.'
        )
      )
    )
  );
}