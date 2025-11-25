<?php
// backend/db.php
declare(strict_types=1);

/* === MODO DEV: descomenta estas 3 líneas si necesitas ver errores en pantalla === */
// ini_set('display_errors', '1');
// ini_set('display_startup_errors', '1');
// error_reporting(E_ALL);

/* --------- Cargar .env --------- */
$ENV_PATH = __DIR__ . '/.env';
if (is_file($ENV_PATH)) {
  $lines = file($ENV_PATH, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    if ($line === '' || $line[0] === '#') continue;
    [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
    $_ENV[trim($k)] = trim($v);
  }
}

/* --------- Zona horaria --------- */
date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'America/Bogota');

/* --------- Sesión segura --------- */
ini_set('session.use_strict_mode', '1');

// duración del cookie de sesión (ej: 7 días)
$cookieLifetime = 60 * 60 * 24 * 7; // 7 días

session_set_cookie_params([
  'lifetime' => $cookieLifetime,
  'path'     => '/',
  'secure'   => false,   // pon true si usas HTTPS
  'httponly' => true,
  'samesite' => 'Lax',
]);

session_name($_ENV['SESSION_NAME'] ?? 'premierfilms_sid');
if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

/* --------- CORS básico --------- */
$allowed = array_map('trim', explode(',', $_ENV['ALLOWED_ORIGINS'] ?? 'http://localhost'));
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Headers: Content-Type");
  header("Access-Control-Allow-Methods: GET,POST,OPTIONS");
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

/* --------- Helpers JSON / método --------- */
function json_out(array $data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
function require_post(): void {
  if (strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') {
    json_out(['error' => 'Método no permitido'], 405);
  }
}

/* --------- Conexión PDO --------- */
function getPDO(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
  $db   = $_ENV['DB_NAME'] ?? 'cine_db';
  $user = $_ENV['DB_USER'] ?? 'root';
  $pass = $_ENV['DB_PASS'] ?? '';

  $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}
