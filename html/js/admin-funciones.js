// js/admin-funciones.js
(() => {
  const API = window.API_BASE || (location.origin + '/Cine/backend');
  const $  = (sel) => document.querySelector(sel);

  let MOVIES = [];
  let SCREENINGS = [];
  let CURRENT_MOVIE_ID = null;

  function formatDateTime(dt) {
    if (!dt) return '—';
    // 'YYYY-MM-DD HH:MM:SS' → 'YYYY-MM-DD HH:MM'
    return dt.slice(0, 16);
  }

  function renderScreenings(list) {
    const tbody = $('#tbScreenings');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">No hay funciones programadas para esta película.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(s => `
      <tr>
        <td>${formatDateTime(s.start_datetime)}</td>
        <td>${s.hall || '—'}</td>
        <td>${s.format || '—'}</td>
        <td>${s.base_price != null ? '$ ' + Number(s.base_price).toLocaleString('es-CO') : '—'}</td>
        <td class="actions">
          <button class="btn" data-edit-screening="${s.id}">Editar</button>
          <button class="btn btn-danger" data-del-screening="${s.id}">Eliminar</button>
        </td>
      </tr>
    `).join('');
  }

  async function loadMovies(fetchJSON) {
    const data = await fetchJSON(`${API}/admin/movies-list.php`);
    MOVIES = data.movies || [];

    const sel = $('#movieSelect');
    if (!sel) return;

    sel.innerHTML = `<option value="">Selecciona una película…</option>` +
      MOVIES.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
  }

  async function loadScreenings(fetchJSON) {
    if (!CURRENT_MOVIE_ID) {
      SCREENINGS = [];
      renderScreenings([]);
      return;
    }

    const url = `${API}/admin/screening-list.php?movie_id=${encodeURIComponent(CURRENT_MOVIE_ID)}`;
    const data = await fetchJSON(url);
    SCREENINGS = data.screenings || [];
    renderScreenings(SCREENINGS);
  }

  async function createScreening(fetchJSON) {
    if (!CURRENT_MOVIE_ID) {
      alert('Selecciona primero una película.');
      return;
    }

    const movie_id = CURRENT_MOVIE_ID;
    const cinema_id = Number($('#cinemaId')?.value || 1);

    let dt = $('#scrDatetime')?.value;      // 'YYYY-MM-DDTHH:MM'
    if (!dt) {
      alert('Indica fecha y hora de la función.');
      return;
    }
    // Lo convertimos a 'YYYY-MM-DD HH:MM:00'
    dt = dt.replace('T', ' ') + ':00';

    const hall   = ($('#scrHall')?.value || '').trim();
    const format = $('#scrFormat')?.value || '2D';
    const price  = $('#scrPrice')?.value ? Number($('#scrPrice').value) : 0;

    if (!hall) {
      alert('Indica la sala.');
      return;
    }

    const payload = {
      movie_id,
      cinema_id,
      start_datetime: dt,
      hall,
      format,
      base_price: price
    };

    const data = await fetchJSON(`${API}/admin/screening-create.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!data.ok) {
      throw new Error(data.error || 'Error al crear función');
    }

    await loadScreenings(fetchJSON);
  }

  async function editScreeningQuick(fetchJSON, id) {
    const s = SCREENINGS.find(x => String(x.id) === String(id));
    if (!s) {
      alert('No se encontró la función en memoria.');
      return;
    }

    // Pedimos datos rápidos por prompt (luego podrías cambiarlo por un modal bonito)
    const dtActual   = s.start_datetime || '';
    const hallActual = s.hall || '';
    const fmtActual  = s.format || '2D';
    const precioAct  = s.base_price != null ? String(s.base_price) : '0';

    const nuevoDt = prompt('Inicio (YYYY-MM-DD HH:MM:SS):', dtActual);
    if (!nuevoDt || !nuevoDt.trim()) return;

    const nuevoHall = prompt('Sala:', hallActual);
    if (!nuevoHall || !nuevoHall.trim()) return;

    const nuevoFmt = prompt('Formato (2D,3D,IMAX):', fmtActual) || '2D';
    const nuevoPrecioStr = prompt('Precio base:', precioAct) || precioAct;
    const nuevoPrecio = Number(nuevoPrecioStr);

    if (!Number.isFinite(nuevoPrecio) || nuevoPrecio <= 0) {
      alert('Precio base inválido.');
      return;
    }

    const payload = {
      id: s.id,
      movie_id: s.movie_id,
      cinema_id: s.cinema_id || 1,
      start_datetime: nuevoDt.trim(),
      hall: nuevoHall.trim(),
      format: nuevoFmt.trim(),
      base_price: nuevoPrecio
    };

    const data = await fetchJSON(`${API}/admin/screening-update.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!data.ok) {
      throw new Error(data.error || 'No se pudo actualizar la función');
    }

    await loadScreenings(fetchJSON);
  }

  async function deleteScreening(fetchJSON, id) {
    if (!confirm('¿Eliminar esta función?')) return;

    const data = await fetchJSON(`${API}/admin/screening-delete.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (!data.ok) {
      throw new Error(data.error || 'Error al eliminar función');
    }

    await loadScreenings(fetchJSON);
  }

  async function init() {
    try {
      const AK = window.AdminKit;
      const { fetchJSON } = AK;

      await AK.initAdminPage({
        roles: ['admin'],
        userSelector: '#adminUser',
        logoutSelectors: ['#btnLogout', '#logoutLink'],
      });

      await loadMovies(fetchJSON);

      $('#movieSelect')?.addEventListener('change', async (e) => {
        CURRENT_MOVIE_ID = e.target.value || null;
        await loadScreenings(fetchJSON);
      });

      $('#btnAddScreening')?.addEventListener('click', async () => {
        try {
          await createScreening(fetchJSON);
        } catch (err) {
          console.error(err);
          alert(err.message || 'No se pudo crear la función.');
        }
      });

      document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('[data-edit-screening]');
        const delBtn  = e.target.closest('[data-del-screening]');

        try {
          if (editBtn) {
            const id = editBtn.dataset.editScreening;
            await editScreeningQuick(fetchJSON, id);
          }
          if (delBtn) {
            const id = delBtn.dataset.delScreening;
            await deleteScreening(fetchJSON, id);
          }
        } catch (err) {
          console.error(err);
          alert(err.message || 'Ocurrió un error.');
        }
      });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error cargando funciones.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
