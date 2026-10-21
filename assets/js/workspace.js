// ============================================================
// SPECTRE — Investigation Workspace Module
// ============================================================

import { toast } from './app.js';

export function renderWorkspace(container) {
  const investigations = load();
  let current = null;

  const render = () => {
    container.innerHTML = `
      <div class="mod-head">
        <div>
          <div class="mod-title">Investigation Workspace</div>
          <div class="mod-sub">Организация расследований. Данные хранятся локально в браузере.</div>
        </div>
        <div class="mod-actions">
          <button class="btn btn-ghost btn-sm" id="wsImportBtn">Импорт JSON</button>
          <button class="btn btn-red btn-sm" id="wsNewBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Новое расследование
          </button>
        </div>
      </div>

      <div style="display:flex;gap:16px;">
        <!-- SIDEBAR LIST -->
        <div style="width:260px;flex-shrink:0;">
          <div class="investigation-list" id="invList">
            ${investigations.length === 0
              ? `<div class="empty" style="padding:32px 12px;">
                   <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                   <h3>Нет расследований</h3>
                   <p>Нажмите «Новое расследование»</p>
                 </div>`
              : investigations.map(inv => `
                  <div class="inv-card ${current?.id === inv.id ? 'active' : ''}" data-id="${inv.id}" style="${current?.id === inv.id ? 'border-color:var(--accent);background:var(--accent-dim)' : ''}">
                    <div class="inv-card-info">
                      <h4>${escHtml(inv.title)}</h4>
                      <p>${new Date(inv.updatedAt || inv.createdAt).toLocaleDateString('ru-RU')} · ${inv.status || 'Активно'}</p>
                    </div>
                    <div class="inv-actions">
                      <button class="btn btn-ghost btn-sm inv-export" data-id="${inv.id}" title="Экспорт">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button class="btn btn-danger btn-sm inv-delete" data-id="${inv.id}" title="Удалить">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                `).join('')
            }
          </div>
        </div>

        <!-- MAIN EDITOR -->
        <div style="flex:1;min-width:0;" id="wsEditor">
          ${!current
            ? `<div class="empty" style="padding:80px 24px;">
                 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                 <h3>Выберите расследование</h3>
                 <p>Или создайте новое с помощью кнопки выше</p>
               </div>`
            : renderEditor(current)
          }
        </div>
      </div>
      <input type="file" id="wsImportFile" accept=".json" style="display:none">
    `;

    bindEvents(container, investigations, current, setCurrentAndRender);
  };

  const setCurrentAndRender = (inv) => {
    current = inv;
    render();
  };

  render();

  function bindEvents(container, investigations, current, setCurrent) {
    // New investigation
    container.querySelector('#wsNewBtn').addEventListener('click', () => {
      const title = prompt('Название расследования:');
      if (!title) return;
      const inv = {
        id: uid(),
        title,
        objective: '',
        notes: '',
        sources: '',
        facts: '',
        hypotheses: '',
        observations: '',
        status: 'Активно',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      investigations.unshift(inv);
      saveAll(investigations);
      setCurrent(inv);
    });

    // Click on investigation card
    container.querySelectorAll('.inv-card[data-id]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.inv-actions')) return;
        const inv = investigations.find(i => i.id === card.dataset.id);
        if (inv) setCurrent(inv);
      });
    });

    // Delete
    container.querySelectorAll('.inv-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const inv = investigations.find(i => i.id === btn.dataset.id);
        if (!inv) return;
        if (!confirm(`Удалить расследование "${inv.title}"?`)) return;
        const idx = investigations.indexOf(inv);
        investigations.splice(idx, 1);
        saveAll(investigations);
        setCurrent(current?.id === inv.id ? null : current);
        toast('Расследование удалено', 'info');
      });
    });

    // Export single
    container.querySelectorAll('.inv-export').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const inv = investigations.find(i => i.id === btn.dataset.id);
        if (!inv) return;
        downloadJSON(inv, `spectre_inv_${inv.id}.json`);
        toast('Экспортировано', 'success');
      });
    });

    // Import
    container.querySelector('#wsImportBtn').addEventListener('click', () => {
      container.querySelector('#wsImportFile').click();
    });
    container.querySelector('#wsImportFile').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const inv = JSON.parse(ev.target.result);
          if (!inv.id || !inv.title) throw new Error('Неверный формат');
          inv.id = uid(); // New ID to avoid conflicts
          investigations.unshift(inv);
          saveAll(investigations);
          setCurrent(inv);
          toast('Расследование импортировано', 'success');
        } catch (err) {
          toast('Ошибка импорта: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Editor save
    if (current) {
      container.querySelector('#wsSaveBtn')?.addEventListener('click', () => {
        current.title       = container.querySelector('#wsTitle').value || current.title;
        current.objective   = container.querySelector('#wsObjective').value;
        current.notes       = container.querySelector('#wsNotes').value;
        current.sources     = container.querySelector('#wsSources').value;
        current.facts       = container.querySelector('#wsFacts').value;
        current.hypotheses  = container.querySelector('#wsHypotheses').value;
        current.observations= container.querySelector('#wsObs').value;
        current.status      = container.querySelector('#wsStatus').value;
        current.updatedAt   = new Date().toISOString();
        saveAll(investigations);
        toast('Расследование сохранено', 'success');
        render();
      });
    }
  }
}

