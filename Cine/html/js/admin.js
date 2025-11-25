// js/admin.js
(() => {
  const AK = window.AdminKit;
  const { fetchJSON } = AK;
  // Si por algo no existe API_BASE global, usamos este fallback:
  const API_BASE = window.API_BASE || (location.origin + '/Cine/backend');

  const $ = (sel) => document.querySelector(sel);

  function formatCOP(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n);
  }

  function formatInt(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(n);
  }

  async function loadDashboard() {
    // Usa el endpoint que ya tenías
    const data = await fetchJSON(`${API_BASE}/admin/dashboard.php`);

    // Soporta dos formatos posibles: {metrics:{...}} o todo plano
    const m = data.metrics || data;

    const elRev = $('#kpiRevenue');
    const elTix = $('#kpiTickets');
    const elVip = $('#kpiVip');

    if (elRev) elRev.textContent = formatCOP(m.revenue_today);
    if (elTix) elTix.textContent = formatInt(m.tickets_today);
    if (elVip) elVip.textContent = formatInt(m.vip_clients);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Protege la ruta y pinta el chip de usuario
      await AK.initAdminPage({
        roles: ['admin'],
        userSelector: '#adminUser',
        logoutSelectors: ['#btnLogout', '#logoutLink'],
      });

      // Solo cargamos los KPIs principales
      await loadDashboard();
    } catch (e) {
      console.error(e);
      alert(e.message || 'No se pudo cargar el dashboard.');
    }
  });
})();
