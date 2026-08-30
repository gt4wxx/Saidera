<?php
$v = saidera_v();
$titulo = $titulo ?? 'Saidera';
$css = $css ?? [];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <title><?= htmlspecialchars($titulo) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="../assets/css/app.css?v=<?= $v ?>"/>
<?php foreach ($css as $href): ?>
  <link rel="stylesheet" href="<?= htmlspecialchars($href) ?>?v=<?= $v ?>"/>
<?php endforeach; ?>
  <link rel="icon" type="image/png" href="../assets/brand/icon-192.png"/>
  <link rel="apple-touch-icon" href="../assets/brand/apple-touch.png"/>
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/brand/apple-touch.png"/>
  <link rel="apple-touch-icon" sizes="192x192" href="../assets/brand/icon-192.png"/>
  <link rel="manifest" href="<?= htmlspecialchars($manifest ?? '../manifest.webmanifest') ?>"/>
  <meta name="theme-color" content="#171717"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-title" content="Saidera"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<?php if (!empty($swCliente)): ?>
  <script src="../assets/js/pwa-captura.js?v=<?= $v ?>"></script>
<?php else: ?>
  <script>
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
    }
  </script>
<?php endif; ?>
</head>
