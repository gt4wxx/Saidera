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
    header('Location: index.php');
    exit;
}

$erroLogin = '';
$erroCad = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $acao = (string) ($_POST['acao'] ?? 'login');
    try {
        if ($acao === 'cadastro') {
            $nome = trim((string) ($_POST['nome'] ?? ''));
            if (strlen($nome) < 2) throw new RuntimeException('Informe seu nome.');
            $uid = auth_criar((string) ($_POST['email'] ?? ''), (string) ($_POST['senha'] ?? ''), 'cliente');
            $primeiro = explode(' ', $nome)[0];
            $codigo = codigo_unico('SDR', 'clientes');
            db()->prepare('INSERT INTO clientes (usuario_id, codigo, nome, primeiro_nome, telefone, nascimento, cidade, bairro, cliente_desde) VALUES (?,?,?,?,?,?,?,?,CURDATE())')
                ->execute([
                    $uid,
                    $codigo,
                    $nome,
                    $primeiro,
                    $_POST['telefone'] ?: null,
                    !empty($_POST['nascimento']) ? $_POST['nascimento'] : null,
                    'Aracaju',
                    $_POST['bairro'] ?: null,
                ]);
            $u = auth_login((string) $_POST['email'], (string) $_POST['senha']);
            auditar('Novo cliente', $nome);
            header('Location: ' . session_payload($u)['pagina']);
            exit;
        }

        $u = auth_login((string) ($_POST['email'] ?? ''), (string) ($_POST['senha'] ?? ''));
        header('Location: ' . session_payload($u)['pagina']);
        exit;
    } catch (Throwable $e) {
        if ($acao === 'cadastro') $erroCad = $e->getMessage();
        else $erroLogin = $e->getMessage();
    }
} else {
    try {
        $me = auth_user();
        if ($me) {
            header('Location: ' . session_payload($me)['pagina']);
            exit;
        }
    } catch (Throwable $e) {
        $erroLogin = 'Não foi possível conectar ao banco. Confira a instalação.';
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <title>Saidera</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="assets/css/app.css?v=6"/>
  <link rel="stylesheet" href="assets/css/client.css?v=6"/>
  <link rel="icon" type="image/png" href="assets/brand/icon-192.png"/>
  <link rel="apple-touch-icon" href="assets/brand/apple-touch.png"/>
  <link rel="manifest" href="manifest.webmanifest"/>
  <meta name="theme-color" content="#171717"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-title" content="Saidera"/>
  <script>
    (function () {
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
      if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
    })();
  </script>
</head>
<body>
  <main class="landing">
    <header class="landing-hero">
      <div class="landing-brand" id="landing-brand"></div>
      <p class="lead" style="margin:0 auto 8px;text-align:center">A fidelidade que a noite merece.</p>
      <p class="tiny muted" style="margin:0 auto 16px;text-align:center;max-width:46ch">Entre com e-mail e senha. Cliente se cadastra aqui. Casa, garçom, parceiro e admin recebem acesso pelo painel.</p>
    </header>
    <section class="card pad" style="max-width:440px;margin:0 auto 18px">
      <form id="form-login" method="post" action="index.php">
        <input type="hidden" name="acao" value="login"/>
        <h2 style="margin-bottom:12px">Entrar</h2>
        <div class="field"><span>E-mail</span><input name="email" type="email" required autocomplete="username"/></div>
        <div class="field" style="margin-top:10px"><span>Senha</span><input name="senha" type="password" required autocomplete="current-password"/></div>
        <p class="tiny" id="login-erro" style="color:#f87171;margin-top:8px"><?= h($erroLogin) ?></p>
        <button type="submit" class="btn btn-gold btn-block" style="margin-top:12px">Entrar</button>
      </form>
    </section>
    <section class="card pad" style="max-width:440px;margin:0 auto 24px">
      <form id="form-cadastro" method="post" action="index.php">
        <input type="hidden" name="acao" value="cadastro"/>
        <h2 style="margin-bottom:8px">Criar conta de cliente</h2>
        <p class="tiny muted" style="margin-bottom:12px">Você recebe um QR pessoal (SDR-…) para quando o garçom precisar.</p>
        <div class="field"><span>Nome</span><input name="nome" required/></div>
        <div class="field" style="margin-top:10px"><span>E-mail</span><input name="email" type="email" required/></div>
        <div class="field" style="margin-top:10px"><span>Senha</span><input name="senha" type="password" minlength="6" required/></div>
        <div class="field" style="margin-top:10px"><span>Telefone</span><input name="telefone"/></div>
        <div class="field" style="margin-top:10px"><span>Nascimento</span><input name="nascimento" type="date"/></div>
        <div class="field" style="margin-top:10px"><span>Bairro</span><input name="bairro"/></div>
        <p class="tiny" id="cad-erro" style="color:#f87171;margin-top:8px"><?= h($erroCad) ?></p>
        <button type="submit" class="btn btn-navy btn-block" style="margin-top:12px">Cadastrar</button>
      </form>
    </section>
  </main>
  <script src="assets/js/icons.js?v=6"></script>
  <script src="assets/js/ui.js?v=6"></script>
  <script>
    document.getElementById("landing-brand").innerHTML = `${Brand.principal()}<span class="badge badge-navy" style="margin-top:10px">Saidera</span>`;
  </script>
</body>
</html>
