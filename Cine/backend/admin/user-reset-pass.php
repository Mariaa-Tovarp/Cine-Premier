<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

require_post();
$pdo = getPDO();

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int)($data['id'] ?? 0);

if ($id <= 0) {
    json_out([
        'ok'    => false,
        'error' => 'ID inválido',
    ], 400);
}

// Nueva contraseña temporal
$tempPass = bin2hex(random_bytes(4));
$passHash = password_hash($tempPass, PASSWORD_DEFAULT);

try {
    $stmt = $pdo->prepare(
        "UPDATE users
         SET password_hash = :pass
         WHERE id = :id"
    );
    $stmt->execute([
        ':pass' => $passHash,
        ':id'   => $id,
    ]);

    json_out([
        'ok'            => true,
        'temp_password' => $tempPass,
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
