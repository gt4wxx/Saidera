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
  <div id="app">
    <div id="cli-boot" style="min-height:100dvh;display:grid;place-items:center;background:#0e0e0e;padding:28px;text-align:center">
      <div>
        <img src="../Saidera_Kit_Marca/03_logo_horizontal.png?v=<?= $v ?>" alt="Saideira" style="width:min(220px,72vw);margin:0 auto 18px"/>
        <p id="cli-boot-msg" style="color:#c4b8a4;font-size:14px">Abrindo seu painel…</p>
      </div>
    </div>
  </div>
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
