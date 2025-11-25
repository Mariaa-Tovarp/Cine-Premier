// showtimes.js
const qs = new URLSearchParams(location.search);
const MOVIE_ID  = Number(qs.get('movie_id'));     // viene desde la cartelera
const CINEMA_ID = Number(qs.get('cinema_id') || 0);

const API_BASE = location.origin + '/Cine/backend';
const $ = (id) => document.getElementById(id);

function hhmm(dateStr) {
  const d = new Date(dateStr);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function fechaLarga(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
}

(async function init() {
  if (!Number.isFinite(MOVIE_ID)) {
    $('showtimesContainer').innerHTML = '<p>Película no especificada.</p>';
    return;
  }

  const url = new URL(`${API_BASE}/screenings.php`, location.href);
  url.searchParams.set('movie_id', MOVIE_ID);
  if (Number.isFinite(CINEMA_ID) && CINEMA_ID > 0) {
    url.searchParams.set('cinema_id', CINEMA_ID);
  }

  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) {
    $('showtimesContainer').innerHTML = '<p>No se pudieron cargar las funciones.</p>';
    return;
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    $('showtimesContainer').innerHTML = '<p>No hay funciones disponibles.</p>';
    return;
  }

  // Título y meta
  const first = rows[0];
  $('movieTitle').textContent = first.title || 'Funciones';
  $('movieMeta').textContent  = `${first.cinema || ''} · ${first.city || ''}`.trim();

  // Agrupar funciones por fecha (YYYY-MM-DD)
  const byDate = new Map();
  for (const r of rows) {
    const d = new Date(r.start_datetime);
    const iso = d.toISOString().slice(0,10); // YYYY-MM-DD
    if (!byDate.has(iso)) byDate.set(iso, []);
    byDate.get(iso).push(r);
  }

  const container = $('showtimesContainer');
  container.innerHTML = '';

  [...byDate.entries()]
    .sort(([d1],[d2]) => d1.localeCompare(d2))
    .forEach(([isoDate, screenings]) => {
      const card = document.createElement('div');
      card.className = 'showtimes-card';

      const h3 = document.createElement('h3');
      h3.textContent = fechaLarga(screenings[0].start_datetime);
      card.appendChild(h3);

      const meta = document.createElement('div');
      meta.className = 'showtimes-date';
      meta.textContent = `Funciones disponibles: ${screenings.length}`;
      card.appendChild(meta);

      screenings
        .sort((a,b) => new Date(a.start_datetime) - new Date(b.start_datetime))
        .forEach(sc => {
          const time = hhmm(sc.start_datetime); // HH:MM
          const a = document.createElement('a');
          a.className = 'time-chip';

          // URL hacia seat.html con movie_id, cinema_id, date, time, format
          const seatUrl = new URL('./seat.html', location.origin + '/Cine/html/');
          seatUrl.searchParams.set('movie_id', sc.movie_id);
          seatUrl.searchParams.set('cinema_id', sc.cinema_id);
          seatUrl.searchParams.set('date', isoDate);
          seatUrl.searchParams.set('time', encodeURIComponent(time));
          if (sc.format) {
            seatUrl.searchParams.set('format', sc.format);
          }

          a.href = seatUrl.toString();
          a.textContent = time;
          card.appendChild(a);
        });

      container.appendChild(card);
    });
})();
