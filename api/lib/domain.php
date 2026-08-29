<?php

function codigo_unico(string $prefixo, string $tabela, string $coluna = 'codigo'): string
{
    do {
        $c = $prefixo . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 5));
        $st = db()->prepare("SELECT id FROM {$tabela} WHERE {$coluna} = ?");
        $st->execute([$c]);
    } while ($st->fetch());
    return $c;
}

function cliente_por_usuario(int $uid): ?array
{
    $st = db()->prepare('SELECT * FROM clientes WHERE usuario_id = ?');
    $st->execute([$uid]);
    return $st->fetch() ?: null;
}

function funcionario_por_usuario(int $uid): ?array
{
    $st = db()->prepare('SELECT * FROM funcionarios WHERE usuario_id = ?');
    $st->execute([$uid]);
    $f = $st->fetch();
    if ($f) turno_reset($f);
    return $f ?: null;
}

function gestor_est_id(int $uid): ?int
{
    $st = db()->prepare('SELECT estabelecimento_id FROM estabelecimento_gestores WHERE usuario_id = ? LIMIT 1');
    $st->execute([$uid]);
    $r = $st->fetch();
    return $r ? (int) $r['estabelecimento_id'] : null;
}

function parceiro_por_usuario(int $uid): ?array
{
    $st = db()->prepare('SELECT * FROM parceiros WHERE usuario_id = ?');
    $st->execute([$uid]);
    return $st->fetch() ?: null;
}

function turno_reset(array &$f): void
{
    $hoje = date('Y-m-d');
    if (($f['turno_data'] ?? '') === $hoje) return;
    db()->prepare('UPDATE funcionarios SET tampas_hoje = 0, saideras_entregues = 0, turno_data = ? WHERE id = ?')
        ->execute([$hoje, $f['id']]);
    $f['tampas_hoje'] = 0;
    $f['saideras_entregues'] = 0;
    $f['turno_data'] = $hoje;
}

function marcar_turno(?int $funId, int $tampas = 0, int $saideras = 0): void
{
    if (!$funId) return;
    $st = db()->prepare('SELECT * FROM funcionarios WHERE id = ?');
    $st->execute([$funId]);
    $f = $st->fetch();
    if (!$f) return;
    turno_reset($f);
    db()->prepare('UPDATE funcionarios SET tampas_hoje = tampas_hoje + ?, saideras_entregues = saideras_entregues + ? WHERE id = ?')
        ->execute([$tampas, $saideras, $funId]);
}

function meta_bar(int $estId, int $bebidaId): int
{
    $est = db()->prepare('SELECT meta_padrao FROM estabelecimentos WHERE id = ?');
    $est->execute([$estId]);
    $e = $est->fetch();
    $padrao = (int) ($e['meta_padrao'] ?? cfg('meta_padrao_rede', 10));
    $st = db()->prepare('SELECT meta, regra FROM estabelecimento_bebidas WHERE estabelecimento_id = ? AND bebida_id = ?');
    $st->execute([$estId, $bebidaId]);
    $row = $st->fetch();
    if ($row && $row['meta']) return (int) $row['meta'];
    return $padrao;
}

function garantir_progresso(int $cliId, int $estId, int $bebidaId): array
{
    $st = db()->prepare('SELECT * FROM progresso_tampas WHERE cliente_id = ? AND estabelecimento_id = ? AND bebida_id = ?');
    $st->execute([$cliId, $estId, $bebidaId]);
    $p = $st->fetch();
    if ($p) return $p;
    $meta = meta_bar($estId, $bebidaId);
    db()->prepare('INSERT INTO progresso_tampas (cliente_id, estabelecimento_id, bebida_id, atual, meta) VALUES (?,?,?,?,?)')
        ->execute([$cliId, $estId, $bebidaId, 0, $meta]);
    $st->execute([$cliId, $estId, $bebidaId]);
    return $st->fetch();
}

function nova_saidera(int $cliId, int $estId, int $bebidaId, ?int $campanhaId = null): array
{
    $dias = (int) cfg('validade_saidera_dias', 15);
    $exp = (new DateTimeImmutable())->modify('+' . $dias . ' days')->format('Y-m-d H:i:s');
    $codigo = codigo_unico('SAI', 'saideras');
    db()->prepare('INSERT INTO saideras (codigo, cliente_id, estabelecimento_id, bebida_id, campanha_id, expira_em) VALUES (?,?,?,?,?,?)')
        ->execute([$codigo, $cliId, $estId, $bebidaId, $campanhaId, $exp]);
    $id = (int) db()->lastInsertId();
    auditar('Saidera conquistada', $codigo);
    return ['id' => pub('sai', $id), 'codigo' => $codigo];
}

function notificar(int $cliId, string $titulo, string $texto, string $tipo = 'progresso', ?int $camId = null): void
{
    db()->prepare('INSERT INTO notificacoes (cliente_id, titulo, texto, tipo, campanha_id) VALUES (?,?,?,?,?)')
        ->execute([$cliId, $titulo, $texto, $tipo, $camId]);
}

