<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

require_post();
$pdo = getPDO();

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$id    = (int)($data['id'] ?? 0);
$name  = trim($data['name']  ?? '');
$email = trim($data['email'] ?? '');
$role  = trim($data['role']  ?? '');

if ($id <= 0 || $name === '' || $email === '') {
    json_out([
        'ok'    => false,
        'error' => 'Datos incompletos para actualizar',
    ], 400);
}

try {
    $sql = "UPDATE users
            SET name = :name, email = :email, role = :role
            WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name'  => $name,
        ':email' => $email,
        ':role'  => $role,
        ':id'    => $id,
    ]);

    $stmt = $pdo->prepare(
        "SELECT id, name, email, role, last_login_at
         FROM users WHERE id = :id"
    );
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();

    json_out([
        'ok'   => true,
        'user' => $user,
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
