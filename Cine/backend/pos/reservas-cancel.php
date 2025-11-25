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

    // 1. Obtener la reserva
    $stmt = $pdo->prepare("SELECT * FROM reservas WHERE id = ? FOR UPDATE");
    $stmt->execute([$id]);
    $reserva = $stmt->fetch();

    if (!$reserva) {
        throw new Exception("Reserva no encontrada");
    }

    if ($reserva["status"] === "PAID") {
        throw new Exception("No se puede cancelar una reserva PAGA");
    }

    if ($reserva["status"] === "CANCELLED") {
        throw new Exception("La reserva ya está cancelada");
    }

    // 2. Liberar asientos: reservas_seats
    $stmt = $pdo->prepare("DELETE FROM reservas_seats WHERE reserva_id = ?");
    $stmt->execute([$id]);

    // 3. Opcional: si manejas una tabla seats ocupados por función
    // ejemplo:
    // DELETE FROM screening_seats WHERE reserva_id = ?

    // 4. Marcar como cancelada
    $stmt = $pdo->prepare("UPDATE reservas SET status = 'CANCELLED' WHERE id = ?");
    $stmt->execute([$id]);

    $pdo->commit();

    echo json_encode(["ok" => true, "message" => "Reserva cancelada y asientos liberados"]);

} catch (Exception $ex) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => $ex->getMessage()]);
}