function registrar_consumo(int $cliId, int $estId, int $bebidaId, int $qtd, ?int $funId = null, bool $silencioso = false): array
{
    $qtd = max(1, min(40, $qtd));
    $p = garantir_progresso($cliId, $estId, $bebidaId);
    $metaBar = meta_bar($estId, $bebidaId);
    $antes = (int) $p['atual'];
    $total = $antes + $qtd;
    $ganhas = intdiv($total, $metaBar);
    $depois = $total % $metaBar;
    $novas = [];
    for ($i = 0; $i < $ganhas; $i++) {
        $novas[] = nova_saidera($cliId, $estId, $bebidaId);
    }
    db()->prepare('UPDATE progresso_tampas SET atual = ?, meta = ?, atualizado_em = NOW() WHERE id = ?')
        ->execute([$depois, $metaBar, $p['id']]);
    db()->prepare('INSERT INTO consumos (cliente_id, estabelecimento_id, bebida_id, quantidade, funcionario_id) VALUES (?,?,?,?,?)')
        ->execute([$cliId, $estId, $bebidaId, $qtd, $funId]);
    db()->prepare('UPDATE clientes SET ultima_visita = NOW() WHERE id = ?')->execute([$cliId]);
    marcar_turno($funId, $qtd, 0);
    $beb = db()->prepare('SELECT nome FROM bebidas WHERE id = ?');
    $beb->execute([$bebidaId]);
    $est = db()->prepare('SELECT nome FROM estabelecimentos WHERE id = ?');
    $est->execute([$estId]);
    $bn = $beb->fetch()['nome'] ?? 'Bebida';
    $en = $est->fetch()['nome'] ?? 'Casa';
    if (!$silencioso) {
        $titulo = $ganhas ? 'Você ganhou uma Saidera!' : ($qtd . ' Tampa' . ($qtd > 1 ? 's' : '') . ' registrada' . ($qtd > 1 ? 's' : ''));
        $texto = $ganhas
            ? "{$bn} no {$en}. Informe o ID da Saidera à casa para retirar."
            : "{$bn} no {$en}: {$depois}/{$metaBar}.";
        notificar($cliId, $titulo, $texto, $ganhas ? 'saidera' : 'progresso');
        auditar('Registro de consumo', "{$en} · {$bn} ×{$qtd}");
    }
    return [
        'antes' => $antes,
        'depois' => $depois,
        'meta' => $metaBar,
        'ganhas' => $ganhas,
        'novas' => $novas,
        'ofertaConcluida' => false,
        'metaBar' => $metaBar,
    ];
}

function criar_ticket(int $estId, array $itens): array
{
    $limpos = [];
    foreach ($itens as $i) {
        $bid = nid('beb', $i['bebidaId'] ?? '') ?? (int) ($i['bebidaId'] ?? 0);
        $q = (int) ($i['quantidade'] ?? 0);
        if ($bid < 1 || $q < 1) continue;
        $st = db()->prepare('SELECT nome FROM bebidas WHERE id = ?');
        $st->execute([$bid]);
        $b = $st->fetch();
        if (!$b) continue;
        $limpos[] = ['bebida_id' => $bid, 'nome' => $b['nome'], 'quantidade' => $q];
    }
    if (!$limpos) fail('Escolha pelo menos uma bebida.');
    $codigo = codigo_unico('TKT', 'tickets');
    db()->prepare('INSERT INTO tickets (codigo, estabelecimento_id) VALUES (?, ?)')->execute([$codigo, $estId]);
    $tid = (int) db()->lastInsertId();
    $ins = db()->prepare('INSERT INTO ticket_itens (ticket_id, bebida_id, nome, quantidade) VALUES (?,?,?,?)');
    foreach ($limpos as $it) {
        $ins->execute([$tid, $it['bebida_id'], $it['nome'], $it['quantidade']]);
    }
    auditar('QR de tampas gerado', $codigo);
    return ticket_pub($tid);
}

function ticket_pub(int $id): array
{
    $t = db()->prepare('SELECT * FROM tickets WHERE id = ?');
    $t->execute([$id]);
    $row = $t->fetch();
    $itens = db()->prepare('SELECT bebida_id, nome, quantidade FROM ticket_itens WHERE ticket_id = ?');
    $itens->execute([$id]);
    return [
        'id' => pub('tkt', $id),
        'codigo' => $row['codigo'],
        'estabelecimentoId' => pub('est', $row['estabelecimento_id']),
        'itens' => array_map(fn($i) => [
            'bebidaId' => pub('beb', $i['bebida_id']),
            'nome' => $i['nome'],
            'quantidade' => (int) $i['quantidade'],
        ], $itens->fetchAll()),
        'usado' => (bool) $row['usado'],
        'usadoPor' => $row['usado_por'] ? pub('cli', $row['usado_por']) : null,
        'usadoEm' => iso($row['usado_em']),
        'criadoEm' => iso($row['criado_em']),
    ];
}

