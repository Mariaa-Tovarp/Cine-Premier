<?php
declare(strict_types=1);
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/../db.php';

// Activar errores (solo desarrollo)
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// Leer JSON del frontend
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!$data) {
    echo json_encode(["ok" => false, "error" => "JSON inválido"]);
    exit;
}

$movie_id     = $data["movie_id"]     ?? null;
$screening_id = $data["screening_id"] ?? null;
$client_id    = $data["client_id"]    ?? null;
$seats        = $data["seats"]        ?? [];

if (!$movie_id || !$screening_id || !$client_id || empty($seats)) {
    echo json_encode(["ok" => false, "error" => "Datos incompletos"]);
    exit;
}

try {
    $pdo = getPDO();
    $pdo->beginTransaction();

    // =========================================================
    // 1) Obtener nombre del cliente
    // =========================================================
    $stClient = $pdo->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
    $stClient->execute([$client_id]);
    $rowClient = $stClient->fetch(PDO::FETCH_ASSOC);
    $clientName = $rowClient["name"] ?? "";

    // =========================================================
    // 2) Verificar disponibilidad
    // =========================================================
    $placeholders = implode(",", array_fill(0, count($seats), "?"));

    $sqlCheck = "
        SELECT seat_code, status
        FROM seats
        WHERE screening_id = ?
          AND seat_code IN ($placeholders)
        FOR UPDATE
    ";

    $params = array_merge([$screening_id], $seats);
    $st = $pdo->prepare($sqlCheck);
    $st->execute($params);
    $found = $st->fetchAll(PDO::FETCH_ASSOC);

    if (count($found) !== count($seats)) {
        $pdo->rollBack();
        echo json_encode(["ok" => false, "error" => "Uno o más asientos no existen"]);
        exit;
    }

    foreach ($found as $f) {
        if ($f["status"] !== "free") {
            $pdo->rollBack();
            echo json_encode(["ok" => false, "error" => "El asiento {$f['seat_code']} ya no está disponible"]);
            exit;
        }
    }

    // =========================================================
    // 3) CALCULAR TOTAL REAL
    // =========================================================

    $total = 0;

    $sqlSeatInfo = $pdo->prepare("
        SELECT is_premium 
        FROM seats 
        WHERE screening_id = ? AND seat_code = ?
    ");

    foreach ($seats as $seat) {
        $sqlSeatInfo->execute([$screening_id, $seat]);
        $row = $sqlSeatInfo->fetch(PDO::FETCH_ASSOC);

        $isPremium = $row && $row["is_premium"] == 1;

        // precios reales
        $total += $isPremium ? 23000 : 18000;
    }

    // =========================================================
    // 4) Marcar asientos como reservados
    // =========================================================
    $sqlUpd = "
        UPDATE seats
           SET status = 'reserved'
         WHERE screening_id = ?
           AND seat_code = ?
    ";
    $upd = $pdo->prepare($sqlUpd);

    foreach ($seats as $s) {
        $upd->execute([$screening_id, $s]);
    }

    // =========================================================
    // 5) Insertar reserva
    // =========================================================
    $code = "R-" . rand(8000, 9999);

    $sqlInsert = "
        INSERT INTO reservas (
            code,
            movie_id,
            screening_id,
            client_id,
            client,
            seats,
            total,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
    ";

    $pdo->prepare($sqlInsert)->execute([
        $code,
        $movie_id,
        $screening_id,
        $client_id,
        $clientName,
        implode(",", $seats),
        $total     // ← TOTAL REAL CALCULADO
    ]);

    $pdo->commit();

    echo json_encode([
        "ok"      => true,
        "code"    => $code,
        "total"   => $total,
        "message" => "Reserva creada correctamente"
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}

