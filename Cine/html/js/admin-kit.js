// js/admin-kit.js
const API_BASE = location.origin + '/Cine/backend';


async function akFetchJSON(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('Respuesta no JSON desde', url, text);
    throw new Error('Respuesta inválida del servidor');
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  return data;
}

const AdminKit = {
  async guard({ roles = ['admin'], login = 'auth.html' } = {}) {
    const me = await akFetchJSON(`${API_BASE}/auth/me.php`);
    const user = me.user || null;

    if (!user || (roles.length && !roles.includes(user.role))) {
      window.location.href = login;
      return null;
    }
    return user;
  },

  mountUserBadge(selector, user) {
    const el = document.querySelector(selector);
    if (!el || !user) return;
    el.textContent = `${user.name || 'Usuario'} · ${user.role || ''}`.trim();
  },

  wireLogout(selectors, login = 'auth.html') {
    (Array.isArray(selectors) ? selectors : [selectors])
      .flatMap(sel => [...document.querySelectorAll(sel)])
      .forEach(el => {
        if (!el) return;
        if (el.tagName === 'BUTTON' && !el.type) el.type = 'button';

        el.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            await akFetchJSON(`${API_BASE}/auth/logout.php`, { method: 'POST' });
          } catch (_) {}
          window.location.href = login;
        });
      });
  },

  async initAdminPage({
    roles = ['admin'],
    userSelector = '#adminUser',
    logoutSelectors = ['#btnLogout', '#logoutLink'],
  } = {}) {
    const user = await this.guard({ roles });
    if (!user) return null;
    this.mountUserBadge(userSelector, user);
    this.wireLogout(logoutSelectors);
    return user;
  },

  fetchJSON: akFetchJSON,
};

window.API_BASE = API_BASE;   // 👈 añade esta línea si aún no está
window.AdminKit = AdminKit;