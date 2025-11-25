<?php
// backend/pos/reservas-update.php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_post();

header('Content-Type: application/json');

$raw     = file_get_contents('php://input');
$payload = json_decode($raw, true) ?? $_POST;

$id = (int)($payload['id'] ?? 0);
if ($id <= 0) json_out(['ok'=>false,'error'=>'ID inválido'],400);

$cliente = trim($payload['cliente'] ?? '');
$pelicula = trim($payload['pelicula'] ?? '');
$fecha = trim($payload['fecha'] ?? '');
$hora = trim($payload['hora'] ?? '');
$asientos = (int)($payload['asientos'] ?? 0);
$sala = trim($payload['sala'] ?? '');
$total = (float)($payload['total'] ?? 0);
$estado = trim($payload['estado'] ?? 'Pendiente');
$nota = trim($payload['nota'] ?? '');

try {
    $pdo = getPDO();

    $sql = "
        UPDATE reservas SET
            cliente=?, pelicula=?, fecha=?, hora=?,
            asientos=?, sala=?, total=?, estado=?, nota=?
        WHERE id=?
    ";

    $pdo->prepare($sql)->execute([
        $cliente, $pelicula, $fecha, $hora,
        $asientos, $sala, $total, $estado, $nota,
        $id
    ]);

    json_out(["ok"=>true]);

} catch (Throwable $e) {
    json_out(["ok"=>false,"error"=>"No se pudo actualizar"],500);
}
