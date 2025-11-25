<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_post();

// Iniciar sesión
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

// Verificar que haya usuario y sea admin
$user = $_SESSION['user'] ?? null;
$role = $user['role'] ?? null;

if (!$user || $role !== 'admin') {
    json_out(['ok' => false, 'error' => 'No autorizado'], 403);
}

// Leer payload (JSON o form-data)
$raw     = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

// Sanitizar campos
$title        = trim((string)($payload['title']        ?? ''));
$genre        = trim((string)($payload['genre']        ?? ''));
$duration_min = $payload['duration_min']               ?? null;
$formats      = trim((string)($payload['formats']      ?? ''));
$rating       = $payload['rating']                     ?? null;

// >>> NUEVOS CAMPOS <<<
$age_rating   = trim((string)($payload['age_rating']   ?? ''));
$poster_url   = trim((string)($payload['poster_url']   ?? ''));
$trailer_url  = trim((string)($payload['trailer_url']  ?? ''));

if ($title === '') {
    json_out(['ok' => false, 'error' => 'El título es obligatorio'], 400);
}

// Normalizar tipos
$duration_min = ($duration_min === '' || $duration_min === null)
    ? null
    : (int)$duration_min;

$rating = ($rating === '' || $rating === null)
    ? null
    : (float)$rating;

try {
    $pdo = getPDO();

    // Insertar película (ahora con age_rating, poster_url y trailer_url)
    $stmt = $pdo->prepare("
        INSERT INTO movies (
            title,
            genre,
            duration_min,
            age_rating,
            rating,
            formats,
            poster_url,
            trailer_url
        )
        VALUES (
            :title,
            :genre,
            :duration_min,
            :age_rating,
            :rating,
            :formats,
            :poster_url,
            :trailer_url
        )
    ");
    $stmt->execute([
        ':title'        => $title,
        ':genre'        => ($genre !== '' ? $genre : null),
        ':duration_min' => $duration_min,
        ':age_rating'   => ($age_rating !== '' ? $age_rating : null),
        ':rating'       => $rating,
        ':formats'      => ($formats !== '' ? $formats : null),
        ':poster_url'   => ($poster_url !== '' ? $poster_url : null),
        ':trailer_url'  => ($trailer_url !== '' ? $trailer_url : null),
    ]);

    $id = (int)$pdo->lastInsertId();

    // Volver a leer el registro ya insertado
    $q = $pdo->prepare("SELECT * FROM movies WHERE id = ?");
    $q->execute([$id]);
    $movie = $q->fetch(PDO::FETCH_ASSOC);

    if (!$movie) {
        throw new Exception('No se pudo recuperar la película creada');
    }

    // Ajustar tipos numéricos para que el JSON sea limpio
    if ($movie['duration_min'] !== null) {
        $movie['duration_min'] = (int)$movie['duration_min'];
    }
    if ($movie['rating'] !== null) {
        $movie['rating'] = (float)$movie['rating'];
    }

    json_out([
        'ok'    => true,
        'movie' => $movie,
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
