import { toast } from './app.js';

// Auto-detect API type by key prefix
function detectAPI(key) {
  if (!key) return null;
  if (key.startsWith('AIza') || key.startsWith('AQ.') || key.length > 15) return 'gemini';
  return 'gemini'; // default
}

const GEMINI_MODEL = 'gemini-2.0-flash';
let chatHistory = [];

export function renderAI(c) {
  const hasKey = !!localStorage.getItem('spectre_key');

  c.innerHTML = `
  <div class="mod-head">
    <div>
      <div class="mod-title">AI Analyst</div>
      <div class="mod-sub">Gemini 2.0 Flash — анализ расследований, OSINT-запросы</div>
    </div>
    <div class="mod-actions">
      <button class="btn btn-ghost btn-sm" id="aiKeyBtn">${hasKey?'Сменить ключ':'Настроить API'}</button>
      ${hasKey?'<button class="btn btn-ghost btn-sm" id="aiClearBtn">Очистить чат</button>':''}
    </div>
  </div>
  ${!hasKey ? renderSetup() : renderChat()}
  `;

  if (!hasKey) { bindSetup(c); }
  else { bindChat(c); }
  c.querySelector('#aiKeyBtn').addEventListener('click', ()=>showKeyModal(c));
}

function renderSetup() {
  return `
  <div style="max-width:520px;margin:40px auto">
    <div class="card" style="padding:32px;text-align:center">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <h2 style="font-size:1.1rem;font-weight:800;margin-bottom:6px">AI Analyst не настроен</h2>
      <p style="font-size:.82rem;color:var(--text2);margin-bottom:24px;line-height:1.6">Нужен бесплатный Gemini API ключ от Google</p>
      <div class="steps" style="text-align:left;margin-bottom:20px">
        <div class="step"><div class="step-n">1</div><div class="step-t">Откройте <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style="color:#e63946">aistudio.google.com</a></div></div>
        <div class="step"><div class="step-n">2</div><div class="step-t">Нажмите <strong>Create API key</strong> — бесплатно (~60 req/min)</div></div>
        <div class="step"><div class="step-n">3</div><div class="step-t">Скопируйте ключ и вставьте ниже</div></div>
      </div>
      <input type="password" class="inp" id="aiKeyInput" placeholder="Вставьте API ключ…" style="margin-bottom:10px" autocomplete="off">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:16px">🔒 Ключ хранится только в вашем браузере (localStorage)</div>
      <button class="btn btn-red" id="aiSaveBtn" style="width:100%;justify-content:center;padding:11px">Сохранить и активировать</button>
    </div>
  </div>`;
}

