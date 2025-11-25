<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

$pdo = getPDO();

$movieId  = isset($_GET['movie_id']) ? (int)$_GET['movie_id'] : 0;
$cinemaId = isset($_GET['cinema_id']) ? (int)$_GET['cinema_id'] : 0;

if ($movieId <= 0) {
    json_out([
        'ok'    => false,
        'error' => 'movie_id es requerido',
    ], 400);
}

try {
    $sql = "SELECT id, movie_id, cinema_id, start_datetime, format, hall, base_price
            FROM screenings
            WHERE movie_id = :movie_id";

    if ($cinemaId > 0) {
        $sql .= " AND cinema_id = :cinema_id";
    }

    $sql .= " ORDER BY start_datetime ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':movie_id', $movieId, PDO::PARAM_INT);
    if ($cinemaId > 0) {
        $stmt->bindValue(':cinema_id', $cinemaId, PDO::PARAM_INT);
    }
    $stmt->execute();
    $rows = $stmt->fetchAll();

    json_out([
        'ok'         => true,
        'screenings' => $rows,
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
