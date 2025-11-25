'use strict';

const LS_USER  = 'pf_user';
const $        = (s, sc = document) => sc.querySelector(s);

// API BASE (http://localhost/Cine/backend)
const API_BASE = `${location.origin}/Cine/backend`;

console.log('[profile] profile.js cargado');

/* ============================================
   Helpers
============================================ */

// Traduce role de la tabla users
function roleLabelFromUserRole(role) {
  const r = (role || 'user').toLowerCase();
  if (r === 'admin')   return 'Administrador';
  if (r === 'cashier') return 'Cajero';
  if (r === 'vip')     return 'Cliente VIP'; // por si algún día lo usas
  return 'Cliente';
}

// Traduce tier del plan de la tabla members
function vipLabelFromTier(tier) {
  const t = (tier || '').toLowerCase();
  if (t === 'vip_basic')   return 'Cliente VIP Básico';
  if (t === 'vip_plus')    return 'Cliente VIP Plus';
  if (t === 'vip_premium') return 'Cliente VIP Premium';
  // fallback genérico
  return 'Cliente VIP';
}

/* ============================================
   Render básico del usuario
============================================ */
function renderUser(u) {
  if (!u) return;

  const name  = u.name  || 'Usuario';
  const email = u.email || '—';
  const roleLabel = roleLabelFromUserRole(u.role);

  $('#profileName').textContent   = name;
  $('#profileEmail').textContent  = email;
  $('#profileAvatar').textContent = name.charAt(0).toUpperCase();
  $('#fieldName').textContent     = name;
  $('#fieldEmail').textContent    = email;
  $('#fieldRole').textContent     = roleLabel;
  $('#profileRole').textContent   = roleLabel;

  const vipInit = Number(u.vip_points ?? 0);
  $('#fieldVip').textContent = vipInit.toLocaleString('es-CO');
}

/* ============================================
   Cargar usuario desde backend
============================================ */
async function loadMe() {
  try {
    const res  = await fetch(`${API_BASE}/auth/me.php`, {
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));

    console.log('[profile] me.php →', res.status, data);

    if (!res.ok || !data.user) {
      location.href = 'auth.html';
      return null;
    }

    const user = data.user;
    renderUser(user);

    // guardamos una copia fresca
    try {
      const str = JSON.stringify(user);
      sessionStorage.setItem(LS_USER, str);
      localStorage.setItem(LS_USER, str);
    } catch (e) {
      console.warn('[profile] No se pudo guardar usuario en storage:', e);
    }

    return user;
  } catch (err) {
    console.error('[profile] Error al cargar me.php:', err);
    location.href = 'auth.html';
    return null;
  }
}

/* ============================================
   Cargar estado de membresía VIP
   Devuelve el objeto member o null
============================================ */
async function loadVipMemberAndRenderPoints() {
  try {
    const res = await fetch(`${API_BASE}/memberships/status.php`, {
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    console.log('[profile] status.php →', res.status, data);

    if (!res.ok) {
      console.warn('[profile] status.php no OK:', res.status, data.error);
      return null;
    }

    const member = data.member || null;
    const pts    = member ? Number(member.points || 0) : 0;

    // pintar puntos vip
    const fieldVip = $('#fieldVip');
    if (fieldVip) fieldVip.textContent = pts.toLocaleString('es-CO');

    // actualizar copia guardada del usuario con puntos/tier (opcional)
    try {
      const raw = sessionStorage.getItem(LS_USER) || localStorage.getItem(LS_USER);
      if (raw) {
        const u = JSON.parse(raw);
        u.vip_points = pts;
        u.vip_tier   = member ? member.tier : null;
        const str = JSON.stringify(u);
        sessionStorage.setItem(LS_USER, str);
        localStorage.setItem(LS_USER, str);
      }
    } catch (e) {
      console.warn('[profile] No se pudo actualizar LS_USER con vip:', e);
    }

    return member;
  } catch (err) {
    console.error('[profile] Error al cargar estado VIP:', err);
    return null;
  }
}

/* ============================================
   Historial de compras
============================================ */
function renderHistory(purchases) {
  const list  = $('#historyList');
  const empty = $('#historyEmpty');
  if (!list) return;

  list.innerHTML = '';

  if (!Array.isArray(purchases) || purchases.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  purchases.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'history-item';

    const fecha = new Date(p.purchased_at || p.start_datetime || Date.now());
    const fechaTxt = fecha.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const horaTxt = fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const seats = p.seats || p.seat || '';
    const total = Number(p.total || 0);
    const totalTxt = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(total);

    card.innerHTML = `
      <header>
        <h3>${p.movie_title || 'Película'}</h3>
        <span class="chip chip-sm">${p.format || '2D'} · ${p.hall || ''}</span>
      </header>
      <p class="meta">
        <span>🎬 ${p.cinema_name || ''}</span>
        <span>📅 ${fechaTxt} · ${horaTxt}</span>
      </p>
      <p class="meta">
        <span>🎟 Asientos: <b>${seats}</b></span>
        <span>Total: <b>${totalTxt}</b></span>
      </p>
    `;
    list.appendChild(card);
  });
}

async function loadHistory() {
  const list  = $('#historyList');
  const empty = $('#historyEmpty');
  if (!list) return;

  try {
    const res  = await fetch(`${API_BASE}/purchases/history.php`, {
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));

    console.log('[profile] history.php →', res.status, data);

    if (!res.ok || data.ok === false) {
      console.warn('[profile] Error al cargar historial:', data.error || res.status);
      if (empty) empty.style.display = 'block';
      list.innerHTML = '';
      return;
    }

    renderHistory(data.purchases || []);
  } catch (err) {
    console.error('[profile] Error de red al cargar historial:', err);
    if (empty) empty.style.display = 'block';
    list.innerHTML = '';
  }
}

/* ============================================
   Cerrar sesión
============================================ */
async function doLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout.php`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (_) {}

  localStorage.removeItem(LS_USER);
  sessionStorage.removeItem(LS_USER);
  location.href = 'auth.html';
}

$('#btnLogout')?.addEventListener('click', doLogout);
$('#btnNavLogout')?.addEventListener('click', doLogout);

/* ============================================
   INIT
============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[profile] init()');

  // 1) Usuario base
  const user = await loadMe();
  if (!user) return;

  // 2) Estado VIP (NO fuerza nada en BD, solo UI)
  const member = await loadVipMemberAndRenderPoints();

  if (member) {
    const tierLabel = vipLabelFromTier(member.tier);

    const currentRole = (user.role || '').toLowerCase();

    // Solo cambiamos el texto si es cliente normal
    if (!currentRole || currentRole === 'user') {
      const tag = $('#profileRole');
      const fld = $('#fieldRole');
      if (tag) tag.textContent = tierLabel;
      if (fld) fld.textContent = tierLabel;
    }
  }

  // 3) Historial
  loadHistory();
});
