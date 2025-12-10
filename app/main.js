const API = '/error-service/ErrorLogs';

const $tbody = document.querySelector('#logs-table tbody');
const $refresh = document.getElementById('refresh');
const dailyCtx = document.getElementById('dailyChart').getContext('2d');
const sourceCtx = document.getElementById('sourceChart').getContext('2d');

const $level = document.getElementById('filter-level');
const $source = document.getElementById('filter-source');
const $from = document.getElementById('filter-from');
const $to = document.getElementById('filter-to');
const $q = document.getElementById('filter-q');
const $pageInfo = document.getElementById('pageInfo');
const $prevPage = document.getElementById('prevPage');
const $nextPage = document.getElementById('nextPage');
const $pageSize = document.getElementById('pageSize');

let dailyChart, sourceChart;
let currentPage = 1;
let totalPages = 1;

async function loadLogs(page = 1) {
  const pageSize = parseInt($pageSize.value, 10) || 10;
  currentPage = page;
  const skip = (page - 1) * pageSize;

  const filters = [];
  if ($level.value) filters.push(`level eq '${$level.value}'`);
  if ($source.value) filters.push(`source eq '${$source.value}'`);
  if ($from.value) filters.push(`timestamp ge ${formatDateFilter($from.value)}`);
  if ($to.value) filters.push(`timestamp le ${formatDateFilter($to.value, true)}`);

  let qFilter = '';
  if ($q.value && $q.value.trim()) {
    // fallback: server-side contains isn't always available; do client-side search later
    qFilter = $q.value.trim().toLowerCase();
  }

  const qs = [];
  qs.push('$count=true');
  qs.push(`$orderby=timestamp desc`);
  qs.push(`$top=${pageSize}`);
  qs.push(`$skip=${skip}`);
  if (filters.length) qs.push(`$filter=${filters.join(' and ')}`);

  try {
    const url = API + '?' + qs.join('&');
    const res = await fetch(url);
    const json = await res.json();
    let items = json.value || [];
    if (qFilter) {
      const q = qFilter;
      items = items.filter(it => ((it.message||'')+ ' ' + (it.description||'')).toLowerCase().includes(q));
    }

    renderTable(items);
    // load chart data for the last 7 days (separate call to ensure full range)
    await loadChartDataForLast7Days();

    const count = json['@odata.count'] || items.length;
    totalPages = Math.max(1, Math.ceil(count / pageSize));
    $pageInfo.textContent = `${currentPage} / ${totalPages}`;
    $prevPage.disabled = currentPage <= 1;
    $nextPage.disabled = currentPage >= totalPages;

    // populate source dropdown with received items (simple heuristic)
    populateSourceOptions(json.value || []);
  } catch (e) {
    console.error('Failed to load logs', e);
  }
}

function formatDateFilter(dateStr, endOfDay=false) {
  // dateStr is YYYY-MM-DD
  if (endOfDay) return `${dateStr}T23:59:59Z`;
  return `${dateStr}T00:00:00Z`;
}

function renderTable(items) {
  $tbody.innerHTML = '';
  items.forEach(it => {
    const tr = document.createElement('tr');
    const ts = it.timestamp ? new Date(it.timestamp).toLocaleString() : '—';
    tr.innerHTML = `<td>${it.ID}</td><td>${ts}</td><td>${it.level||''}</td><td>${escapeHtml(it.message||'')}</td><td>${escapeHtml(it.description||'')}</td><td>${escapeHtml(it.source||'')}</td>`;
    $tbody.appendChild(tr);
  });
}

