<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

try {
  $pdo = getPDO();
  $db  = $pdo->query("SELECT DATABASE()")->fetchColumn();
  echo json_encode([
    'status'  => 'ok',
    'db'      => $db,
    'session' => session_id() ? 'alive' : 'none'
  ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['status'=>'error','message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
