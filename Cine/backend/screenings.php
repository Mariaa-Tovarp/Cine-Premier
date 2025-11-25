<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();

$movie_id  = isset($_GET['movie_id'])  ? (int)$_GET['movie_id']  : null;
$cinema_id = isset($_GET['cinema_id']) ? (int)$_GET['cinema_id'] : null;
$date      = $_GET['date'] ?? null;

$w = [];
$p = [];

if ($movie_id)  { 
  $w[] = "s.movie_id = ?";        
  $p[] = $movie_id; 
}

if ($cinema_id) { 
  $w[] = "s.cinema_id = ?";       
  $p[] = $cinema_id; 
}

if ($date) { 
  $w[] = "DATE(s.start_datetime) = ?"; 
  $p[] = $date; 
}

$sql = "
  SELECT
    s.id,
    s.movie_id,
    s.cinema_id,
    s.start_datetime,
    s.format,
    s.hall,
    COALESCE(s.base_price, 18000) AS base_price,
    m.title,
    c.name  AS cinema,
    c.city
  FROM screenings s
  JOIN movies  m ON m.id = s.movie_id
  JOIN cinemas c ON c.id = s.cinema_id
";

if ($w) {
  $sql .= " WHERE " . implode(' AND ', $w);
}

$sql .= " ORDER BY s.start_datetime";

try {
  $st   = $pdo->prepare($sql);
  $st->execute($p);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC);

  json_out($rows);

} catch (Throwable $e) {
  json_out(['error' => 'No se pudieron cargar las funciones'], 500);
}
