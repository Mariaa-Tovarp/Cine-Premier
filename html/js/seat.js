// === Parámetros ===
const qs = new URLSearchParams(location.search);
const MOVIE_ID  = Number(qs.get('movie_id'));
const CINEMA_ID = Number(qs.get('cinema_id'));
const DATE_ISO  = qs.get('date');                           
const TIME      = decodeURIComponent(qs.get('time') || '');
const FORMAT    = decodeURIComponent(qs.get('format') || '2D');

const $ = (id) => document.getElementById(id);
const API_BASE = location.origin + '/Cine/backend';

// 🔹 clave para marcar uso de puntos VIP
const VIP_USE_POINTS_KEY = 'vip_use_points';

let SCREENING_ID = null;
let PRICE_BASE   = 0;
let selected     = new Set();
let vipPreview   = null;
let HALL         = null;
let SCREENINGS   = [];
let seatMeta     = new Map();

function monedaCOP(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(n || 0);
}
function hhmm(dateStr) {
  const d = new Date(dateStr);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function tituloCase(s = '') {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fechaISO(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

// === Renderizado del grid ===
function renderGrid(layout) {
  const grid = $('grid');
  grid.innerHTML = '';
  seatMeta.clear();

  if (!Array.isArray(layout) || layout.length === 0) {
    grid.textContent = 'No se pudieron cargar los asientos.';
    return;
  }

  layout.forEach((row) => {
    if (!Array.isArray(row) || row.length === 0) return;

    const rowLetter = (row[0]?.code || 'A1').charAt(0);
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = rowLetter;
    grid.appendChild(label);

    row.forEach((cell, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';

      const classes = ['seat'];
      if (cell.status === 'occupied') classes.push('occupied');

      const backendPremium = typeof cell.tier === 'string' && cell.tier.toLowerCase() === 'premium';
      const indexPremium   = (idx >= 5 && idx <= 7) || (idx >= 13 && idx <= 15);
      const isPremium      = (backendPremium || indexPremium) && cell.status !== 'occupied';

      if (isPremium) classes.push('premium');

      btn.className    = classes.join(' ');
      btn.textContent  = cell.code.replace(/^[A-Z]/, '');
      btn.dataset.code = cell.code;

      seatMeta.set(cell.code, { isPremium });

      if (cell.status !== 'occupied') {
        btn.addEventListener('click', () => {
          if (btn.classList.toggle('selected')) selected.add(cell.code);
          else selected.delete(cell.code);
          vipPreview = null;
          updateTotal();
        });
      } else {
        btn.disabled = true;
      }

      grid.appendChild(btn);
    });
  });

  updateTotal();
}

// === Calcular total ===
function updateTotal() {
  const btn = $('btnConfirm');
  const count = selected.size;

  if (vipPreview && vipPreview.seat_count === count && vipPreview.screening_id === SCREENING_ID) {
    $('sumTotal').textContent = monedaCOP(vipPreview.total);
    btn.disabled = count === 0;
    btn.classList.toggle('enabled', count > 0);
    return;
  }

  let total = 0;
  for (const code of selected) {
    const meta = seatMeta.get(code);
    const isPremium = meta?.isPremium;
    const priceSeat = PRICE_BASE + (isPremium ? 5000 : 0);
    total += priceSeat;
  }

  $('sumTotal').textContent = monedaCOP(total);
  btn.disabled = count === 0;
  btn.classList.toggle('enabled', count > 0);
}

// === Aplicar datos de función ===
async function applyScreening(sc) {
  SCREENING_ID = Number(sc.id);
  PRICE_BASE   = Number(sc.base_price) || 18000;
  HALL         = sc.hall || null;

  const fechaTxt = new Date(sc.start_datetime).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  $('movieTitle').textContent = sc.title || '—';
  $('sumMovie').textContent   = sc.title || '—';
  $('sumCinema').textContent  = sc.cinema || '—';
  $('sumDate').textContent    = tituloCase(fechaTxt);
  $('sumTime').textContent    = hhmm(sc.start_datetime);
  $('sumFormat').textContent  = sc.format || FORMAT || '2D';

  $('showMeta').innerHTML = `
    <span>📍 ${sc.cinema || '—'}</span>
    <span>📅 ${tituloCase(fechaTxt)}</span>
    <span>🕖 ${hhmm(sc.start_datetime)}</span>
    <span class="chip">${sc.format || '2D'}</span>
  `;

  selected.clear();
  vipPreview = null;
  updateTotal();

  if ($('btnVip')) {
    $('btnVip').disabled = false;
    $('btnVip').textContent = 'Aplicar Descuento VIP';
  }

  await loadSeats();
}

// === Elegir función inicial ===
function pickInitialScreening(rows) {
  if (!rows.length) return null;

  if (DATE_ISO && TIME) {
    const match = rows.find(r =>
      fechaISO(r.start_datetime) === DATE_ISO &&
      hhmm(r.start_datetime) === TIME
    );
    if (match) return match;
  }

  if (DATE_ISO) {
    const sameDate = rows.filter(r => fechaISO(r.start_datetime) === DATE_ISO);
    if (sameDate.length) {
      return sameDate.sort((a,b) => new Date(a.start_datetime) - new Date(b.start_datetime))[0];
    }
  }

  if (TIME) {
    const sameTime = rows.find(r => hhmm(r.start_datetime) === TIME);
    if (sameTime) return sameTime;
  }

  return rows[0];
}

// === Selector de funciones ===
function renderScreeningSelector() {
  const sel = $('fnSelect');
  if (!sel || !SCREENINGS.length) return;

  sel.innerHTML = '';

  SCREENINGS
    .slice()
    .sort((a,b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .forEach(sc => {
      const opt = document.createElement('option');
      const fechaTxt = new Date(sc.start_datetime).toLocaleDateString('es-ES', {
        weekday:'short', day:'numeric', month:'short'
      });
      const timeTxt = hhmm(sc.start_datetime);
      opt.value = String(sc.id);
      opt.textContent = `${fechaTxt} · ${timeTxt} · ${sc.format || '2D'}${sc.hall ? ' · Sala ' + sc.hall : ''}`;
      sel.appendChild(opt);
    });

  if (SCREENING_ID != null) {
    sel.value = String(SCREENING_ID);
  }

  sel.onchange = async () => {
    const id = Number(sel.value);
    const sc = SCREENINGS.find(s => Number(s.id) === id);
    if (sc) await applyScreening(sc);
  };
}

// === Cargar funciones ===
async function loadScreeningsAndInit() {
  const url = new URL(`${API_BASE}/screenings.php`, location.href);
  if (Number.isFinite(MOVIE_ID))  url.searchParams.set('movie_id', MOVIE_ID);
  if (Number.isFinite(CINEMA_ID)) url.searchParams.set('cinema_id', CINEMA_ID);

  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) throw new Error('No se pudo cargar la función');

  let rows = await res.json();
  console.log('🎬 screenings (raw):', rows);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No hay funciones para esta película');
  }

  SCREENINGS = rows;

  const initial = pickInitialScreening(rows);
  if (!initial) throw new Error('No se encontró una función válida');

  await applyScreening(initial);
  renderScreeningSelector();
}

// === Normalizar asientos ===
function buildLayoutFromSeats(seatsFlat) {
  const rowsMap = new Map();

  for (const s of seatsFlat) {
    let code = s.seat_code || s.code || s.label || s.name || '';
    if (!code) continue;
    code = String(code).toUpperCase();

    const row = code[0];
    const num = Number(code.slice(1)) || 0;

    if (!rowsMap.has(row)) rowsMap.set(row, []);
    rowsMap.get(row).push({
      code,
      status: s.status || s.state || 'free',
      tier: s.tier || null,
      num
    });
  }

  const letters = Array.from(rowsMap.keys()).sort();
  const layout = [];

  for (const letter of letters) {
    const arr = rowsMap.get(letter);
    arr.sort((a,b) => a.num - b.num);
    layout.push(arr);
  }

  return layout;
}

// === Cargar asientos ===
async function loadSeats() {
  const url = `${API_BASE}/seat.php?screening_id=${encodeURIComponent(SCREENING_ID)}`;
  const res = await fetch(url, { credentials: 'include' });
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('🎟 seats: respuesta NO JSON', text);
    $('grid').textContent = 'No se pudieron cargar los asientos.';
    return;
  }

  console.log('🎟 seats (raw):', data);

  if (Array.isArray(data.layout)) {
    renderGrid(data.layout);
    return;
  }

  const flat = Array.isArray(data.seats)
    ? data.seats
    : Array.isArray(data)
    ? data
    : [];

  if (!flat.length) {
    $('grid').textContent = 'No se pudieron cargar los asientos.';
    return;
  }

  const layout = buildLayoutFromSeats(flat);
  renderGrid(layout);
}

// === Aplicar descuento VIP ===
$('btnVip')?.addEventListener('click', async () => {
  if (!SCREENING_ID) return;
  if (selected.size === 0) { 
    alert('Selecciona al menos un asiento'); 
    return; 
  }

  const coupon = ($('coupon')?.value || '').trim();
  try {
    const res = await fetch(`${API_BASE}/memberships/preview.php`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screening_id: SCREENING_ID,
        seat_count: selected.size,
        coupon
      })
    });

    const j = await res.text();
    let data = JSON.parse(j);

    if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo aplicar descuento');

    vipPreview = data;
    $('sumTotal').textContent = monedaCOP(data.total);
    $('btnVip').textContent = data.non_stack
      ? `Descuento aplicado (${data.applied_pct}% NO acumulable)`
      : `Descuento aplicado (${data.applied_pct}%)`;
    $('btnVip').disabled = true;

  } catch (e) {
    alert(e.message || 'No se pudo aplicar descuento');
  }
});