function renderEditor(inv) {
  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div class="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${escHtml(inv.title)}
        </div>
        <div style="display:flex;gap:8px;">
          <select class="inp" id="wsStatus" style="width:auto;padding:6px 10px;font-size:0.8rem;">
            ${['Активно','Приостановлено','Завершено'].map(s =>
              `<option ${inv.status===s?'selected':''}>${s}</option>`
            ).join('')}
          </select>
          <button class="btn btn-red btn-sm" id="wsSaveBtn">Сохранить</button>
        </div>
      </div>

      <div class="grid-2" style="gap:12px;margin-bottom:12px;">
        <div class="sec">
          <label class="lbl">Название</label>
          <input class="inp" id="wsTitle" value="${escAttr(inv.title)}">
        </div>
        <div class="sec">
          <label class="lbl">Цель расследования</label>
          <input class="inp" id="wsObjective" value="${escAttr(inv.objective||'')}" placeholder="Что нужно выяснить?">
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active" data-tab="notes">Заметки</button>
        <button class="tab-btn" data-tab="facts">Факты</button>
        <button class="tab-btn" data-tab="hyp">Гипотезы</button>
        <button class="tab-btn" data-tab="obs">Наблюдения</button>
        <button class="tab-btn" data-tab="sources">Источники</button>
      </div>

      <div id="tab-notes" class="tab-panel active">
        <textarea class="inp" id="wsNotes" rows="10" placeholder="Свободные заметки по расследованию…">${escHtml(inv.notes||'')}</textarea>
      </div>
      <div id="tab-facts" class="tab-panel">
        <div class="alert alert-info" style="margin-bottom:10px;">Записывайте только подтверждённые факты с источниками</div>
        <textarea class="inp" id="wsFacts" rows="10" placeholder="• Факт 1 [Источник: URL]\n• Факт 2 [Источник: название]">${escHtml(inv.facts||'')}</textarea>
      </div>
      <div id="tab-hyp" class="tab-panel">
        <div class="alert alert-warn" style="margin-bottom:10px;">Гипотезы — предположения, требующие проверки</div>
        <textarea class="inp" id="wsHypotheses" rows="10" placeholder="• Гипотеза 1: ...\n• Гипотеза 2: ...">${escHtml(inv.hypotheses||'')}</textarea>
      </div>
      <div id="tab-obs" class="tab-panel">
        <textarea class="inp" id="wsObs" rows="10" placeholder="Наблюдения, паттерны, аномалии…">${escHtml(inv.observations||'')}</textarea>
      </div>
      <div id="tab-sources" class="tab-panel">
        <div class="alert alert-info" style="margin-bottom:10px;">Источники: URL, документы, публикации</div>
        <textarea class="inp" id="wsSources" rows="10" placeholder="1. https://...\n2. Название документа\n3. ...">${escHtml(inv.sources||'')}</textarea>
      </div>
    </div>

    <div style="display:flex;gap:8px;font-size:0.75rem;color:var(--text-muted);">
      <span>Создано: ${new Date(inv.createdAt).toLocaleString('ru-RU')}</span>
      <span>·</span>
      <span>Обновлено: ${new Date(inv.updatedAt||inv.createdAt).toLocaleString('ru-RU')}</span>
    </div>
  `;
}

// Tab switching — delegated on container
document.addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  const tabs = btn.closest('.tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tabId = 'tab-' + btn.dataset.tab;
  const parent = tabs.closest('.card') || tabs.parentElement;
  parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = parent.querySelector('#' + tabId);
  if (panel) panel.classList.add('active');
});

function load() {
  try { return JSON.parse(localStorage.getItem('spectre_investigations') || '[]'); } catch { return []; }
}
function saveAll(investigations) {
  localStorage.setItem('spectre_investigations', JSON.stringify(investigations));
}
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
