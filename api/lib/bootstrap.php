<?php

function row_bebida(array $b): array
{
    return [
        'id' => pub('beb', $b['id']),
        'nome' => $b['nome'],
        'tipo' => $b['tipo'],
        'marca' => $b['marca'],
        'cor' => $b['cor'],
    ];
}

function row_cliente(array $c): array
{
    $prefs = $c['prefs_json'] ? json_decode($c['prefs_json'], true) : [];
    return [
        'id' => pub('cli', $c['id']),
        'nome' => $c['nome'],
        'primeiroNome' => $c['primeiro_nome'],
        'codigo' => $c['codigo'],
        'telefone' => $c['telefone'] ?: '',
        'email' => $c['email'] ?? '',
        'nascimento' => $c['nascimento'] ? date('d/m/Y', strtotime($c['nascimento'])) : '',
        'cidade' => $c['cidade'] ?: '',
        'bairro' => $c['bairro'] ?: '',
        'avatar' => $c['avatar'] ?: 'assets/brand/icon-192.png',
        'clienteDesde' => br_date($c['cliente_desde']),
        'ultimaVisita' => $c['ultima_visita'] ? br_date($c['ultima_visita']) : '',
        'ultimaVisitaIso' => iso($c['ultima_visita']),
        'status' => 'ativo',
        'bebidaFavoritaId' => $c['bebida_favorita_id'] ? pub('beb', $c['bebida_favorita_id']) : null,
        'prefs' => $prefs ?: [
            'push' => true, 'email' => true, 'whatsapp' => false, 'perfilPublico' => true,
            'bebidaFavoritaId' => $c['bebida_favorita_id'] ? pub('beb', $c['bebida_favorita_id']) : null,
        ],
    ];
}

function row_est(array $e, bool $comBebidas = true): array
{
    $out = [
        'id' => pub('est', $e['id']),
        'nome' => $e['nome'],
        'tipo' => $e['tipo'],
        'bairro' => $e['bairro'],
        'endereco' => $e['endereco'],
        'lat' => $e['lat'] !== null ? (float) $e['lat'] : null,
        'lng' => $e['lng'] !== null ? (float) $e['lng'] : null,
        'distanciaKm' => 0,
        'avaliacao' => (float) $e['avaliacao'],
        'avaliacoes' => (int) $e['avaliacoes'],
        'imagem' => $e['imagem'],
        'cartaz' => $e['cartaz'],
        'status' => $e['status'],
        'aberto' => true,
        'horario' => $e['horario'],
        'metaPadrao' => (int) $e['meta_padrao'],
        'promocao' => $e['promocao'],
        'bebidas' => [],
    ];
    if ($comBebidas) {
        $st = db()->prepare('SELECT b.*, eb.meta, eb.regra FROM estabelecimento_bebidas eb JOIN bebidas b ON b.id = eb.bebida_id WHERE eb.estabelecimento_id = ?');
        $st->execute([$e['id']]);
        $out['bebidas'] = array_map(fn($b) => [
            'id' => pub('beb', $b['id']),
            'nome' => $b['nome'],
            'meta' => $b['meta'] !== null ? (int) $b['meta'] : null,
            'regra' => $b['regra'],
        ], $st->fetchAll());
    }
    return $out;
}

function row_saidera(array $s): array
{
    return [
        'id' => pub('sai', $s['id']),
        'codigo' => $s['codigo'],
        'clienteId' => pub('cli', $s['cliente_id']),
        'estabelecimentoId' => pub('est', $s['estabelecimento_id']),
        'bebidaId' => pub('beb', $s['bebida_id']),
        'status' => $s['status'],
        'conquistadaEm' => iso($s['conquistada_em']),
        'utilizadaEm' => iso($s['utilizada_em']),
        'expiraEm' => iso($s['expira_em']),
        'campanhaId' => $s['campanha_id'] ? pub('cam', $s['campanha_id']) : null,
    ];
}

function row_tampa(array $t): array
{
    return [
        'id' => pub('tmp', $t['id']),
        'clienteId' => pub('cli', $t['cliente_id']),
        'estabelecimentoId' => pub('est', $t['estabelecimento_id']),
        'bebidaId' => pub('beb', $t['bebida_id']),
        'atual' => (int) $t['atual'],
        'meta' => (int) $t['meta'],
        'atualizadoEm' => iso($t['atualizado_em']),
    ];
}