function resgatar_ticket(string $codigo, int $cliId): array
{
    $codigo = strtoupper(trim($codigo));
    if (preg_match('/SAIDERA-T:\s*([A-Z0-9\-]+)/', $codigo, $m)) $codigo = $m[1];
    $st = db()->prepare('SELECT * FROM tickets WHERE codigo = ?');
    $st->execute([$codigo]);
    $t = $st->fetch();
    if (!$t) fail('QR inválido. Peça um novo cupom à casa.');
    if ($t['usado']) fail('Este QR já foi usado. Cada cupom vale uma vez.');
    db()->prepare('UPDATE tickets SET usado = 1, usado_por = ?, usado_em = NOW() WHERE id = ?')
        ->execute([$cliId, $t['id']]);
    $itens = db()->prepare('SELECT * FROM ticket_itens WHERE ticket_id = ?');
    $itens->execute([$t['id']]);
    $rows = $itens->fetchAll();
    $ganhas = 0;
    $novas = [];
    foreach ($rows as $it) {
        $r = registrar_consumo($cliId, (int) $t['estabelecimento_id'], (int) $it['bebida_id'], (int) $it['quantidade'], null, true);
        $ganhas += $r['ganhas'];
        $novas = array_merge($novas, $r['novas']);
    }
    $resumo = implode(', ', array_map(fn($i) => $i['quantidade'] . '× ' . $i['nome'], $rows));
    $est = db()->prepare('SELECT nome FROM estabelecimentos WHERE id = ?');
    $est->execute([$t['estabelecimento_id']]);
    $en = $est->fetch()['nome'] ?? 'Casa';
    notificar($cliId, $ganhas ? 'Você ganhou uma Saidera!' : 'Tampas adicionadas', "{$resumo} no {$en}.", $ganhas ? 'saidera' : 'progresso');
    auditar('QR de tampas resgatado', $codigo . ' · ' . $resumo);
    return [
        'ticket' => ticket_pub((int) $t['id']),
        'est' => ['nome' => $en, 'id' => pub('est', $t['estabelecimento_id'])],
        'ganhas' => $ganhas,
        'novas' => $novas,
    ];
}

function entregar_saidera_codigo(string $codigo, int $estId, ?int $funId = null): array
{
    $codigo = strtoupper(trim($codigo));
    $st = db()->prepare('SELECT * FROM saideras WHERE codigo = ?');
    $st->execute([$codigo]);
    $s = $st->fetch();
    if (!$s) fail('Saidera não encontrada. Confira o ID com o cliente.');
    if ((int) $s['estabelecimento_id'] !== $estId) fail('Esta Saidera é de outro estabelecimento.');
    return entregar_saidera((int) $s['id'], $funId);
}

function entregar_saidera(int $id, ?int $funId = null): array
{
    $st = db()->prepare('SELECT * FROM saideras WHERE id = ?');
    $st->execute([$id]);
    $s = $st->fetch();
    if (!$s || $s['status'] !== 'disponivel') fail('Esta Saidera não está disponível.');
    if (strtotime($s['expira_em']) < time()) {
        db()->prepare("UPDATE saideras SET status = 'expirada' WHERE id = ?")->execute([$id]);
        fail('Esta Saidera expirou.');
    }
    db()->prepare("UPDATE saideras SET status = 'utilizada', utilizada_em = NOW() WHERE id = ?")->execute([$id]);
    marcar_turno($funId, 0, 1);
    auditar('Entrega de Saidera', $s['codigo']);
    $s['status'] = 'utilizada';
    return [
        'id' => pub('sai', $s['id']),
        'codigo' => $s['codigo'],
        'bebidaId' => pub('beb', $s['bebida_id']),
        'clienteId' => pub('cli', $s['cliente_id']),
        'estabelecimentoId' => pub('est', $s['estabelecimento_id']),
        'status' => 'utilizada',
    ];
}

function expirar_saideras(): void
{
    db()->exec("UPDATE saideras SET status = 'expirada' WHERE status = 'disponivel' AND expira_em < NOW()");
}

function cliente_por_codigo(string $q): ?array
{
    $q = trim($q);
    $st = db()->prepare('SELECT * FROM clientes WHERE codigo = ? OR REPLACE(codigo, "-", "") = REPLACE(?, "-", "")');
    $st->execute([strtoupper($q), strtoupper($q)]);
    $c = $st->fetch();
    if ($c) return $c;
    $st = db()->prepare('SELECT * FROM clientes WHERE LOWER(nome) LIKE ? OR LOWER(primeiro_nome) = ? LIMIT 1');
    $st->execute(['%' . strtolower($q) . '%', strtolower($q)]);
    return $st->fetch() ?: null;
}
