<?php
declare(strict_types=1);
header('Content-Type: application/json');
session_start();

if (!isset($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}

echo json_encode([
    "ok" => true,
    "cart" => $_SESSION['cart']
]);
