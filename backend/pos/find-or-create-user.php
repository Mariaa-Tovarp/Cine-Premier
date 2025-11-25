<?php
declare(strict_types=1);
header("Content-Type: application/json");

require_once __DIR__ . '/../db.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

$name  = trim($data["name"]  ?? "");
$email = trim($data["email"] ?? "");

if ($name === "" || $email === "") {
    echo json_encode([
        "ok" => false,
        "error" => "Nombre y correo son requeridos"
    ]);
    exit;
}

try {

    $pdo = getPDO();

    // 1) Buscar si ya existe un cliente con ese correo
    $st = $pdo->prepare("
        SELECT id 
        FROM users 
        WHERE email = ? AND role = 'user'
        LIMIT 1
    ");
    $st->execute([$email]);

    $row = $st->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        echo json_encode([
            "ok" => true,
            "client_id" => $row["id"]
        ]);
        exit;
    }

    // 2) Si no existe → crear cliente
    $insert = $pdo->prepare("
        INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
        VALUES (?, ?, '', 'user', NOW(), NOW())
    ");
    $insert->execute([$name, $email]);

    $client_id = (int)$pdo->lastInsertId();

    echo json_encode([
        "ok" => true,
        "client_id" => $client_id
    ]);

} catch (Throwable $e) {
    echo json_encode([
        "ok" => false,
        "error" => $e->getMessage()
    ]);
}