// === Confirmar compra (FIX INCLUIDO) ===
$('btnConfirm')?.addEventListener('click', async () => {
  if (!SCREENING_ID || selected.size === 0) {
    alert('Selecciona al menos un asiento.');
    return;
  }

  const coupon = ($('coupon')?.value || '').trim();
  const usePoints = localStorage.getItem(VIP_USE_POINTS_KEY) === '1';

  try {
    const res = await fetch(`${API_BASE}/purchases/purchase.php`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screening_id: SCREENING_ID,
        seats: Array.from(selected),
        coupon,
        use_points: usePoints
      })
    });

    const text = await res.text();
    let j = JSON.parse(text);

    if (!res.ok || !j.ok) {
      throw new Error(j.error || 'Error en la compra');
    }

    // 🔥 FIX: limpiar selección + recargar asientos
    selected.clear();
    vipPreview = null;

    await loadSeats();
    updateTotal();

    if (usePoints) localStorage.removeItem(VIP_USE_POINTS_KEY);

    if (j.vip && typeof j.vip.points_left === 'number') {
      try {
        const raw = localStorage.getItem('vip_member');
        const mem = raw ? JSON.parse(raw) : {};
        mem.points = j.vip.points_left;
        if (j.vip.tier) mem.tier = j.vip.tier;
        localStorage.setItem('vip_member', JSON.stringify(mem));
      } catch (_) {}
    }

    const usedPoints = Number(j.used_points || 0);
    const pointsValue = usedPoints * 50;

    const invoice = {
      movie:   $('sumMovie').textContent,
      cinema:  $('sumCinema').textContent,
      date:    $('sumDate').textContent,
      time:    $('sumTime').textContent,
      format:  $('sumFormat').textContent,
      seats:   j.seats,
      hall:    HALL,
      subtotal: j.subtotal,
      applied_pct: j.applied_pct,
      discount_value: j.discount_value,
      used_points: usedPoints,
      points_value: pointsValue,
      total: j.total
    };

    sessionStorage.setItem('lastPurchase', JSON.stringify(invoice));

    window.location.href = location.origin + '/Cine/html/factura.html';

  } catch (e) {
    alert('No se pudo completar la compra: ' + (e.message || e));
  }
});

// === Inicializar ===
(async function init() {
  if (!($('grid') && $('sumMovie'))) return;
  try {
    await loadScreeningsAndInit();
  } catch (e) {
    console.error(e);
    $('grid').innerHTML = `<p class="error">${e.message}</p>`;
  }
})();
