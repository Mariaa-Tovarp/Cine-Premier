<?php
require_once __DIR__."/../db.php";
$pdo = getPDO();

$today = date("Y-m-d");

$tot = $pdo->prepare("SELECT SUM(total) FROM pos_sales WHERE DATE(created_at)=?");
$tot->execute([$today]);
$sales = (float)$tot->fetchColumn();

$cnt = $pdo->prepare("
SELECT COUNT(*) 
FROM pos_sale_items 
WHERE item_type='movie' 
AND sale_id IN (SELECT id FROM pos_sales WHERE DATE(created_at)=?)
");
$cnt->execute([$today]);
$tickets = (int)$cnt->fetchColumn();

$avg = $tickets ? $sales / $tickets : 0;

echo json_encode([
    "sales"=>$sales,
    "tickets"=>$tickets,
    "avg"=>$avg
]);
