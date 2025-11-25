<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

require_post();
$pdo = getPDO();

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    json_out([
        'ok'    => false,
        'error' => 'JSON inválido',
    ], 400);
}

$movieId   = isset($data['movie_id'])       ? (int)$data['movie_id']       : 0;
$cinemaId  = isset($data['cinema_id'])      ? (int)$data['cinema_id']      : 0;
$startDt   = isset($data['start_datetime']) ? trim($data['start_datetime']): '';
$format    = isset($data['format'])         ? trim($data['format'])        : '';
$hall      = isset($data['hall'])           ? trim($data['hall'])          : '';
$basePrice = isset($data['base_price'])     ? (float)$data['base_price']   : 0;

if ($movieId <= 0 || $startDt === '' || $hall === '' || $basePrice <= 0) {
    json_out([
        'ok'    => false,
        'error' => 'Datos incompletos para crear la función',
    ], 400);
}

if ($cinemaId <= 0) {
    $cinemaId = 1;
}

try {
    $sql = "INSERT INTO screenings (movie_id, cinema_id, start_datetime, format, hall, base_price)
            VALUES (:movie_id, :cinema_id, :start_dt, :format, :hall, :base_price)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':movie_id'   => $movieId,
        ':cinema_id'  => $cinemaId,
        ':start_dt'   => $startDt,
        ':format'     => $format,
        ':hall'       => $hall,
        ':base_price' => $basePrice,
    ]);

    $id = (int)$pdo->lastInsertId();

    json_out([
        'ok'        => true,
        'screening' => [
            'id'             => $id,
            'movie_id'       => $movieId,
            'cinema_id'      => $cinemaId,
            'start_datetime' => $startDt,
            'format'         => $format,
            'hall'           => $hall,
            'base_price'     => $basePrice,
        ],
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
