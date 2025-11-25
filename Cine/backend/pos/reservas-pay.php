<?php
declare(strict_types=1);
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    if (!isset($_GET['id'])) {
        throw new Exception("ID de reserva no especificado");
    }

    $id = intval($_GET['id']);
    $pdo = getPDO();

    $pdo->beginTransaction();

    // 1. Obtener reserva
    $stmt = $pdo->prepare("SELECT * FROM reservas WHERE id = ? FOR UPDATE");
    $stmt->execute([$id]);
    $reserva = $stmt->fetch();

    if (!$reserva) throw new Exception("Reserva no encontrada");
    if ($reserva["status"] === "PAID") throw new Exception("Esta reserva ya está pagada");
    if ($reserva["status"] === "CANCELLED") throw new Exception("No se puede pagar una reserva cancelada");

    $screening_id = intval($reserva["screening_id"]);
    $client_id = $reserva["client_id"] ?: null;
    $seats = explode(",", $reserva["seats"]);
    $total = floatval($reserva["total"]);

    // 2. Crear venta POS
    $stmt = $pdo->prepare("
        INSERT INTO pos_sales (screening_id, client_id, total, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->execute([$screening_id, $client_id, $total]);
    $sale_id = $pdo->lastInsertId();

    // Precio por asiento
    $price_per_seat = $total / count($seats);

    // 3. Crear items + tickets + marcar asiento vendido
    foreach ($seats as $seat) {

        // Item POS
        $stmt = $pdo->prepare("
            INSERT INTO pos_sale_items (sale_id, item_type, description, price, qty)
            VALUES (?, 'ticket', ?, ?, 1)
        ");
        $stmt->execute([
            $sale_id,
            "Asiento $seat",
            $price_per_seat
        ]);

        // Ticket
        $stmt = $pdo->prepare("
            INSERT INTO tickets (screening_id, seat_code, sale_id, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$screening_id, $seat, $sale_id]);

        // Marcar asiento como vendido
        $stmt = $pdo->prepare("
            UPDATE seats
            SET status = 'occupied'
            WHERE screening_id = ? AND seat_code = ?
        ");
        $stmt->execute([$screening_id, $seat]);
    }

    // 4. Marcar reserva como pagada
    $stmt = $pdo->prepare("UPDATE reservas SET status = 'PAID' WHERE id = ?");
    $stmt->execute([$id]);

    $pdo->commit();

    echo json_encode(["ok" => true, "message" => "Reserva pagada correctamente"]);
} catch (Exception $ex) {

    if ($pdo->inTransaction()) $pdo->rollBack();

    http_response_code(400);
    echo json_encode(["ok" => false, "error" => $ex->getMessage()]);
}