function renderChat() {
  const invs = JSON.parse(localStorage.getItem('spectre_investigations')||'[]');
  return `
  <div style="display:flex;gap:14px;align-items:flex-start">
    <div style="flex:1;min-width:0">
      <div class="ai-chat" id="aiChat">
        <div class="msg ai">
          <div class="avatar ai">AI</div>
          <div class="bubble">Привет! Я AI Analyst на базе <strong>Gemini 2.0 Flash</strong>.<br><br>Помогу с:<br>• Анализом данных расследования<br>• OSINT методологией<br>• Интерпретацией технических данных<br><br>Чем могу помочь?</div>
        </div>
      </div>
      <div class="ai-row">
        <input type="text" class="inp" id="aiInput" placeholder="Введите сообщение… (Enter для отправки)" autocomplete="off">
        <button class="btn btn-red" id="aiSend">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>

    <div style="width:210px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
      <div class="card">
        <div class="card-title">Быстрые запросы</div>
        <div style="display:flex;flex-direction:column;gap:5px">
          ${[
            ['🔍 OSINT методология','Опиши базовую методологию OSINT-расследования по шагам. Отвечай на русском.'],
            ['📧 Email разведка','Какие методы используются для разведки по email-адресу в OSINT? Отвечай на русском.'],
            ['🌐 DNS анализ','Что можно выяснить из DNS-записей домена при OSINT-расследовании? Отвечай на русском.'],
            ['📍 Геолокация IP','Как определить примерное местоположение по IP-адресу? Методы и ограничения. Отвечай на русском.'],
            ['🔒 RDAP vs WHOIS','В чём разница между RDAP и WHOIS? Что лучше для OSINT? Отвечай на русском.'],
          ].map(([l,p])=>`<button class="btn btn-ghost btn-sm qp" data-p="${esc(p)}" style="text-align:left;white-space:normal;height:auto;padding:6px 10px;font-size:.75rem">${l}</button>`).join('')}
        </div>
      </div>

      ${invs.length>0?`
      <div class="card">
        <div class="card-title">Анализ расследования</div>
        <select class="inp" id="aiInvSel" style="font-size:.78rem;padding:7px 10px;margin-bottom:7px">
          <option value="">Выбрать…</option>
          ${invs.map(i=>`<option value="${i.id}">${esc(i.title.slice(0,28))}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" id="aiAnalyze" style="width:100%;justify-content:center">Проанализировать</button>
      </div>`:''}

      <div class="card">
        <div class="card-title">Статус</div>
        <div style="font-size:.76rem;color:var(--text2);display:flex;flex-direction:column;gap:5px">
          <div style="display:flex;justify-content:space-between"><span>Модель</span><span style="color:#60a5fa">Gemini 2.0 Flash</span></div>
          <div style="display:flex;justify-content:space-between"><span>Ключ</span><span class="tag t-green">OK</span></div>
          <div style="display:flex;justify-content:space-between"><span>История</span><span id="histCnt" style="color:var(--text2)">0</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

function bindSetup(c) {
  c.querySelector('#aiSaveBtn')?.addEventListener('click',()=>{
    const k=c.querySelector('#aiKeyInput').value.trim();
    if(k.length<10){toast('Введите корректный API ключ','error');return;}
    localStorage.setItem('spectre_key',k);
    toast('Ключ сохранён! AI Analyst активирован.','success');
    renderAI(c);
  });
}

function bindChat(c) {
  chatHistory=[];
  const chatEl=c.querySelector('#aiChat');
  const input=c.querySelector('#aiInput');
  const sendBtn=c.querySelector('#aiSend');

  const send=async(text)=>{
    text=text.trim(); if(!text) return;
    input.value='';
    addMsg(chatEl,'user',text);
    chatHistory.push({role:'user',parts:[{text}]});
    updateHist(c);
    const typing=addTyping(chatEl);
    sendBtn.disabled=true; input.disabled=true;
    try{
      const reply=await callGemini(chatHistory);
      typing.remove();
      addMsg(chatEl,'ai',reply);
      chatHistory.push({role:'model',parts:[{text:reply}]});
      updateHist(c);
    }catch(err){
      typing.remove();
      addMsg(chatEl,'ai','❌ Ошибка: '+err.message);
    }finally{sendBtn.disabled=false;input.disabled=false;input.focus();}
  };

  sendBtn.addEventListener('click',()=>send(input.value));
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input.value);}});
  c.querySelectorAll('.qp').forEach(b=>b.addEventListener('click',()=>send(b.dataset.p)));

  c.querySelector('#aiClearBtn')?.addEventListener('click',()=>{
    chatHistory=[];
    chatEl.innerHTML=`<div class="msg ai"><div class="avatar ai">AI</div><div class="bubble">Чат очищен. Готов к работе!</div></div>`;
    updateHist(c); toast('Чат очищен','info');
  });

  c.querySelector('#aiAnalyze')?.addEventListener('click',()=>{
    const id=c.querySelector('#aiInvSel')?.value;
    if(!id){toast('Выберите расследование','warn');return;}
    const inv=JSON.parse(localStorage.getItem('spectre_investigations')||'[]').find(i=>i.id===id);
    if(!inv) return;
    send(`Ты OSINT-аналитик. Проанализируй расследование:\n\nНазвание: ${inv.title}\nЦель: ${inv.objective||'—'}\nФакты: ${inv.facts||'—'}\nГипотезы: ${inv.hypotheses||'—'}\nНаблюдения: ${inv.observations||'—'}\nИсточники: ${inv.sources||'—'}\n\nДай: 1) Оценку полноты 2) Сильные стороны 3) Пробелы и рекомендации 4) Направления для изучения. Отвечай на русском.`);
  });
}

