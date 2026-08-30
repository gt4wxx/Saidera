<?php

function saidera_v(): string
{
    return '43';
}

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
    saidera_migrar();
    return true;
}

function saidera_migrar(): void
{
    static $feito = false;
    if ($feito) return;
    $feito = true;
    try {
        $cols = db()->query('SHOW COLUMNS FROM estabelecimentos')->fetchAll(PDO::FETCH_COLUMN);
        $add = [
            'cep' => "ALTER TABLE estabelecimentos ADD COLUMN cep VARCHAR(12) DEFAULT NULL",
            'logradouro' => "ALTER TABLE estabelecimentos ADD COLUMN logradouro VARCHAR(180) DEFAULT NULL",
            'numero' => "ALTER TABLE estabelecimentos ADD COLUMN numero VARCHAR(20) DEFAULT NULL",
            'complemento' => "ALTER TABLE estabelecimentos ADD COLUMN complemento VARCHAR(80) DEFAULT NULL",
            'cidade' => "ALTER TABLE estabelecimentos ADD COLUMN cidade VARCHAR(80) DEFAULT NULL",
            'uf' => "ALTER TABLE estabelecimentos ADD COLUMN uf CHAR(2) DEFAULT 'SE'",
        ];
        foreach ($add as $col => $sql) {
            if (!in_array($col, $cols, true)) db()->exec($sql);
        }
        db()->exec('ALTER TABLE estabelecimentos MODIFY endereco VARCHAR(400) DEFAULT NULL');
        db()->exec('CREATE TABLE IF NOT EXISTS parceiro_bebidas (
          parceiro_id BIGINT UNSIGNED NOT NULL,
          bebida_id BIGINT UNSIGNED NOT NULL,
          PRIMARY KEY (parceiro_id, bebida_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        db()->exec('CREATE TABLE IF NOT EXISTS campanha_adesoes (
          campanha_id BIGINT UNSIGNED NOT NULL,
          cliente_id BIGINT UNSIGNED NOT NULL,
          PRIMARY KEY (campanha_id, cliente_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        db()->exec('CREATE TABLE IF NOT EXISTS planos (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          descricao TEXT,
          preco DECIMAL(10,2) DEFAULT NULL,
          menus_json JSON NOT NULL,
          a_mostra TINYINT(1) NOT NULL DEFAULT 0,
          status ENUM("ativo","inativo") NOT NULL DEFAULT "ativo",
          criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        $cols = db()->query('SHOW COLUMNS FROM estabelecimentos')->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('plano_id', $cols, true)) {
            db()->exec('ALTER TABLE estabelecimentos ADD COLUMN plano_id BIGINT UNSIGNED DEFAULT NULL');
        }
        garantir_planos();
        garantir_plano_cobrancas();
    } catch (Throwable $e) {
        /* instalação antiga sem permissão de ALTER — o cadastro novo ainda grava o endereço composto */
    }
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
