<?php
declare(strict_types=1);
header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';

// (Opcional durante pruebas)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {

    $pdo = getPDO();

    $sql = "
        SELECT 
            r.id,
            r.code,
            r.client,
            r.seats,

            -- 🔥 Convertimos total a número REAL
            CAST(r.total AS DECIMAL(10,2)) AS total,

            r.status,

            -- 🔥 Extraemos fecha y hora desde tu columna real start_datetime
            DATE(s.start_datetime) AS date,
            TIME(s.start_datetime) AS time,

            m.title AS movie,
            s.hall AS room

        FROM reservas r
        JOIN screenings s ON s.id = r.screening_id
        JOIN movies m ON m.id = s.movie_id
        ORDER BY r.id DESC
    ";

    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "ok" => true,
        "reservas" => $rows
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {

    echo json_encode([
        "ok" => false,
        "error" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
