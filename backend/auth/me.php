<?php
// backend/auth/me.php
require_once __DIR__ . '/../db.php';

// Usuario actual en sesión (si existe)
$user = $_SESSION['user'] ?? null;

// Estructura compatible con nav-auth.js y vip.js
json_out([
  'ok'   => true,
  'user' => $user ?: null,
]);