async function loadChartDataForLast7Days(){
  // compute start and end in UTC for last 7 days (inclusive)
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 6); // last 7 days including today
  const startStr = start.toISOString().slice(0,10) + 'T00:00:00Z';
  const endStr = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(),23,59,59)).toISOString().slice(0,19) + 'Z';

  // Some OData backends require quoting or different datetime syntax.
  // Request a reasonably large page and filter client-side for robustness.
  const url = API + '?%24top=10000&%24orderby=timestamp%20desc';
  try {
    const res = await fetch(url);
    const json = await res.json();
    const all = json.value || [];
    const items = all.filter(it => {
      if (!it.timestamp) return false;
      const t = new Date(it.timestamp);
      return t >= new Date(startStr) && t <= new Date(endStr);
    });
    renderChartsForWeek(items, start);
  } catch (e) {
    console.error('Failed to load chart data', e);
  }
}

function renderChartsForWeek(items, startDate) {
  // build labels for 7 days
  const labels = [];
  for (let i=0;i<7;i++){
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    labels.push(d.toISOString().slice(0,10));
  }

  const counts = labels.map(_=>0);
  const countsBySource = {};
  items.forEach(it => {
    if (!it.timestamp) return;
    const day = new Date(it.timestamp).toISOString().slice(0,10);
    const idx = labels.indexOf(day);
    if (idx >= 0) counts[idx]++;
    const src = it.source || 'unknown';
    countsBySource[src] = (countsBySource[src]||0) + 1;
  });

  if (dailyChart) {
    dailyChart.data.labels = labels;
    dailyChart.data.datasets[0].data = counts;
    dailyChart.update();
  } else {
    dailyChart = new Chart(dailyCtx, {
      type: 'line',
      data: { labels: labels, datasets: [{label:'Errors',data:counts,borderColor:'#c0392b',backgroundColor:'rgba(192,57,43,0.1)'}]},
      options: { responsive:true }
    });
  }

  const srcLabels = Object.keys(countsBySource);
  const srcData = srcLabels.map(s=>countsBySource[s]);
  // when there's no data, show a placeholder slice so the pie remains visible
  if (srcLabels.length === 0) {
    srcLabels.splice(0, srcLabels.length, 'No data');
    srcData.splice(0, srcData.length, 1);
  }

  if (sourceChart) {
    sourceChart.data.labels = srcLabels;
    sourceChart.data.datasets[0].data = srcData;
    sourceChart.update();
  } else {
    sourceChart = new Chart(sourceCtx, {
      type: 'pie',
      data: { labels: srcLabels, datasets: [{data:srcData,backgroundColor: srcLabels.map((_,i)=>randomColor(i))}] },
      options: { responsive:true }
    });
  }
}

function populateSourceOptions(items) {
  const set = new Set();
  items.forEach(it => set.add(it.source || 'unknown'));
  const existing = Array.from($source.options).map(o=>o.value);
  set.forEach(s => {
    if (!existing.includes(s)) {
      const opt = document.createElement('option'); opt.value = s; opt.textContent = s; $source.appendChild(opt);
    }
  });
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function randomColor(i){
  const palette = ['#1976d2','#c0392b','#27ae60','#f39c12','#8e44ad','#2c3e50','#d35400'];
  return palette[i%palette.length];
}

$refresh.addEventListener('click', ()=>loadLogs(1));
$prevPage.addEventListener('click', ()=>{ if (currentPage>1) loadLogs(currentPage-1); });
$nextPage.addEventListener('click', ()=>{ if (currentPage<totalPages) loadLogs(currentPage+1); });
$pageSize.addEventListener('change', ()=>loadLogs(1));

// quick hook: if no data present, try to seed by client POST (fallback)
async function ensureSeeded() {
  try {
    const r = await fetch(API + '?$top=1');
    const j = await r.json();
    const items = j.value || [];
    if (!items.length) {
      // post two sample entries
      await fetch(API, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:'ERROR',message:'Sample error 1',description:'First sample error',source:'unit-seed'})});
      await fetch(API, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:'WARN',message:'Sample warning',description:'Second sample entry',source:'unit-seed'})});
    }
  } catch(e){/*ignore*/}
}

ensureSeeded().then(()=>loadLogs(1));
