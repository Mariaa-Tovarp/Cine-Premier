// js/factura.js
(function () {
  const $ = (id) => document.getElementById(id);
  const fmtCOP = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(n || 0);

  const dataRaw = sessionStorage.getItem('lastPurchase');
  if (!dataRaw) {
    // Si no hay datos, mandamos al inicio
    alert('No se encontró información de la compra.');
    window.location.href = 'index.html';
    return;
  }

  let inv;
  try {
    inv = JSON.parse(dataRaw);
  } catch {
    alert('Factura inválida.');
    window.location.href = 'index.html';
    return;
  }

  // --------- Datos básicos ----------
  const invId = 'PF-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') +
    '-' + String(Math.floor(Math.random() * 900) + 100);

  $('invId').textContent = 'ID: ' + invId;
  $('invMovie').textContent = inv.movie || '—';
  $('invCinema').textContent = inv.cinema || '—';
  $('invDate').textContent = inv.date || '—';
  $('invTime').textContent = inv.time || '—';
  $('invFormat').textContent = inv.format || '2D';
  $('invHall').textContent = inv.hall ? 'Sala ' + inv.hall : '—';

  // filas y asientos
  const seats = Array.isArray(inv.seats) ? inv.seats : [];
  const rowsSet = new Set(seats.map((s) => String(s).charAt(0)));
  $('invRows').textContent = rowsSet.size
    ? Array.from(rowsSet).join(', ')
    : '—';
  $('invSeats').textContent = seats.length ? seats.join(', ') : '—';

  // --------- Resumen de pago ----------
  const subtotal = Number(inv.subtotal || 0);
  const appliedPct = Number(inv.applied_pct || 0);
  const discountValue = Number(inv.discount_value || 0);
  const usedPoints = Number(inv.used_points || 0);
  const pointsValue =
    typeof inv.points_value === 'number'
      ? inv.points_value
      : usedPoints * 50;
  const total = Number(inv.total || 0);

  $('invSubtotal').textContent = fmtCOP(subtotal);

  // línea de descuento % (membresía + cupón)
  $('invDiscount').textContent =
    appliedPct > 0
      ? `${appliedPct}% (${fmtCOP(discountValue)})`
      : '0% ($ 0)';

  // 🔹 NUEVA LÍNEA: puntos usados
  const ptsLabel = usedPoints > 0
    ? `${usedPoints} pts (${fmtCOP(pointsValue)})`
    : '0 pts ($ 0)';
  const elPts = $('invPointsUsed');
  if (elPts) {
    elPts.textContent = ptsLabel;
  }

  $('invTotal').textContent = fmtCOP(total);

  // --------- QR ----------
  const qrData = encodeURIComponent(
    `Premier Films | ${inv.movie} | ${inv.cinema} | ${inv.date} ${inv.time} | Total ${fmtCOP(total)} | ID ${invId}`
  );
  const qrUrl =
    'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
    qrData;
  const img = $('invQr');
  if (img) img.src = qrUrl;

  // Botones
  const volver = document.getElementById('btnVolver');
  if (volver) {
    volver.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
})();

