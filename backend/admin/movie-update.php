<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

// Solo aceptamos POST
require_post();

$pdo = getPDO();

try {
    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new Exception('Conexión a BD ($pdo) no inicializada');
    }

    // Leemos JSON enviado desde fetch(...)
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        throw new Exception('JSON inválido');
    }

    $id           = isset($body['id'])           ? (int)$body['id']           : 0;
    $title        = isset($body['title'])        ? trim((string)$body['title'])        : '';
    $genre        = isset($body['genre'])        ? trim((string)$body['genre'])        : null;
    $duration_min = isset($body['duration_min']) ? (int)$body['duration_min']          : null;
    $formats      = isset($body['formats'])      ? trim((string)$body['formats'])      : null;
    $rating       = isset($body['rating'])       ? (float)$body['rating']              : null;
    $poster_url   = isset($body['poster_url'])   ? trim((string)$body['poster_url'])   : null;

    // >>> NUEVOS CAMPOS <<<
    $age_rating   = isset($body['age_rating'])   ? trim((string)$body['age_rating'])   : null;
    $trailer_url  = isset($body['trailer_url'])  ? trim((string)$body['trailer_url'])  : null;

    if ($id <= 0) {
        throw new Exception('ID de película inválido');
    }
    if ($title === '') {
        throw new Exception('El título es obligatorio');
    }

    $sql = "UPDATE movies
            SET title        = :title,
                genre        = :genre,
                duration_min = :duration_min,
                age_rating   = :age_rating,
                formats      = :formats,
                rating       = :rating,
                poster_url   = :poster_url,
                trailer_url  = :trailer_url
            WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title'        => $title,
        ':genre'        => $genre ?: null,
        ':duration_min' => $duration_min ?: null,
        ':age_rating'   => $age_rating ?: null,
        ':formats'      => $formats ?: null,
        ':rating'       => $rating ?: null,
        ':poster_url'   => $poster_url ?: null,
        ':trailer_url'  => $trailer_url ?: null,
        ':id'           => $id,
    ]);

    // Volvemos a leer la película actualizada para devolverla al frontend
    $stmt = $pdo->prepare("SELECT * FROM movies WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $movie = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$movie) {
        throw new Exception('No se encontró la película después de actualizar');
    }

    // Normalizar tipos numéricos
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
