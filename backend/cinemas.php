<?php
require_once __DIR__ . '/db.php';

try {
  $pdo = getPDO();
  $sql = "SELECT id, name, city, address, phone FROM cinemas ORDER BY name";
  $rows = $pdo->query($sql)->fetchAll();
  json_out($rows);
} catch (Throwable $e) {
  json_out(['error'=>'No se pudieron cargar los cines'], 500);
}
