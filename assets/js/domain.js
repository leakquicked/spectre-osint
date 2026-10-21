// ============================================================
// SPECTRE — Domain Intelligence Module
// ============================================================

import { toast } from './app.js';

export function renderDomain(container) {
  container.innerHTML = `
    <div class="mod-head">
      <div>
        <div class="mod-title">Domain Intelligence</div>
        <div class="mod-sub">RDAP lookup, DNS-запросы через публичные DoH (DNS-over-HTTPS) сервисы</div>
      </div>
    </div>

    <div class="card section">
      <div class="inp-row">
        <input type="text" class="inp" id="domainInput" placeholder="example.com или https://example.com/page" autocomplete="off" spellcheck="false">
        <button class="btn btn-red" id="lookupBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Анализ
        </button>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;" id="quickDomains">
        ${['google.com','github.com','cloudflare.com'].map(d =>
          `<button class="btn btn-ghost btn-sm quick-domain" data-d="${d}">${d}</button>`
        ).join('')}
      </div>
    </div>

    <div id="domainResults"></div>

    <div class="sec-title" style="margin-top:24px;">История поиска</div>
    <div id="domainHistory" class="card" style="padding:0;overflow:hidden;"></div>
  `;

  const input  = container.querySelector('#domainInput');
  const btn    = container.querySelector('#lookupBtn');

  btn.addEventListener('click', () => runLookup(input.value.trim()));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runLookup(input.value.trim()); });

  container.querySelectorAll('.quick-domain').forEach(b => {
    b.addEventListener('click', () => {
      input.value = b.dataset.d;
      runLookup(b.dataset.d);
    });
  });

  renderHistory();
}

function extractDomain(raw) {
  raw = raw.trim();
  if (!raw) return null;
  try {
    if (!raw.includes('://')) raw = 'https://' + raw;
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return raw.replace(/^www\./, '').split('/')[0].split('?')[0];
  }
}

async function runLookup(raw) {
  const domain = extractDomain(raw);
  if (!domain) { toast('Введите домен', 'warn'); return; }

  const resultsEl = document.getElementById('domainResults');
  resultsEl.innerHTML = `
    <div class="card" style="margin-top:16px;">
      <div class="card-title" style="margin-bottom:16px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
        Анализ домена: <span style="color:var(--accent)">${escHtml(domain)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="dots"><span></span><span></span><span></span></div>
        <span style="color:var(--text-muted);font-size:0.85rem;">Выполняю запросы…</span>
      </div>
    </div>
  `;

  const [rdap, dns] = await Promise.all([
    fetchRDAP(domain),
    fetchDNS(domain),
  ]);

  displayDomainResults(domain, rdap, dns);
  saveHistory(domain);
  renderHistory();
}

async function fetchRDAP(domain) {
  const RDAP_SERVERS = [
    `https://rdap.org/domain/${domain}`,
    `https://rdap.iana.org/domain/${domain}`,
  ];

  for (const url of RDAP_SERVERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') return { _error: 'Таймаут запроса (8с)' };
      continue;
    }
  }
  return { _error: 'CORS или сервер недоступен. RDAP-запросы блокируются браузером с GitHub Pages. Попробуйте rdap.org напрямую.' };
}

async function fetchDNS(domain) {
  const types = ['A','AAAA','MX','NS','TXT','CNAME'];
  const results = {};

  // Cloudflare DoH
  const base = 'https://cloudflare-dns.com/dns-query';

  await Promise.all(types.map(async type => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { Accept: 'application/dns-json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) { results[type] = { error: 'HTTP ' + res.status }; return; }
      const data = await res.json();
      results[type] = data.Answer || [];
    } catch (e) {
      results[type] = { error: e.name === 'AbortError' ? 'Таймаут' : e.message };
    }
  }));

  return results;
}

