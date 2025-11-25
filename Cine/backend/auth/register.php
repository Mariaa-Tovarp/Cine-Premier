<?php
// Cine/backend/auth/register.php
declare(strict_types=1);

require_once __DIR__ . '/../db.php'; // aquí están getPDO(), json_out(), require_post()

try {
    // Solo permitir POST
    require_post();

    // Conexión PDO
    $pdo = getPDO();

    // Saber a qué base de datos estamos conectados
    $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn() ?? 'desconocida';

    // Leer JSON crudo
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        json_out(['ok' => false, 'error' => 'JSON inválido', 'db' => $dbName], 400);
    }

    $name     = trim($data['name'] ?? '');
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if ($name === '' || $email === '' || $password === '') {
        json_out(['ok' => false, 'error' => 'Faltan datos', 'db' => $dbName], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_out(['ok' => false, 'error' => 'Correo inválido', 'db' => $dbName], 400);
    }

    // 1) ¿Ya existe?
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_out(['ok' => false, 'error' => 'Ese correo ya está registrado', 'db' => $dbName], 409);
    }

    // 2) Hash de contraseña
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $role = 'user';

    // 3) INSERT en tu tabla users (SIN vip_points)
    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$name, $email, $hash, $role]);

    if ($stmt->rowCount() === 0) {
        json_out(['ok' => false, 'error' => 'No se pudo guardar el usuario', 'db' => $dbName], 500);
    }

    $id = (int)$pdo->lastInsertId();

    json_out([
        'ok' => true,
        'db' => $dbName,
        'user' => [
            'id'    => $id,
            'name'  => $name,
            'email' => $email,
            'role'  => $role,
            // ya no devolvemos vip_points
        ],
    ]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => 'Error en el servidor',
        // 'debug' => $e->getMessage(), // descomenta si quieres ver el error exacto
    ], 500);
}

