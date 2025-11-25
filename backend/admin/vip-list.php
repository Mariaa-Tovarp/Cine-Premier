<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

$pdo = getPDO();
session_start();

function json_out(array $data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

$user = $_SESSION['user'] ?? null;
if (!$user || ($user['role'] ?? '') !== 'admin') {
  json_out(['ok' => false, 'error' => 'No autorizado'], 401);
}

/*
  members: user_id, tier, points, since
  users:   id, name, email
  tickets: user_id, purchased_at
*/

$sql = "
  SELECT
    u.id,
    u.name,
    u.email,
    m.tier,
    m.points,
    MAX(t.purchased_at) AS last_purchase
  FROM members m
  JOIN users   u ON u.id = m.user_id
  LEFT JOIN tickets t ON t.user_id = u.id
  GROUP BY u.id, u.name, u.email, m.tier, m.points
  ORDER BY m.points DESC, u.name ASC
";

$stmt = $pdo->query($sql);

$clients = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  $last = $row['last_purchase']
    ? (new DateTime($row['last_purchase']))->format('d/m/Y H:i')
    : null;

  $tierRaw = strtolower($row['tier'] ?? '');
  $label = match ($tierRaw) {
    'vip_basic'   => 'Basic',
    'vip_premium' => 'Premium',
    'vip_premier' => 'Premier',
    default       => $row['tier'] ?? 'VIP',
  };

  $clients[] = [
    'id'            => (int)$row['id'],
    'name'          => $row['name'],
    'email'         => $row['email'],
    'tier'          => $row['tier'],
    'tier_label'    => $label,
    'points'        => (int)$row['points'],
    'last_purchase' => $last,
  ];
}

json_out(['ok' => true, 'clients' => $clients]);
