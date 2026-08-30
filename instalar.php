<?php
declare(strict_types=1);
$cfgPath = __DIR__ . '/api/config.php';
$schema = __DIR__ . '/sql/schema.sql';
$erro = '';
$ok = '';

function h($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

if (is_file($cfgPath) && empty($_POST['forcar'])) {
    require $cfgPath;
    try {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS);
        $n = (int) $pdo->query("SELECT COUNT(*) FROM usuarios WHERE papel = 'admin'")->fetchColumn();
        if ($n > 0 && empty($_GET['ok'])) {
            $ok = 'A Saideira já está instalada. Entre pela página inicial.';
        }
    } catch (Throwable $e) {
        $erro = 'Configuração encontrada, mas o banco não conectou: ' . $e->getMessage();
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $host = trim($_POST['host'] ?? 'localhost');
    $name = trim($_POST['name'] ?? '');
    $user = trim($_POST['user'] ?? '');
    $pass = (string) ($_POST['pass'] ?? '');
    $adminEmail = strtolower(trim($_POST['admin_email'] ?? ''));
    $adminSenha = (string) ($_POST['admin_senha'] ?? '');
    $adminNome = trim($_POST['admin_nome'] ?? 'Admin Saideira');
    try {
        if (!$name || !$user) throw new RuntimeException('Preencha o banco e o usuário do MySQL da Hostinger.');
        if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('E-mail do admin inválido.');
        if (strlen($adminSenha) < 6) throw new RuntimeException('Senha do admin com pelo menos 6 caracteres.');
        $pdo = new PDO('mysql:host=' . $host . ';dbname=' . $name . ';charset=utf8mb4', $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $sql = file_get_contents($schema);
        $pdo->exec($sql);
        $php = "<?php\n"
            . "define('DB_HOST', " . var_export($host, true) . ");\n"
            . "define('DB_NAME', " . var_export($name, true) . ");\n"
            . "define('DB_USER', " . var_export($user, true) . ");\n"
            . "define('DB_PASS', " . var_export($pass, true) . ");\n"
            . "define('DB_CHARSET', 'utf8mb4');\n"
            . "define('APP_NAME', 'Saideira');\n"
            . "define('SESSION_NAME', 'saidera_sess');\n";
        if (file_put_contents($cfgPath, $php) === false) {
            throw new RuntimeException('Não consegui gravar api/config.php. Crie o arquivo na Hostinger com permissão de escrita.');
        }
        $hash = password_hash($adminSenha, PASSWORD_DEFAULT);
        $st = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $st->execute([$adminEmail]);
        if (!$st->fetch()) {
            $pdo->prepare('INSERT INTO usuarios (email, senha_hash, papel) VALUES (?,?,?)')
                ->execute([$adminEmail, $hash, 'admin']);
        }
        header('Location: instalar.php?ok=1');
        exit;
    } catch (Throwable $e) {
        $erro = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Instalar Saideira</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet"/>
  <style>
    body { font-family: Manrope, system-ui, sans-serif; background: #0e0e0e; color: #FFF9E8; margin: 0; padding: 32px 16px; }
    main { max-width: 520px; margin: 0 auto; }
    h1 { font-size: 1.6rem; }
    p { color: #bdbdbd; line-height: 1.5; }
    label { display: block; margin: 12px 0 6px; font-size: .8rem; font-weight: 800; color: #9a9a9a; }
    input { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px; border: 0; background: #1a1a1a; color: #fff; }
    button { margin-top: 18px; width: 100%; padding: 14px; border: 0; border-radius: 14px; background: #F5B800; color: #171717; font-weight: 800; cursor: pointer; }
    .err { background: #3a1515; color: #ffb4b4; padding: 12px; border-radius: 12px; }
    .ok { background: #14281c; color: #86efac; padding: 12px; border-radius: 12px; }
    a { color: #F5B800; }
  </style>
</head>
<body>
<main>
  <h1>Instalar a Saideira</h1>
  <p>Use os dados do MySQL no hPanel da Hostinger (Bancos de dados). Isso cria as tabelas e o primeiro admin. Sem dados de demonstração.</p>
  <?php if ($erro): ?><p class="err"><?= h($erro) ?></p><?php endif; ?>
  <?php if (!empty($_GET['ok']) || ($ok && empty($erro))): ?>
    <p class="ok">Pronto. <a href="index.php">Entrar na Saideira</a></p>
  <?php endif; ?>
  <form method="post">
    <label>Host do banco</label>
    <input name="host" value="<?= h($_POST['host'] ?? 'localhost') ?>"/>
    <label>Nome do banco</label>
    <input name="name" value="<?= h($_POST['name'] ?? '') ?>" placeholder="u000000000_saidera" required/>
    <label>Usuário do banco</label>
    <input name="user" value="<?= h($_POST['user'] ?? '') ?>" required/>
    <label>Senha do banco</label>
    <input name="pass" type="password"/>
    <label>E-mail do admin</label>
    <input name="admin_email" type="email" value="<?= h($_POST['admin_email'] ?? '') ?>" required/>
    <label>Senha do admin</label>
    <input name="admin_senha" type="password" required/>
    <button type="submit">Criar banco e admin</button>
  </form>
</main>
</body>
</html>
