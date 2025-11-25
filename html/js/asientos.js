// ===== Helpers =====
const $ = s => document.querySelector(s);
const fmtCOP = v => v.toLocaleString('es-CO', {
  style: 'currency',
  currency: 'COP'
});

// ===== Datos desde URL =====
const p = new URLSearchParams(location.search);
const MOVIE  = p.get('movie')  || 'Tron Ares';
const CINEMA = p.get('cinema') || 'Premier Films - Centro';
const DATE   = p.get('date')   || new Date().toLocaleDateString('es-ES', {
  weekday:'long', day:'numeric', month:'long', year:'numeric'
});
const TIME   = p.get('time')   || '15:20';
const FORMAT = p.get('format') || '2D';
const POSTER = p.get('poster') || ''; // opcional, por si lo mandas desde la cartelera

$('#movieTitle').textContent = MOVIE;
$('#functionMeta').innerHTML = `
  <span class="chip">📍 ${CINEMA}</span>
  <span class="chip">📅 ${DATE}</span>
  <span class="chip">⏱️ ${TIME}</span>
  <span class="chip">🎞️ ${FORMAT}</span>`;
$('#sumMovie').textContent = MOVIE;
$('#sumCinema').textContent = CINEMA;
$('#sumDate').textContent = DATE;
$('#sumTime').textContent = TIME;
$('#sumFormat').textContent = FORMAT;

// ===== Sala =====
const ROWS = 13;            // A–M
const COLS = 20;            // 1–20
const AISLES = [6, 14];     // pasillos DESPUÉS de estas posiciones
const premiumRows = new Set(['E','F','G','H']);
const premiumCols = [7,13]; // 7..13 inclusive
const occupied = new Set([
  'A3','A4','B2','C7','D8','E12',
  'F5','G2','G19','H3','I10','J4',
  'K1','L11','M9'
]);
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const room = $('#room');
let selected = new Set();
let vip = false;

function isPremium(rowLetter, col){
  return premiumRows.has(rowLetter) &&
         col >= premiumCols[0] &&
         col <= premiumCols[1];
}

function buildRoom(){
  room.innerHTML = '';
  for(let r=0; r<ROWS; r++){
    const rowLetter = ABC[r];
    const row = document.createElement('div');
    row.className = 'row';

    const lblL = document.createElement('div');
    lblL.className = 'rowlbl';
    lblL.textContent = rowLetter;

    const lblR = lblL.cloneNode(true);

    const seats = document.createElement('div');
    seats.className = 'seats';

    for(let c=1; c<=COLS; c++){
      const id = `${rowLetter}${c}`;
      const b = document.createElement('button');
      b.className = 'seat';
      b.type = 'button';
      b.textContent = c;
      b.dataset.id = id;

      if (isPremium(rowLetter, c)) {
        b.classList.add('premium');
        b.title = 'Asiento Premium (+$5.000)';
      } else {
        b.title = 'Asiento normal ($12.000)';
      }

      if (occupied.has(id)) {
        b.classList.add('occupied');
        b.disabled = true;
        b.title = 'Ocupado';
      }

      seats.appendChild(b);

      // Pasillo DESPUÉS de estas posiciones
      if (AISLES.includes(c)) {
        const gap = document.createElement('div');
        gap.className = 'aisle';
        seats.appendChild(gap);
      }
    }

    row.appendChild(lblL);
    row.appendChild(seats);
    row.appendChild(lblR);
    room.appendChild(row);
  }
}
buildRoom();

// ===== Interacción asientos =====
room.addEventListener('click', e => {
  const s = e.target.closest('.seat');
  if (!s || s.disabled) return;
  const id = s.dataset.id;

  if (s.classList.toggle('selected')) {
    selected.add(id);
  } else {
    selected.delete(id);
  }
  updateTotal();
});

$('#btnVIP').addEventListener('click', () => {
  vip = !vip;
  $('#btnVIP').textContent = vip
    ? 'Quitar Descuento VIP'
    : 'Aplicar Descuento VIP';
  updateTotal();
});

// ===== Precios y total =====
const BASE_PRICE   = 12000;
const PREMIUM_ADD  = 5000;
const VIP_DISC     = 0.10;

function seatPrice(id){
  const rowLetter = id[0];
  const col = +id.slice(1);
  return BASE_PRICE + (isPremium(rowLetter, col) ? PREMIUM_ADD : 0);
}

function updateTotal(){
  let t = 0;
  selected.forEach(id => { t += seatPrice(id); });
  if (vip) t *= (1 - VIP_DISC);

  $('#sumTotal').textContent = fmtCOP(t);
  $('#seatCount').textContent = selected.size
    ? `${selected.size} asiento${selected.size>1?'s':''} seleccionado${selected.size>1?'s':''}`
    : '';

  const btn = $('#btnConfirm');
  btn.disabled = selected.size === 0;
  btn.classList.toggle('enabled', selected.size > 0);
}
updateTotal();

/* ========= CARRITO (localStorage) =========
   Usamos la misma clave y forma que cart.js
   KEY: 'carrito_premier'
*/
const CART_KEY = 'carrito_premier';

function pushCartItem(item){
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    cart.push(item);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('carrito_premier error', e);
  }
}

$('#btnConfirm').addEventListener('click', async () => {
  if (!selected.size) return;

  // Construir payload para backend
  const payload = {
    screening_id : Number(p.get("screening_id") || 0),
    seats        : [...selected],
    coupon       : "" // si luego quieres, puedes leer desde un input
  };

  if (!payload.screening_id) {
    alert("Falta screening_id en la URL (screening_id=123).");
    return;
  }

  try {
    const resp = await fetch("/Cine/backend/purchase.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      alert("Error: " + (data.error || "Error inesperado en la compra"));
      return;
    }

    // =============== BACKEND OK ===============

    // Total generado por backend (no calculamos nada aquí)
    const totalBackend = data.total;

    // Preparar ítem para carrito local (solo visual)
    const cartItem = {
      id        : 'TKT-' + Date.now(),
      type      : 'tickets',
      movie     : MOVIE,
      cinema    : CINEMA,
      date      : DATE,
      time      : TIME,
      format    : FORMAT,
      seats     : data.seats,
      qty       : data.qty,
      unitPrice : data.price,   // precio base real del backend
      poster    : POSTER || "",
      total     : totalBackend, // total real del backend
      meta      : {
        backend: true,
        membership_pct: data.membership_pct,
        coupon_pct: data.coupon_pct,
        applied_pct: data.applied_pct
      }
    };

    // Guardar última compra
    localStorage.setItem("ultima_compra", JSON.stringify(cartItem));

    // Push al carrito local
    const CART_KEY = 'carrito_premier';
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    cart.push(cartItem);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    // Redirigir
    location.href = "cart.html";

  } catch (err) {
    console.error(err);
    alert("Error de comunicación con el servidor.");
  }
});
