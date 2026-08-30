<?php
declare(strict_types=1);

require_once __DIR__ . '/api/lib/app.php';

function h($s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

if (!saidera_instalado()) {
    header('Location: instalar.php');
    exit;
}

saidera_app();

if (isset($_GET['sair'])) {
    auth_logout();
    header('Location: entrar.php');
    exit;
}

$eu = null;
try {
    $eu = auth_user();
} catch (Throwable $e) {
    $eu = null;
}

if ($eu && ($eu['papel'] ?? '') !== 'cliente') {
    header('Location: ' . session_payload($eu)['pagina']);
    exit;
}

$clienteLogado = $eu && ($eu['papel'] ?? '') === 'cliente';
$casa = preg_replace('/[^a-z0-9\-]/i', '', (string) ($_GET['casa'] ?? ''));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <title>Saidera · Entrar</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="assets/css/app.css?v=20"/>
  <link rel="stylesheet" href="assets/css/client.css?v=20"/>
  <link rel="icon" type="image/png" href="assets/brand/icon-192.png"/>
  <link rel="apple-touch-icon" href="assets/brand/apple-touch.png"/>
  <link rel="manifest" href="manifest-cliente.webmanifest"/>
  <meta name="theme-color" content="#171717"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-title" content="Saidera"/>
  <script>
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  </script>
</head>
<body>
  <main class="landing">
    <header class="landing-hero">
      <div class="landing-brand" id="landing-brand"></div>
      <p class="lead" style="margin:0 auto 8px;text-align:center">A fidelidade que a noite merece.</p>
      <p class="tiny muted" style="margin:0 auto 16px;text-align:center;max-width:42ch">O cliente entra pelo app. Sem conta, cadastre e instale. Com o app, abra pelo ícone.</p>
    </header>
    <section class="card pad" id="entrar-card" style="max-width:440px;margin:0 auto 18px">
      <div id="entrar-status" hidden></div>
      <form id="form-login">
        <h2 style="margin-bottom:12px">Entrar</h2>
        <div class="field"><span>E-mail</span><input name="email" type="email" required autocomplete="username"/></div>
        <div class="field" style="margin-top:10px"><span>Senha</span><input name="senha" type="password" required autocomplete="current-password"/></div>
        <p class="tiny" id="login-erro" style="color:#f87171;margin-top:8px"></p>
        <button type="submit" class="btn btn-gold btn-block" style="margin-top:12px">Entrar</button>
        <a class="btn btn-navy btn-block" style="margin-top:10px" href="#form-cadastro">Cadastrar</a>
        <button type="button" class="btn btn-ghost btn-block" style="margin-top:10px" data-pwa-install>Instalar o Saidera</button>
      </form>
    </section>
    <section class="card pad" id="cadastro" style="max-width:440px;margin:0 auto 24px">
      <form id="form-cadastro">
        <h2 style="margin-bottom:8px">Criar conta</h2>
        <p class="tiny muted" style="margin-bottom:12px">Você recebe um QR pessoal (SDR-…) para quando o garçom precisar.</p>
        <div class="field"><span>Nome</span><input name="nome" required/></div>
        <div class="field" style="margin-top:10px"><span>E-mail</span><input name="email" type="email" required/></div>
        <div class="field" style="margin-top:10px"><span>Senha</span><input name="senha" type="password" minlength="6" required/></div>
        <div class="field" style="margin-top:10px"><span>Telefone</span><input name="telefone"/></div>
        <div class="field" style="margin-top:10px"><span>Nascimento</span><input name="nascimento" type="date"/></div>
        <div class="field" style="margin-top:10px"><span>Bairro</span><input name="bairro"/></div>
        <p class="tiny" id="cad-erro" style="color:#f87171;margin-top:8px"></p>
        <button type="submit" class="btn btn-gold btn-block" style="margin-top:12px">Cadastrar e instalar</button>
        <button type="button" class="btn btn-ghost btn-block" style="margin-top:10px" data-pwa-install>Instalar o Saidera</button>
      </form>
    </section>
  </main>
  <script>
    window.SAIDERA_CLIENTE_LOGADO = <?= $clienteLogado ? 'true' : 'false' ?>;
    window.SAIDERA_CASA_CONVITE = <?= json_encode($casa) ?>;
  </script>
  <script src="assets/js/icons.js?v=20"></script>
  <script src="assets/js/api.js?v=20"></script>
  <script src="assets/js/ui.js?v=20"></script>
  <script src="assets/js/entrar.js?v=20"></script>
</body>
</html>
