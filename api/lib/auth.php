<?php

function auth_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name(defined('SESSION_NAME') ? SESSION_NAME : 'saidera_sess');
    $https = function_exists('saidera_https') ? saidera_https() : (
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
    );
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 14,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function auth_user(): ?array
{
    auth_start();
    $id = $_SESSION['uid'] ?? null;
    if (!$id) return null;
    $st = db()->prepare('SELECT * FROM usuarios WHERE id = ? AND ativo = 1');
    $st->execute([$id]);
    $u = $st->fetch();
    return $u ?: null;
}

function auth_require(?array $papeis = null): array
{
    $u = auth_user();
    if (!$u) fail('Faça login para continuar.', 401);
    if ($papeis && !in_array($u['papel'], $papeis, true)) {
        fail('Você não tem permissão para isso.', 403);
    }
    return $u;
}

function auth_login(string $email, string $senha): array
{
    $st = db()->prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1');
    $st->execute([strtolower(trim($email))]);
    $u = $st->fetch();
    if (!$u || !password_verify($senha, $u['senha_hash'])) {
        throw new RuntimeException('E-mail ou senha inválidos.', 401);
    }
    auth_start();
    session_regenerate_id(true);
    unset($_SESSION['admin_uid']);
    $_SESSION['uid'] = (int) $u['id'];
    return $u;
}

function auth_logout(): void
{
    auth_start();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path']);
    }
    session_destroy();
}

function auth_criar(string $email, string $senha, string $papel): int
{
    $email = strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('E-mail inválido.', 400);
    }
    if (strlen($senha) < 6) {
        throw new RuntimeException('A senha precisa ter pelo menos 6 caracteres.', 400);
    }
    $st = db()->prepare('SELECT id FROM usuarios WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) {
        throw new RuntimeException('Este e-mail já está cadastrado.', 400);
    }
    db()->prepare('INSERT INTO usuarios (email, senha_hash, papel) VALUES (?, ?, ?)')
        ->execute([$email, password_hash($senha, PASSWORD_DEFAULT), $papel]);
    return (int) db()->lastInsertId();
}