function row_campanha(array $c): array
{
    $ests = db()->prepare('SELECT estabelecimento_id FROM campanha_estabelecimentos WHERE campanha_id = ?');
    $ests->execute([$c['id']]);
    $ids = array_map(fn($r) => pub('est', $r['estabelecimento_id']), $ests->fetchAll());
    $cliIds = $c['cliente_ids_json'] ? json_decode($c['cliente_ids_json'], true) : [];
    return [
        'id' => pub('cam', $c['id']),
        'titulo' => $c['titulo'],
        'origem' => $c['origem'],
        'estabelecimentoId' => $c['estabelecimento_id'] ? pub('est', $c['estabelecimento_id']) : null,
        'parceiroId' => $c['parceiro_id'] ? pub('par', $c['parceiro_id']) : null,
        'status' => $c['status'],
        'tipo' => $c['tipo'],
        'publico' => $c['publico'],
        'mensagem' => $c['mensagem'],
        'metaTampas' => $c['meta_tampas'] !== null ? (int) $c['meta_tampas'] : null,
        'alteraMeta' => (bool) $c['altera_meta'],
        'bebidaId' => $c['bebida_id'] ? pub('beb', $c['bebida_id']) : null,
        'estabelecimentos' => $ids,
        'periodoInicio' => $c['periodo_inicio'] ? date('d/m/Y', strtotime($c['periodo_inicio'])) : null,
        'periodoFim' => $c['periodo_fim'] ? date('d/m/Y', strtotime($c['periodo_fim'])) : null,
        'canal' => $c['canal'],
        'disparada' => (bool) $c['disparada'],
        'clienteIds' => $cliIds,
        'limite' => $c['limite'] ? (int) $c['limite'] : null,
        'publicoPotencial' => (int) $c['publico_potencial'],
        'participantes' => (int) $c['participantes'],
        'saideras' => (int) $c['saideras_count'],
        'solicitadaEm' => iso($c['solicitada_em']),
    ];
}

