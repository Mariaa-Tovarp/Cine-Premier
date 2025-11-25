<?php
header("Content-Type: application/json");
require_once "../db.php";

$data = json_decode(file_get_contents("php://input"), true);

$screening_id = $data["screening_id"];
$seats        = $data["seats"];
$movie_id     = $data["movie_id"];
$type         = $data["operation"]; // venta | reserva

try {
    $pdo = getPDO();
    $pdo->beginTransaction();

    //------------------------------------------
    // 1) VALIDAR ASIENTOS
    //------------------------------------------
    foreach ($seats as $code) {

        $q = $pdo->prepare("
            SELECT id, status 
            FROM seats 
            WHERE screening_id=? AND seat_code=?
            LIMIT 1
        ");
        $q->execute([$screening_id, $code]);
        $seat = $q->fetch(PDO::FETCH_ASSOC);

        if (!$seat) {
            throw new Exception("Asiento no encontrado: $code");
        }

        if ($seat["status"] !== "free") {
            throw new Exception("El asiento $code NO está disponible.");
        }
    }

    //------------------------------------------
    // 2) CAMBIAR ESTADO DE ASIENTOS
    //------------------------------------------
    $newStatus = ($type === "venta" ? "occupied" : "reserved");

    $u = $pdo->prepare("
        UPDATE seats SET status=? 
        WHERE screening_id=? AND seat_code=?
    ");

    foreach ($seats as $code) {
        $u->execute([$newStatus, $screening_id, $code]);
    }

    //------------------------------------------
    // 3) GUARDAR TICKETS O RESERVA
    //------------------------------------------
    $ticketIds = [];

    if ($type === "venta") {

        // REGISTRA TICKETS
        $ins = $pdo->prepare("
            INSERT INTO tickets(screening_id, seat, status)
            VALUES(?, ?, 'paid')
        ");

        foreach ($seats as $code) {
            $ins->execute([$screening_id, $code]);
            $ticketIds[] = $pdo->lastInsertId(); // <--- AQUI ESTA LA CORRECCIÓN
        }

    } else {

        // RESERVA ÚNICA QUE GUARDA TODOS LOS ASIENTOS JUNTOS
        $code = "R-" . rand(8000, 9999);

        $ins = $pdo->prepare("
            INSERT INTO reservas(code, screening_id, seats, status)
            VALUES(?, ?, ?, 'CONFIRMED')
        ");

        $ins->execute([
            $code,
            $screening_id,
            implode(",", $seats)
        ]);
    }

    //------------------------------------------
    // TODO OK
    //------------------------------------------
    $pdo->commit();

    echo json_encode([
        "ok" => true,
        "type" => $type,
        "ticket_ids" => $ticketIds,
        "seats" => $seats
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(["ok"=>false, "error"=>$e->getMessage()]);
}
