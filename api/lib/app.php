<?php

function saidera_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if ((string) ($_SERVER['SERVER_PORT'] ?? '') === '443') return true;
    return strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function saidera_instalado(): bool
{
    return is_file(dirname(__DIR__) . '/config.php');
}

function saidera_app(): bool
{
    if (!saidera_instalado()) return false;
    require_once dirname(__DIR__) . '/config.php';
    require_once __DIR__ . '/http.php';
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/auth.php';
    require_once __DIR__ . '/domain.php';
    require_once __DIR__ . '/admin.php';
    require_once __DIR__ . '/admin_rotas.php';
    require_once __DIR__ . '/bootstrap.php';
    return true;
}

function saidera_pagina_papel(string $papel): string
{
    return [
        'cliente' => 'pages/cliente.php',
        'funcionario' => 'pages/garcom.php',
        'estabelecimento' => 'pages/estabelecimento.php',
        'parceiro' => 'pages/parceiro.php',
        'admin' => 'pages/admin.php',
    ][$papel] ?? 'index.php';
}
