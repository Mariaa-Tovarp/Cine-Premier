<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
// Si tienes alguna función de seguridad tipo require_login() o similar,
// la puedes llamar aquí. Por ahora lo dejamos solo con la conexión.

// Obtener PDO
$pdo = getPDO();
try {
    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new Exception('Conexión a BD ($pdo) no inicializada');
    }

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        throw new Exception('JSON inválido');
    }

    $id = isset($body['id']) ? (int)$body['id'] : 0;
    if ($id <= 0) {
        throw new Exception('ID de película inválido');
    }

    // Si tienes proyecciones que dependan de la película,
    // aquí podrías borrar primero de screenings, etc.
    // Ejemplo:
    // $pdo->prepare("DELETE FROM screenings WHERE movie_id = :id")->execute([':id' => $id]);

    $stmt = $pdo->prepare("DELETE FROM movies WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode([
        'ok' => true,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => $e->getMessage(),
    ]);
}
