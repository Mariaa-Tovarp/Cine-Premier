<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

require_post();
$pdo = getPDO();

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

$id = isset($data['id']) ? (int)$data['id'] : 0;

if ($id <= 0) {
    json_out([
        'ok'    => false,
        'error' => 'ID inválido',
    ], 400);
}

try {
    $stmt = $pdo->prepare("DELETE FROM screenings WHERE id = :id");
    $stmt->execute([':id' => $id]);

    json_out(['ok' => true]);
} catch (Throwable $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
