// ============================================================
// SPECTRE — Report Generator Module
// ============================================================

import { toast } from './app.js';

export function renderReports(container) {
  const investigations = JSON.parse(localStorage.getItem('spectre_investigations') || '[]');

  container.innerHTML = `
    <div class="mod-head">
      <div>
        <div class="mod-title">Report Generator</div>
        <div class="mod-sub">Генерация отчётов из расследований. Экспорт в Markdown, JSON, CSV.</div>
      </div>
    </div>

    <div class="grid-2" style="gap:16px;align-items:flex-start;">
      <!-- LEFT: CONFIG -->
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="card">
          <div class="card-title" style="margin-bottom:14px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Источник данных
          </div>

          <div class="sec" style="margin-bottom:12px;">
            <label class="lbl">Расследование</label>
            <select class="inp" id="rpInvSelect">
              <option value="">— Выбрать расследование —</option>
              ${investigations.map(inv =>
                `<option value="${inv.id}">${escHtml(inv.title)}</option>`
              ).join('')}
            </select>
          </div>

          <div class="sec" style="margin-bottom:12px;">
            <label class="lbl">Автор отчёта</label>
            <input class="inp" id="rpAuthor" placeholder="Analyst Name" value="${localStorage.getItem('spectre_author') || ''}">
          </div>

          <div class="sec" style="margin-bottom:12px;">
            <label class="lbl">Классификация</label>
            <select class="inp" id="rpClass">
              <option>TLP:CLEAR</option>
              <option>TLP:GREEN</option>
              <option>TLP:AMBER</option>
              <option>TLP:RED</option>
              <option>CONFIDENTIAL</option>
              <option>INTERNAL</option>
              <option>UNCLASSIFIED</option>
            </select>
          </div>

          <div class="sec" style="margin-bottom:14px;">
            <label class="lbl">Заключение (вручную)</label>
            <textarea class="inp" id="rpConclusion" rows="4" placeholder="Итоговый вывод расследования…"></textarea>
          </div>

          <div class="sec" style="margin-bottom:14px;">
            <label class="lbl">Ограничения и оговорки</label>
            <textarea class="inp" id="rpLimitations" rows="3" placeholder="Что не удалось проверить, CORS-блокировки, нехватка данных…"></textarea>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;">
            <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
              <input type="checkbox" id="rpIncludeFacts" checked> Включить факты
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
              <input type="checkbox" id="rpIncludeHyp" checked> Включить гипотезы
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
              <input type="checkbox" id="rpIncludeObs" checked> Включить наблюдения
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
              <input type="checkbox" id="rpIncludeSources" checked> Включить источники
            </label>
          </div>

          <div class="divider"></div>
          <button class="btn btn-red" id="rpGenerateBtn" style="width:100%;justify-content:center;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Сгенерировать отчёт
          </button>
        </div>
      </div>

      <!-- RIGHT: PREVIEW -->
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div id="rpPreviewWrap">
          <div class="empty" style="padding:60px 24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <h3>Отчёт не сгенерирован</h3>
            <p>Выберите расследование и нажмите «Сгенерировать»</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Save author on change
  container.querySelector('#rpAuthor').addEventListener('blur', e => {
    localStorage.setItem('spectre_author', e.target.value);
  });

  container.querySelector('#rpGenerateBtn').addEventListener('click', () => {
    const invId = container.querySelector('#rpInvSelect').value;
    if (!invId) { toast('Выберите расследование', 'warn'); return; }
    const inv = investigations.find(i => i.id === invId);
    if (!inv) { toast('Расследование не найдено', 'error'); return; }

    const cfg = {
      author:      container.querySelector('#rpAuthor').value || 'Unknown Analyst',
      cls:         container.querySelector('#rpClass').value,
      conclusion:  container.querySelector('#rpConclusion').value,
      limitations: container.querySelector('#rpLimitations').value,
      facts:       container.querySelector('#rpIncludeFacts').checked,
      hyp:         container.querySelector('#rpIncludeHyp').checked,
      obs:         container.querySelector('#rpIncludeObs').checked,
      sources:     container.querySelector('#rpIncludeSources').checked,
    };

    const md = generateMarkdown(inv, cfg);
    showPreview(md, inv, cfg, container);
    toast('Отчёт сгенерирован', 'success');
  });
}

function generateMarkdown(inv, cfg) {
  const now = new Date().toLocaleString('ru-RU');
  const created = new Date(inv.createdAt).toLocaleString('ru-RU');
  const updated = new Date(inv.updatedAt || inv.createdAt).toLocaleString('ru-RU');

  let md = '';
  md += `# SPECTRE OSINT Report\n\n`;
  md += `**Классификация:** ${cfg.cls}\n`;
  md += `**Автор:** ${cfg.author}\n`;
  md += `**Дата генерации:** ${now}\n`;
  md += `**Платформа:** SPECTRE OSINT v1.0.0\n\n`;
  md += `---\n\n`;

  md += `## Расследование\n\n`;
  md += `**Название:** ${inv.title}\n`;
  md += `**Статус:** ${inv.status || 'Активно'}\n`;
  md += `**Цель:** ${inv.objective || '—'}\n`;
  md += `**Создано:** ${created}\n`;
  md += `**Обновлено:** ${updated}\n\n`;

  if (inv.notes) {
    md += `## Заметки\n\n${inv.notes}\n\n`;
  }

  if (cfg.facts && inv.facts) {
    md += `## Подтверждённые факты\n\n${inv.facts}\n\n`;
  }

  if (cfg.hyp && inv.hypotheses) {
    md += `## Гипотезы\n\n> ⚠️ Гипотезы не являются установленными фактами и требуют проверки.\n\n${inv.hypotheses}\n\n`;
  }

  if (cfg.obs && inv.observations) {
    md += `## Наблюдения\n\n${inv.observations}\n\n`;
  }

  if (cfg.sources && inv.sources) {
    md += `## Источники\n\n${inv.sources}\n\n`;
  }

  if (cfg.limitations) {
    md += `## Ограничения\n\n${cfg.limitations}\n\n`;
  }

  if (cfg.conclusion) {
    md += `## Заключение\n\n${cfg.conclusion}\n\n`;
  } else {
    md += `## Заключение\n\n*Заключение не добавлено.*\n\n`;
  }

  md += `---\n\n`;
  md += `*Отчёт сгенерирован SPECTRE OSINT Platform. `;
  md += `Содержимое основано исключительно на данных, внесённых аналитиком. `;
  md += `Платформа не несёт ответственности за точность и полноту информации.*\n`;

  return md;
}

