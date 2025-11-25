/* ========= Auth REAL (solo BD Cine) ========= */
const LS_USER = 'pf_user';
const $ = (s, sc = document) => sc.querySelector(s);

/* tabs */
document.querySelectorAll('.switch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.switch-btn').forEach(b => b.classList.remove('is-active'));
    document.querySelectorAll('.form').forEach(f => f.classList.remove('is-active'));
    btn.classList.add('is-active');
    (btn.dataset.mode === 'login' ? $('#formLogin') : $('#formRegister')).classList.add('is-active');
  });
});

/* mostrar/ocultar contraseña */
document.querySelectorAll('.peek').forEach(p => {
  p.addEventListener('click', () => {
    const input = p.previousElementSibling;
    input.type = (input.type === 'password' ? 'text' : 'password');
  });
});

/* ===== utilidades de sesión ===== */
const setSession = (u, remember = false) => {
  const data = { ...u, loggedAt: Date.now(), remember: !!remember };

  if (remember) {
    // Recordarme activado → persiste entre cierres de navegador
    localStorage.setItem(LS_USER, JSON.stringify(data));
    sessionStorage.removeItem(LS_USER);
  } else {
    // Solo esta sesión/navegador → se borra al cerrar
    sessionStorage.setItem(LS_USER, JSON.stringify(data));
    localStorage.removeItem(LS_USER);
  }
};

const API_BASE = location.origin + '/Cine/backend';

/* ========== LOGIN (solo backend) ========== */
$('#formLogin')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = e.target.email.value.trim().toLowerCase();
  const pass     = e.target.password.value;
  const remember = e.target.remember.checked;

  if (!email || !pass) {
    alert('Ingresa correo y contraseña');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login.php`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false || !data.user) {
      alert(data.error || 'Error en inicio de sesión');
      return;
    }

    const u = data.user;
    setSession(u, remember);

    // Mapa de respaldo por rol (por si algún día el backend no manda redirect)
    const fallbackRouteByRole = {
      admin:   '/Cine/html/admin.html',
      cashier: '/Cine/html/pos.html',
      vip:     '/Cine/html/profile.html',
      user:    '/Cine/html/profile.html'
    };

    // 1º usar la URL que devuelve PHP; 2º, fallback por rol; 3º, home genérico
    const dest =
      data.redirect ||
      fallbackRouteByRole[u.role] ||
      '/Cine/index.html';

    window.location.href = dest;

  } catch (err) {
    console.error('Error en login:', err);
    alert('No se pudo conectar con el servidor de Premier Films.');
  }
});

/* ========== REGISTRO (solo BD) ========== */
$('#formRegister')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name  = e.target.name.value.trim();
  const email = e.target.email.value.trim().toLowerCase();
  const pass  = e.target.password.value;

  if (!name || !email || !pass) {
    alert('Completa todos los campos');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register.php`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false || !data.user) {
      alert(data.error || 'No se pudo crear la cuenta');
      return;
    }

    const u = data.user;
    // nuevo usuario: lo tratamos como "recordarme" para que quede logueado
    setSession(u, true);

    alert('Cuenta creada. ¡Disfruta Premier Films!');
    // Cliente recién creado → perfil
    window.location.href = '/Cine/html/profile.html';

  } catch (err) {
    console.error('Error llamando a register.php:', err);
    alert('No se pudo conectar con el servidor para crear la cuenta.');
  }
});

/* ========== RECUPERAR (pendiente backend real) ========== */
$('#forgotLink')?.addEventListener('click', e => {
  e.preventDefault();
  alert('La recuperación de contraseña se configura desde el backend. Por ahora, contacta al administrador.');
});
