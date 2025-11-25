<?php
header("Content-Type: application/json");
require_once "../db.php";

try {
    $pdo = getPDO();

    $sql = "
        SELECT 
            id,
            title,
            genre,
            duration_min,
            age_rating,
            rating,
            formats,
            poster_url
        FROM movies
        ORDER BY title ASC
    ";

    $st = $pdo->query($sql);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "ok" => true,
        "movies" => $rows
    ]);
}
catch(Throwable $e){
    echo json_encode([
        "ok" => false,
        "error" => $e->getMessage()
    ]);
}
