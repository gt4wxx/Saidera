<?php
$v = $v ?? saidera_v();
$logo = '../Saidera_Kit_Marca/03_logo_horizontal.png?v=' . rawurlencode((string) $v);
?>
<div id="saidera-boot" class="saidera-boot" role="status" aria-live="polite">
  <div class="saidera-boot-inner">
    <img class="saidera-boot-logo" src="<?= htmlspecialchars($logo) ?>" alt="Saideira" width="220" height="48"/>
    <div class="saidera-boot-spin" aria-hidden="true"></div>
    <p class="saidera-boot-msg" id="saidera-boot-msg">Abrindo o salão…</p>
  </div>
</div>
<div id="saidera-net" class="saidera-net" hidden role="status">Sem internet</div>
<script>if (window.SaideraShell) SaideraShell.attach();</script>
