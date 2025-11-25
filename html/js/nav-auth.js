// js/nav-auth.js
(() => {
  const LS_USER  = 'pf_user';
  const API_BASE = location.origin + '/Cine/backend';
  // Evitamos pisar la variable global `$` de otros archivos
  const q = (s, sc = document) => sc.querySelector(s);

  function getUserFromStorage() {
    let raw = sessionStorage.getItem(LS_USER) || localStorage.getItem(LS_USER);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return null; }
  }

  // Pregunta al backend por la sesión PHP actual
  async function fetchUserFromBackend() {
    try {
      const res = await fetch(`${API_BASE}/auth/me.php`, {
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.user) {
        const json = JSON.stringify(data.user);
        localStorage.setItem(LS_USER, json);
        sessionStorage.setItem(LS_USER, json);
        return data.user;
      }
    } catch (e) {
      console.warn('No se pudo consultar /auth/me.php', e);
    }
    return null;
  }

  async function initNavAuth() {
    const btn = q('#navAuthBtn');
    if (!btn) return; // esta página no tiene botón de auth

    let u = getUserFromStorage();
    if (!u) {
      u = await fetchUserFromBackend();
    }

    if (u) {
      btn.textContent = 'Mi perfil';
      btn.href = './profile.html';
    } else {
      btn.textContent = 'Iniciar Sesión';
      btn.href = './auth.html';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavAuth);
  } else {
    initNavAuth();
  }
})();