function bootstrap_store(array $u): array
{
    expirar_saideras();
    $bebidas = array_map('row_bebida', db()->query('SELECT * FROM bebidas ORDER BY nome')->fetchAll());
    $meta = [
        'cidade' => cfg('cidade', 'Aracaju/SE'),
        'metaPadraoRede' => (int) cfg('meta_padrao_rede', 10),
        'demo' => [
            'clienteId' => null,
            'estabelecimentoId' => null,
            'parceiroId' => null,
            'funcionarioId' => null,
        ],
    ];
    $empty = [
        'meta' => $meta,
        'clientes' => [],
        'estabelecimentos' => [],
        'bebidas' => $bebidas,
        'funcionarios' => [],
        'parceiros' => [],
        'tampas' => [],
        'consumos' => [],
        'saideras' => [],
        'campanhas' => [],
        'notificacoes' => [],
        'tickets' => [],
        'auditoria' => [],
        'avisosEstabelecimento' => [],
    ];

    if ($u['papel'] === 'cliente') {
        $cli = cliente_por_usuario((int) $u['id']);
        if (!$cli) fail('Perfil de cliente incompleto.', 403);
        $cli['email'] = $u['email'];
        $empty['meta']['demo']['clienteId'] = pub('cli', $cli['id']);
        $empty['clientes'] = [row_cliente($cli)];
        $empty['estabelecimentos'] = array_map(fn($e) => row_est($e), db()->query("SELECT * FROM estabelecimentos WHERE status = 'ativo' ORDER BY nome")->fetchAll());
        $st = db()->prepare('SELECT * FROM progresso_tampas WHERE cliente_id = ?');
        $st->execute([$cli['id']]);
        $empty['tampas'] = array_map('row_tampa', $st->fetchAll());
        $st = db()->prepare('SELECT * FROM saideras WHERE cliente_id = ? ORDER BY conquistada_em DESC');
        $st->execute([$cli['id']]);
        $empty['saideras'] = array_map('row_saidera', $st->fetchAll());
        $st = db()->prepare('SELECT * FROM consumos WHERE cliente_id = ? ORDER BY criado_em DESC LIMIT 40');
        $st->execute([$cli['id']]);
        $empty['consumos'] = array_map(fn($c) => [
            'id' => pub('con', $c['id']),
            'clienteId' => pub('cli', $c['cliente_id']),
            'estabelecimentoId' => pub('est', $c['estabelecimento_id']),
            'bebidaId' => pub('beb', $c['bebida_id']),
            'quantidade' => (int) $c['quantidade'],
            'criadoEm' => iso($c['criado_em']),
        ], $st->fetchAll());
        $st = db()->prepare('SELECT * FROM notificacoes WHERE cliente_id = ? ORDER BY criado_em DESC LIMIT 50');
        $st->execute([$cli['id']]);
        $empty['notificacoes'] = array_map(fn($n) => [
            'id' => pub('ntf', $n['id']),
            'clienteId' => pub('cli', $n['cliente_id']),
            'titulo' => $n['titulo'],
            'texto' => $n['texto'],
            'tipo' => $n['tipo'],
            'lida' => (bool) $n['lida'],
            'campanhaId' => $n['campanha_id'] ? pub('cam', $n['campanha_id']) : null,
            'criadoEm' => iso($n['criado_em']),
        ], $st->fetchAll());
        $empty['campanhas'] = array_map('row_campanha', db()->query("SELECT * FROM campanhas WHERE status = 'ativa' AND disparada = 1")->fetchAll());
        $empty['parceiros'] = array_map(fn($p) => [
            'id' => pub('par', $p['id']), 'nome' => $p['nome'], 'selo' => $p['selo'], 'logoCor' => $p['logo_cor'],
        ], db()->query("SELECT * FROM parceiros WHERE status = 'ativo'")->fetchAll());
        $st = db()->prepare('SELECT * FROM tickets WHERE usado_por = ? ORDER BY usado_em DESC LIMIT 10');
        $st->execute([$cli['id']]);
        $empty['tickets'] = array_map(fn($t) => ticket_pub((int) $t['id']), $st->fetchAll());
        return $empty;
    }

    if ($u['papel'] === 'funcionario') {
        $f = funcionario_por_usuario((int) $u['id']);
        if (!$f) fail('Perfil de funcionário incompleto.', 403);
        $empty['meta']['demo']['funcionarioId'] = pub('fun', $f['id']);
        $empty['meta']['demo']['estabelecimentoId'] = pub('est', $f['estabelecimento_id']);
        $est = db()->prepare('SELECT * FROM estabelecimentos WHERE id = ?');
        $est->execute([$f['estabelecimento_id']]);
        $e = $est->fetch();
        $empty['estabelecimentos'] = [row_est($e)];
        $empty['funcionarios'] = [[
            'id' => pub('fun', $f['id']),
            'nome' => $f['nome'],
            'cargo' => $f['cargo'],
            'estabelecimentoId' => pub('est', $f['estabelecimento_id']),
            'status' => $f['status'],
            'avatar' => $f['avatar'] ?: 'assets/brand/icon-192.png',
            'tampasHoje' => (int) $f['tampas_hoje'],
            'saiderasEntregues' => (int) $f['saideras_entregues'],
        ]];
        $st = db()->prepare('SELECT * FROM saideras WHERE estabelecimento_id = ? AND status = "disponivel" ORDER BY conquistada_em DESC LIMIT 80');
        $st->execute([$f['estabelecimento_id']]);
        $empty['saideras'] = array_map('row_saidera', $st->fetchAll());
        $ids = array_unique(array_column($empty['saideras'], 'clienteId'));
        if ($ids) {
            $ints = array_map(fn($id) => nid('cli', $id), $ids);
            $in = implode(',', array_fill(0, count($ints), '?'));
            $st = db()->prepare("SELECT c.*, u.email FROM clientes c JOIN usuarios u ON u.id = c.usuario_id WHERE c.id IN ($in)");
            $st->execute($ints);
            $empty['clientes'] = array_map('row_cliente', $st->fetchAll());
        }
        return $empty;
    }

    if ($u['papel'] === 'estabelecimento') {
        $eid = gestor_est_id((int) $u['id']);
        if (!$eid) fail('Nenhum estabelecimento vinculado a esta conta.', 403);
        $empty['meta']['demo']['estabelecimentoId'] = pub('est', $eid);
        $est = db()->prepare('SELECT * FROM estabelecimentos WHERE id = ?');
        $est->execute([$eid]);
        $empty['estabelecimentos'] = [row_est($est->fetch())];
        $st = db()->prepare('SELECT * FROM funcionarios WHERE estabelecimento_id = ?');
        $st->execute([$eid]);
        $empty['funcionarios'] = array_map(fn($f) => [
            'id' => pub('fun', $f['id']),
            'nome' => $f['nome'],
            'cargo' => $f['cargo'],
            'estabelecimentoId' => pub('est', $f['estabelecimento_id']),
            'status' => $f['status'],
            'avatar' => $f['avatar'] ?: 'assets/brand/icon-192.png',
            'tampasHoje' => (int) $f['tampas_hoje'],
            'saiderasEntregues' => (int) $f['saideras_entregues'],
        ], $st->fetchAll());
        $st = db()->prepare('SELECT * FROM tickets WHERE estabelecimento_id = ? ORDER BY criado_em DESC LIMIT 40');
        $st->execute([$eid]);
        $empty['tickets'] = array_map(fn($t) => ticket_pub((int) $t['id']), $st->fetchAll());
        $st = db()->prepare('SELECT * FROM saideras WHERE estabelecimento_id = ? ORDER BY conquistada_em DESC LIMIT 80');
        $st->execute([$eid]);
        $empty['saideras'] = array_map('row_saidera', $st->fetchAll());
        $st = db()->prepare('SELECT DISTINCT c.*, u.email FROM clientes c JOIN usuarios u ON u.id = c.usuario_id WHERE c.id IN (
            SELECT cliente_id FROM progresso_tampas WHERE estabelecimento_id = ?
            UNION SELECT cliente_id FROM consumos WHERE estabelecimento_id = ?
            UNION SELECT cliente_id FROM saideras WHERE estabelecimento_id = ?
        )');
        $st->execute([$eid, $eid, $eid]);
        $empty['clientes'] = array_map('row_cliente', $st->fetchAll());
        $st = db()->prepare('SELECT * FROM progresso_tampas WHERE estabelecimento_id = ?');
        $st->execute([$eid]);
        $empty['tampas'] = array_map('row_tampa', $st->fetchAll());
        $st = db()->prepare('SELECT * FROM consumos WHERE estabelecimento_id = ? ORDER BY criado_em DESC LIMIT 80');
        $st->execute([$eid]);
        $empty['consumos'] = array_map(fn($c) => [
            'id' => pub('con', $c['id']),
            'clienteId' => pub('cli', $c['cliente_id']),
            'estabelecimentoId' => pub('est', $c['estabelecimento_id']),
            'bebidaId' => pub('beb', $c['bebida_id']),
            'quantidade' => (int) $c['quantidade'],
            'criadoEm' => iso($c['criado_em']),
        ], $st->fetchAll());
        $st = db()->prepare('SELECT * FROM campanhas WHERE estabelecimento_id = ? OR id IN (SELECT campanha_id FROM campanha_estabelecimentos WHERE estabelecimento_id = ?) ORDER BY solicitada_em DESC');
        $st->execute([$eid, $eid]);
        $empty['campanhas'] = array_map('row_campanha', $st->fetchAll());
        $empty['parceiros'] = array_map(fn($p) => [
            'id' => pub('par', $p['id']), 'nome' => $p['nome'], 'selo' => $p['selo'],
        ], db()->query('SELECT * FROM parceiros')->fetchAll());
        return $empty;
    }

    if ($u['papel'] === 'parceiro') {
        $p = parceiro_por_usuario((int) $u['id']);
        if (!$p) fail('Perfil de parceiro incompleto.', 403);
        $empty['meta']['demo']['parceiroId'] = pub('par', $p['id']);
        $empty['parceiros'] = [[
            'id' => pub('par', $p['id']),
            'nome' => $p['nome'],
            'categoria' => $p['categoria'],
            'selo' => $p['selo'],
            'status' => $p['status'],
            'logoCor' => $p['logo_cor'],
        ]];
        $empty['estabelecimentos'] = array_map(fn($e) => row_est($e), db()->query("SELECT * FROM estabelecimentos WHERE status = 'ativo'")->fetchAll());
        $st = db()->prepare('SELECT * FROM campanhas WHERE parceiro_id = ? ORDER BY solicitada_em DESC');
        $st->execute([$p['id']]);
        $empty['campanhas'] = array_map('row_campanha', $st->fetchAll());
        return $empty;
    }

    // admin
    $empty['estabelecimentos'] = array_map(fn($e) => row_est($e), db()->query('SELECT * FROM estabelecimentos ORDER BY nome')->fetchAll());
    $empty['clientes'] = array_map('row_cliente', db()->query('SELECT c.*, u.email FROM clientes c JOIN usuarios u ON u.id = c.usuario_id ORDER BY c.nome LIMIT 200')->fetchAll());
    $empty['parceiros'] = array_map(fn($p) => [
        'id' => pub('par', $p['id']), 'nome' => $p['nome'], 'categoria' => $p['categoria'],
        'selo' => $p['selo'], 'status' => $p['status'], 'logoCor' => $p['logo_cor'],
    ], db()->query('SELECT * FROM parceiros')->fetchAll());
    $empty['campanhas'] = array_map('row_campanha', db()->query('SELECT * FROM campanhas ORDER BY solicitada_em DESC')->fetchAll());
    $empty['saideras'] = array_map('row_saidera', db()->query('SELECT * FROM saideras ORDER BY conquistada_em DESC LIMIT 80')->fetchAll());
    $empty['tampas'] = array_map('row_tampa', db()->query('SELECT * FROM progresso_tampas LIMIT 200')->fetchAll());
    $empty['consumos'] = array_map(fn($c) => [
        'id' => pub('con', $c['id']),
        'clienteId' => pub('cli', $c['cliente_id']),
        'estabelecimentoId' => pub('est', $c['estabelecimento_id']),
        'bebidaId' => pub('beb', $c['bebida_id']),
        'quantidade' => (int) $c['quantidade'],
        'criadoEm' => iso($c['criado_em']),
    ], db()->query('SELECT * FROM consumos ORDER BY criado_em DESC LIMIT 80')->fetchAll());
    $empty['auditoria'] = array_map(fn($a) => [
        'em' => iso($a['em']), 'acao' => $a['acao'], 'detalhe' => $a['detalhe'],
    ], db()->query('SELECT * FROM auditoria ORDER BY em DESC LIMIT 80')->fetchAll());
    $empty['funcionarios'] = array_map(fn($f) => [
        'id' => pub('fun', $f['id']),
        'nome' => $f['nome'],
        'cargo' => $f['cargo'],
        'estabelecimentoId' => pub('est', $f['estabelecimento_id']),
        'status' => $f['status'],
        'avatar' => $f['avatar'] ?: 'assets/brand/icon-192.png',
        'tampasHoje' => (int) $f['tampas_hoje'],
        'saiderasEntregues' => (int) $f['saideras_entregues'],
    ], db()->query('SELECT * FROM funcionarios')->fetchAll());
    return $empty;
}

