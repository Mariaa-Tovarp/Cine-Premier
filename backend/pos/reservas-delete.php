<?php
declare(strict_types=1);
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    if (!isset($_POST['id'])) {
        throw new Exception("ID de reserva no especificado");
    }

    $id = intval($_POST['id']);
    $pdo = getPDO();

    $pdo->beginTransaction();

    // Eliminar asientos asociados
    $stmt = $pdo->prepare("DELETE FROM reservas_seats WHERE reserva_id = ?");
    $stmt->execute([$id]);

    // Eliminar reserva
    $stmt = $pdo->prepare("DELETE FROM reservas WHERE id = ?");
    $stmt->execute([$id]);

    $pdo->commit();

    echo json_encode(["ok" => true, "message" => "Reserva eliminada"]);

} catch (Exception $ex) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => $ex->getMessage()]);
}
