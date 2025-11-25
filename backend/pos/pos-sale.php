<?php
// backend/pos/pos-sale.php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_post();

header('Content-Type: application/json');

$user = $_SESSION['user'] ?? null;
if (!$user || empty($user['id'])) {
    json_out(['ok' => false, 'error' => 'No autenticado'], 401);
}

$raw     = file_get_contents('php://input');
$payload = json_decode($raw, true) ?? $_POST;

$items          = $payload['items'] ?? [];
$customer_name  = trim($payload['customer_name'] ?? '');
$customer_email = trim($payload['customer_email'] ?? '');

if (!$items || !is_array($items)) {
    json_out(['ok' => false, 'error' => 'Carrito vacío'], 400);
}

try {
    $pdo = getPDO();
    $pdo->beginTransaction();

    // 1) Calcular subtotal base (sin descuento)
    $baseSubtotal = 0.0;
    foreach ($items as $it) {
        $qty   = (int)($it['qty']   ?? 0);
        $price = (float)($it['price'] ?? 0);
        if ($qty <= 0 || $price < 0) continue;
        $baseSubtotal += $qty * $price;
    }

    // 2) Buscar membresía del cliente por email
    $discountRate = 0.0;
    $memberTier   = null;
    $memberId     = null;

    if ($customer_email !== '') {
        $sql = "
            SELECT
                u.id   AS user_id,
                m.tier AS tier
            FROM users u
            LEFT JOIN members m
                   ON m.user_id = u.id
            WHERE u.email = ?
            LIMIT 1
        ";
        $st  = $pdo->prepare($sql);
        $st->execute([$customer_email]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row['tier'])) {
            $memberId   = (int)$row['user_id'];
            $memberTier = $row['tier'];

            $discountByTier = [
                'vip_basic'  => 0.10,
                'vip_silver' => 0.15,
                'vip_gold'   => 0.20,
            ];

            if (isset($discountByTier[$memberTier])) {
                $discountRate = $discountByTier[$memberTier];
            }
        }
    }

    // 3) Aplicar descuento
    $discountAmount = $baseSubtotal * $discountRate;
    $subtotal       = $baseSubtotal - $discountAmount;

    // 4) Impuestos y total
    $tax   = round($subtotal * 0.16, 2); // IVA 16%
    $total = round($subtotal + $tax, 2);

    // 5) Insertar venta
    $st = $pdo->prepare("
        INSERT INTO pos_sales
            (cashier_id, customer_name, customer_email, is_vip, subtotal, tax, total)
        VALUES
            (:cashier_id, :name, :email, :is_vip, :subtotal, :tax, :total)
    ");
    $st->execute([
        ':cashier_id' => (int)$user['id'],
        ':name'       => $customer_name,
        ':email'      => $customer_email,
        ':is_vip'     => $discountRate > 0 ? 1 : 0,
        ':subtotal'   => $subtotal, // ya con descuento
        ':tax'        => $tax,
        ':total'      => $total,
    ]);

    $saleId = (int)$pdo->lastInsertId();

    // 6) Insertar líneas
    $stItem = $pdo->prepare("
        INSERT INTO pos_sale_items
            (sale_id, item_type, item_id, name, qty, price)
        VALUES
            (:sale_id, :type, :item_id, :name, :qty, :price)
    ");

    foreach ($items as $it) {
        $qty   = (int)($it['qty']   ?? 0);
        $price = (float)($it['price'] ?? 0);
        if ($qty <= 0 || $price < 0) continue;

        $type = $it['type'] ?? 'ticket';
        $itemId = null;

        if ($type === 'ticket') {
            $itemId = isset($it['screening_id']) ? (int)$it['screening_id'] : null;
        } elseif ($type === 'snack') {
            $itemId = isset($it['snack_id']) ? (int)$it['snack_id'] : null;
        }

        $name = (string)($it['label'] ?? '');

        $stItem->execute([
            ':sale_id' => $saleId,
            ':type'    => $type,
            ':item_id' => $itemId,
            ':name'    => $name,
            ':qty'     => $qty,
            ':price'   => $price,
        ]);
    }

    $pdo->commit();

    json_out([
        'ok'      => true,
        'sale_id' => $saleId,
        'total'   => $total,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_out([
        'ok'    => false,
        'error' => 'No se pudo registrar la venta',
    ], 500);
}
