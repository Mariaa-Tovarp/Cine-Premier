<?php
declare(strict_types=1);
header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

$screening_id = (int)($_GET["screening_id"] ?? 0);
if (!$screening_id) {
    echo json_encode(["ok" => false, "error" => "screening_id requerido"]);
    exit;
}

try {
    $pdo = getPDO();

    // Traer asientos
    $sql = "
        SELECT 
            seat_code,
            is_premium,
            status
        FROM seats
        WHERE screening_id = ?
        ORDER BY seat_code
    ";
    $st = $pdo->prepare($sql);
    $st->execute([$screening_id]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    // Mapeo de estados esperados por la interfaz
    $map = [
        "free"      => "free",
        "reserved"  => "reserved",
        "occupied"  => "occupied"
    ];

    foreach ($rows as &$r) {

        // Código que requiere seat.js
        $r["code"] = $r["seat_code"];

        // 🔥 Normalizar estado SIEMPRE
        $st = strtolower(trim($r["status"] ?? "free"));
        $r["status"] = $map[$st] ?? "free";

        // Premium → tier
        $r["tier"] = $r["is_premium"] ? "premium" : "normal";

        unset($r["is_premium"]);
    }

    echo json_encode([
        "ok"    => true,
        "seats" => $rows
    ]);

} catch (Throwable $e) {
    echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
