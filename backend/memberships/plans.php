<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

try {
    $pdo  = getPDO();
    $rows = $pdo->query("SELECT id, tier, name, price_month, perks, highlight, cta FROM membership_plans ORDER BY id")
                ->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        if (isset($r['perks']) && is_string($r['perks'])) {
            $r['perks'] = json_decode($r['perks'], true) ?: [];
        }
        $r['highlight'] = (bool)($r['highlight'] ?? 0);
    }

    // devolvemos { plans: [...] }
    json_out(['plans' => $rows]);
} catch (Throwable $e) {
    json_out(['error' => $e->getMessage()], 500);
}
