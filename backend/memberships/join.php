<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_post();

try {
    $user = $_SESSION['user'] ?? null;
    if (!$user || empty($user['id'])) {
        json_out(['ok' => false, 'error' => 'Requiere login'], 401);
    }

    $user_id = (int)$user['id'];

    // Leer POST (JSON)
    $raw     = file_get_contents('php://input');
    $payload = json_decode($raw, true);
    $tier    = trim($payload['tier'] ?? '');

    if ($tier === '') {
        json_out(['ok' => false, 'error' => 'Falta tipo de membresía'], 400);
    }

    $pdo = getPDO();

    // Creamos la membresía si no existe; si existe, solo actualizamos el tier
    $sql = "
        INSERT INTO members (user_id, tier, points, since, joined_at)
        VALUES (?, ?, 0, CURDATE(), NOW())
        ON DUPLICATE KEY UPDATE
            tier = VALUES(tier)
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user_id, $tier]);

    json_out([
        'ok'   => true,
        'tier' => $tier,
    ]);

} catch (Throwable $e) {
    json_out(['ok' => false, 'error' => $e->getMessage()], 500);
}