function session_payload(array $u): array
{
    $out = [
        'papel' => $u['papel'],
        'email' => $u['email'],
        'clienteId' => null,
        'estabelecimentoId' => null,
        'funcionarioId' => null,
        'parceiroId' => null,
        'pagina' => [
            'cliente' => 'pages/cliente.html',
            'funcionario' => 'pages/garcom.html',
            'estabelecimento' => 'pages/estabelecimento.html',
            'parceiro' => 'pages/parceiro.html',
            'admin' => 'pages/admin.html',
        ][$u['papel']] ?? 'index.html',
    ];
    if ($u['papel'] === 'cliente') {
        $c = cliente_por_usuario((int) $u['id']);
        $out['clienteId'] = $c ? pub('cli', $c['id']) : null;
        $out['nome'] = $c['primeiro_nome'] ?? '';
    } elseif ($u['papel'] === 'funcionario') {
        $f = funcionario_por_usuario((int) $u['id']);
        $out['funcionarioId'] = $f ? pub('fun', $f['id']) : null;
        $out['estabelecimentoId'] = $f ? pub('est', $f['estabelecimento_id']) : null;
        $out['nome'] = $f['nome'] ?? '';
    } elseif ($u['papel'] === 'estabelecimento') {
        $eid = gestor_est_id((int) $u['id']);
        $out['estabelecimentoId'] = $eid ? pub('est', $eid) : null;
    } elseif ($u['papel'] === 'parceiro') {
        $p = parceiro_por_usuario((int) $u['id']);
        $out['parceiroId'] = $p ? pub('par', $p['id']) : null;
        $out['nome'] = $p['nome'] ?? '';
    } else {
        $out['nome'] = 'Admin';
    }
    return $out;
}
