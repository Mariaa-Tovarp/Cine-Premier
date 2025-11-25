// js/admin-usuarios.js
(() => {
  // Ruta básica a tu backend
  const API = window.API_BASE || (location.origin + '/Cine/backend');
  const $   = (sel) => document.querySelector(sel);

  // Estado en memoria (datos vienen de la BD)
  let USERS = [];

  // ===== Helpers de UI =====
  function formatRole(role) {
    const map = {
      admin:   'Administrador',
      cashier: 'Cajero',
      ops:     'Operaciones',
    };
    return `<span class="badge">${map[role] || role || '—'}</span>`;
  }

  function formatLastLogin(u) {
    return (
      u.last_login_at ||
      u.last_login ||
      u.last_access ||
      u.ultimo_acceso ||
      '—'
    );
  }

  function renderRow(u) {
    return `
      <tr>
        <td>${u.name || u.full_name || '—'}</td>
        <td>${u.email || '—'}</td>
        <td>${formatRole(u.role)}</td>
        <td>${formatLastLogin(u)}</td>
        <td class="actions">
          <button class="btn" data-edit="${u.id}">Editar</button>
          <button class="btn" data-pass="${u.id}">Reset Pass</button>
          <button class="btn btn-danger" data-del="${u.id}">Eliminar</button>
        </td>
      </tr>
    `;
  }

  function applyFilter() {
    const q = ($('#qUser')?.value || '').toLowerCase().trim();
    const f = ($('#fRole')?.value || '').trim();

    const list = USERS.filter((u) => {
      const txt = (
        (u.name || u.full_name || '') + ' ' + (u.email || '')
      ).toLowerCase();

      const okQ = !q || txt.includes(q);
      const okR = !f || (u.role === f);
      return okQ && okR;
    });

    const tbody = $('#tbUsers');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="5" class="muted">No hay usuarios que coincidan con el filtro.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(renderRow).join('');
  }

  // ===== Llamadas a la API (BD) =====
  async function loadUsers(fetchJSON) {
    const data = await fetchJSON(`${API}/admin/users-list.php`);
    USERS = data.users || [];   // ← datos vienen 100% de la BD
    applyFilter();
  }

  async function createUserQuick(fetchJSON) {
    const name  = prompt('Nombre del usuario:');
    if (!name || !name.trim()) return;

    const email = prompt('Correo electrónico:');
    if (!email || !email.trim()) return;

    const role = prompt('Rol (admin / cashier / ops):', 'cashier') || 'cashier';

    const payload = {
      name:  name.trim(),
      email: email.trim(),
      role:  role.trim(),
    };

    const data = await fetchJSON(`${API}/admin/user-create.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (data.error) {
      alert(data.error);
      return;
    }

    if (data.user) {
      USERS.unshift(data.user);   // actualizamos estado local
      applyFilter();

      if (data.temp_password) {
        alert(
          `Usuario creado.\n\nCorreo: ${data.user.email}\nContraseña temporal: ${data.temp_password}`
        );
      } else {
        alert('Usuario creado correctamente.');
      }
    }
  }

  async function editUserQuick(fetchJSON, id) {
    const u = USERS.find((x) => String(x.id) === String(id));
    if (!u) return;

    const currentName  = u.name || u.full_name || '';
    const currentEmail = u.email || '';
    const currentRole  = u.role || 'cashier';

    const name  = prompt('Nombre del usuario:', currentName);
    if (!name || !name.trim()) return;

    const email = prompt('Correo electrónico:', currentEmail);
    if (!email || !email.trim()) return;

    const role = prompt('Rol (admin / cashier / ops):', currentRole) || currentRole;

    const payload = {
      id,
      name:  name.trim(),
      email: email.trim(),
      role:  role.trim(),
    };

    const data = await fetchJSON(`${API}/admin/user-update.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (data.error) {
      alert(data.error);
      return;
    }

    if (data.user) {
      const idx = USERS.findIndex((x) => String(x.id) === String(id));
      if (idx !== -1) USERS[idx] = data.user;
      applyFilter();
      alert('Usuario actualizado correctamente.');
    }
  }

  async function resetPassword(fetchJSON, id) {
    if (!confirm('¿Reiniciar la contraseña de este usuario?')) return;

    const data = await fetchJSON(`${API}/admin/user-reset-pass.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (data.error) {
      alert(data.error);
      return;
    }

    if (data.temp_password) {
      alert(
        `Contraseña reiniciada.\nNueva contraseña temporal: ${data.temp_password}`
      );
    } else {
      alert('Contraseña reiniciada.');
    }
  }

  async function deleteUser(fetchJSON, id) {
    if (!confirm('¿Eliminar este usuario?')) return;

    const data = await fetchJSON(`${API}/admin/user-delete.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (data.error) {
      alert(data.error);
      return;
    }

    // Eliminamos del estado local y refrescamos vista
    USERS = USERS.filter((u) => String(u.id) !== String(id));
    applyFilter();
    alert('Usuario eliminado.');
  }

  // ===== INIT =====
  async function init() {
    try {
      const AK = window.AdminKit;
      if (!AK || !AK.fetchJSON) {
        throw new Error('AdminKit no está cargado. Asegúrate de incluir js/admin-kit.js antes.');
      }

      const { fetchJSON } = AK;

      // Protege la ruta y pinta usuario
      await AK.initAdminPage({
        roles: ['admin'],                 // solo admin
        userSelector: '#adminUser',
        logoutSelectors: ['#btnLogout', '#logoutLink'],
      });

      // Carga inicial desde BD
      await loadUsers(fetchJSON);

      // Filtros
      $('#qUser')?.addEventListener('input', applyFilter);
      $('#fRole')?.addEventListener('change', applyFilter);

      // Nuevo usuario
      $('#btnNewUser')?.addEventListener('click', async () => {
        try {
          await createUserQuick(fetchJSON);
        } catch (err) {
          console.error(err);
          alert(err.message || 'No se pudo crear el usuario.');
        }
      });

      // Delegación: editar / reset pass / eliminar
      document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('[data-edit]');
        const passBtn = e.target.closest('[data-pass]');
        const delBtn  = e.target.closest('[data-del]');

        try {
          if (editBtn) {
            await editUserQuick(fetchJSON, editBtn.dataset.edit);
          } else if (passBtn) {
            await resetPassword(fetchJSON, passBtn.dataset.pass);
          } else if (delBtn) {
            await deleteUser(fetchJSON, delBtn.dataset.del);
          }
        } catch (err) {
          console.error(err);
          alert(err.message || 'Error procesando la acción.');
        }
      });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error cargando usuarios.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

