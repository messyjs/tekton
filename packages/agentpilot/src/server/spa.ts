/**
 * AgentPilot SPA — Self-contained HTML with inline React, Leaflet map, calculator.
 * No build step required.
 */
export function generateAgentPilotHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AgentPilot — WA Real Estate</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;height:100vh;overflow:hidden}
.app{display:flex;height:100vh}
.sidebar{width:260px;background:#1e293b;border-right:1px solid #334155;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}
.sidebar-header{padding:16px;border-bottom:1px solid #334155}
.sidebar-header h1{font-size:18px;font-weight:700;color:#38bdf8;display:flex;align-items:center;gap:8px}
.sidebar-header span{font-size:11px;color:#94a3b8;margin-top:4px}
.nav{flex:1;overflow-y:auto;padding:8px}
.nav-section{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:12px 12px 6px;font-weight:600}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;color:#94a3b8;cursor:pointer;font-size:13px;transition:all .15s}
.nav-item:hover{background:#334155;color:#e2e8f0}
.nav-item.active{background:#0ea5e9;color:white}
.nav-icon{font-size:16px;width:20px;text-align:center}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{height:48px;background:#1e293b;border-bottom:1px solid #334155;display:flex;align-items:center;padding:0 16px;gap:12px}
.topbar input{flex:1;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:8px 12px;color:#e2e8f0;font-size:13px;outline:none}
.topbar input:focus{border-color:#0ea5e9}
.topbar select{background:#0f172a;border:1px solid #334155;border-radius:6px;padding:6px 10px;color:#e2e8f0;font-size:12px}
.content{flex:1;overflow:hidden;position:relative}
#map{width:100%;height:100%;z-index:1}
.panel-overlay{position:absolute;right:0;top:0;width:380px;height:100%;background:#1e293b;border-left:1px solid #334155;z-index:1000;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s ease;overflow:hidden}
.panel-overlay.open{transform:translateX(0)}
.panel-header{padding:16px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center}
.panel-header h2{font-size:15px;font-weight:600}
.close-btn{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px;padding:4px 8px}
.close-btn:hover{color:#e2e8f0}
.panel-body{flex:1;overflow-y:auto;padding:16px}
.field{margin-bottom:12px}
.field label{display:block;font-size:11px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.field input,.field select{width:100%;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:8px 10px;color:#e2e8f0;font-size:13px;outline:none}
.field input:focus,.field select:focus{border-color:#0ea5e9}
.calc-btn{width:100%;background:#0ea5e9;color:white;border:none;border-radius:6px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.calc-btn:hover{background:#0284c7}
.result{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px;margin-top:12px}
.result-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #1e293b}
.result-row:last-child{border-bottom:none}
.result-label{color:#94a3b8}
.result-value{color:#e2e8f0;font-weight:500}
.result-value.positive{color:#22c55e}
.result-value.negative{color:#ef4444}
.result-total{font-size:15px;font-weight:700;padding-top:8px;border-top:2px solid #334155;margin-top:4px}
.popup-detail{min-width:220px}
.popup-detail h3{font-size:14px;font-weight:600;margin-bottom:6px}
.popup-detail .price{font-size:20px;font-weight:700;color:#38bdf8}
.popup-detail .meta{font-size:12px;color:#94a3b8;margin-top:6px;line-height:1.6}
.popup-detail .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.badge-active{background:#22c55e33;color:#22c55e}
.badge-pending{background:#eab30833;color:#eab308}
.badge-sold{background:#ef444433;color:#ef4444}
.legend{position:absolute;bottom:20px;left:20px;background:#1e293bee;padding:12px 16px;border-radius:8px;z-index:1000;font-size:12px;line-height:2}
.legend-dot{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}
.stats-bar{display:flex;gap:12px;padding:12px 16px;background:#1e293b;border-bottom:1px solid #334155}
.stat-card{flex:1;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px;text-align:center}
.stat-val{font-size:20px;font-weight:700;color:#38bdf8}
.stat-label{font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:2px;letter-spacing:.5px}
.chat-input-wrap{padding:12px;border-top:1px solid #334155;background:#1e293b}
.chat-input-wrap input{width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 14px;color:#e2e8f0;font-size:13px;outline:none}
.chat-messages{flex:1;overflow-y:auto;padding:12px}
.chat-msg{margin-bottom:10px;font-size:13px}
.chat-msg.user{color:#38bdf8}
.chat-msg.agent{color:#94a3b8}
.chat-msg b{color:#e2e8f0}
</style>
</head>
<body>
<div id="root"></div>
<script>
const e=React.createElement;
const {useState,useEffect,useRef,useCallback}=React;

// ── Map Component ──────────────────────────────────────────────────
function MapView({listings, filter, onSelect}){
  const mapRef=useRef(null);
  const markersRef=useRef([]);

  useEffect(()=>{
    if(mapRef.current)return;
    const map=L.map('map',{center:[47.5,-120.5],zoom:7,zoomControl:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
    L.control.zoom({position:'topright'}).addTo(map);
    mapRef.current=map;
  },[]);

  useEffect(()=>{
    if(!mapRef.current)return;
    markersRef.current.forEach(m=>m.remove());
    markersRef.current=[];
    const filtered=listings.filter(l=>{
      if(filter.status!=='all'&&l.status!==filter.status)return false;
      if(filter.type!=='all'&&l.type!==filter.type)return false;
      if(filter.priceMin&&l.price<filter.priceMin)return false;
      if(filter.priceMax&&l.price>filter.priceMax)return false;
      if(filter.beds&&l.beds<filter.beds)return false;
      return true;
    });
    filtered.forEach(l=>{
      const colors={active:'#22c55e',pending:'#eab308',sold:'#ef4444'};
      const color=colors[l.status]||'#64748b';
      const icon=L.divIcon({className:'',html:'<div style="width:28px;height:28px;border-radius:50%;background:'+color+';border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;text-shadow:0 1px 2px rgba(0,0,0,.5)">'+formatPrice(l.price)+'</div>',iconSize:[28,28],iconAnchor:[14,14]});
      const marker=L.marker([l.lat,l.lng],{icon}).addTo(mapRef.current);
      marker.on('click',()=>onSelect(l));
      const soldInfo=l.status==='sold'?'<div style="margin-top:4px;color:#ef4444">Sold: $'+(l.soldPrice||'').toLocaleString()+'</div>':'';
      marker.bindPopup('<div class="popup-detail"><h3>'+l.address+'</h3><div class="price">$'+l.price.toLocaleString()+'</div><div class="meta">'+l.beds+'bd / '+l.baths+'ba / '+l.sqft.toLocaleString()+' sqft<br>'+l.city+', '+l.state+' '+l.zip+'<span class="badge badge-'+l.status+'">'+l.status.toUpperCase()+'</span>'+soldInfo+'</div></div>',{maxWidth:250});
      markersRef.current.push(marker);
    });
  },[listings,filter]);

  return e('div',{id:'map'});
}

function formatPrice(p){
  if(p>=1000000)return'$'+(p/1000000).toFixed(1)+'M';
  return'$'+(p/1000).toFixed(0)+'K';
}

// ── Stats Bar ──────────────────────────────────────────────────────
function StatsBar({listings,filter}){
  const filtered=listings.filter(l=>{
    if(filter.status!=='all'&&l.status!==filter.status)return false;
    if(filter.type!=='all'&&l.type!==filter.type)return false;
    return true;
  });
  const active=filtered.filter(l=>l.status==='active');
  const pending=filtered.filter(l=>l.status==='pending');
  const sold=filtered.filter(l=>l.status==='sold');
  const avgPrice=active.length?Math.round(active.reduce((s,l)=>s+l.price,0)/active.length):0;
  const avgDom=active.length?Math.round(active.reduce((s,l)=>s+l.dom,0)/active.length):0;

  return e('div',{className:'stats-bar'},
    e(StatCard,{value:active.length,label:'For Sale',color:'#22c55e'}),
    e(StatCard,{value:pending.length,label:'Pending',color:'#eab308'}),
    e(StatCard,{value:sold.length,label:'Sold',color:'#ef4444'}),
    e(StatCard,{value:'$'+Math.round(avgPrice/1000)+'K',label:'Avg Price'}),
    e(StatCard,{value:avgDom+'d',label:'Avg DOM'})
  );
}
function StatCard({value,label,color}){
  return e('div',{className:'stat-card'},
    e('div',{className:'stat-val',style:color?{color}:undefined},value),
    e('div',{className:'stat-label'},label)
  );
}

// ── Panels ─────────────────────────────────────────────────────────
function MortgagePanel({onClose}){
  const[fields,setFields]=useState({loanAmount:'400000',annualRate:'6.5',termYears:'30',annualPropertyTax:'7200',annualInsurance:'1800',downPayment:'80000',purchasePrice:'480000'});
  const[result,setResult]=useState(null);
  const[show,setShow]=useState('piti');
  const calc=async()=>{
    try{
      const endpoint=show==='mortgage'?'/api/calculator/mortgage':show==='reet'?'/api/calculator/riet':'/api/calculator/piti';
      const body=show==='mortgage'?{loanAmount:+fields.loanAmount,annualRate:+fields.annualRate/100,termYears:+fields.termYears}
        :show==='reet'?{salePrice:+fields.purchasePrice,localRate:0.005}
        :{loanAmount:+fields.loanAmount,annualRate:+fields.annualRate/100,termYears:+fields.termYears,annualPropertyTax:+fields.annualPropertyTax,annualInsurance:+fields.annualInsurance,downPayment:+fields.downPayment,purchasePrice:+fields.purchasePrice};
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      setResult(await res.json());
    }catch(err){console.error(err)}
  };
  const tabClass=(t)=>show===t?'nav-item active':'nav-item';
  return e('div',{className:'panel-overlay open'},
    e('div',{className:'panel-header'},e('h2',null,'💰 Calculator'),e('button',{className:'close-btn',onClick:onClose},'×')),
    e('div',{style:{display:'flex',padding:'8px 16px',gap:4,background:'#0f172a'}},
      e('button',{className:tabClass('piti'),onClick:()=>setShow('piti')},'PITI'),
      e('button',{className:tabClass('mortgage'),onClick:()=>setShow('mortgage')},'P&I'),
      e('button',{className:tabClass('reet'),onClick:()=>setShow('reet')},'REET')
    ),
    e('div',{className:'panel-body'},
      show==='reet'?e('div',null,
        e(Field,{label:'Sale Price',value:fields.purchasePrice,onChange:v=>setFields(f=>({...f,purchasePrice:v}))}),
      ):show==='mortgage'?e('div',null,
        e(Field,{label:'Loan Amount ($)',value:fields.loanAmount,onChange:v=>setFields(f=>({...f,loanAmount:v}))}),
        e(Field,{label:'Interest Rate (%)',value:fields.annualRate,onChange:v=>setFields(f=>({...f,annualRate:v}))}),
        e(Field,{label:'Term (years)',value:fields.termYears,onChange:v=>setFields(f=>({...f,termYears:v}))}),
      ):e('div',null,
        e(Field,{label:'Purchase Price ($)',value:fields.purchasePrice,onChange:v=>setFields(f=>({...f,purchasePrice:v}))}),
        e(Field,{label:'Down Payment ($)',value:fields.downPayment,onChange:v=>setFields(f=>({...f,downPayment:v}))}),
        e(Field,{label:'Loan Amount ($)',value:fields.loanAmount,onChange:v=>setFields(f=>({...f,loanAmount:v}))}),
        e(Field,{label:'Interest Rate (%)',value:fields.annualRate,onChange:v=>setFields(f=>({...f,annualRate:v}))}),
        e(Field,{label:'Term (years)',value:fields.termYears,onChange:v=>setFields(f=>({...f,termYears:v}))}),
        e(Field,{label:'Annual Property Tax ($)',value:fields.annualPropertyTax,onChange:v=>setFields(f=>({...f,annualPropertyTax:v}))}),
        e(Field,{label:'Annual Insurance ($)',value:fields.annualInsurance,onChange:v=>setFields(f=>({...f,annualInsurance:v}))}),
      ),
      e('button',{className:'calc-btn',onClick:calc,style:{marginTop:12}},'Calculate'),
      result&&show==='piti'&&e(Result,{rows:[
        ['P&I','$'+result.principalAndInterest?.toLocaleString()],
        ['Property Tax/Mo','$'+result.monthlyPropertyTax?.toLocaleString()],
        ['Insurance/Mo','$'+result.monthlyInsurance?.toLocaleString()],
        result.pmiRequired?['PMI/Mo','$'+result.monthlyPMI?.toLocaleString()]:null,
        ['Total PITI','$'+result.totalMonthlyPayment?.toLocaleString()],
        ].filter(Boolean),total:['Monthly Payment','$'+result.totalMonthlyPayment?.toLocaleString()]}),
      result&&show==='mortgage'&&e(Result,{rows:[
        ['Monthly P&I','$'+result.monthlyPayment?.toLocaleString()],
        ['Total Payments','$'+result.totalPayments?.toLocaleString()],
        ['Total Interest','$'+result.totalInterest?.toLocaleString()],
        ],total:['Loan Amount','$'+result.loanAmount?.toLocaleString()]}),
      result&&show==='reet'&&e(Result,{rows:[
        ...result.tierBreakdown?.map(t=>['Tier $'+t.min?.toLocaleString()+'–$'+t.max?.toLocaleString(),(t.rate*100).toFixed(2)+'% → $'+t.tax?.toLocaleString()]),
        ['State REET','$'+result.stateREET?.toLocaleString()],
        ['Local REET (0.50%)','$'+result.localREET?.toLocaleString()],
        ],total:['Total REET','$'+result.totalREET?.toLocaleString()]}),
    )
  );
}

function NetSheetPanel({onClose}){
  const[fields,setFields]=useState({salePrice:'800000',listingCommission:'3',buyerCommission:'3',mortgagePayoff:'400000',localReetRate:'0.5'});
  const[result,setResult]=useState(null);
  const calc=async()=>{
    try{
      const res=await fetch('/api/calculator/net-sheet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        salePrice:+fields.salePrice,listingCommission:+fields.listingCommission/100,buyerCommission:+fields.buyerCommission/100,mortgagePayoff:+fields.mortgagePayoff,localReetRate:+fields.localReetRate/100,
      })});
      setResult(await res.json());
    }catch(err){console.error(err)}
  };
  return e('div',{className:'panel-overlay open'},
    e('div',{className:'panel-header'},e('h2',null,'📋 Seller Net Sheet'),e('button',{className:'close-btn',onClick:onClose},'×')),
    e('div',{className:'panel-body'},
      e(Field,{label:'Sale Price ($)',value:fields.salePrice,onChange:v=>setFields(f=>({...f,salePrice:v}))}),
      e(Field,{label:'Listing Commission (%)',value:fields.listingCommission,onChange:v=>setFields(f=>({...f,listingCommission:v}))}),
      e(Field,{label:'Buyer Commission (%)',value:fields.buyerCommission,onChange:v=>setFields(f=>({...f,buyerCommission:v}))}),
      e(Field,{label:'Mortgage Payoff ($)',value:fields.mortgagePayoff,onChange:v=>setFields(f=>({...f,mortgagePayoff:v}))}),
      e(Field,{label:'Local REET Rate (%)',value:fields.localReetRate,onChange:v=>setFields(f=>({...f,localReetRate:v}))}),
      e('button',{className:'calc-btn',onClick:calc},'Calculate Net Sheet'),
      result&&e(Result,{rows:result.debits?.map(d=>[d.label,'−$'+d.amount?.toLocaleString()]),total:['NET TO SELLER','$'+result.netToSeller?.toLocaleString()]}),
    )
  );
}

function ChatPanel({onClose}){
  const[messages,setMessages]=useState([{role:'agent',text:'Hi! I\\'m AgentPilot. Ask me anything about WA real estate — calculations, listings, market data. Try: "What\\'s my seller net on a $750K sale?" or "Calculate PITI on a $600K loan at 6.5%."'}]);
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const send=async()=>{
    if(!input.trim()||loading)return;
    const msg=input.trim();setInput('');
    setMessages(m=>[...m,{role:'user',text:msg}]);
    setLoading(true);
    try{
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})});
      const data=await res.json();
      setMessages(m=>[...m,{role:'agent',text:'Routed to: '+data.decision?.agents?.join(', ')+'\\n'+data.summary}]);
    }catch(err){setMessages(m=>[...m,{role:'agent',text:'Error: '+err.message}])}
    setLoading(false);
  };
  return e('div',{className:'panel-overlay open',style:{width:360}},
    e('div',{className:'panel-header'},e('h2',null,'💬 Chat'),e('button',{className:'close-btn',onClick:onClose},'×')),
    e('div',{className:'chat-messages'},
      messages.map((m,i)=>e('div',{key:i,className:'chat-msg '+m.role},e('b',null,m.role==='user'?'You: ':'AgentPilot: '),m.text))
    ),
    e('div',{className:'chat-input-wrap'},
      e('input',{placeholder:'Ask about WA real estate...',value:input,onChange:e=>setInput(e.target.value),onKeyDown:e=>{if(e.key==='Enter')send()},disabled:loading})
    )
  );
}

function Field({label,value,onChange}){
  return e('div',{className:'field'},e('label',null,label),e('input',{type:'text',value,onChange:e=>onChange(e.target.value)}));
}
function Result({rows,total}){
  return e('div',{className:'result'},
    rows.map((r,i)=>e('div',{key:i,className:'result-row'},e('span',{className:'result-label'},r[0]),e('span',{className:'result-value'},r[1]))),
    total&&e('div',{className:'result-total'},e('span',{className:'result-label'},total[0]),e('span',{className:'result-value'},total[1]))
  );
}

// ── App ────────────────────────────────────────────────────────────
function App(){
  const[listings,setListings]=useState([]);
  const[filter,setFilter]=useState({status:'all',type:'all',priceMin:'',priceMax:'',beds:''});
  const[panel,setPanel]=useState(null);
  const[selected,setSelected]=useState(null);

  useEffect(()=>{
    fetch('/api/listings').then(r=>r.json()).then(setListings).catch(console.error);
  },[]);

  const sidebarItems=[
    {icon:'🗺️',label:'Map',action:()=>setPanel(null)},
    {icon:'💰',label:'Mortgage Calculator',action:()=>setPanel('piti')},
    {icon:'📋',label:'Seller Net Sheet',action:()=>setPanel('netsheet')},
    {icon:'📊',label:'Investment Analysis',action:()=>setPanel('investment')},
    {icon:'🏘️',label:'REET Calculator',action:()=>setPanel('reet')},
    {icon:'💬',label:'Chat with AgentPilot',action:()=>setPanel('chat')},
  ];

  return e('div',{className:'app'},
    e('div',{className:'sidebar'},
      e('div',{className:'sidebar-header'},
        e('h1',null,'🏘️ AgentPilot'),
        e('span',null,'WA Real Estate • NWMLS')
      ),
      e('div',{className:'nav'},
        e('div',{className:'nav-section'},'Navigation'),
        sidebarItems.map((item,i)=>e('div',{key:i,className:'nav-item'+(panel===item.label?' active':''),onClick:item.action},
          e('span',{className:'nav-icon'},item.icon),item.label
        )),
        e('div',{className:'nav-section'},'Filters'),
        e(FilterSelect,{label:'Status',value:filter.status,options:[{v:'all',l:'All'},{v:'active',l:'For Sale'},{v:'pending',l:'Pending'},{v:'sold',l:'Sold'}],onChange:v=>setFilter(f=>({...f,status:v}))}),
        e(FilterSelect,{label:'Type',value:filter.type,options:[{v:'all',l:'All'},{v:'house',l:'House'},{v:'condo',l:'Condo'}],onChange:v=>setFilter(f=>({...f,type:v}))}),
        e(Field,{label:'Min Price ($)',value:filter.priceMin,onChange:v=>setFilter(f=>({...f,priceMin:v}))}),
        e(Field,{label:'Max Price ($)',value:filter.priceMax,onChange:v=>setFilter(f=>({...f,priceMax:v}))}),
      ),
    ),
    e('div',{className:'main'},
      e(StatsBar,{listings,filter}),
      e(MapView,{listings,filter,onSelect:l=>{setSelected(l)}}),
      e('div',{className:'legend'},
        e('div',null,e('span',{className:'legend-dot',style:{background:'#22c55e'}}),'For Sale (Active)'),
        e('div',null,e('span',{className:'legend-dot',style:{background:'#eab308'}}),'Pending'),
        e('div',null,e('span',{className:'legend-dot',style:{background:'#ef4444'}}),'Sold')
      ),
    ),
    panel==='piti'&&e(MortgagePanel,{onClose:()=>setPanel(null)}),
    panel==='netsheet'&&e(NetSheetPanel,{onClose:()=>setPanel(null)}),
    panel==='reet'&&e(MortgagePanel,{onClose:()=>setPanel(null),showReet:true}),
    panel==='chat'&&e(ChatPanel,{onClose:()=>setPanel(null)}),
  );
}
function FilterSelect({label,value,options,onChange}){
  return e('div',{className:'field'},
    e('label',null,label),
    e('select',{value,onChange:e=>onChange(e.target.value)},
      options.map(o=>e('option',{key:o.v,value:o.v},o.l))
    )
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(e(App));
</script>
</body>
</html>`;
}