function showPreview(md, inv, cfg, container) {
  const wrap = container.querySelector('#rpPreviewWrap');

  wrap.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div>
          <span class="tag tag-${tagColor(cfg.cls)}">${cfg.cls}</span>
          <span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">${inv.title}</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-red btn-sm" id="exportMdBtn">↓ Markdown</button>
          <button class="btn btn-ghost btn-sm" id="exportJsonRpBtn">↓ JSON</button>
          <button class="btn btn-ghost btn-sm" id="exportCsvBtn">↓ CSV</button>
          <button class="btn btn-ghost btn-sm" id="copyMdBtn">Копировать</button>
        </div>
      </div>
      <div class="report-preview" id="mdPreview">${escHtml(md)}</div>
    </div>
  `;

  container.querySelector('#exportMdBtn').addEventListener('click', () => {
    downloadBlob(md, `spectre_report_${inv.id}.md`, 'text/markdown');
    toast('Markdown сохранён', 'success');
  });

  container.querySelector('#exportJsonRpBtn').addEventListener('click', () => {
    const data = {
      meta: { generated: new Date().toISOString(), author: cfg.author, classification: cfg.cls },
      investigation: inv,
      conclusion: cfg.conclusion,
      limitations: cfg.limitations,
    };
    downloadBlob(JSON.stringify(data, null, 2), `spectre_report_${inv.id}.json`, 'application/json');
    toast('JSON сохранён', 'success');
  });

  container.querySelector('#exportCsvBtn').addEventListener('click', () => {
    const rows = [
      ['Поле', 'Значение'],
      ['Название', inv.title],
      ['Статус', inv.status || 'Активно'],
      ['Цель', inv.objective || ''],
      ['Автор', cfg.author],
      ['Классификация', cfg.cls],
      ['Заметки', inv.notes || ''],
      ['Факты', inv.facts || ''],
      ['Гипотезы', inv.hypotheses || ''],
      ['Наблюдения', inv.observations || ''],
      ['Источники', inv.sources || ''],
      ['Ограничения', cfg.limitations || ''],
      ['Заключение', cfg.conclusion || ''],
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob('\uFEFF' + csv, `spectre_report_${inv.id}.csv`, 'text/csv;charset=utf-8');
    toast('CSV сохранён', 'success');
  });

  container.querySelector('#copyMdBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(md).then(() => toast('Скопировано!', 'success'));
  });
}

function tagColor(cls) {
  if (cls.includes('RED')) return 'red';
  if (cls.includes('AMBER')) return 'yellow';
  if (cls.includes('GREEN')) return 'green';
  if (cls.includes('CONFIDENTIAL')) return 'red';
  return 'blue';
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
