<?php
require_once __DIR__ . '/../db.php';

try {
    $pdo = getPDO();

    // ===== Ingresos de HOY (COP) =====
    $sqlRevenue = "
        SELECT COALESCE(SUM(price), 0) AS revenue
        FROM tickets
        WHERE DATE(purchased_at) = CURDATE()
    ";
    $revenue = (float)$pdo->query($sqlRevenue)->fetchColumn();

    // ===== Boletos vendidos HOY =====
    $sqlTickets = "
        SELECT COUNT(*) AS qty
        FROM tickets
        WHERE DATE(purchased_at) = CURDATE()
    ";
    $tickets = (int)$pdo->query($sqlTickets)->fetchColumn();

    // ===== Clientes VIP (members) =====
    $sqlVip = "SELECT COUNT(*) FROM members";
    $vipClients = (int)$pdo->query($sqlVip)->fetchColumn();

    // ===== Ocupación de HOY =====
    // total de asientos para funciones de hoy
    $sqlTotalSeats = "
        SELECT COUNT(*)
        FROM seats s
        JOIN screenings sc ON sc.id = s.screening_id
        WHERE DATE(sc.start_datetime) = CURDATE()
    ";
    $totalSeats = (int)$pdo->query($sqlTotalSeats)->fetchColumn();

    // asientos ocupados en funciones de hoy
    $sqlSoldSeats = "
        SELECT COUNT(*)
        FROM seats s
        JOIN screenings sc ON sc.id = s.screening_id
        WHERE DATE(sc.start_datetime) = CURDATE()
          AND s.status = 'occupied'
    ";
    $soldSeats = (int)$pdo->query($sqlSoldSeats)->fetchColumn();

    $occPct = 0.0;
    if ($totalSeats > 0) {
        $occPct = round(($soldSeats / $totalSeats) * 100, 1); // 1 decimal
    }

    // Respuesta
    json_out([
        'ok'             => true,
        'revenue_today'  => $revenue,
        'tickets_today'  => $tickets,
        'vip_clients'    => $vipClients,
        'occupancy_pct'  => $occPct,
        'seats_total'    => $totalSeats,
        'seats_occupied' => $soldSeats,
    ]);

} catch (Exception $e) {
    json_out([
        'ok'    => false,
        'error' => $e->getMessage(),
    ], 500);
}
