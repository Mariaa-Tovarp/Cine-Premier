// ======================
// BLOQUE VIP (tarjeta + planes)
// ======================
document.addEventListener('DOMContentLoaded', () => {
  console.log('[VIP] init');

  const API_BASE = location.origin + '/Cine/backend';
  const $ = (id) => document.getElementById(id);

  const els = {
    status: $('#vipStatus'),
    tier: $('#vipTier'),
    points: $('#vipPoints'),
    since: $('#vipSince'),
  };

  let currentUser = null;
  let member = null;
  let plans = [];

  async function fetchJSON(url, options = {}) {
    console.log('[VIP] fetch', url);
    const res = await fetch(url, {
      credentials: 'include',
      ...options,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[VIP] Respuesta NO JSON desde', url, text);
      throw new Error('Respuesta inválida del servidor');
    }
    if (!res.ok) {
      throw new Error(data.error || `Error HTTP ${res.status}`);
    }
    return data;
  }

  async function loadUser() {
    try {
      const data = await fetchJSON(`${API_BASE}/auth/me.php`);
      currentUser = data.user || null;
      console.log('[VIP] user', currentUser);
    } catch (e) {
      console.warn('[VIP] no user', e.message);
      currentUser = null;
    }
  }

  async function loadMember() {
    try {
      const data = await fetchJSON(`${API_BASE}/memberships/status.php`);
      member = data.member || null;
      console.log('[VIP] member', member);
    } catch (e) {
      console.warn('[VIP] no member', e.message);
      member = null;
    }
  }

  async function loadPlans() {
    try {
      const data = await fetchJSON(`${API_BASE}/memberships/plans.php`);
      plans = Array.isArray(data.plans)
        ? data.plans
        : Array.isArray(data)
        ? data
        : [];
      console.log('[VIP] plans', plans);
    } catch (e) {
      console.warn('[VIP] no plans', e.message);
      plans = [];
    }
  }

  function saveMemberToLocalStorage() {
    if (!member) {
      localStorage.removeItem('vip_member');
    } else {
      const simple = {
        tier: member.tier || 'vip_basic',
        points: Number(member.points || 0),
        since: member.since || null,
      };
      localStorage.setItem('vip_member', JSON.stringify(simple));
      console.log('[VIP] saved vip_member', simple);
    }

    if (window.refreshAssistant) {
      window.refreshAssistant();
    }
  }

  function renderCard() {
    const statusEl = els.status || document.getElementById('vipStatus');
    const tierEl   = els.tier   || document.getElementById('vipTier');
    const pointsEl = els.points || document.getElementById('vipPoints');
    const sinceEl  = els.since  || document.getElementById('vipSince');

    const isMember = !!member;

    if (statusEl) {
      statusEl.textContent = isMember ? 'Miembro activo' : 'Invitado';
    }

    if (tierEl) {
      tierEl.textContent = isMember ? (member.tier || 'VIP') : '—';
    }

    if (pointsEl) {
      const pts = isMember ? Number(member.points || 0) : 0;
      pointsEl.textContent = pts.toLocaleString('es-CO');
    }

    if (sinceEl) {
      if (isMember && member.since) {
        const d = new Date(member.since);
        sinceEl.textContent = !isNaN(d) ? d.toLocaleDateString('es-ES') : '—';
      } else {
        sinceEl.textContent = '—';
      }
    }

    saveMemberToLocalStorage();
  }

  // 👉 Llama al backend para guardar el plan elegido
  async function joinWithTier(tier) {
    const res = await fetchJSON(`${API_BASE}/memberships/join.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });

    console.log('[VIP] join result', res);
    await loadMember();
    renderCard();

    if (window.openAssistant) window.openAssistant();

    alert(`¡Listo! Ahora eres miembro ${member?.tier || tier.toUpperCase()}.`);
  }

  // 👉 Click en "Unirme": muestra alerta con planes, elige y guarda en BD
  async function handleJoinFromButton() {
    try {
      if (!currentUser) {
        alert('Debes iniciar sesión para unirte al programa VIP.');
        location.href = 'auth.html?next=vip.html';
        return;
      }

      if (!plans.length) {
        await loadPlans();
      }

      if (!plans.length) {
        alert('No hay planes disponibles en este momento.');
        return;
      }

      // Construimos el mensaje con los planes
      const listado = plans
        .map((p, i) => {
          const price = Number(p.price_month || 0).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
          });
          return `${i + 1}. ${p.name} — $${price}/mes`;
        })
        .join('\n');

      const respuesta = prompt(
        'Elige un plan VIP escribiendo el número:\n\n' +
        listado +
        '\n\nDeja vacío o pulsa Cancelar para salir.'
      );

      if (!respuesta) {
        // Canceló o vacío → no hacemos nada
        return;
      }

      const idx = parseInt(respuesta, 10);
      if (Number.isNaN(idx) || idx < 1 || idx > plans.length) {
        alert('Opción no válida.');
        return;
      }

      const elegido = plans[idx - 1];
      const tier = elegido.tier || 'vip_basic';

      await joinWithTier(tier);
    } catch (e) {
      console.error('[VIP] error al unirse:', e);
      alert(e.message || 'No se pudo activar la membresía.');
    }
  }

  // Usar puntos en la próxima compra
  function handleUsePoints() {
    if (!currentUser) {
      location.href = 'auth.html?next=vip.html';
      return;
    }
    if (!member) {
      alert('Activa tu tarjeta VIP para comenzar a acumular puntos.');
      return;
    }

    const pts = Number(member.points || 0);
    if (!pts) {
      alert('Aún no tienes puntos suficientes para canjear.');
      return;
    }

    localStorage.setItem('vip_use_points', '1');

    alert(
      `Perfecto 👌\n` +
      `Tienes ${pts.toLocaleString('es-CO')} puntos.\n` +
      `Se intentarán usar como descuento en tu próxima compra.`
    );
  }

  // INIT
  (async function initVipPage() {
    try {
      await loadUser();
      await Promise.all([loadMember(), loadPlans()]);
      renderCard();
    } catch (e) {
      console.warn('[VIP] init error', e);
    }

    const btnJoin = document.getElementById('btnJoin');
    const btnUse = document.getElementById('btnUsePoints');
    const btnChat = document.getElementById('btnVipChat');

    if (btnJoin) btnJoin.addEventListener('click', handleJoinFromButton);
    if (btnUse) btnUse.addEventListener('click', handleUsePoints);

    if (btnChat) {
      btnChat.addEventListener('click', () => {
        if (window.openAssistant) {
          window.openAssistant();
        } else {
          alert('El asistente aún no está disponible.');
        }
      });
    }
  })();
});


// ======================
// BLOQUE widget: sync con VIP
// ======================
document.addEventListener('DOMContentLoaded', () => {
  function refreshAssistant() {
    const raw = localStorage.getItem('vip_member');
    let member = null;
    try {
      member = raw ? JSON.parse(raw) : null;
    } catch {}

    const points = member?.points ?? 0;

    const ptsLbl = document.getElementById('pa-points-label');
    const ptsTxt = document.getElementById('pa-points-text');
    const bar = document.getElementById('pa-progress');

    if (ptsLbl)
      ptsLbl.textContent = points
        ? `${points.toLocaleString('es-CO')} puntos`
        : '— puntos';

    if (ptsTxt)
      ptsTxt.textContent = points
        ? `Como miembro VIP, tienes ${points.toLocaleString(
            'es-CO',
          )} puntos disponibles 💎`
        : 'Activa tu membresía para acumular puntos.';

    if (bar) {
      const pct = Math.min(points / 10, 100);
      requestAnimationFrame(() => (bar.style.width = pct + '%'));
    }
  }

  function openAssistant() {
    const w = document.getElementById('pa-widget');
    if (!w) return;
    w.classList.remove('pa--min', 'pa--hidden');
    w.classList.add('pa--open', 'pa--pulse');
    setTimeout(() => w.classList.remove('pa--pulse'), 900);
    try {
      w.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {}
  }

  window.refreshAssistant = refreshAssistant;
  window.openAssistant = openAssistant;

  refreshAssistant();

  const widget = document.getElementById('pa-widget');
  const toggle = document.getElementById('pa-toggle');
  if (!widget || !toggle) return;

  widget.classList.add('pa--floating', 'pa--hidden');

  function closeAssistant() {
    widget.classList.remove('pa--open', 'pa--pulse');
    widget.classList.add('pa--hidden');
  }

  toggle.addEventListener('click', () => {
    if (widget.classList.contains('pa--open')) closeAssistant();
    else openAssistant();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAssistant();
  });
});

// ======================
// BLOQUE CHATBOT — cartelera real SIN grid de asientos
// ======================
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = location.origin + '/Cine/backend';

  const w = document.getElementById('pa-widget');
  if (!w) return;

  const chat = document.getElementById('pa-chat');
  if (!document.getElementById('pa-input')) {
    const bar = document.createElement('div');
    bar.className = 'pa-input';
    bar.id = 'pa-input';
    bar.innerHTML = `
      <input id="pa-text" type="text" placeholder="Escribe aquí…">
      <button id="pa-send">Enviar</button>`;
    w.appendChild(bar);
  }

  const input = document.getElementById('pa-text');
  const sendBtn = document.getElementById('pa-send');

  function localDateFromISO(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  let MOVIES = [];
  const MOVIES_BY_ID = new Map();
  const SCREENINGS_CACHE = new Map();

  const state = {
    movieId: null,
    date: null,
    time: null,
    tickets: 2,
    screening: null,
  };

  function bot(html) {
    push(false, html);
  }
  function user(html) {
    push(true, html);
  }

  function push(isUser, html) {
    const row = document.createElement('div');
    row.className = 'pa-row ' + (isUser ? 'user' : 'bot');
    row.innerHTML = `<div class="pa-bubble">${html}</div>`;
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  const norm = (s) =>
    (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  function getIntent(text) {
    const t = norm(text);
    if (/\b(descuent|promo|ofert)/.test(t)) return 'promo';
    if (/\b(pagar|carrito|comprar|bolet)/.test(t)) return 'pay';
    if (/\b(ver|cartelera|funcion|pelicul|horario)/.test(t)) return 'book';
    return 'smalltalk';
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { credentials: 'include' });
    const txt = await res.text();
    let data;
    try {
      data = JSON.parse(txt);
    } catch {
      throw new Error('Respuesta inválida');
    }
    if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
    return data;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  async function loadMoviesForToday() {
    if (MOVIES.length) return;

    const date = todayISO();
    const data = await fetchJSON(`${API_BASE}/movies.php?date=${date}`);
    MOVIES = Array.isArray(data) ? data : data.movies || [];

    MOVIES_BY_ID.clear();
    for (const m of MOVIES) {
      MOVIES_BY_ID.set(Number(m.id), m);
    }
  }

  async function loadScreenings(movieId) {
    const key = String(movieId);
    if (SCREENINGS_CACHE.has(key)) return SCREENINGS_CACHE.get(key);

    const data = await fetchJSON(`${API_BASE}/screenings.php?movie_id=${movieId}`);
    const list = Array.isArray(data) ? data : data.screenings || [];

    SCREENINGS_CACHE.set(key, list);
    return list;
  }

  function getVipMember() {
    try {
      return JSON.parse(localStorage.getItem('vip_member') || 'null');
    } catch {
      return null;
    }
  }

  async function suggestMovies() {
    try {
      await loadMoviesForToday();
    } catch {
      bot('❌ No pude cargar la cartelera.');
      return;
    }

    if (!MOVIES.length) {
      bot('Hoy no hay funciones programadas.');
      return;
    }

    const chips = MOVIES.map(
      (m) => `<button class="pa-chip-in" data-movie-id="${m.id}">${m.title}</button>`,
    ).join('');

    bot(`🎬 Estas son las películas en cartelera hoy:<div class="pa-quick-in">${chips}</div>`);
  }

  async function suggestTimes(movieId) {
    await loadMoviesForToday();
    const mv = MOVIES_BY_ID.get(Number(movieId));
    if (!mv) return bot('No encontré esa película.');

    let screenings = [];
    try {
      screenings = await loadScreenings(movieId);
    } catch {
      return bot('No pude obtener las funciones.');
    }

    if (!screenings.length) {
      return bot(`No hay funciones para <b>${mv.title}</b>.`);
    }

    const today = todayISO();
    const todays = screenings.filter(
      (s) => s.start_datetime.slice(0, 10) === today,
    );

    let chosenDate;
    let listBase;

    if (todays.length) {
      chosenDate = today;
      listBase = todays;
    } else {
      screenings.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      chosenDate = screenings[0].start_datetime.slice(0, 10);
      listBase = screenings.filter(
        (s) => s.start_datetime.slice(0, 10) === chosenDate,
      );
    }

    state.date = chosenDate;

    const fechaTxt = localDateFromISO(chosenDate).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const times = [...new Set(listBase.map((s) => s.start_datetime.slice(11, 16)))];

    const chips = times
      .map((t) => `<button class="pa-chip-in" data-time="${t}">${t}</button>`)
      .join('');

    const poster = mv.poster_url || mv.poster || '';
       const imgTag = poster
      ? `<img src="${poster}" style="width:100%;border-radius:12px;margin-bottom:8px;">`
      : '';

    bot(`
      <div style="text-align:center">
        ${imgTag}
        <b>${mv.title}</b><br>
        <small>${fechaTxt}</small>
        <div class="pa-quick-in" style="margin-top:8px">${chips}</div>
      </div>
    `);
  }

  async function showCartSummary() {
    await loadMoviesForToday();
    const mv = MOVIES_BY_ID.get(Number(state.movieId));
    const sc = state.screening;
    if (!mv || !sc) return bot('Selecciona película y horario.');

    const isoDate = sc.start_datetime.slice(0, 10);
    const dateObj = localDateFromISO(isoDate);
    const dd = dateObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const d = new Date(sc.start_datetime);
    const hh = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    bot(`
      <div class="pa-cart">
        <p><b>${mv.title}</b></p>
        <p>${sc.cinema || ''} ${sc.hall ? '· Sala ' + sc.hall : ''}</p>
        <p>${dd} · ${hh} · ${sc.format || ''}</p>
        <p style="margin-top:8px">
          Todo listo. Continúa para seleccionar tus asientos y finalizar la compra.
        </p>
        <div class="pa-quick-in" style="margin-top:10px; justify-content:flex-end;">
          <button class="pa-chip-in" data-goto="seats-page">
            Ir a seleccionar asientos y comprar
          </button>
        </div>
      </div>
    `);
  }

  function gotoSeatsPage() {
    const sc = state.screening;
    if (!sc) return bot('Selecciona película y horario.');

    const url = new URL(location.origin + '/Cine/html/seat.html');
    url.searchParams.set('movie_id', sc.movie_id);
    url.searchParams.set('cinema_id', sc.cinema_id);
    url.searchParams.set('date', sc.start_datetime.slice(0, 10));
    url.searchParams.set('time', sc.start_datetime.slice(11, 16));
    url.searchParams.set('format', sc.format || '2D');

    window.location.href = url.toString();
  }

  const PROMOS = [
    { title: 'Martes 2x1', code: 'MARTES2X1', desc: '50% en 2D los martes' },
    { title: 'VIP Combo', code: 'VIPCOMBO', desc: 'Palomitas XL + 2 bebidas' },
    { title: 'IMAX -15%', code: 'IMAXPRE', desc: 'Preventa IMAX -15%' },
  ];

  function showPromos() {
    const list = PROMOS.map(
      (p) =>
        `<li>• <b>${p.title}</b> — <code>${p.code}</code> <span>${p.desc}</span></li>`,
    ).join('');
    bot(`<p>🎁 Promos:</p><ul style="margin-left:18px">${list}</ul>`);
  }

  function showVipStatus() {
    const m = getVipMember();
    if (!m) return bot('Aún no activas tu tarjeta VIP 💳');

    bot(`
      <p>💳 <b>Tu tarjeta VIP</b></p>
      <ul style="margin-left:18px">
        <li>Nivel: <b>${m.tier}</b></li>
        <li>Puntos: <b>${m.points}</b></li>
      </ul>
    `);
  }

  const quickBar = document.querySelector('.pa-quick');
  if (quickBar)
    quickBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.pa-chip');
      if (!chip) return;
      if (chip.dataset.action === 'recom') suggestMovies();
      if (chip.dataset.action === 'reservas')
        bot('Tus reservas aparecerán aquí.');
      if (chip.dataset.action === 'estado') showVipStatus();
    });

  chat.addEventListener('click', async (e) => {
    const mBtn = e.target.closest('[data-movie-id]');
    if (mBtn) {
      state.movieId = Number(mBtn.dataset.movieId);
      state.date = null;
      state.time = null;
      state.screening = null;
      await suggestTimes(state.movieId);
      return;
    }

    const tBtn = e.target.closest('[data-time]');
    if (tBtn) {
      const hhmm = tBtn.dataset.time;
      state.time = hhmm;

      if (!state.movieId) {
        bot('Primero elige una película.');
        return;
      }

      const screenings = await loadScreenings(state.movieId);
      let found;

      if (state.date) {
        found = screenings.find(
          (s) =>
            s.start_datetime.slice(0, 10) === state.date &&
            s.start_datetime.slice(11, 16) === hhmm,
        );
      } else {
        found = screenings.find(
          (s) => s.start_datetime.slice(11, 16) === hhmm,
        );
      }

      if (!found) {
        bot('No encontré la función para ese horario.');
        return;
      }

      state.screening = found;
      await showCartSummary();
      return;
    }

    const go = e.target.closest('[data-goto]');
    if (go && go.dataset.goto === 'seats-page') gotoSeatsPage();
  });

  function handle(text) {
    const t = text.trim();
    if (!t) return;
    user(t);

    const intent = getIntent(t);
    setTimeout(() => route(intent), 400);
  }

  function route(intent) {
    if (intent === 'promo') return showPromos();
    if (intent === 'book') return suggestMovies();
    if (intent === 'pay') {
      if (!state.screening)
        bot('Selecciona película y horario primero 🙂');
      else showCartSummary();
      return;
    }
    bot('🎬 Puedo mostrarte cartelera, horarios, promos y tu estado VIP.');
  }

  sendBtn.addEventListener('click', () => {
    handle(input.value);
    input.value = '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handle(input.value);
      input.value = '';
    }
  });

  bot('🎥 ¡Hola! Soy tu asistente Premier. Pídeme cartelera, horarios o promos.');
});
