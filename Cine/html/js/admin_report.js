// admin_report.js (con guardia de sesión/rol)
const API_BASE = location.origin + '/Cine/Cine/backend';

const $ = (id) => document.getElementById(id);
const date_from = $('date_from');
const date_to   = $('date_to');
const group_by  = $('group_by');
const cinema_id = $('cinema_id');
const movie_id  = $('movie_id');
const btnLoad   = $('btnLoad');
const btnCsv    = $('btnCsv');

const sumTickets = $('sumTickets');
const sumRevenue = $('sumRevenue');
const sumRange   = $('sumRange');
const reportZone = $('reportZone');

function fmtCOP(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(n || 0);
}

// ✅ Guardia de sesión/rol admin
async function ensureAdmin() {
  try {
    const res = await fetch(`${API_BASE}/auth/me.php`, { credentials: 'include' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const { user } = await res.json();

    if (!user) {
      // Sin sesión → redirigir a login y volver a este panel al iniciar
      const next = encodeURIComponent('/Cine/Cine/html/admin_report.html');
      location.href = `auth.html?next=${next}`;
      return false;
    }
    if (user.role !== 'admin') {
      // Sesión sin permisos → bloquear UI
      lockUI('Acceso restringido. Este panel es solo para <strong>administradores</strong>.');
      return false;
    }
    // OK admin
    return true;
  } catch (e) {
    lockUI('No se pudo verificar la sesión. Intenta iniciar sesión de nuevo.');
    return false;
  }
}

function lockUI(msg) {
  // Deshabilitar controles
  [date_from, date_to, group_by, cinema_id, movie_id, btnLoad, btnCsv].forEach(el => {
    if (el) el.disabled = true;
  });
  sumTickets.textContent = '0';
  sumRevenue.textContent = fmtCOP(0);
  sumRange.textContent   = '';
  reportZone.innerHTML = `<div class="empty warn">${msg}</div>`;
}

// Fechas por defecto: últimos 7 días
(function initDates() {
  const today = new Date();
  const to = today.toISOString().slice(0,10);
  const from = new Date(today.getTime() - 6*86400000).toISOString().slice(0,10);
  if (date_from) date_from.value = from;
  if (date_to)   date_to.value   = to;
})();

// Cargar combos (cines y películas)
async function loadCombos() {
  try {
    const [cinemasRes, moviesRes] = await Promise.all([
      fetch(`${API_BASE}/cinemas.php`, { credentials:'include' }),
      fetch(`${API_BASE}/movies.php`,  { credentials:'include' }),
    ]);
    if (!cinemasRes.ok || !moviesRes.ok) throw new Error('No se pudieron cargar datos base');

    const cinemas = await cinemasRes.json();
    const movies  = await moviesRes.json();

    cinema_id.innerHTML = `<option value="">Todos</option>` + 
      cinemas.map(c => `<option value="${c.id}">${c.name} (${c.city})</option>`).join('');

    movie_id.innerHTML = `<option value="">Todas</option>` +
      movies.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
  } catch (e) {
    console.warn(e);
  }
}

function headersFor(group) {
  switch (group) {
    case 'day':       return ['Día', 'Boletos', 'Ingresos'];
    case 'cinema':    return ['ID Cine', 'Cine', 'Boletos', 'Ingresos'];
    case 'movie':     return ['ID Película', 'Película', 'Boletos', 'Ingresos'];
    case 'screening': return ['ID Función', 'Película', 'Cine', 'Fecha/Hora', 'Boletos', 'Ingresos'];
    default:          return [];
  }
}

function rowFor(group, r) {
  switch (group) {
    case 'day':       return [r.day, r.tickets, fmtCOP(r.revenue)];
    case 'cinema':    return [r.cinema_id, r.cinema, r.tickets, fmtCOP(r.revenue)];
    case 'movie':     return [r.movie_id, r.movie, r.tickets, fmtCOP(r.revenue)];
    case 'screening': return [r.screening_id, r.movie, r.cinema, new Date(r.start_datetime).toLocaleString(), r.tickets, fmtCOP(r.revenue)];
    default: return [];
  }
}

function buildTable(group, rows) {
  const thead = headersFor(group);
  const html = `
    <table>
      <thead><tr>${thead.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map(r => `<tr>${
          rowFor(group, r).map((v,i) => {
            const isRight = (group === 'day'     && i === 2) ||
                            (group === 'cinema'  && i === 3) ||
                            (group === 'movie'   && i === 3) ||
                            (group === 'screening' && (i === 4 || i === 5));
            return `<td${isRight ? ' class="right"' : ''}>${v ?? ''}</td>`;
          }).join('')
        }</tr>`).join('')}
      </tbody>
    </table>
  `;
  return html;
}

async function loadReport() {
  const params = new URLSearchParams();
  if (date_from.value) params.set('date_from', date_from.value);
  if (date_to.value)   params.set('date_to',   date_to.value);
  if (cinema_id.value) params.set('cinema_id', cinema_id.value);
  if (movie_id.value)  params.set('movie_id',  movie_id.value);
  params.set('group_by', group_by.value);

  reportZone.innerHTML = `<div class="empty">Cargando…</div>`;
  try {
    const url = `${API_BASE}/admin/sales_report.php?${params.toString()}`;
    const res = await fetch(url, { credentials:'include' });
    if (res.status === 403) {
      lockUI('Acceso restringido. Debes iniciar sesión como <strong>admin</strong>.');
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const rows = data.rows || [];

    sumTickets.textContent = (data.summary?.tickets ?? 0);
    sumRevenue.textContent = fmtCOP(data.summary?.revenue ?? 0);
    sumRange.textContent   = `Rango: ${data.filters?.date_from || '—'} → ${data.filters?.date_to || '—'}`;

    reportZone.innerHTML = rows.length
      ? buildTable((data.filters?.group_by || 'day'), rows)
      : `<div class="empty">Sin resultados para los filtros seleccionados.</div>`;
  } catch (e) {
    reportZone.innerHTML = `<div class="empty warn">Error al cargar el reporte: ${e.message}</div>`;
  }
}

function exportCSV() {
  const params = new URLSearchParams();
  if (date_from.value) params.set('date_from', date_from.value);
  if (date_to.value)   params.set('date_to',   date_to.value);
  if (cinema_id.value) params.set('cinema_id', cinema_id.value);
  if (movie_id.value)  params.set('movie_id',  movie_id.value);
  params.set('group_by', group_by.value);
  params.set('format', 'csv');

  const url = `${API_BASE}/admin/sales_report.php?${params.toString()}`;
  window.open(url, '_blank', 'noopener');
}

// Eventos
btnLoad.addEventListener('click', loadReport);
btnCsv .addEventListener('click', exportCSV);

// Init con verificación de admin antes de todo
(async function init() {
  const ok = await ensureAdmin();
  if (!ok) return;            // si no es admin/log, ya se redirigió o bloqueó
  await loadCombos();
  await loadReport();
})();
