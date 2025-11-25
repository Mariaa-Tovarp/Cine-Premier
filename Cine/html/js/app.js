// js/app.js (SIN ARRAYS: todo viene de la BD)
const grid        = document.getElementById('grid');
const filters     = document.querySelectorAll('.filter');
const searchInput = document.getElementById('searchInput');

const API_BASE = location.origin + '/Cine/backend';



let MOVIES_DB = [];   // Catálogo cargado desde MySQL (movies.php)
let RENDER_LIST = []; // Vista actual (tras filtros/búsqueda)

// ===== helpers UI =====
function chips(age, formats) {
  const parts = [];
  if (age) parts.push(`<span class="chip">${age}</span>`);
  (formats || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(f => parts.push(`<span class="chip">${f}</span>`));
  return parts.join('');
}

function times(list) {
  return (list || []).map(
    t => `<button class="time-pill" type="button" data-time="${t}">${t}</button>`
  ).join('');
}

// ===== card =====
function makeCard(m) {
  // Conservamos los mismos botones/maquetación que ya tienes
  const poster = m.poster_url || 'img/posters/placeholder.svg';
  const rating = typeof m.rating === 'number' ? m.rating.toFixed(1) : '4.5';

  return `
  <article class="card" data-format="${m.formats || ''}" data-id="${m.id}">
    <div class="poster">
      <div class="chips">${chips(m.age_rating, m.formats)}</div>
      <img alt="Poster ${m.title}" src="${poster}" loading="lazy"
           onerror="this.onerror=null;this.src='img/posters/placeholder.svg'">
    </div>
    <div class="card-body">
      <div class="title-row">
        <div class="title">${m.title}</div>
        <div class="rating">⭐ ${rating}</div>
      </div>
      <div class="meta">
        <span class="ico">🎭 ${m.genre || ''}</span>
        <span class="ico">⏱ ${m.duration_min ?? ''} min</span>
      </div>
      <div class="times" aria-label="Horarios disponibles">${times(m.times)}</div>
      <div class="actions">
        <a class="btn-sm"             href="#" data-action="trailer">▶️ Tráiler</a>
        <a class="btn-sm btn-primary" href="#" data-action="comprar">🛒 Comprar</a>
      </div>
    </div>
  </article>`;
}

function render(list) {
  if (!grid) return;
  RENDER_LIST = list.slice();
  grid.innerHTML = list.map(makeCard).join('');
}

// ===== filtros =====
function applyFormatFilter(format = 'ALL') {
  if (!grid) return;
  [...grid.children].forEach(c => {
    const f = (c.getAttribute('data-format') || '').toUpperCase();
    c.style.display = (format === 'ALL' || f.includes(format)) ? '' : 'none';
  });
}

filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFormatFilter((btn.dataset.format || 'ALL').toUpperCase());
  });
});

// ===== búsqueda =====
searchInput?.addEventListener('input', () => {
  if (!grid) return;
  const q = (searchInput.value || '').toLowerCase().trim();
  // Filtramos sobre la lista completa cargada desde la BD
  const filtered = MOVIES_DB.filter(m => {
    return (m.title || '').toLowerCase().includes(q) ||
           (m.genre || '').toLowerCase().includes(q) ||
           (m.director || '').toLowerCase().includes(q);
  });
  render(filtered);
  // Mantener filtro de formato activo tras búsqueda
  const active = document.querySelector('.filter.active');
  const fmt = active ? (active.dataset.format || 'ALL').toUpperCase() : 'ALL';
  applyFormatFilter(fmt);
});

// ===== navegación =====
// Llevamos al usuario a screenings.html con movie_id y (si eligió) hora.
function goToScreenings(movieId, time) {
  const base = location.origin + location.pathname.replace(/[^/]+$/, '');
  const url  = new URL('seat.html', base);
  url.searchParams.set('movie_id', movieId);
  if (time) url.searchParams.set('time', time);
  location.href = url.toString();
}

function openTrailer(movie) {
  // Si tienes movie.html para el tráiler, puedes cambiar aquí.
  if (movie?.trailer_url || movie?.trailerUrl) {
    window.open(movie.trailer_url || movie.trailerUrl, '_blank', 'noopener');
  } else {
    alert('Este título no tiene tráiler configurado.');
  }
}

// Delegación ÚNICA
grid?.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;

  const movieId = Number(card.getAttribute('data-id') || '0');
  const movie   = MOVIES_DB.find(m => Number(m.id) === movieId);
  if (!movie) return;

  const pill = e.target.closest('.time-pill');
  if (pill) {
    e.preventDefault();
    const hhmm = pill.getAttribute('data-time');
    goToScreenings(movieId, hhmm);
    return;
  }

  const actBtn = e.target.closest('[data-action]');
  if (actBtn) {
    e.preventDefault();
    const action = actBtn.getAttribute('data-action');
    if (action === 'trailer') openTrailer(movie);
    if (action === 'comprar') {
      // Si no eligió hora, intenta la primera disponible; si no hay, solo pasa movie_id
      const first = Array.isArray(movie.times) && movie.times.length ? movie.times[0] : '';
      goToScreenings(movieId, first);
    }
  }
});

// ===== Cargar catálogo desde BD =====
async function loadMoviesFromDB() {
  if (grid) grid.innerHTML = '<p>Cargando cartelera...</p>';
  try {
    const res = await fetch(`${API_BASE}/movies.php`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Normalizamos mínimamente: asegurar id numérico y times como array
    MOVIES_DB = (Array.isArray(data) ? data : []).map((m) => ({
      id: Number(m.id),
      title: m.title || '',
      genre: m.genre || '',
      duration_min: m.duration_min ?? null,
      age_rating: m.age_rating || '',
      rating: typeof m.rating === 'number' ? m.rating : null,
      formats: m.formats || '',
      poster_url: m.poster_url || '',
      trailer_url: m.trailer_url || m.trailerUrl || '',
      plot: m.plot || '',
      cast: m.cast || '',
      director: m.director || '',
      times: Array.isArray(m.times) ? m.times : []
    }));

    render(MOVIES_DB);

    // Aplicar el filtro de formato activo (si hay)
    const active = document.querySelector('.filter.active');
    const fmt = active ? (active.dataset.format || 'ALL').toUpperCase() : 'ALL';
    applyFormatFilter(fmt);
  } catch (err) {
    if (grid) grid.innerHTML = `<p>Error cargando cartelera: ${err.message}</p>`;
  }
}

loadMoviesFromDB();
