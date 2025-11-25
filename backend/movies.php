<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();

// Fecha que se va a usar para armar los horarios (times[])
$date = $_GET['date'] ?? (new DateTime('today'))->format('Y-m-d');

try {
  // 1) Películas del catálogo
  $movies = $pdo->query("
    SELECT 
      id,
      title,
      genre,
      duration_min,
      age_rating,
      rating,
      formats,
      poster_url,
      trailer_url
    FROM movies
    ORDER BY title
  ")->fetchAll(PDO::FETCH_ASSOC);

  // 2) Horarios del día para cada película
  $st = $pdo->prepare("
    SELECT 
      s.movie_id, 
      TIME_FORMAT(s.start_datetime, '%H:%i') AS hhmm
    FROM screenings s
    WHERE DATE(s.start_datetime) = ?
    ORDER BY s.start_datetime
  ");
  $st->execute([$date]);

  $timesByMovie = [];
  foreach ($st as $r) {
    $movieId = (int)$r['movie_id'];
    $timesByMovie[$movieId][] = $r['hhmm'];
  }

  // 3) Adjuntar times[] a cada película
  foreach ($movies as &$m) {
    $id = (int)$m['id'];
    $m['times'] = $timesByMovie[$id] ?? [];
  }
  unset($m);

  json_out($movies);

} catch (Throwable $e) {
  json_out(['error' => 'No se pudo cargar el catálogo'], 500);
}
