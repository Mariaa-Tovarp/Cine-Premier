<?php
// backend/purchases/history.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// ❌ NO poner session_start() aquí
// db.php YA maneja la sesión con CINESESS correctamente

require_once __DIR__ . '/../db.php';

// Ahora la sesión ya está cargada desde db.php

if (empty($_SESSION['user']['id'])) {
    echo json_encode([
        'ok'    => false,
        'error' => 'No autenticado'
    ]);
    exit;
}

$userId = (int) $_SESSION['user']['id'];

try {
    $pdo = getPDO();

    $sql = "
        SELECT
            t.id,
            t.purchased_at,
            s.id             AS screening_id,
            s.start_datetime,
            s.format,
            s.hall,
            m.title          AS movie_title,
            c.name           AS cinema_name,
            GROUP_CONCAT(t.seat ORDER BY t.seat SEPARATOR ', ') AS seats,
            SUM(t.price)     AS total
        FROM tickets t
        JOIN screenings s ON t.screening_id = s.id
        JOIN movies     m ON s.movie_id    = m.id
        LEFT JOIN cinemas c ON s.cinema_id = c.id
        WHERE t.user_id = ?
          AND t.status = 'paid'
        GROUP BY s.id, DATE(t.purchased_at)
        ORDER BY t.purchased_at DESC
        LIMIT 50
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok'        => true,
        'purchases' => $rows
    ]);
} catch (Throwable $e) {
    echo json_encode([
        'ok'    => false,
        'error' => 'Error al cargar historial: ' . $e->getMessage()
    ]);
}