async function callGemini(history) {
  const key=localStorage.getItem('spectre_key');
  if(!key) throw new Error('API ключ не найден');

  const url=`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body={
    system_instruction:{parts:[{text:`Ты профессиональный OSINT-аналитик в системе SPECTRE. Помогаешь с разведкой по открытым источникам. Отвечаешь точно, структурированно, без выдумок. Если данных недостаточно — говоришь об этом. Отвечаешь на языке вопроса.`}]},
    contents:history,
    generationConfig:{temperature:0.7,topP:0.9,maxOutputTokens:2048},
  };

  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),30000);
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal});
  clearTimeout(t);

  if(!res.ok){
    const e=await res.json().catch(()=>({}));
    const m=e?.error?.message||`HTTP ${res.status}`;
    if(res.status===400) throw new Error('Неверный API ключ. Проверьте настройки.');
    if(res.status===429) throw new Error('Превышен лимит запросов. Подождите.');
    if(res.status===403) throw new Error('Доступ запрещён. Проверьте API ключ.');
    throw new Error(m);
  }

  const data=await res.json();
  const text=data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!text){
    if(data?.candidates?.[0]?.finishReason==='SAFETY') throw new Error('Ответ заблокирован фильтром безопасности.');
    throw new Error('Пустой ответ от API');
  }
  return text;
}

function addMsg(el,role,text) {
  const d=document.createElement('div');
  d.className=`msg ${role}`;
  d.innerHTML=`<div class="avatar ${role}">${role==='user'?'Вы':'AI'}</div><div class="bubble">${fmt(text)}</div>`;
  el.appendChild(d); el.scrollTop=el.scrollHeight; return d;
}
function addTyping(el) {
  const d=document.createElement('div');
  d.className='msg ai';
  d.innerHTML=`<div class="avatar ai">AI</div><div class="bubble"><div class="dots"><span></span><span></span><span></span></div></div>`;
  el.appendChild(d); el.scrollTop=el.scrollHeight; return d;
}
function updateHist(c){const e=c.querySelector('#histCnt');if(e)e.textContent=chatHistory.length;}
function showKeyModal(c) {
  const cur=localStorage.getItem('spectre_key')||'';
  const ov=document.createElement('div'); ov.className='modal-ov';
  ov.innerHTML=`<div class="modal">
    <div class="modal-head"><div class="modal-title">API Ключ</div><button class="modal-x" id="mx">✕</button></div>
    <div class="alert a-info" style="margin-bottom:14px">Ключ хранится в localStorage. Получить: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#e63946">aistudio.google.com</a></div>
    <label class="lbl">API Key</label>
    <input type="password" class="inp" id="mkInput" value="${cur}" style="margin-bottom:14px" autocomplete="off">
    <div style="display:flex;gap:7px;justify-content:flex-end">
      ${cur?'<button class="btn btn-danger btn-sm" id="mDel">Удалить</button>':''}
      <button class="btn btn-ghost btn-sm" id="mx2">Отмена</button>
      <button class="btn btn-red btn-sm" id="mSave">Сохранить</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();
  ov.querySelector('#mx').onclick=close;
  ov.querySelector('#mx2').onclick=close;
  ov.addEventListener('click',e=>{if(e.target===ov)close();});
  ov.querySelector('#mSave').onclick=()=>{
    const k=ov.querySelector('#mkInput').value.trim();
    if(k.length<10){toast('Введите корректный ключ','error');return;}
    localStorage.setItem('spectre_key',k); close();
    toast('Ключ обновлён','success'); renderAI(c);
  };
  ov.querySelector('#mDel')?.addEventListener('click',()=>{
    if(!confirm('Удалить API ключ?')) return;
    localStorage.removeItem('spectre_key'); close();
    toast('Ключ удалён','info'); renderAI(c);
  });
}
function fmt(t){
  return esc(t)
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code style="background:var(--bg);padding:1px 5px;border-radius:3px;font-family:var(--mono);font-size:.82em">$1</code>')
    .replace(/\n/g,'<br>');
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
