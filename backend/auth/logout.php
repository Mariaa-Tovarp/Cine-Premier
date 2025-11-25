<?php
// backend/auth/logout.php
declare(strict_types=1);

require_once __DIR__ . '/../db.php'; // para json_out y la sesión

// Limpiar datos de sesión
$_SESSION = [];

// Borrar cookie de sesión
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}

// Destruir sesión
session_destroy();

json_out(['ok' => true]);
