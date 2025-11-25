<?php
// backend/pos/member-info.php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');

try {
    $pdo = getPDO();

    // Email del cliente recibido desde el POS
    $email = trim($_GET['email'] ?? $_POST['email'] ?? '');

    if ($email === '') {
        json_out([
            'ok'     => false,
            'member' => null,
            'error'  => 'Falta el email del cliente',
        ], 400);
    }

    $sql = "
        SELECT
            u.id       AS user_id,
            u.name     AS user_name,
            u.email,
            m.tier,
            m.points,
            m.since,
            m.joined_at
        FROM users u
        LEFT JOIN members m
               ON m.user_id = u.id
        WHERE u.email = ?
        LIMIT 1
    ";

    $st = $pdo->prepare($sql);
    $st->execute([$email]);
    $row = $st->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        json_out([
            'ok'     => true,
            'member' => null,
        ]);
    }

    // Mapear descuento por tier (ajusta valores si quieres)
    $discountByTier = [
        'vip_basic'  => 0.10, // 10%
        'vip_silver' => 0.15, // 15%
        'vip_gold'   => 0.20, // 20%
    ];

    $tier = $row['tier'] ?? null;
    $discount = $tier && isset($discountByTier[$tier])
        ? $discountByTier[$tier]
        : 0.0;

    $row['points']   = isset($row['points']) ? (int)$row['points'] : 0;
    $row['discount'] = $discount;

    json_out([
        'ok'     => true,
        'member' => $row,
    ]);

} catch (Throwable $e) {
    json_out([
        'ok'     => false,
        'member' => null,
        'error'  => $e->getMessage(),
    ], 500);
}
