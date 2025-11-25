<?php
require_once __DIR__ . '/../db.php';
require_post();

$user = $_SESSION['user'] ?? null;
if (!$user) json_out(['error' => 'Requiere login'], 401);

$payload = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$screening_id = (int)($payload['screening_id'] ?? 0);
$seat_count   = (int)($payload['seat_count'] ?? 0);
$coupon       = trim($payload['coupon'] ?? '');

if ($screening_id <= 0 || $seat_count <= 0) {
  json_out(['error' => 'Datos incompletos'], 400);
}

$pdo = getPDO();

// Precio base y fecha/hora
$stmt = $pdo->prepare("SELECT base_price, start_datetime FROM screenings WHERE id = ?");
$stmt->execute([$screening_id]);
$sc = $stmt->fetch();
if (!$sc) json_out(['error' => 'Función no existe'], 404);

$price    = (float)$sc['base_price'];
$dt       = new DateTime($sc['start_datetime']);
$weekday  = (int)$dt->format('N'); // 2 = martes
$subtotal = $price * $seat_count;

// Descuento por membresía
$membership_pct = 0;
$stmt = $pdo->prepare("SELECT tier FROM members WHERE user_id = ?");
$stmt->execute([$user['id']]);
if ($m = $stmt->fetch()) {
  $map = ['vip_basic'=>10, 'vip_premium'=>15, 'vip_premier'=>20];
  $membership_pct = $map[strtolower($m['tier'])] ?? 0;
}

// Cupón / Martes (desde BD)
$coupon_pct = 0;
$non_stack  = false;
$coupon_id  = null;

if ($coupon !== '') {
  $stmt = $pdo->prepare("
    SELECT id, title, `desc`, details, coupon, valid_from, valid_to
    FROM promos
    WHERE coupon = ? AND CURDATE() BETWEEN IFNULL(valid_from, CURDATE()) AND IFNULL(valid_to, CURDATE())
    LIMIT 1
  ");
  $stmt->execute([$coupon]);
  if ($pr = $stmt->fetch()) {
    // Regla simple: si en details dice 'No acumulable', no se acumula
    $non_stack = stripos($pr['details'] ?? '', 'no acumulable') !== false;
    // Ejemplo: MARTES50 → 50%
    // Puedes mapear por ID o por 'desc' si prefieres dinámico
    $coupon_id = $pr['id'];
    if (preg_match('/(\d{1,2})\s*%/u', ($pr['desc'] ?? ''), $mch)) {
      $coupon_pct = min(80, max(0, (int)$mch[1]));
    } else if ($coupon_id === 'martes_cine') {
      $coupon_pct = 50;
      $non_stack  = true;
    }
  }
} else {
  // Si es martes y existe promo martes en BD, aplícala automáticamente (opcional)
  if ($weekday === 2) {
    $stmt = $pdo->query("
      SELECT id, details FROM promos
      WHERE id = 'martes_cine'
        AND CURDATE() BETWEEN IFNULL(valid_from, CURDATE()) AND IFNULL(valid_to, CURDATE())
      LIMIT 1
    ");
    if ($pr = $stmt->fetch()) {
      $coupon_pct = 50;
      $coupon_id  = 'martes_cine';
      $non_stack  = stripos($pr['details'] ?? '', 'no acumulable') !== false;
    }
  }
}

// Composición de descuentos
$applied_pct = 0;
if ($non_stack) {
  $applied_pct = max($membership_pct, $coupon_pct); // no acumulable
} else {
  $applied_pct = min(80, $membership_pct + $coupon_pct); // acumulable con tope 80%
}

$discount_value = round($subtotal * ($applied_pct / 100), 2);
$total = max(0, $subtotal - $discount_value);

json_out([
  'ok' => true,
  'screening_id'  => $screening_id,
  'seat_count'    => $seat_count,
  'price'         => $price,
  'subtotal'      => $subtotal,
  'membership_pct'=> $membership_pct,
  'coupon_id'     => $coupon_id,
  'coupon_code'   => $coupon ?: null,
  'coupon_pct'    => $coupon_pct,
  'non_stack'     => $non_stack,
  'applied_pct'   => $applied_pct,
  'discount_value'=> $discount_value,
  'total'         => $total
]);
