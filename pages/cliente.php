<?php
require __DIR__ . '/_proteger.php';
saidera_proteger('cliente');
$titulo = 'Saideira · Cliente';
$css = ['../assets/css/client.css'];
$manifest = '../manifest-cliente.webmanifest';
$swCliente = true;
require __DIR__ . '/_cabecalho.php';
$v = saidera_v();
?>
<body class="client-page">
<?php require __DIR__ . '/_shell.php'; ?>
  <div id="app"></div>
  <script src="../assets/js/icons.js?v=<?= $v ?>"></script>
  <script src="../assets/js/api.js?v=<?= $v ?>"></script>
  <script src="../assets/js/store.js?v=<?= $v ?>"></script>
  <script src="../assets/js/logic.js?v=<?= $v ?>"></script>
  <script src="../assets/js/vendor/qrcode.min.js"></script>
  <script src="../assets/js/vendor/jsQR.js"></script>
  <script src="../assets/js/qr.js?v=<?= $v ?>"></script>
  <script src="../assets/js/ui.js?v=<?= $v ?>"></script>
  <script src="../assets/js/cliente.js?v=<?= $v ?>"></script>
</body>
</html>
