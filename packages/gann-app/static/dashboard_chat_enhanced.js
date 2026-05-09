/* Enhanced Chat Page with Gemini support */
function ChatPageEnhanced() {
  var cs = S([]); var convs = cs[0]; var setConvs = cs[1];
  var as = S(null); var activeId = as[0]; var setActiveId = as[1];
  var ms = S([]); var messages = ms[0]; var setMessages = ms[1];
  var is = S(''); var input = is[0]; var setInput = is[1];
  var ls = S(false); var loading = ls[0]; var setLoading = ls[1];
  var cfgS = S(null); var chatConfig = cfgS[0]; var setChatConfig = cfgS[1];
  var bottomRef = R(null);
  var gs = S([]); var geminiModels = gs[0]; var setGeminiModels = gs[1];
  var st = S('ollama'); var source = st[0]; var setSource = st[1];
  var typingS = S(false); var isTyping = typingS[0]; var setTyping = typingS[1];

  E(function() {
    api('/chat/config').then(setChatConfig);
    api('/chat/conversations').then(function(d) {
      if (d && d.conversations && d.conversations.length > 0) {
        setConvs(d.conversations);
        setActiveId(d.conversations[0].id);
        api('/chat/conversations/' + d.conversations[0].id).then(function(c) {
          if (c && c.messages) setMessages(c.messages);
        });
      }
    });
    // Try to get Gemini models from command center
    fetch('http://localhost:7799/api/gemini/models').then(function(r){return r.json();}).then(function(d){
      if (d && d.models) setGeminiModels(d.models.slice(0,6).map(function(m){return m.name||m;}));
    }).catch(function(){});
  }, []);

  E(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({behavior:'smooth'});
  }, [messages]);

  function postMsg(cid, txt) {
    setMessages(function(p) { return p.concat([{role:'user',content:txt,timestamp:Date.now()}]); });
    setLoading(true);
    setTyping(true);
    fetch(API + '/api/chat/conversations/' + cid + '/messages', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content:txt})})
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setLoading(false);
        setTyping(false);
        if (d.error) {
          setMessages(function(p) { return p.concat([{role:'assistant',content:'Error: ' + d.error,timestamp:Date.now()}]); });
        } else {
          setMessages(function(p) { return p.concat([{role:'assistant',content:d.content||'',timestamp:Date.now(),model:d.model||'',tokens:d.tokens}]); });
          api('/chat/conversations').then(function(d2) { if (d2 && d2.conversations) setConvs(d2.conversations); });
        }
      })
      .catch(function(err) { setLoading(false); setTyping(false); setMessages(function(p) { return p.concat([{role:'assistant',content:'Error: ' + err.message,timestamp:Date.now()}]); }); });
  }

  function sendMsg() {
    var txt = input.trim();
    if (!txt || loading) return;
    if (!activeId) {
      fetch(API + '/api/chat/conversations', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})})
        .then(function(r) { return r.json(); })
        .then(function(c) { if (c && c.id) { setConvs(function(p) { return [c].concat(p); }); setActiveId(c.id); setMessages([]); postMsg(c.id, txt); } });
      setInput(''); return;
    }
    postMsg(activeId, txt); setInput('');
  }

  // Gemini direct chat
  function sendToGemini() {
    var txt = input.trim();
    if (!txt) return;
    setMessages(function(p) { return p.concat([{role:'user',content:txt,timestamp:Date.now()}]); });
    setInput('');
    setTyping(true);
    fetch('http://localhost:7799/api/gemini', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:[{role:'user',content:txt}]})})
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setTyping(false);
        if (d.error) {
          setMessages(function(p) { return p.concat([{role:'assistant',content:'Gemini Error: ' + d.error,timestamp:Date.now()}]); });
        } else {
          setMessages(function(p) { return p.concat([{role:'assistant',content:d.content||'',timestamp:Date.now(),model:d.model||'gemini',tokens:d.tokens_out}]); });
        }
      })
      .catch(function(err) { setTyping(false); setMessages(function(p) { return p.concat([{role:'assistant',content:'Connection error: ' + err.message,timestamp:Date.now()}]); }); });
  }

  function handleKeyDown(ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      if (source === 'gemini') sendToGemini();
      else sendMsg();
    }
  }

  function handleSend() {
    if (source === 'gemini') sendToGemini();
    else sendMsg();
  }

  return e('div', {className:'page-enter'},
    e('div', {className:'page-header'}, e('h2', null, 'Chat'),
      e('div', {style:{display:'flex',gap:6,alignItems:'center'}},
        // Source selector
        e('div', {style:{display:'flex',gap:2,background:'rgba(255,255,255,0.03)',borderRadius:6,padding:2,border:'1px solid var(--border)'}},
          e('button', {style:{padding:'4px 10px',borderRadius:4,border:'none',fontSize:10,fontWeight:600,cursor:'pointer',background:source==='ollama'?'var(--indigo-dim)':'transparent',color:source==='ollama'?'var(--indigo)':'var(--text2)',fontFamily:'Sora,sans-serif',transition:'all 0.15s'}, onClick:function(){setSource('ollama');}}, 'Ollama'),
          e('button', {style:{padding:'4px 10px',borderRadius:4,border:'none',fontSize:10,fontWeight:600,cursor:'pointer',background:source==='gemini'?'var(--indigo-dim)':'transparent',color:source==='gemini'?'var(--indigo)':'var(--text2)',fontFamily:'Sora,sans-serif',transition:'all 0.15s'}, onClick:function(){setSource('gemini');}}, 'Gemini')
        ),
        source === 'ollama' ? e('button', {className:'btn', style:{padding:'4px 10px',fontSize:10}, onClick:function(){ fetch(API+'/api/chat/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).then(function(r){return r.json();}).then(function(c){if(c&&c.id){setConvs(function(p){return [c].concat(p);});setActiveId(c.id);setMessages([]);}}); }}, '+ New') : null
      )
    ),
    e('div', {className:'chat-area'},
      e('div', {className:'chat-messages'},
        messages.length === 0 ? e('div', {className:'empty'}, 'Select a source and start chatting') : null,
        messages.map(function(m, i) {
          var isU = m.role === 'user';
          return e('div', {key:i, className:'chat-msg '+(isU?'chat-user':'chat-assistant')},
            e('div', {style:{fontSize:9,color:isU?'var(--indigo)':'var(--text3)',marginBottom:3,fontWeight:700,fontFamily:'JetBrains Mono,monospace',letterSpacing:1.5,display:'flex',alignItems:'center',gap:6}},
              isU?'YOU':(m.model||'ASSISTANT').toUpperCase().slice(0,20),
              m.tokens ? e('span', {style:{fontSize:8,fontWeight:400,opacity:0.5}}, m.tokens + ' tok') : null
            ),
            e('div', {style:{whiteSpace:'pre-wrap'}}, m.content)
          );
        }),
        isTyping ? e('div', {className:'chat-msg chat-assistant', style:{opacity:0.6}}, e(LoadingDots)) : null,
        e('div', {ref:bottomRef})
      ),
      e('div', {className:'chat-input'},
        e('input', {value:input, onChange:function(ev){setInput(ev.target.value);}, onKeyDown:handleKeyDown, placeholder:source==='gemini'?'Ask Gemini...':'Message Ollama...', style:{flex:1}}),
        e('button', {className:'btn', onClick:handleSend, disabled:loading||!input.trim()}, loading?'...':'Send')
      )
    )
  );
}
