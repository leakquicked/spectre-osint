// ============================================================
// SPECTRE — Link Analysis Graph Module (Canvas)
// ============================================================

import { toast } from './app.js';

const NODE_TYPES = {
  Domain:   { color: '#00d4ff', icon: '🌐' },
  IP:       { color: '#22c55e', icon: '🖥' },
  Email:    { color: '#f59e0b', icon: '✉️' },
  Person:   { color: '#a78bfa', icon: '👤' },
  URL:      { color: '#60a5fa', icon: '🔗' },
  Org:      { color: '#fb923c', icon: '🏢' },
  File:     { color: '#94a3b8', icon: '📄' },
  Image:    { color: '#f472b6', icon: '🖼' },
  Social:   { color: '#34d399', icon: '💬' },
  Evidence: { color: '#fbbf24', icon: '🔍' },
  Note:     { color: '#6b7280', icon: '📝' },
};

let nodes = [], edges = [], selectedNode = null;
let dragging = null, dragOffX = 0, dragOffY = 0;
let panX = 0, panY = 0, scale = 1;
let isPanning = false, panStartX = 0, panStartY = 0;
let connectMode = false, connectSource = null;
let canvas, ctx;

export function renderGraph(container) {
  load();

  container.innerHTML = `
    <div class="mod-head">
      <div>
        <div class="mod-title">Link Analysis</div>
        <div class="mod-sub">Визуальный граф связей — перетаскивайте узлы, создавайте связи</div>
      </div>
      <div class="mod-actions">
        <button class="btn btn-ghost btn-sm" id="gImportBtn">Импорт JSON</button>
        <button class="btn btn-ghost btn-sm" id="gExportBtn">Экспорт JSON</button>
        <button class="btn btn-danger btn-sm" id="gClearBtn">Очистить</button>
      </div>
    </div>

    <div class="graph-toolbar">
      <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;margin-right:4px;">ДОБАВИТЬ:</span>
      ${Object.keys(NODE_TYPES).map(t =>
        `<button class="node-type-btn" data-type="${t}">${NODE_TYPES[t].icon} ${t}</button>`
      ).join('')}
      <div style="margin-left:auto;display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm" id="connectModeBtn" title="Режим связи">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          Связать
        </button>
        <button class="btn btn-ghost btn-sm" id="gResetView">Сброс вида</button>
        <button class="btn btn-ghost btn-sm" id="gDeleteSelected" style="display:none;">🗑 Удалить</button>
      </div>
    </div>

    <div style="display:flex;gap:12px;align-items:flex-start;">
      <div style="flex:1;min-width:0;">
        <canvas id="graphCanvas"></canvas>
        <div style="margin-top:8px;font-size:0.72rem;color:var(--text-muted);text-align:center;">
          Колесо мыши — масштаб · Правая кнопка / пространство + drag — панорама · Клик по узлу — выбор · <span id="connectModeHint"></span>
        </div>
      </div>
      <div class="graph-sidebar">
        <div class="card" id="nodePropsPanel" style="display:none;">
          <div class="card-title" style="margin-bottom:12px;">Свойства узла</div>
          <div class="sec" style="margin-bottom:10px;">
            <label class="lbl">Метка</label>
            <input class="inp" id="nodeLabelInput" type="text" autocomplete="off">
          </div>
          <div class="sec" style="margin-bottom:10px;">
            <label class="lbl">Описание</label>
            <textarea class="inp" id="nodeDescInput" rows="3"></textarea>
          </div>
          <div class="sec" style="margin-bottom:12px;">
            <label class="lbl">Источник</label>
            <input class="inp" id="nodeSourceInput" type="text" placeholder="URL или название">
          </div>
          <button class="btn btn-red btn-sm" id="saveNodeBtn" style="width:100%;justify-content:center;">Сохранить</button>
        </div>

        <div class="card" id="graphStats">
          <div class="card-title" style="margin-bottom:10px;">Граф</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
              <span style="color:var(--text-muted);">Узлы</span>
              <span id="statsNodes" style="font-family:var(--font-mono);color:var(--accent)">0</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
              <span style="color:var(--text-muted);">Связи</span>
              <span id="statsEdges" style="font-family:var(--font-mono);color:var(--accent)">0</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:8px;">Легенда</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${Object.entries(NODE_TYPES).map(([t,c]) =>
              `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary);">
                 <div style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;"></div>
                 ${t}
               </div>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>

    <div id="graphTooltip"></div>
    <input type="file" id="gImportFile" accept=".json" style="display:none">
  `;

  canvas = container.querySelector('#graphCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  bindEvents(container);
  draw();
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width || 800;
  canvas.height = 520;
  draw();
}

// ── Draw ────────────────────────────────────────────────────
function draw() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background grid
  ctx.save();
  ctx.strokeStyle = 'rgba(0,212,255,0.04)';
  ctx.lineWidth = 1;
  const step = 40 * scale;
  const offX = (panX % step + step) % step;
  const offY = (panY % step + step) % step;
  for (let x = offX; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = offY; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(scale, scale);

  // Draw edges
  edges.forEach(e => {
    const a = nodes.find(n => n.id === e.from);
    const b = nodes.find(n => n.id === e.to);
    if (!a || !b) return;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(0,212,255,0.3)';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();

    // Arrow
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const r = 22;
    const ax = b.x - Math.cos(angle) * r;
    const ay = b.y - Math.sin(angle) * r;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 8/scale * Math.cos(angle - 0.4), ay - 8/scale * Math.sin(angle - 0.4));
    ctx.lineTo(ax - 8/scale * Math.cos(angle + 0.4), ay - 8/scale * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,212,255,0.5)';
    ctx.fill();

    // Edge label
    if (e.label) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.font = `${10/scale}px system-ui`;
      ctx.fillStyle = 'rgba(138,155,181,0.8)';
      ctx.textAlign = 'center';
      ctx.fillText(e.label, mx, my - 4/scale);
    }
  });

  // Draw nodes
  nodes.forEach(n => {
    const cfg = NODE_TYPES[n.type] || NODE_TYPES.Note;
    const r = 22;
    const isSelected = selectedNode?.id === n.id;
    const isConnSrc = connectSource?.id === n.id;

    // Glow
    if (isSelected || isConnSrc) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r + 8);
      grad.addColorStop(0, isConnSrc ? 'rgba(245,158,11,0.5)' : 'rgba(0,212,255,0.4)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Circle fill
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color + '22';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#ffffff' : cfg.color;
    ctx.lineWidth = isSelected ? 2.5 / scale : 1.8 / scale;
    ctx.stroke();

    // Icon
    ctx.font = `${14/scale}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg.icon, n.x, n.y);

    // Label
    ctx.font = `bold ${11/scale}px system-ui`;
    ctx.fillStyle = '#e8edf5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = n.label.length > 18 ? n.label.slice(0, 16) + '…' : n.label;
    ctx.fillText(label, n.x, n.y + r + 4/scale);
  });

  ctx.restore();
  updateStats();
}

