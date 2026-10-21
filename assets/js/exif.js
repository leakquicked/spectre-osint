// ============================================================
// SPECTRE — EXIF Analyzer Module
// ============================================================

import { toast } from './app.js';

export function renderExif(container) {
  container.innerHTML = `
    <div class="mod-head">
      <div>
        <div class="mod-title">EXIF Analyzer</div>
        <div class="mod-sub">Извлечение метаданных изображений. Обработка локальная — файл не покидает браузер.</div>
      </div>
      <div class="mod-actions">
        <button class="btn btn-ghost btn-sm" id="exifHistoryBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          История
        </button>
      </div>
    </div>

    <!-- DROP ZONE -->
    <div class="drop" id="dropZone">
      <input type="file" id="fileInput" accept="image/*,image/jpeg,image/png,image/tiff,image/webp,image/heic">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <p><strong>Перетащите изображение</strong> или нажмите для выбора</p>
      <p style="font-size:0.78rem;">JPEG, PNG, TIFF, WEBP — метаданные EXIF извлекаются только из JPEG/TIFF</p>
    </div>

    <!-- RESULTS -->
    <div id="exifResults" style="margin-top:20px;"></div>
  `;

  const dropZone = container.querySelector('#dropZone');
  const fileInput = container.querySelector('#fileInput');

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => processFile(e.target.files[0]));

  dropZone.addEventListener('over', e => { e.preventDefault(); dropZone.classList.add('over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  container.querySelector('#exifHistoryBtn').addEventListener('click', showHistory);
}

async function processFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('Выберите файл изображения', 'error');
    return;
  }

  const resultsEl = document.getElementById('exifResults');
  resultsEl.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;padding:20px;">
        <div class="dots"><span></span><span></span><span></span></div>
        <span style="color:var(--text-muted);font-size:0.85rem;">Анализ файла…</span>
      </div>
    </div>
  `;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const metadata = extractEXIF(arrayBuffer, file);
    const imageUrl = URL.createObjectURL(file);

    displayResults(metadata, imageUrl, file);
    saveToHistory(metadata, file.name);
    toast('Метаданные извлечены', 'success');
  } catch (err) {
    toast('Ошибка обработки файла: ' + err.message, 'error');
    resultsEl.innerHTML = `<div class="alert alert-error">Ошибка: ${err.message}</div>`;
  }
}

function extractEXIF(buffer, file) {
  const meta = {
    _file: {
      'Имя файла':    file.name,
      'Тип файла':    file.type || 'неизвестно',
      'Размер файла': formatBytes(file.size),
      'Последнее изменение': file.lastModified
        ? new Date(file.lastModified).toLocaleString('ru-RU')
        : 'нет данных',
    },
    _exif: {},
    _gps: {},
    _camera: {},
  };

  // Only JPEG contains EXIF
  const view = new DataView(buffer);
  if (view.getUint16(0) !== 0xFFD8) {
    meta._note = 'Файл не является JPEG — EXIF-метаданные недоступны. Отображены только базовые сведения.';
    // Try to get image dimensions via Image element
    return meta;
  }

  let offset = 2;
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);
    offset += 2;

    if (marker === 0xFFE1) {
      // APP1 segment — contains EXIF
      const segLen = view.getUint16(offset);
      offset += 2;

      const exifHeader = String.fromCharCode(
        view.getUint8(offset), view.getUint8(offset+1),
        view.getUint8(offset+2), view.getUint8(offset+3)
      );

      if (exifHeader === 'Exif') {
        parseIFD(view, offset + 6, meta);
      }
      offset += segLen - 2;
    } else if ((marker & 0xFF00) === 0xFF00) {
      if (offset + 1 >= view.byteLength) break;
      const segLen = view.getUint16(offset);
      offset += segLen;
    } else {
      break;
    }
  }

  return meta;
}

function parseIFD(view, tiffStart, meta) {
  try {
    const littleEndian = view.getUint16(tiffStart) === 0x4949;
    const ifdOffset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);

    const numEntries = view.getUint16(ifdOffset, littleEndian);

    const TAG_NAMES = {
      0x010E: ['_exif', 'Описание'],
      0x010F: ['_camera', 'Производитель'],
      0x0110: ['_camera', 'Модель камеры'],
      0x0112: ['_exif', 'Ориентация'],
      0x011A: ['_exif', 'XResolution'],
      0x011B: ['_exif', 'YResolution'],
      0x0128: ['_exif', 'Единица разрешения'],
      0x0131: ['_camera', 'ПО (Software)'],
      0x0132: ['_exif', 'Дата изменения'],
      0x013B: ['_exif', 'Автор'],
      0x8769: null, // ExifIFD pointer
      0x8825: null, // GPS IFD pointer
      0x8827: ['_camera', 'ISO'],
      0x9000: ['_exif', 'Версия EXIF'],
      0x9003: ['_exif', 'Дата оригинала'],
      0x9004: ['_exif', 'Дата создания'],
      0x9201: ['_camera', 'Выдержка'],
      0x9202: ['_camera', 'Диафрагма'],
      0x9203: ['_camera', 'Яркость'],
      0x9204: ['_camera', 'Экспокоррекция'],
      0x9205: ['_camera', 'Макс. диафрагма'],
      0x9207: ['_camera', 'Режим замера'],
      0x9208: ['_camera', 'Источник света'],
      0x9209: ['_camera', 'Вспышка'],
      0x920A: ['_camera', 'Фокусное расстояние'],
      0xA001: ['_exif', 'Цветовое пространство'],
      0xA002: ['_exif', 'Ширина изображения'],
      0xA003: ['_exif', 'Высота изображения'],
      0xA20E: ['_exif', 'X DPI'],
      0xA20F: ['_exif', 'Y DPI'],
      0xA402: ['_camera', 'Режим экспозиции'],
      0xA403: ['_camera', 'Баланс белого'],
      0xA406: ['_camera', 'Тип сцены'],
      0xA430: ['_exif', 'Владелец камеры'],
      0xA431: ['_camera', 'Серийный номер'],
      0xA432: ['_camera', 'Данные объектива'],
      0xA433: ['_camera', 'Производитель объектива'],
      0xA434: ['_camera', 'Модель объектива'],
    };

    const GPS_TAGS = {
      0x0000: 'GPS версия',
      0x0001: 'GPS широта (N/S)',
      0x0002: 'GPS широта',
      0x0003: 'GPS долгота (E/W)',
      0x0004: 'GPS долгота',
      0x0005: 'GPS высота (ref)',
      0x0006: 'GPS высота',
      0x0007: 'GPS время (UTC)',
      0x0008: 'GPS спутники',
      0x0009: 'GPS статус',
      0x000C: 'GPS скорость (ref)',
      0x000D: 'GPS скорость',
      0x001D: 'GPS дата',
    };

    const readValue = (type, offset, count, le) => {
      try {
        if (type === 2) { // ASCII
          let s = '';
          for (let i = 0; i < count && offset + i < view.byteLength; i++) {
            const c = view.getUint8(offset + i);
            if (c === 0) break;
            s += String.fromCharCode(c);
          }
          return s.trim();
        }
        if (type === 3) return view.getUint16(offset, le); // SHORT
        if (type === 4) return view.getUint32(offset, le); // LONG
        if (type === 5) { // RATIONAL
          const num = view.getUint32(offset, le);
          const den = view.getUint32(offset + 4, le);
          return den === 0 ? 0 : (num / den).toFixed(4);
        }
        if (type === 10) { // SRATIONAL
          const num = view.getInt32(offset, le);
          const den = view.getInt32(offset + 4, le);
          return den === 0 ? 0 : (num / den).toFixed(4);
        }
        return null;
      } catch { return null; }
    };

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag   = view.getUint16(entryOffset, littleEndian);
      const type  = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);

      const TYPE_SIZES = [0,1,1,2,4,8,1,1,2,4,8,4,8];
      const typeSize = TYPE_SIZES[type] || 1;
      const valueSize = typeSize * count;

      let valueOffset;
      if (valueSize <= 4) {
        valueOffset = entryOffset + 8;
      } else {
        valueOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
      }

      // ExifIFD sub-pointer
      if (tag === 0x8769) {
        const subOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
        parseSubIFD(view, tiffStart, subOffset, littleEndian, meta, TAG_NAMES, readValue, TYPE_SIZES);
        continue;
      }

      // GPS IFD
      if (tag === 0x8825) {
        const gpsOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
        parseGPSIFD(view, tiffStart, gpsOffset, littleEndian, meta, GPS_TAGS, readValue, TYPE_SIZES);
        continue;
      }

      const tagInfo = TAG_NAMES[tag];
      if (!tagInfo) continue;

      const val = readValue(type, valueOffset, count, littleEndian);
      if (val !== null && val !== '' && val !== undefined) {
        meta[tagInfo[0]][tagInfo[1]] = String(val);
      }
    }
  } catch (e) {
    meta._parseError = 'Частичный разбор EXIF: ' + e.message;
  }
}

function parseSubIFD(view, tiffStart, ifdOffset, le, meta, TAG_NAMES, readValue, TYPE_SIZES) {
  try {
    const numEntries = view.getUint16(ifdOffset, le);
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;
      const tag  = view.getUint16(entryOffset, le);
      const type = view.getUint16(entryOffset + 2, le);
      const count= view.getUint32(entryOffset + 4, le);
      const typeSize = TYPE_SIZES[type] || 1;
      const valueSize = typeSize * count;
      let valueOffset = valueSize <= 4
        ? entryOffset + 8
        : tiffStart + view.getUint32(entryOffset + 8, le);

      const tagInfo = TAG_NAMES[tag];
      if (!tagInfo) continue;

      const val = readValue(type, valueOffset, count, le);
      if (val !== null && val !== '' && val !== undefined) {
        meta[tagInfo[0]][tagInfo[1]] = String(val);
      }
    }
  } catch {}
}

function parseGPSIFD(view, tiffStart, ifdOffset, le, meta, GPS_TAGS, readValue, TYPE_SIZES) {
  try {
    const numEntries = view.getUint16(ifdOffset, le);
    let latRef = '', lonRef = '';
    let latArr = null, lonArr = null;

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;
      const tag  = view.getUint16(entryOffset, le);
      const type = view.getUint16(entryOffset + 2, le);
      const count= view.getUint32(entryOffset + 4, le);
      const typeSize = TYPE_SIZES[type] || 1;
      const valueSize = typeSize * count;
      let valueOffset = valueSize <= 4
        ? entryOffset + 8
        : tiffStart + view.getUint32(entryOffset + 8, le);

      if (tag === 0x0001) {
        latRef = String.fromCharCode(view.getUint8(valueOffset));
      } else if (tag === 0x0003) {
        lonRef = String.fromCharCode(view.getUint8(valueOffset));
      } else if (tag === 0x0002) {
        // Latitude: 3 rationals
        try {
          const d = view.getUint32(valueOffset,le)/view.getUint32(valueOffset+4,le);
          const m = view.getUint32(valueOffset+8,le)/view.getUint32(valueOffset+12,le);
          const s = view.getUint32(valueOffset+16,le)/view.getUint32(valueOffset+20,le);
          latArr = [d,m,s];
        } catch {}
      } else if (tag === 0x0004) {
        try {
          const d = view.getUint32(valueOffset,le)/view.getUint32(valueOffset+4,le);
          const m = view.getUint32(valueOffset+8,le)/view.getUint32(valueOffset+12,le);
          const s = view.getUint32(valueOffset+16,le)/view.getUint32(valueOffset+20,le);
          lonArr = [d,m,s];
        } catch {}
      } else {
        const name = GPS_TAGS[tag];
        if (name) {
          const val = readValue(type, valueOffset, count, le);
          if (val !== null && val !== '') meta._gps[name] = String(val);
        }
      }
    }

    // Convert DMS to decimal
    if (latArr) {
      const lat = (latArr[0] + latArr[1]/60 + latArr[2]/3600) * (latRef === 'S' ? -1 : 1);
      meta._gps['Широта (decimal)'] = lat.toFixed(6);
      meta._gps['Широта (DMS)'] = `${latArr[0].toFixed(0)}° ${latArr[1].toFixed(0)}' ${latArr[2].toFixed(2)}" ${latRef}`;
    }
    if (lonArr) {
      const lon = (lonArr[0] + lonArr[1]/60 + lonArr[2]/3600) * (lonRef === 'W' ? -1 : 1);
      meta._gps['Долгота (decimal)'] = lon.toFixed(6);
      meta._gps['Долгота (DMS)'] = `${lonArr[0].toFixed(0)}° ${lonArr[1].toFixed(0)}' ${lonArr[2].toFixed(2)}" ${lonRef}`;
    }
  } catch {}
}

