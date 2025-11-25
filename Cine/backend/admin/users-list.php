<?php
// users-list.php
header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';


try {
    $pdo = getPDO(); // función que devuelve tu instancia PDO

    $sql = "
        SELECT
            id,
            name,
            email,
            role,
            last_login_at
        FROM users
        ORDER BY id ASC
    ";
    $stmt = $pdo->query($sql);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok'    => true,
        'users' => $users,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => $e->getMessage(),
    ]);
}
