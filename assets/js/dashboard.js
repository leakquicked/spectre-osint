import { navigate } from './app.js';

const HERO_IMGS = [
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80&auto=format',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80&auto=format',
  'https://images.unsplash.com/photo-1550751827-4bd374173312?w=1200&q=80&auto=format',
];

export function renderDashboard(c) {
  const invs = JSON.parse(localStorage.getItem('spectre_investigations')||'[]');
  const hasKey = !!localStorage.getItem('spectre_key');
  const exifH = JSON.parse(localStorage.getItem('spectre_exif_history')||'[]');
  const domH  = JSON.parse(localStorage.getItem('spectre_domain_history')||'[]');
  const img = HERO_IMGS[Math.floor(Math.random()*HERO_IMGS.length)];

  c.innerHTML = `
  <!-- HERO -->
  <div class="dash-hero">
    <div class="dash-hero-bg"></div>
    <img class="dash-hero-img" src="${img}" alt="" loading="lazy">
    <div class="dash-hero-overlay"></div>
    <div class="dash-hero-badge">v1.0.0</div>
    <div class="dash-hero-content">
      <h1>SPECTRE<span style="color:#e63946">.</span></h1>
      <p>Open Source Intelligence Platform — всё в браузере, без сервера</p>
    </div>
  </div>

  <!-- STATS -->
  <div class="g4 sec">
    <div class="stat">
      <div class="stat-icon" style="background:rgba(230,57,70,.1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e63946" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="stat-label">Расследования</div>
      <div class="stat-val" style="color:#e63946">${invs.length}</div>
      <div class="stat-sub">в localStorage</div>
    </div>
    <div class="stat">
      <div class="stat-icon" style="background:rgba(59,130,246,.1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </div>
      <div class="stat-label">EXIF Анализов</div>
      <div class="stat-val" style="color:#60a5fa">${exifH.length}</div>
      <div class="stat-sub">изображений</div>
    </div>
    <div class="stat">
      <div class="stat-icon" style="background:rgba(34,197,94,.1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/></svg>
      </div>
      <div class="stat-label">Domain Lookups</div>
      <div class="stat-val" style="color:#22c55e">${domH.length}</div>
      <div class="stat-sub">доменов проверено</div>
    </div>
    <div class="stat">
      <div class="stat-icon" style="background:${hasKey?'rgba(34,197,94,.1)':'rgba(245,158,11,.1)'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${hasKey?'#22c55e':'#f59e0b'}" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div class="stat-label">AI Analyst</div>
      <div class="stat-val" style="font-size:1rem;margin-top:6px;color:${hasKey?'#22c55e':'#f59e0b'}">${hasKey?'ACTIVE':'NO KEY'}</div>
      <div class="stat-sub">${hasKey?'Gemini готов':'Нужен API ключ'}</div>
    </div>
  </div>

  <!-- QUICK TOOLS -->
  <div class="sec">
    <div class="sec-title">Быстрый запуск</div>
    <div class="qt-grid">
      ${[
        ['exif','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>','EXIF Analyzer'],
        ['domain','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"/></svg>','Domain Intel'],
        ['graph','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>','Link Analysis'],
        ['workspace','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>','Investigation'],
        ['reports','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>','Reports'],
        ['ai','<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>','AI Analyst'],
      ].map(([m,icon,label])=>`<div class="qt-btn" data-nav="${m}">${icon}${label}</div>`).join('')}
    </div>
  </div>

  <div class="g2">
    <!-- RECENT -->
    <div>
      <div class="sec-title">Последние расследования</div>
      ${invs.length===0
        ?`<div class="empty" style="padding:32px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>Нет расследований</h3><p>Создайте в Investigation Workspace</p>
          </div>`
        :`<div class="inv-list">
          ${invs.slice(-4).reverse().map(inv=>`
            <div class="inv-card" data-nav="workspace">
              <div class="inv-info"><h4>${esc(inv.title)}</h4><p>${new Date(inv.createdAt).toLocaleDateString('ru-RU')}</p></div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
            </div>`).join('')}
          </div>`
      }
    </div>

    <!-- STATUS -->
    <div>
      <div class="sec-title">Статус инструментов</div>
      <div class="card" style="padding:0;overflow:hidden">
        ${[
          ['EXIF Analyzer','Локальная обработка','ok'],
          ['Domain Intel','RDAP + Cloudflare DoH','ok'],
          ['Link Analysis','Canvas граф','ok'],
          ['Investigation','localStorage','ok'],
          ['Reports','MD/JSON/CSV','ok'],
          ['AI Analyst (Gemini)',hasKey?'Ключ активен':'Нужен API ключ',hasKey?'ok':'warn'],
        ].map(([n,note,s])=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)">
            <span style="font-size:.83rem;font-weight:500">${n}</span>
            <div style="display:flex;align-items:center;gap:7px">
              <span style="font-size:.72rem;color:var(--text3)">${note}</span>
              <span class="tag ${s==='ok'?'t-green':'t-yellow'}">${s==='ok'?'OK':'SETUP'}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- ACTIVITY CANVAS -->
  <div class="sec" style="margin-top:20px">
    <div class="sec-title">Активность (14 дней)</div>
    <div class="card"><canvas id="actCanvas" height="70"></canvas></div>
  </div>
  `;

  c.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.nav)));
  drawActivity();
}

function drawActivity() {
  const canvas = document.getElementById('actCanvas'); if(!canvas) return;
  const days=14, counts=new Array(days).fill(0), labels=[];
  const now = new Date();
  for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);labels.push(d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}));}
  ['spectre_exif_history','spectre_domain_history'].forEach(key=>{
    const arr=JSON.parse(localStorage.getItem(key)||'[]');
    arr.forEach(item=>{
      if(!item.date) return;
      const id=new Date(item.date);
      for(let i=0;i<days;i++){const d=new Date(now);d.setDate(d.getDate()-(days-1-i));if(id.toDateString()===d.toDateString())counts[i]++;}
    });
  });
  const ctx=canvas.getContext('2d');
  const W=canvas.offsetWidth; canvas.width=W; canvas.height=70;
  const max=Math.max(...counts,1), colW=W/days, pad=5;
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(let g=0;g<=3;g++){const y=70-pad-(g/3)*(70-pad*2-12);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  counts.forEach((val,i)=>{
    const x=i*colW+pad/2, bH=val===0?2:((val/max)*(70-pad*2-14)), y=70-pad-bH;
    const gr=ctx.createLinearGradient(0,y,0,70-pad);
    gr.addColorStop(0,'rgba(230,57,70,0.85)'); gr.addColorStop(1,'rgba(230,57,70,0.1)');
    ctx.fillStyle=val===0?'rgba(255,255,255,0.04)':gr;
    ctx.beginPath(); ctx.roundRect(x,y,colW-pad,bH,2); ctx.fill();
    if(i%3===0){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px system-ui';ctx.textAlign='center';ctx.fillText(labels[i],x+(colW-pad)/2,68);}
  });
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
