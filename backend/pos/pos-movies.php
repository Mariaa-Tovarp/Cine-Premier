<?php
require_once __DIR__."/../db.php";
$pdo = getPDO();

$sql="
SELECT 
 s.id,
 m.title,
 s.hall,
 TIME(s.start_datetime) AS time,
 s.base_price AS price
FROM screenings s
JOIN movies m ON m.id=s.movie_id
ORDER BY s.start_datetime ASC
";

$rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(["items"=>$rows]);
