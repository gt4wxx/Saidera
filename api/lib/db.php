<?php

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function cfg(string $k, $default = null)
{
    $st = db()->prepare('SELECT v FROM config WHERE k = ?');
    $st->execute([$k]);
    $row = $st->fetch();
    return $row ? $row['v'] : $default;
}

function cfg_set(string $k, $v): void
{
    db()->prepare('INSERT INTO config (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)')
        ->execute([$k, (string) $v]);
}

function auditar(string $acao, string $detalhe = ''): void
{
    db()->prepare('INSERT INTO auditoria (acao, detalhe) VALUES (?, ?)')->execute([$acao, $detalhe]);
}
