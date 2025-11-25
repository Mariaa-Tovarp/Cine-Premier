<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

$pdo = getPDO();
session_start();

// --- Helper para JSON ---
function json_out(array $data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

// --- Requiere admin ---
$user = $_SESSION['user'] ?? null;
if (!$user || ($user['role'] ?? '') !== 'admin') {
  json_out(['ok' => false, 'error' => 'No autorizado'], 401);
}

$today = (new DateTime())->format('Y-m-d');

// 1) Ingresos de hoy
$stmt = $pdo->prepare("
  SELECT COALESCE(SUM(t.price), 0) AS revenue, COUNT(*) AS tickets
  FROM tickets t
  WHERE DATE(t.purchased_at) = ?
");
$stmt->execute([$today]);
$row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['revenue' => 0, 'tickets' => 0];

$revenue_today  = (float)$row['revenue'];
$tickets_today  = (int)$row['tickets'];

// 2) Clientes VIP (membresías activas)
$vip_clients = (int)$pdo->query("
  SELECT COUNT(*) FROM members
")->fetchColumn();

// 3) Ocupación aproximada de hoy
// asientos ocupados / asientos totales de funciones de hoy
$stmOcc = $pdo->prepare("
  SELECT
    (SELECT COUNT(*)
     FROM tickets t
     JOIN screenings s ON s.id = t.screening_id
     WHERE DATE(s.start_datetime) = ?) AS sold,
    (SELECT COUNT(*)
     FROM seats st
     JOIN screenings s2 ON s2.id = st.screening_id
     WHERE DATE(s2.start_datetime) = ?) AS capacity
");
$stmOcc->execute([$today, $today]);
$occRow = $stmOcc->fetch(PDO::FETCH_ASSOC) ?: ['sold' => 0, 'capacity' => 0];

$sold     = (int)$occRow['sold'];
$capacity = max(1, (int)$occRow['capacity']); // evitar división por 0
$occupancy_pct = ($sold / $capacity) * 100.0;

// 4) Últimas ventas (simple feed)
$stmSales = $pdo->prepare("
  SELECT
    m.title      AS movie,
    c.name       AS cinema,
    t.price      AS price,
    t.purchased_at
  FROM tickets t
  JOIN screenings s ON s.id = t.screening_id
  JOIN movies m     ON m.id = s.movie_id
  JOIN cinemas c    ON c.id = s.cinema_id
  ORDER BY t.purchased_at DESC
  LIMIT 5
");
$stmSales->execute();
$sales = [];
while ($r = $stmSales->fetch(PDO::FETCH_ASSOC)) {
  $dt = new DateTime($r['purchased_at']);
  $sales[] = [
    'movie' => $r['movie'],
    'cinema' => $r['cinema'],
    'total' => number_format($r['price'], 0, ',', '.'),
    'when' => $dt->format('d/m H:i'),
  ];
}

// 5) Notificaciones dummy (puedes cambiar por algo real)
$notifications = [
  ['text' => 'Nuevo cliente VIP registrado',     'when' => 'hace 5 min'],
  ['text' => 'Función casi llena – Sala 1',      'when' => 'hace 12 min'],
  ['text' => 'Cupón MARTES2X1 usado 3 veces',    'when' => 'hace 30 min'],
];

json_out([
  'ok'               => true,
  'revenue_today'    => $revenue_today,
  'revenue_today_fmt'=> '$ ' . number_format($revenue_today, 0, ',', '.'),
  'tickets_today'    => $tickets_today,
  'vip_clients'      => $vip_clients,
  'occupancy_pct'    => round($occupancy_pct, 1),
  'last_sales'       => $sales,
  'notifications'    => $notifications,
]);
