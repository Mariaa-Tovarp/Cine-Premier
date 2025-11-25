<?php
// backend/pos/snacks-list.php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');

try {
    $pdo = getPDO();
    $sql = "
        SELECT
            id,
            name,
            price,
            category
        FROM snacks
        ORDER BY name
    ";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_out([
        'ok'     => true,
        'snacks' => $rows,
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => 'No se pudieron cargar los snacks',
    ], 500);
}
