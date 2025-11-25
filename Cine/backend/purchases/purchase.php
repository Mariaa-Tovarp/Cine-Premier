<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_post();

$pdo        = getPDO();
$payloadRaw = file_get_contents('php://input');
$payload    = json_decode($payloadRaw, true) ?? $_POST;

$screening_id = (int)($payload['screening_id'] ?? 0);
$seats        = $payload['seats'] ?? [];
$coupon_raw   = trim($payload['coupon'] ?? '');
$coupon       = strtoupper($coupon_raw);
$use_points   = !empty($payload['use_points']); // 🔹 bandera enviada desde seats.js

$user    = $_SESSION['user'] ?? null;
$user_id = $user['id'] ?? null;

if ($screening_id <= 0 || !is_array($seats) || count($seats) === 0) {
  json_out(['ok' => false, 'error' => 'Datos incompletos'], 400);
}

try {
  $pdo->beginTransaction();

  // ======================================================
  // (1) FUNCIÓN + PRECIO BASE
  // ======================================================
  $fallback = 18000.0;
  $stmt = $pdo->prepare("
    SELECT start_datetime, COALESCE(base_price, ?) AS base_price
    FROM screenings
    WHERE id = ?
    FOR UPDATE
  ");
  $stmt->execute([$fallback, $screening_id]);
  $sc = $stmt->fetch();
  if (!$sc) {
    throw new Exception('Función no existe');
  }

  $price   = (float)$sc['base_price'];
  $startDt = new DateTime($sc['start_datetime']);
  $weekday = (int)$startDt->format('N');

  // ======================================================
  // (2) EXISTENCIA DE SILLAS
  // ======================================================
  $haveSeats = (int)$pdo->query("
    SELECT COUNT(*) FROM seats WHERE screening_id = {$screening_id}
  ")->fetchColumn();

  if ($haveSeats === 0) {
    $ins = $pdo->prepare("
      INSERT INTO seats (screening_id, seat_code, status)
      VALUES (?, ?, 'free')
    ");
    foreach (range('A', 'H') as $r) {
      foreach (range(1, 16) as $c) {
        $ins->execute([$screening_id, $r . $c]);
      }
    }
  }

  // ======================================================
  // (3) NORMALIZAR ASIENTOS
  // ======================================================
  $normSeats = [];
  foreach ($seats as $s) {
    $seat = strtoupper(trim((string)$s));
    if (!preg_match('/^[A-J](1[0-6]|[1-9])$/', $seat)) {
      throw new Exception("Asiento inválido: {$seat}");
    }
    $normSeats[] = $seat;
  }

  // ======================================================
  // (4) BLOQUEAR ASIENTOS
  // ======================================================
  $in = str_repeat('?,', count($normSeats) - 1) . '?';
  $st = $pdo->prepare("
    SELECT seat_code, status
    FROM seats
    WHERE screening_id = ?
      AND seat_code IN ($in)
    FOR UPDATE
  ");
  $st->execute(array_merge([$screening_id], $normSeats));
  $status = $st->fetchAll(PDO::FETCH_KEY_PAIR);

  foreach ($normSeats as $seat) {
    if (!isset($status[$seat])) {
      throw new Exception("Asiento inexistente: {$seat}");
    }
    if ($status[$seat] !== 'free') {
      throw new Exception("Asiento ocupado: {$seat}");
    }
  }

  // ======================================================
  // (4.b) SUBTOTAL CON PREMIUM
  // ======================================================
  $premiumExtra = 5000.0;
  $subtotal     = 0.0;
  $qty          = count($normSeats);

  foreach ($normSeats as $seatCode) {
    $num       = (int)preg_replace('/^[A-Z]/i', '', $seatCode);
    $isPremium = in_array($num, [6, 7, 8, 14, 15, 16], true);
    $seatPrice = $price + ($isPremium ? $premiumExtra : 0.0);
    $subtotal += $seatPrice;
  }

  $subtotal = round($subtotal, 2);

  // ======================================================
  // (5) DESCUENTOS → membresía + cupón
  // ======================================================

  // (a) descuento de membresía (porcentaje)
  $membership_pct = 0;
  $member_points  = 0;
  $member_tier    = null;

  if ($user_id) {
    $stmt = $pdo->prepare("SELECT tier, points FROM members WHERE user_id = ?");
    $stmt->execute([$user_id]);
    if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $member_tier   = strtolower($row['tier']);
      $member_points = (int)$row['points'];

      $map = [
        'vip_basic'   => 10,
        'vip_premium' => 15,
        'vip_premier' => 20,
      ];
      $membership_pct = $map[$member_tier] ?? 0;
    }
  }

  // (b) cupón
  $coupon_pct = 0;
  $non_stack  = false;
  $coupon_id  = null;

  if ($coupon !== '') {
    $cp = $pdo->prepare("
      SELECT *
      FROM promos
      WHERE coupon = ?
        AND active = 1
        AND (valid_from IS NULL OR valid_from <= CURDATE())
        AND (valid_to   IS NULL OR valid_to   >= CURDATE())
      LIMIT 1
    ");
    $cp->execute([$coupon]);
    $pr = $cp->fetch(PDO::FETCH_ASSOC);

    if (!$pr) {
      throw new Exception('Cupón inválido o vencido');
    }

    $coupon_id = $pr['id'] ?? null;
    $textAll   = trim(($pr['description'] ?? '') . ' ' . ($pr['title'] ?? ''));

    $non_stack = stripos($textAll, 'no acumulable') !== false;

    $coupon_pct = (int)round((float)($pr['discount_percent'] ?? 0));
    if ($coupon_pct <= 0 && preg_match('/(\d{1,2})\s*%/u', $textAll, $mch)) {
      $coupon_pct = (int)$mch[1];
    }
    $coupon_pct = min(80, max(0, $coupon_pct));

    // reglas especiales
    if ($coupon === 'MARTES2X1' && $weekday !== 2) {
      throw new Exception('El cupón MARTES2X1 solo es válido los martes.');
    }
    if ($coupon === 'SCARE12K') {
      $hour = (int)$startDt->format('H');
      if ($hour < 21) {
        throw new Exception('El cupón SCARE12K solo aplica después de las 9pm.');
      }
      $targetPrice = 12000.0;
      $coupon_pct  = round(100 - ($targetPrice / $price) * 100);
      $coupon_pct  = min(80, max(0, $coupon_pct));
      $non_stack   = true;
    }
  }

  // ======================================================
  // (6) COMBINAR PORCENTAJES
  // ======================================================
  $applied_pct = $non_stack
    ? max($membership_pct, $coupon_pct)
    : min(80, $membership_pct + $coupon_pct);

  $discount_value = round($subtotal * ($applied_pct / 100), 2);
  $total_base     = max(0, round($subtotal - $discount_value, 2));

  // ======================================================
  // (7) APLICAR DESCUENTO POR PUNTOS VIP
  // ======================================================
  $used_points = 0;
  $total       = $total_base;

  if ($use_points && $member_points > 0) {
    // 1 punto = $50
    $max_discount = $member_points * 50;

    if ($max_discount >= $total) {
      // usa solo los necesarios
      $used_points = (int)ceil($total / 50);
      $total       = 0;
    } else {
      $used_points = $member_points;
      $total       = max(0, $total - $max_discount);
    }

    // Actualizar puntos del usuario
    $member_points_after = $member_points - $used_points;

    $upd = $pdo->prepare("
      UPDATE members
      SET points = ?
      WHERE user_id = ?
    ");
    $upd->execute([$member_points_after, $user_id]);
  } else {
    $member_points_after = $member_points;
  }

  // ======================================================
  // (8) PRORRATEO DE TICKETS
  // ======================================================
  $per  = $qty > 0 ? floor(($total / $qty) * 100) / 100 : 0.0;
  $last = round($total - ($per * ($qty - 1)), 2);

  $insTicket = $pdo->prepare("
    INSERT INTO tickets (screening_id, user_id, seat, price, status, purchased_at)
    VALUES (?, ?, ?, ?, 'paid', NOW())
  ");
  $updSeat = $pdo->prepare("
    UPDATE seats
    SET status = 'occupied', updated_at = NOW()
    WHERE screening_id = ? AND seat_code = ? AND status = 'free'
  ");

  foreach ($normSeats as $i => $seat) {
    $p = ($i === $qty - 1) ? $last : $per;

    $updSeat->execute([$screening_id, $seat]);
    if ($updSeat->rowCount() === 0) {
      throw new Exception("Asiento ocupado: {$seat}");
    }

    $insTicket->execute([$screening_id, $user_id, $seat, $p]);
  }

// ======================================================
// (9) SUMAR PUNTOS NUEVOS (SIEMPRE que haya pago en dinero)
// ======================================================
$points_earned = 0;

// 👉 ahora NO filtramos por !$use_points
if ($user_id && $total > 0) {
    // 1 punto por cada 1000 del TOTAL pagado en dinero
    $points_earned = (int)floor($total / 1000);

    if ($points_earned > 0) {
        $upd = $pdo->prepare("
          UPDATE members
          SET points = COALESCE(points, 0) + ?
          WHERE user_id = ?
        ");
        $upd->execute([$points_earned, $user_id]);

        // sumamos esos puntos al saldo final que mandamos al front
        $member_points_after += $points_earned;
    }
}


  // ======================================================
  // (10) COMMIT + RESPUESTA JSON COMPLETA
  // ======================================================
  $pdo->commit();

  json_out([
    'ok'               => true,
    'screening_id'     => $screening_id,
    'seats'            => $normSeats,
    'qty'              => $qty,
    'subtotal'         => $subtotal,
    'membership_pct'   => $membership_pct,
    'coupon_id'        => $coupon_id,
    'coupon_pct'       => $coupon_pct,
    'discount_value'   => $discount_value,
    'applied_pct'      => $applied_pct,
    'total_before_pts' => $total_base,
    'used_points'      => $used_points,
    'points_earned'    => $points_earned,
    'total'            => $total,
    'vip' => [
      'before'      => $member_points,
      'used'        => $used_points,
      'left'        => $member_points_after,
      'points_left' => $member_points_after,
      'tier'        => $member_tier,
    ],
  ]);

} catch (Throwable $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }

  $msg = $e->getMessage();
  json_out(['ok' => false, 'error' => $msg], 400);
}