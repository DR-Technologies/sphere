(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[717],{9368:(e,r,t)=>{Promise.resolve().then(t.bind(t,89441))},73321:(e,r,t)=>{"use strict";var a=t(74645);t.o(a,"useParams")&&t.d(r,{useParams:function(){return a.useParams}}),t.o(a,"useRouter")&&t.d(r,{useRouter:function(){return a.useRouter}})},89441:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>u});var a=t(95155),i=t(39092),d=t.n(i),n=t(12115),g=t(73321),o=t(25702),l=t(51674),s=t(41492),f=t(6296),b=t(89123),c=t(92451),h=t(8240);function x({widget:e,isInitialized:r,columnsMeta:t}){let[i,d]=(0,n.useState)([]),[g,o]=(0,n.useState)(!0),[b,c]=(0,n.useState)(null);return(0,n.useEffect)(()=>{r&&(async()=>{o(!0),c(null);try{let r="";if("table"===e.type&&e.columns&&e.columns.length>0){let t=e.columnAggregations||{};if(Object.entries(t).some(([r,t])=>e.columns?.includes(r)&&"NONE"!==t)){let a={SUM:"SUM",AVG:"AVG",COUNT:"CNT",DISTINCT:"DST"},i=e.columns.map(e=>{let r=t[e]||"NONE";if("NONE"===r)return`"${e}"`;let i=a[r]||r;return"DISTINCT"===r?`COUNT(DISTINCT "${e}") as "${e} (${i})"`:["SUM","AVG"].includes(r)?`${r}(TRY_CAST("${e}" AS DOUBLE)) as "${e} (${i})"`:`${r}("${e}") as "${e} (${i})"`}).join(", "),d=e.columns.filter(e=>"NONE"===(t[e]||"NONE")),n=d.length>0?`GROUP BY ${d.map(e=>`"${e}"`).join(", ")}`:"";r=`SELECT ${i} FROM dataset ${n} LIMIT 50`}else{let t=e.columns.map(e=>`"${e}"`).join(", ");r=`SELECT ${t} FROM dataset LIMIT 100`}}else if("card"===e.type){let t="COUNT"===e.aggregation?`COUNT("${e.yAxis}")`:`${e.aggregation}(TRY_CAST("${e.yAxis}" AS DOUBLE))`;r=`SELECT ${t} as "${e.yAxis}" FROM dataset`}else if("map"===e.type&&e.latitudeField&&e.longitudeField){let t="NONE"===e.aggregation?`TRY_CAST("${e.yAxis}" AS DOUBLE)`:"COUNT"===e.aggregation?`COUNT("${e.yAxis}")`:`${e.aggregation}(TRY_CAST("${e.yAxis}" AS DOUBLE))`,a=e.xAxis?`"${e.xAxis}",`:"",i="NONE"===e.aggregation?"":`GROUP BY ${e.xAxis?`"${e.xAxis}",`:""} "${e.latitudeField}", "${e.longitudeField}"`;r=`
                        SELECT
                            ${a}
                            "${e.latitudeField}",
                            "${e.longitudeField}",
                            ${t} as "${e.yAxis}"
                        FROM dataset
                        ${i}
                        LIMIT ${e.topN||500}
                    `}else if("NONE"===e.aggregation){let t=e.orderBy?`ORDER BY "${e.xAxis}" ${e.orderBy}`:"",a=e.topN?`LIMIT ${e.topN}`:"LIMIT 100";r=`SELECT "${e.xAxis}", "${e.yAxis}" FROM dataset ${t} ${a}`}else{let t="COUNT"===e.aggregation?`COUNT("${e.yAxis}")`:`${e.aggregation}(TRY_CAST("${e.yAxis}" AS DOUBLE))`,a="ASC"===e.orderBy||"DESC"===e.orderBy?`"${e.yAxis}"`:`"${e.xAxis}"`,i=e.orderBy||"DESC",d=e.topN?`LIMIT ${e.topN}`:"LIMIT 50";r=`
                        SELECT 
                            "${e.xAxis}", 
                            ${t} as "${e.yAxis}"
                        FROM dataset 
                        GROUP BY "${e.xAxis}"
                        ORDER BY ${a} ${i}
                        ${d}
                    `}let t=await (0,l.GB)(r);d(t)}catch(e){console.error("Error fetching widget data:",e),c("Error al cargar datos")}finally{o(!1)}})()},[e,r]),(0,a.jsxs)("div",{className:"glass glass-card",style:{padding:"24px",height:"100%",display:"flex",flexDirection:"column",boxSizing:"border-box"},children:[(0,a.jsxs)("div",{style:{marginBottom:"16px"},children:[(0,a.jsx)("h3",{style:{fontSize:"1.125rem",fontWeight:600},children:e.title}),(0,a.jsx)("p",{style:{fontSize:"0.75rem",color:"var(--text-muted)"},children:"table"===e.type?"Vista de tabla":`${e.xAxis} vs ${e.yAxis}`})]}),(0,a.jsx)("div",{style:{flex:1,position:"relative",width:"100%",height:"100%",minHeight:"250px"},children:g?(0,a.jsx)("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:(0,a.jsx)(f.A,{className:"animate-spin",color:"var(--primary)"})}):b?(0,a.jsx)("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#f87171"},children:b}):(0,a.jsx)(s.A,{type:e.type,data:i,xAxis:e.xAxis,yAxis:e.yAxis,columnsMeta:t,widgetTitle:e.title,latitudeField:e.latitudeField,longitudeField:e.longitudeField,colorScheme:e.colorScheme,colorByCategory:e.colorByCategory,customColor:e.customColor})})]})}function u(){let{id:e}=(0,g.useParams)(),[r,t]=(0,n.useState)(null),[i,s]=(0,n.useState)([]),[u,m]=(0,n.useState)(!0),[p,y]=(0,n.useState)(null),[k,$]=(0,n.useState)("dark"),[N,A]=(0,n.useState)(!1);return((0,n.useEffect)(()=>{e&&(async()=>{try{let r=await (0,o.vN)(e);if(!r){y("Reporte no encontrado"),m(!1);return}t(r);let a=await (0,o.$b)(r.dataset_id);a?(s(a.columns||[]),await (0,l.JX)(a.file_url,a.name,a.sheet_name),A(!0)):y("Dataset no encontrado"),m(!1)}catch(e){console.error("Error loading public report:",e),y("Error cargando el reporte"),m(!1)}})()},[e]),u)?(0,a.jsx)("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"dark"===k?"var(--background)":"#f8fafc",color:"dark"===k?"white":"#1e293b"},children:(0,a.jsxs)("div",{style:{textAlign:"center"},children:[(0,a.jsx)(f.A,{size:48,className:"animate-spin",color:"var(--primary)",style:{margin:"0 auto 24px"}}),(0,a.jsx)("p",{style:{color:"dark"===k?"var(--text-muted)":"#64748b"},children:"Cargando reporte p\xfablico..."})]})}):p||!r?(0,a.jsx)("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--background)",color:"white"},children:(0,a.jsxs)("div",{style:{textAlign:"center"},children:[(0,a.jsx)(b.A,{size:64,color:"#f87171",style:{margin:"0 auto 24px"}}),(0,a.jsx)("h2",{style:{fontSize:"1.5rem",fontWeight:600},children:p||"No pudimos encontrar este reporte"}),(0,a.jsx)("p",{style:{color:"var(--text-muted)",marginTop:"8px"},children:"El enlace podr\xeda ser incorrecto o el reporte ya no existe."})]})}):(0,a.jsxs)("div",{style:{height:"100vh",overflowY:"auto",background:"dark"===k?"var(--background)":"#f8fafc",color:"dark"===k?"white":"#1e293b",padding:"0 20px 40px",transition:"background 0.3s, color 0.3s",position:"relative"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:[(0,a.jsxs)("div",{style:{maxWidth:"1200px",margin:"0 auto"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:[(0,a.jsxs)("header",{style:{position:"sticky",top:0,zIndex:100,marginBottom:"48px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"40px 0 24px",background:"dark"===k?"rgba(10, 10, 15, 0.8)":"rgba(248, 250, 252, 0.8)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${"dark"===k?"rgba(255, 255, 255, 0.05)":"rgba(0, 0, 0, 0.05)"}`},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:[(0,a.jsxs)("div",{className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:[(0,a.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px",color:"var(--primary)"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:[(0,a.jsx)(c.A,{size:18}),(0,a.jsx)("span",{style:{fontSize:"0.875rem",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:"Vista P\xfablica"})]}),(0,a.jsx)("h1",{style:{fontSize:"2.5rem",fontWeight:700},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:r.name}),(0,a.jsx)("p",{style:{color:"dark"===k?"var(--text-muted)":"#64748b",marginTop:"8px"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:"Interact\xfaa con los datos visualizados en tiempo real."})]}),(0,a.jsx)("button",{onClick:()=>$("dark"===k?"light":"dark"),style:{padding:"8px 16px",background:"dark"===k?"rgba(255,255,255,0.05)":"#fff",border:"1px solid var(--border)",borderRadius:"20px",cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",fontSize:"0.875rem",fontWeight:500,boxShadow:"light"===k?"0 2px 10px rgba(0,0,0,0.05)":"none",color:"dark"===k?"#fff":"#1e293b"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:"dark"===k?"\uD83C\uDF19 Modo Oscuro":"☀️ Modo Claro"})]}),(0,a.jsx)("div",{style:{position:"relative",width:"100%",minHeight:"600px"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:(0,a.jsx)(h.zz,{className:"layout",layouts:{lg:r.widgets.map(e=>({i:e.id,x:e.x,y:e.y,w:e.w,h:e.h,static:!0}))},breakpoints:{lg:1200,md:996,sm:768,xs:480,xxs:0},cols:{lg:3,md:3,sm:2,xs:1,xxs:1},rowHeight:120,width:1200,margin:[24,24],containerPadding:[0,0],dragConfig:{enabled:!1},resizeConfig:{enabled:!1},children:r.widgets.map(e=>(0,a.jsx)("div",{className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:(0,a.jsx)(x,{widget:e,isInitialized:N,columnsMeta:i})},e.id))})}),(0,a.jsx)("footer",{style:{marginTop:"80px",borderTop:`1px solid ${"dark"===k?"var(--border)":"#e2e8f0"}`,paddingTop:"32px",textAlign:"center"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:(0,a.jsxs)("p",{style:{fontSize:"0.875rem",color:"dark"===k?"var(--text-muted)":"#64748b"},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]]),children:["Generado con ",(0,a.jsx)("span",{style:{fontWeight:700},className:d().dynamic([["dfff2d1e407c9790",["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""]]])+" gradient-text",children:"Sphere"})," • Herramientas de an\xe1lisis r\xe1pido."]})})]}),(0,a.jsx)(d(),{id:"dfff2d1e407c9790",dynamic:["dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))","dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)","light"===k?"#1e293b !important":"inherit","light"===k?"#1e293b":"white","light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""],children:`.glass-card{background:${"dark"===k?"linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))":"linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))"};backdrop-filter:blur(28px)saturate(180%);border:1px solid ${"dark"===k?"rgba(255, 255, 255, 0.16)":"rgba(148, 163, 184, 0.22)"};border-radius:28px;box-shadow:0 24px 60px rgba(7,15,29,.16),inset 0 1px 0 rgba(255,255,255,.22);color:${"light"===k?"#1e293b !important":"inherit"}}.glass-card h3{color:${"light"===k?"#1e293b":"white"}}.gradient-text{background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}${"light"===k?`
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                `:""}
            `})]})}x.displayName="PublicWidget"}},e=>{e.O(0,[524,591,504,53,441,794,358],()=>e(e.s=9368)),_N_E=e.O()}]);