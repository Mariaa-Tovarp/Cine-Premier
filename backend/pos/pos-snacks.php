<?php
require_once __DIR__."/../db.php";
$pdo = getPDO();

$rows = $pdo->query("SELECT id,name,price FROM snacks ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(["items"=>$rows]);