function displayDomainResults(domain, rdap, dns) {
  const resultsEl = document.getElementById('domainResults');

  // Parse RDAP
  let rdapHtml = '';
  if (rdap._error) {
    rdapHtml = `<div class="alert alert-warn">${rdap._error}</div>`;
  } else {
    const fields = {};
    if (rdap.ldhName) fields['Домен'] = rdap.ldhName;
    if (rdap.handle) fields['Handle (RDAP)'] = rdap.handle;
    if (rdap.status) fields['Статус'] = rdap.status.join(', ');

    // Dates
    (rdap.events||[]).forEach(ev => {
      const map = {
        registration: 'Дата регистрации',
        expiration: 'Дата истечения',
        'last changed': 'Последнее изменение',
        transfer: 'Дата переноса',
      };
      if (map[ev.eventAction]) fields[map[ev.eventAction]] = new Date(ev.eventDate).toLocaleDateString('ru-RU');
    });

    // Nameservers
    const ns = (rdap.nameservers||[]).map(n => n.ldhName).filter(Boolean);
    if (ns.length) fields['Nameservers'] = ns.join(', ');

    // Registrar
    const registrar = (rdap.entities||[]).find(e => (e.roles||[]).includes('registrar'));
    if (registrar) {
      const vcard = registrar.vcardArray?.[1] || [];
      const fn = vcard.find(v => v[0]==='fn');
      if (fn) fields['Регистратор'] = fn[3];
      if (registrar.handle) fields['Registrar IANA ID'] = registrar.handle;
      const url = (registrar.links||[]).find(l => l.rel==='related');
      if (url) fields['URL регистратора'] = url.href;
    }

    rdapHtml = Object.keys(fields).length > 0
      ? `<div class="tbl-wrap"><table><tbody>${
          Object.entries(fields).map(([k,v])=>`<tr><td>${escHtml(k)}</td><td>${escHtml(v)}</td></tr>`).join('')
        }</tbody></table></div>`
      : `<div class="alert alert-info">RDAP вернул ответ, но структура нераспознана. Попробуйте <a href="https://rdap.org/#${domain}" target="_blank" rel="noopener" style="color:var(--accent)">rdap.org</a></div>`;
  }

  // DNS table
  const dnsRows = [];
  Object.entries(dns).forEach(([type, answers]) => {
    if (answers.error) {
      dnsRows.push(`<tr><td>${type}</td><td colspan="2" style="color:var(--text-muted)">${answers.error}</td></tr>`);
    } else if (Array.isArray(answers) && answers.length > 0) {
      answers.forEach(a => {
        dnsRows.push(`<tr><td><span class="tag tag-blue">${type}</span></td><td>${escHtml(a.data||'')}</td><td style="color:var(--text-muted)">${a.TTL||''}s</td></tr>`);
      });
    } else {
      dnsRows.push(`<tr><td>${type}</td><td colspan="2" style="color:var(--text-muted)">—</td></tr>`);
    }
  });

  const exportData = { domain, timestamp: new Date().toISOString(), rdap, dns };

  resultsEl.innerHTML = `
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <h2 style="font-size:1.1rem;font-weight:700;">
          <span style="color:var(--accent)">${escHtml(domain)}</span>
        </h2>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" id="copyDomainBtn">Копировать</button>
          <button class="btn btn-ghost btn-sm" id="exportDomainBtn">JSON</button>
          <a href="https://search.censys.io/search?resource=hosts&q=${encodeURIComponent(domain)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Censys →</a>
          <a href="https://www.shodan.io/search?query=${encodeURIComponent(domain)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Shodan →</a>
        </div>
      </div>

      <div class="sec-title">WHOIS / RDAP</div>
      <div class="card" style="padding:0;overflow:hidden;">${rdapHtml}</div>

      <div class="sec-title">DNS Records (via Cloudflare DoH)</div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Тип</th><th>Значение</th><th>TTL</th></tr></thead>
            <tbody>${dnsRows.join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="sec-title">Внешние ресурсы</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">VirusTotal</a>
        <a href="https://securitytrails.com/domain/${encodeURIComponent(domain)}/dns" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">SecurityTrails</a>
        <a href="https://www.whois.com/whois/${encodeURIComponent(domain)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">WHOIS.com</a>
        <a href="https://crt.sh/?q=${encodeURIComponent(domain)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">crt.sh (SSL)</a>
        <a href="https://web.archive.org/web/*/${encodeURIComponent(domain)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Wayback Machine</a>
        <a href="https://dnsdumpster.com/" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">DNSDumpster</a>
      </div>
    </div>
  `;

  document.getElementById('copyDomainBtn').addEventListener('click', () => {
    const text = `Домен: ${domain}\nRDAP: ${JSON.stringify(exportData.rdap, null, 2)}\nDNS: ${JSON.stringify(exportData.dns, null, 2)}`;
    navigator.clipboard.writeText(text).then(() => toast('Скопировано!', 'success'));
  });

  document.getElementById('exportDomainBtn').addEventListener('click', () => {
    downloadJSON(exportData, domain + '_intel.json');
    toast('JSON сохранён', 'success');
  });
}

function saveHistory(domain) {
  const history = JSON.parse(localStorage.getItem('spectre_domain_history') || '[]');
  // Remove existing entry for same domain
  const filtered = history.filter(h => h.domain !== domain);
  filtered.push({ domain, date: new Date().toISOString() });
  if (filtered.length > 30) filtered.shift();
  localStorage.setItem('spectre_domain_history', JSON.stringify(filtered));
}

function renderHistory() {
  const el = document.getElementById('domainHistory');
  if (!el) return;
  const history = JSON.parse(localStorage.getItem('spectre_domain_history') || '[]');

  if (history.length === 0) {
    el.innerHTML = `<div class="empty" style="padding:24px;"><p>История пуста</p></div>`;
    return;
  }

  el.innerHTML = `<table>
    <thead><tr><th>Домен</th><th>Дата</th><th></th></tr></thead>
    <tbody>
      ${history.slice().reverse().map(h => `
        <tr>
          <td style="font-family:var(--font);font-size:0.87rem;font-weight:500;">${escHtml(h.domain)}</td>
          <td>${new Date(h.date).toLocaleString('ru-RU')}</td>
          <td style="text-align:right;">
            <button class="btn btn-ghost btn-sm repeat-lookup" data-d="${escHtml(h.domain)}">Повторить</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;

  el.querySelectorAll('.repeat-lookup').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('domainInput');
      if (input) { input.value = btn.dataset.d; }
      runLookup(btn.dataset.d);
    });
  });
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
