<?php
require __DIR__ . '/_proteger.php';
saidera_proteger('parceiro');
$titulo = 'Saidera · Parceiro';
$css = ['../assets/css/dashboard.css'];
require __DIR__ . '/_cabecalho.php';
$v = saidera_v();
?>
<body class="dash">
  <div id="app"></div>
  <script src="../assets/js/icons.js?v=<?= $v ?>"></script>
  <script src="../assets/js/api.js?v=<?= $v ?>"></script>
  <script src="../assets/js/store.js?v=<?= $v ?>"></script>
  <script src="../assets/js/logic.js?v=<?= $v ?>"></script>
  <script src="../assets/js/ui.js?v=<?= $v ?>"></script>
  <script src="../assets/js/parceiro.js?v=<?= $v ?>"></script>
</body>
</html>
