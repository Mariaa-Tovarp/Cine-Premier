<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
try {
  $rows = $pdo->query("
    SELECT id, title, description, discount_percent, valid_from, valid_to, active
    FROM promos
    WHERE active = 1 AND (valid_from IS NULL OR valid_from <= CURDATE())
      AND (valid_to IS NULL OR valid_to >= CURDATE())
    ORDER BY valid_from DESC NULLS LAST, id DESC
  ")->fetchAll();
  json_out($rows);
} catch (Throwable $e) {
  json_out(['error'=>'No se pudieron cargar las promociones'], 500);
}