// ── Events ──────────────────────────────────────────────────
function bindEvents(container) {
  // Add node buttons
  container.querySelectorAll('.node-type-btn').forEach(btn => {
    btn.addEventListener('click', () => addNode(btn.dataset.type, container));
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    panX = mx - (mx - panX) * delta;
    panY = my - (my - panY) * delta;
    scale = Math.min(Math.max(scale * delta, 0.2), 4);
    draw();
  }, { passive: false });

  canvas.addEventListener('mousedown', e => {
    const { wx, wy } = toWorld(e);

    if (e.button === 2 || e.button === 1) {
      isPanning = true;
      panStartX = e.clientX - panX;
      panStartY = e.clientY - panY;
      canvas.style.cursor = 'grabbing';
      return;
    }

    const hit = hitTest(wx, wy);

    if (connectMode) {
      if (hit) {
        if (!connectSource) {
          connectSource = hit;
          toast(`Выбран источник: ${hit.label}. Нажмите на узел-цель.`, 'info', 2000);
          draw();
        } else if (connectSource.id !== hit.id) {
          const label = prompt('Метка связи (необязательно):') || '';
          edges.push({ id: uid(), from: connectSource.id, to: hit.id, label });
          save();
          connectSource = null;
          connectMode = false;
          document.getElementById('connectModeBtn').classList.remove('active');
          document.getElementById('connectModeHint').textContent = '';
          toast('Связь создана', 'success');
          draw();
        }
      }
      return;
    }

    if (hit) {
      dragging = hit;
      dragOffX = wx - hit.x;
      dragOffY = wy - hit.y;
      selectNode(hit, container);
    } else {
      selectNode(null, container);
      isPanning = true;
      panStartX = e.clientX - panX;
      panStartY = e.clientY - panY;
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (isPanning) {
      panX = e.clientX - panStartX;
      panY = e.clientY - panStartY;
      draw();
      return;
    }

    if (dragging) {
      const { wx, wy } = toWorld(e);
      dragging.x = wx - dragOffX;
      dragging.y = wy - dragOffY;
      draw();
      return;
    }

    // Tooltip
    const { wx, wy } = toWorld(e);
    const hit = hitTest(wx, wy);
    const tooltip = document.getElementById('graphTooltip');
    if (hit && tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top = (e.clientY + 14) + 'px';
      tooltip.innerHTML = `<strong>${escHtml(hit.label)}</strong><br><span style="color:var(--text-muted)">${hit.type}</span>${hit.desc ? '<br>' + escHtml(hit.desc.slice(0,80)) : ''}`;
      canvas.style.cursor = 'pointer';
    } else {
      if (tooltip) tooltip.style.display = 'none';
      canvas.style.cursor = connectMode ? 'crosshair' : 'default';
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (dragging) { save(); dragging = null; }
    isPanning = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Connect mode
  container.querySelector('#connectModeBtn').addEventListener('click', () => {
    connectMode = !connectMode;
    connectSource = null;
    const btn = document.getElementById('connectModeBtn');
    btn.classList.toggle('active', connectMode);
    const hint = document.getElementById('connectModeHint');
    hint.textContent = connectMode ? 'Режим связи: нажмите источник, затем цель' : '';
    if (connectMode) toast('Режим связи: нажмите на исходный узел', 'info', 2000);
    draw();
  });

  // Reset view
  container.querySelector('#gResetView').addEventListener('click', () => {
    panX = 0; panY = 0; scale = 1; draw();
  });

  // Delete selected
  container.querySelector('#gDeleteSelected').addEventListener('click', () => {
    if (!selectedNode) return;
    if (!confirm(`Удалить узел "${selectedNode.label}"?`)) return;
    nodes = nodes.filter(n => n.id !== selectedNode.id);
    edges = edges.filter(e => e.from !== selectedNode.id && e.to !== selectedNode.id);
    selectedNode = null;
    document.getElementById('nodePropsPanel').style.display = 'none';
    document.getElementById('gDeleteSelected').style.display = 'none';
    save(); draw();
    toast('Узел удалён', 'info');
  });

  // Node props save
  container.querySelector('#saveNodeBtn').addEventListener('click', () => {
    if (!selectedNode) return;
    selectedNode.label  = container.querySelector('#nodeLabelInput').value || selectedNode.label;
    selectedNode.desc   = container.querySelector('#nodeDescInput').value;
    selectedNode.source = container.querySelector('#nodeSourceInput').value;
    save(); draw();
    toast('Сохранено', 'success');
  });

  // Export
  container.querySelector('#gExportBtn').addEventListener('click', () => {
    const data = { nodes, edges, meta: { exported: new Date().toISOString() } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'spectre_graph.json'; a.click();
    URL.revokeObjectURL(url);
    toast('Граф экспортирован', 'success');
  });

  // Import
  container.querySelector('#gImportBtn').addEventListener('click', () => {
    container.querySelector('#gImportFile').click();
  });
  container.querySelector('#gImportFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Неверный формат');
        nodes = data.nodes;
        edges = data.edges || [];
        save(); draw();
        toast(`Импортировано: ${nodes.length} узлов, ${edges.length} связей`, 'success');
      } catch (err) {
        toast('Ошибка импорта: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Clear
  container.querySelector('#gClearBtn').addEventListener('click', () => {
    if (!confirm('Очистить весь граф?')) return;
    nodes = []; edges = [];
    selectedNode = null;
    document.getElementById('nodePropsPanel').style.display = 'none';
    document.getElementById('gDeleteSelected').style.display = 'none';
    save(); draw();
    toast('Граф очищен', 'info');
  });
}

function addNode(type, container) {
  const label = prompt(`Метка узла (${type}):`, type);
  if (!label) return;
  const cx = (canvas.width / 2 - panX) / scale;
  const cy = (canvas.height / 2 - panY) / scale;
  const spread = 80;
  const node = {
    id: uid(),
    type,
    label,
    x: cx + (Math.random() - 0.5) * spread,
    y: cy + (Math.random() - 0.5) * spread,
    desc: '',
    source: '',
  };
  nodes.push(node);
  selectNode(node, container);
  save(); draw();
  toast(`Узел "${label}" добавлен`, 'success');
}

function selectNode(node, container) {
  selectedNode = node;
  const panel = document.getElementById('nodePropsPanel');
  const delBtn = document.getElementById('gDeleteSelected');
  if (node) {
    panel.style.display = '';
    delBtn.style.display = '';
    document.getElementById('nodeLabelInput').value = node.label;
    document.getElementById('nodeDescInput').value = node.desc || '';
    document.getElementById('nodeSourceInput').value = node.source || '';
  } else {
    panel.style.display = 'none';
    delBtn.style.display = 'none';
  }
  draw();
}

function hitTest(wx, wy) {
  return nodes.find(n => Math.hypot(n.x - wx, n.y - wy) < 24) || null;
}

function toWorld(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    wx: (e.clientX - rect.left - panX) / scale,
    wy: (e.clientY - rect.top - panY) / scale,
  };
}

function updateStats() {
  const ns = document.getElementById('statsNodes');
  const es = document.getElementById('statsEdges');
  if (ns) ns.textContent = nodes.length;
  if (es) es.textContent = edges.length;
}

function save() {
  localStorage.setItem('spectre_graph', JSON.stringify({ nodes, edges }));
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem('spectre_graph') || '{}');
    nodes = data.nodes || [];
    edges = data.edges || [];
  } catch {
    nodes = []; edges = [];
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
