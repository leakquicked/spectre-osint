import { renderDashboard } from './dashboard.js';
import { renderExif }      from './exif.js';
import { renderDomain }    from './domain.js';
import { renderGraph }     from './graph.js';
import { renderWorkspace } from './workspace.js';
import { renderReports }   from './reports.js';
import { renderAI }        from './ai.js';

export function toast(msg, type='info', dur=3500) {
  const w = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  const icons = {
    success:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warn:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };
  el.innerHTML = `${icons[type]||icons.info}<span>${msg}</span>`;
  w.appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),250); }, dur);
}

const MODULES = {
  dashboard:{ render:renderDashboard, title:'Dashboard' },
  exif:     { render:renderExif,      title:'EXIF Analyzer' },
  domain:   { render:renderDomain,    title:'Domain Intelligence' },
  graph:    { render:renderGraph,     title:'Link Analysis' },
  workspace:{ render:renderWorkspace, title:'Investigation Workspace' },
  reports:  { render:renderReports,   title:'Report Generator' },
  ai:       { render:renderAI,        title:'AI Analyst' },
};

export function navigate(key) {
  const mod = MODULES[key]; if(!mod) return;
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active', el.dataset.module===key));
  document.getElementById('modTitle').textContent = mod.title;
  const c = document.getElementById('content');
  c.innerHTML=''; c.scrollTop=0;
  mod.render(c);
  closeSidebar();
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sOverlay').classList.remove('vis');
}

function showOnboarding() {
  if(localStorage.getItem('spectre_key')) return;
  const ov = document.createElement('div');
  ov.className='ob-wrap'; ov.id='ob';
  ov.innerHTML=`
  <div class="ob-box">
    <div style="margin-bottom:20px">
      <svg width="48" height="48" viewBox="0 0 32 32" fill="none" style="margin:0 auto 12px;display:block">
        <polygon points="16,2 30,9.5 30,22.5 16,30 2,22.5 2,9.5" fill="none" stroke="#e63946" stroke-width="1.5"/>
        <circle cx="16" cy="16" r="3" fill="#e63946"/>
        <line x1="16" y1="10" x2="16" y2="13" stroke="#e63946" stroke-width="1.5"/>
        <line x1="16" y1="19" x2="16" y2="22" stroke="#e63946" stroke-width="1.5"/>
      </svg>
      <div class="ob-title">SPECTRE<span style="color:#e63946">.</span></div>
      <div class="ob-sub">OSINT Intelligence Platform<br>Для AI-аналитика нужен бесплатный Gemini API ключ</div>
    </div>
    <div class="steps">
      <div class="step"><div class="step-n">1</div><div class="step-t">Перейдите на <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a></div></div>
      <div class="step"><div class="step-n">2</div><div class="step-t">Нажмите <strong>Create API key</strong> — бесплатно</div></div>
      <div class="step"><div class="step-n">3</div><div class="step-t">Скопируйте ключ и вставьте ниже</div></div>
      <div class="step"><div class="step-n">4</div><div class="step-t">Ключ сохраняется <strong>только в вашем браузере</strong></div></div>
    </div>
    <input type="password" class="inp" id="obKey" placeholder="Вставьте API ключ…" style="margin-bottom:10px">
    <div class="ob-note">🔒 Ключ хранится в localStorage. Запросы идут напрямую в Google API.</div>
    <button class="btn btn-red" id="obSave" style="width:100%;justify-content:center;padding:11px;font-size:.9rem">Сохранить ключ и войти</button>
    <br><span class="skip" id="obSkip">Войти без AI-функций →</span>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('obSave').onclick=()=>{
    const k=document.getElementById('obKey').value.trim();
    if(k.length<10){toast('Введите корректный API ключ','error');return;}
    localStorage.setItem('spectre_key',k);
    ov.remove(); toast('API ключ сохранён! AI Analyst активирован.','success');
  };
  document.getElementById('obKey').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('obSave').click();});
  document.getElementById('obSkip').onclick=()=>ov.remove();
}

document.addEventListener('DOMContentLoaded',()=>{
  // Clock
  const clk=document.getElementById('clock');
  const tick=()=>{ clk.textContent=new Date().toUTCString().slice(17,25)+' UTC'; };
  tick(); setInterval(tick,1000);

  // Nav
  document.querySelectorAll('.nav-item[data-module]').forEach(el=>{
    el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.module);});
  });

  // Mobile menu
  document.getElementById('mobBtn').addEventListener('click',()=>{
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sOverlay').classList.add('vis');
  });
  document.getElementById('sOverlay').addEventListener('click',closeSidebar);

  navigate('dashboard');
  showOnboarding();
});
