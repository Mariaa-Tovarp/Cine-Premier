<?php
date_default_timezone_set('America/Bogota');
$root = __DIR__;
$envPath = $root . DIRECTORY_SEPARATOR . '.env';

// Cargar .env
function env_load($path) {
  if (!file_exists($path)) return;
  foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line), '#')) continue;
    [$k, $v] = array_map('trim', explode('=', $line, 2));
    $_ENV[$k] = $v;
  }
}
env_load($envPath);

if (!empty($_ENV['APP_TIMEZONE'])) date_default_timezone_set($_ENV['APP_TIMEZONE']);

if (session_status() === PHP_SESSION_NONE) {
  session_name($_ENV['SESSION_NAME'] ?? 'pf_sid');
  session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax']);
}

$allowed = array_map('trim', explode(',', $_ENV['ALLOWED_ORIGINS'] ?? 'http://localhost'));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

function json_out($data, int $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
function require_post() {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'Método no permitido'], 405);
}
function current_user() {
  return $_SESSION['user'] ?? null;
}
?>
