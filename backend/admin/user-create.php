<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

require_post();
$pdo = getPDO();

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$name  = trim($data['name']  ?? '');
$email = trim($data['email'] ?? '');
$role  = trim($data['role']  ?? 'cashier');

if ($name === '' || $email === '') {
    json_out([
        'ok'    => false,
        'error' => 'Nombre y correo son obligatorios',
    ], 400);
}

// Generar contraseña temporal
$tempPass = bin2hex(random_bytes(4)); // 8 caracteres hex
$passHash = password_hash($tempPass, PASSWORD_DEFAULT);

try {
    $sql = "INSERT INTO users (name, email, role, password_hash, created_at)
            VALUES (:name, :email, :role, :pass, NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':email'=> $email,
        ':role' => $role,
        ':pass' => $passHash,
    ]);

    $id = (int)$pdo->lastInsertId();

    $stmt = $pdo->prepare(
        "SELECT id, name, email, role, last_login_at
         FROM users WHERE id = :id"
    );
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();

    json_out([
        'ok'            => true,
        'user'          => $user,
        'temp_password' => $tempPass, // para mostrar en el alert
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
