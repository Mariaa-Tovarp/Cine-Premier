<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

try {
    $user = $_SESSION['user'] ?? null;

    if (!$user || empty($user['id'])) {
        json_out(['member' => null]);
    }

    $pdo = getPDO();

    $sql = "
        SELECT
            user_id,
            tier,
            points,
            since,
            joined_at
        FROM members
        WHERE user_id = ?
        LIMIT 1
    ";

    $st = $pdo->prepare($sql);
    $st->execute([(int)$user['id']]);
    $row = $st->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $row['points'] = (int)$row['points'];
    }

    json_out(['member' => $row]);

} catch (Throwable $e) {
    json_out([
        'member' => null,
        'error'  => $e->getMessage(),
    ], 500);
}
