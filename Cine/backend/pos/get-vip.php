<?php
header("Content-Type: application/json");
require_once "../db.php";

$email = $_GET["email"] ?? "";

try {
    $pdo = getPDO();

    // 1. buscar usuario
    $u = $pdo->prepare("SELECT id FROM users WHERE email=?");
    $u->execute([$email]);
    $user = $u->fetch(PDO::FETCH_ASSOC);

    if(!$user){
        echo json_encode(["ok"=>true, "vip"=>0, "discount"=>0]);
        exit;
    }

    // 2. buscar membresía
    $m = $pdo->prepare("
        SELECT m.tier, p.perks
        FROM members m
        JOIN membership_plans p ON p.tier = m.tier
        WHERE m.user_id = ?
    ");
    $m->execute([$user["id"]]);
    $mem = $m->fetch(PDO::FETCH_ASSOC);

    if(!$mem){
        echo json_encode(["ok"=>true, "vip"=>0, "discount"=>0]);
        exit;
    }

    // 3. buscar descuento en perks
    $perks = json_decode($mem["perks"], true);
    $discount = 0;

    foreach($perks as $p){
        if(strpos($p, "% OFF") !== false){
            preg_match('/(\d+)%/', $p, $m);

            if(isset($m[1])){
                $discount = intval($m[1]) / 100;
            }
        }
    }

    echo json_encode(["ok"=>true, "vip"=>1, "discount"=>$discount]);
}
catch(Exception $e){
    echo json_encode(["ok"=>false, "error"=>$e->getMessage()]);
}
