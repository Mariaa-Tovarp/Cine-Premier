<?php
declare(strict_types=1);
require_once __DIR__ . '/../db.php';

try {
    require_post();

    // ACEPTA JSON
    $input = file_get_contents("php://input");
    $data  = json_decode($input, true);

    if (!is_array($data)) {
        $data = $_POST;
    }

    $email = trim($data['email'] ?? '');
    $pass  = trim($data['password'] ?? '');

    if ($email === '' || $pass === '') {
        throw new Exception("Credenciales incompletas");
    }

    $pdo = getPDO();

    // Buscar usuario
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        throw new Exception("Usuario no encontrado");
    }

    if (!password_verify($pass, $user['password_hash'])) {
        throw new Exception("Contraseña incorrecta");
    }

    // 🔥 CORRECCIÓN: Registrar login y acceso
    $stmt = $pdo->prepare("
        UPDATE users
        SET last_login_at = NOW(),
            last_access = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$user['id']]);

    // Guardar sesión
    $_SESSION['user'] = [
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ];

    $redirect = match($user['role']) {
        'admin'  => '/Cine/html/admin.html',
        'cashier'=> '/Cine/html/pos.html',
        default  => '/Cine/html/profile.html'
    };

    json_out([
        'ok'       => true,
        'user'     => $_SESSION['user'],
        'redirect' => $redirect
    ]);

} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => "Error al iniciar sesión",
        'debug' => $e->getMessage()
    ], 500);
}
