// js/admin-peliculas.js
(() => {
  // Usamos la API base definida en admin-kit.js
  const API = window.API_BASE || (location.origin + '/Cine/backend');

  // Selector rápido
  const $ = (sel) => document.querySelector(sel);

  let MOVIES = [];

  // ============ Helpers de formato ============
  function formatDuration(min) {
    if (!min) return '—';
    return `${min} min`;
  }

  function formatRating(r) {
    if (r == null || r === '') return '—';
    return r.toFixed ? r.toFixed(1) : r;
  }

  // ============ Render tabla ============
  function renderMovieRow(m) {
    return `
      <tr>
        <td>${m.title || '—'}</td>
        <td>${m.genre || '—'}</td>
        <td>${formatDuration(m.duration_min)}</td>
        <td>${m.formats || '—'}</td>
        <td>${formatRating(m.rating)}</td>
        <td class="actions">
          <button class="btn" data-edit="${m.id}">Editar</button>
          <button class="btn btn-danger" data-del="${m.id}">Eliminar</button>
        </td>
      </tr>
    `;
  }

  // ============ Cards de catálogo ============
  function renderMovieCard(m) {
    const poster = m.poster_url && m.poster_url.trim() !== ''
      ? m.poster_url
      : 'https://via.placeholder.com/200x300?text=Poster';

    return `
      <article class="movie-card">
        <div class="movie-poster">
          <img src="${poster}" alt="Poster de ${m.title || ''}">
        </div>
        <div class="movie-body">
          <h3>${m.title || 'Sin título'}</h3>
          <p class="muted">${m.genre || 'Género no definido'}</p>
          <p class="muted">
            ${formatDuration(m.duration_min)}
            ${m.formats ? ' · ' + m.formats : ''}
          </p>
          <div class="movie-meta">
            <span class="badge">Rating: ${formatRating(m.rating)}</span>
          </div>
        </div>
      </article>
    `;
  }

  // ============ Filtros ============
  function applyMovieFilter() {
    const q = ($('#qMovie')?.value || '').toLowerCase().trim();
    const f = ($('#fFormat')?.value || '').toLowerCase().trim();

    const list = MOVIES.filter((m) => {
      const title   = (m.title   || '').toLowerCase();
      const formats = (m.formats || '').toLowerCase();
      return (!q || title.includes(q)) &&
             (!f || formats.includes(f));
    });

    const tbody = $('#tbMovies');
    if (tbody) {
      tbody.innerHTML = list.length
        ? list.map(renderMovieRow).join('')
        : `<tr><td colspan="6" class="muted">No hay películas que coincidan con el filtro.</td></tr>`;
    }

    const grid = $('#pelisGrid');
    if (grid) {
      grid.innerHTML = list.length
        ? list.map(renderMovieCard).join('')
        : `<p class="muted">No hay películas registradas todavía.</p>`;
    }
  }

  // ============ Carga desde la BD ============
  async function loadMovies(fetchJSON) {
    const data = await fetchJSON(`${API}/admin/movies-list.php`);
    MOVIES = data.movies || [];
    applyMovieFilter();
  }

  // ============ Crear película ============
  async function createMovieQuick(fetchJSON) {
    const title = prompt('Título de la película:');
    if (!title || !title.trim()) return; // cancelado

    const genre      = prompt('Género (opcional):', '');
    const durStr     = prompt('Duración en minutos (opcional):', '');
    const formats    = prompt('Formatos (2D, 3D, IMAX...) (opcional):', '');
    const ratingStr  = prompt('Rating (0–10, opcional):', '');
    const ageRating  = prompt('Clasificación por edad (ej: G, PG, PG-13, R):', '');
    const trailerUrl = prompt('URL del tráiler (YouTube, etc.) (opcional):', '');
    const posterUrl  = prompt('URL del póster (opcional):', '');

    const duration_min = durStr ? parseInt(durStr, 10) : null;
    const rating       = ratingStr ? parseFloat(ratingStr) : null;

    const payload = {
      title: title.trim(),
      genre: genre ? genre.trim() : '',
      duration_min,
      formats: formats ? formats.trim() : '',
      rating,
      age_rating: ageRating ? ageRating.trim() : '',
      trailer_url: trailerUrl ? trailerUrl.trim() : '',
      poster_url: posterUrl ? posterUrl.trim() : ''
    };

    const data = await fetchJSON(`${API}/admin/movie-create.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (data.movie) {
      MOVIES.unshift(data.movie);
      applyMovieFilter();
    }
  }

  // ============ Editar película ============
  async function editMovieQuick(fetchJSON, movie) {
    const title     = prompt('Título de la película:', movie.title || '');
    if (!title || !title.trim()) return;

    const genre     = prompt('Género (opcional):', movie.genre || '');
    const durStr    = prompt('Duración en minutos (opcional):', movie.duration_min ?? '');
    const formats   = prompt('Formatos (2D, 3D, IMAX...) (opcional):', movie.formats || '');
    const ratingStr = prompt('Rating (0–10, opcional):', movie.rating ?? '');
    const ageRating = prompt('Clasificación por edad:', movie.age_rating || '');
    const trailer   = prompt('URL del tráiler:', movie.trailer_url || '');
    const poster    = prompt('URL del póster:', movie.poster_url || '');

    const duration_min = durStr ? parseInt(durStr, 10) : null;
    const rating       = ratingStr ? parseFloat(ratingStr) : null;

    const payload = {
      id: movie.id,
      title: title.trim(),
      genre: genre ? genre.trim() : '',
      duration_min,
      formats: formats ? formats.trim() : '',
      rating,
      age_rating: ageRating ? ageRating.trim() : '',
      trailer_url: trailer ? trailer.trim() : '',
      poster_url: poster ? poster.trim() : ''
    };

    const data = await fetchJSON(`${API}/admin/movie-update.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (data.movie) {
      // Actualizamos en el array local
      const idx = MOVIES.findIndex(m => m.id == movie.id);
      if (idx !== -1) MOVIES[idx] = data.movie;
      applyMovieFilter();
    }
  }

  // ============ Eliminar película ============
  async function deleteMovie(fetchJSON, movie) {
    if (!confirm(`¿Eliminar la película "${movie.title}"? Esta acción no se puede deshacer.`)) return;

    const body = JSON.stringify({ id: movie.id });

    await fetchJSON(`${API}/admin/movie-delete.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    MOVIES = MOVIES.filter(m => m.id != movie.id);
    applyMovieFilter();
  }

  // ============ INIT ============
  async function init() {
    try {
      console.log('[admin-peliculas] DOM listo');

      const AK = window.AdminKit;
      if (!AK) {
        console.error('AdminKit no está cargado');
        return;
      }
      const { fetchJSON } = AK;

      // Protege ruta + pinta chip usuario
      await AK.initAdminPage({
        roles: ['admin'],
        userSelector: '#adminUser',
        logoutSelectors: ['#btnLogout', '#logoutLink'],
      });

      // Carga inicial
      await loadMovies(fetchJSON);

      // Filtros
      $('#qMovie')?.addEventListener('input', applyMovieFilter);
      $('#fFormat')?.addEventListener('change', applyMovieFilter);

      // Botón "Nueva Película"
      $('#btnNewMovie')?.addEventListener('click', async () => {
        try {
          console.log('[admin-peliculas] click en + Nueva Película');
          await createMovieQuick(fetchJSON);
        } catch (err) {
          console.error(err);
          alert(err.message || 'No se pudo crear la película.');
        }
      });

      // Delegación para Editar / Eliminar
      document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('[data-edit]');
        const delBtn  = e.target.closest('[data-del]');

        const { fetchJSON } = AK;

        if (editBtn) {
          const id = editBtn.dataset.edit;
          const movie = MOVIES.find(m => m.id == id);
          if (movie) {
            try {
              await editMovieQuick(fetchJSON, movie);
            } catch (err) {
              console.error(err);
              alert(err.message || 'No se pudo actualizar la película.');
            }
          }
        }

        if (delBtn) {
          const id = delBtn.dataset.del;
          const movie = MOVIES.find(m => m.id == id);
          if (movie) {
            try {
              await deleteMovie(fetchJSON, movie);
            } catch (err) {
              console.error(err);
              alert(err.message || 'No se pudo eliminar la película.');
            }
          }
        }
      });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error cargando películas.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