function displayResults(meta, imageUrl, file) {
  const resultsEl = document.getElementById('exifResults');
  if (!resultsEl) return;

  const hasGPS = Object.keys(meta._gps).length > 0;
  const hasCamera = Object.keys(meta._camera).length > 0;
  const hasExif = Object.keys(meta._exif).length > 0;

  const lat = meta._gps['Широта (decimal)'];
  const lon = meta._gps['Долгота (decimal)'];
  const mapLink = lat && lon
    ? `<a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="margin-top:10px;">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
         Открыть на карте
       </a>`
    : '';

  resultsEl.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
      <div style="flex-shrink:0;">
        <img src="${imageUrl}" alt="preview" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">
      </div>
      <div style="flex:1;min-width:180px;">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:6px;">${escHtml(file.name)}</h3>
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">${file.type} · ${formatBytes(file.size)}</p>
        ${meta._note ? `<div class="alert alert-warn">${meta._note}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-red btn-sm" id="copyResultBtn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Копировать
          </button>
          <button class="btn btn-ghost btn-sm" id="exportJsonBtn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            JSON
          </button>
        </div>
      </div>
    </div>

    ${renderSection('Файл', meta._file)}
    ${hasExif ? renderSection('EXIF метаданные', meta._exif) : ''}
    ${hasCamera ? renderSection('Камера / Объектив', meta._camera) : ''}
    ${hasGPS ? `
      <div class="sec-title" style="margin-top:20px;">GPS координаты</div>
      <div class="card" style="padding:0;overflow:hidden;">
        <table><tbody>
          ${Object.entries(meta._gps).map(([k,v]) => `<tr><td>${escHtml(k)}</td><td>${escHtml(v)}</td></tr>`).join('')}
        </tbody></table>
      </div>
      ${mapLink}
    ` : ''}

    ${!hasExif && !hasCamera && !hasGPS
      ? `<div class="alert alert-info" style="margin-top:12px;">
           EXIF-данные в этом файле не обнаружены или недоступны. Это нормально для PNG, WebP и изображений, прошедших через соцсети (которые автоматически удаляют метаданные).
         </div>`
      : ''}
  `;

  document.getElementById('copyResultBtn').addEventListener('click', () => {
    const text = flattenMeta(meta);
    navigator.clipboard.writeText(text).then(() => toast('Скопировано!', 'success'));
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    downloadJSON({ file: meta._file, exif: meta._exif, camera: meta._camera, gps: meta._gps }, file.name.replace(/\.[^.]+$/, '') + '_exif.json');
    toast('JSON сохранён', 'success');
  });
}

function renderSection(title, obj) {
  if (!obj || Object.keys(obj).length === 0) return '';
  return `
    <div class="sec-title" style="margin-top:20px;">${title}</div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="tbl-wrap">
        <table><tbody>
          ${Object.entries(obj).map(([k,v]) => `<tr><td>${escHtml(k)}</td><td>${escHtml(v)}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>
  `;
}

function flattenMeta(meta) {
  const lines = [];
  const add = obj => Object.entries(obj).forEach(([k,v]) => lines.push(`${k}: ${v}`));
  if (meta._file) add(meta._file);
  if (meta._exif) add(meta._exif);
  if (meta._camera) add(meta._camera);
  if (meta._gps) add(meta._gps);
  return lines.join('\n');
}

function saveToHistory(meta, name) {
  const history = JSON.parse(localStorage.getItem('spectre_exif_history') || '[]');
  history.push({ name, date: new Date().toISOString(), hasgps: Object.keys(meta._gps||{}).length > 0 });
  if (history.length > 50) history.shift();
  localStorage.setItem('spectre_exif_history', JSON.stringify(history));
}

function showHistory() {
  const history = JSON.parse(localStorage.getItem('spectre_exif_history') || '[]');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">История EXIF-анализов</div>
        <button class="modal-x" id="closeModal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      ${history.length === 0
        ? '<div class="empty"><p>История пуста</p></div>'
        : `<div class="tbl-wrap">
             <table>
               <thead><tr><th>Файл</th><th>Дата</th><th>GPS</th></tr></thead>
               <tbody>
                 ${history.slice().reverse().map(h => `
                   <tr>
                     <td>${escHtml(h.name)}</td>
                     <td>${new Date(h.date).toLocaleString('ru-RU')}</td>
                     <td><span class="tag ${h.hasgps ? 'tag-green' : 'tag-yellow'}">${h.hasgps ? 'ДА' : 'НЕТ'}</span></td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>
           </div>`
      }
      <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px;">
        ${history.length > 0 ? '<button class="btn btn-danger btn-sm" id="clearHistory">Очистить историю</button>' : ''}
        <button class="btn btn-ghost btn-sm" id="closeModal2">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#closeModal').onclick = () => overlay.remove();
  overlay.querySelector('#closeModal2').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  const clr = overlay.querySelector('#clearHistory');
  if (clr) clr.onclick = () => {
    localStorage.removeItem('spectre_exif_history');
    overlay.remove();
    toast('История очищена', 'info');
  };
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
