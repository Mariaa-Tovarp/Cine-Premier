<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
// Si tienes alguna función de seguridad tipo require_login() o similar,
// la puedes llamar aquí. Por ahora lo dejamos solo con la conexión.

// Obtener PDO
$pdo = getPDO();

try {
    // Traemos las columnas que usa el panel
    $stmt = $pdo->query("
        SELECT
            id,
            title,
            genre,
            duration_min,
            formats,
            rating,
            poster_url
        FROM movies
        ORDER BY created_at DESC, id DESC
    ");

    $movies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_out([
        'ok'     => true,
        'movies' => $movies,
    ]);
} catch (Throwable $e) {
    // Opcional: loguear el error real en un archivo
    // error_log($e->getMessage());

    json_out([
        'ok'    => false,
        'error' => 'Error al cargar películas',
    ], 500);
}
