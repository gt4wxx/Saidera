<?php

function formatar_cep(string $cep): string
{
    $n = preg_replace('/\D+/', '', $cep);
    if (strlen($n) !== 8) {
        throw new RuntimeException('Informe um CEP válido com 8 dígitos.', 400);
    }
    return substr($n, 0, 5) . '-' . substr($n, 5);
}

function montar_endereco(array $in): string
{
    $cep = '';
    try {
        $cep = formatar_cep((string) ($in['cep'] ?? ''));
    } catch (Throwable $e) {
        $cep = trim((string) ($in['cep'] ?? ''));
    }
    $rua = trim((string) ($in['logradouro'] ?? $in['rua'] ?? ''));
    $num = trim((string) ($in['numero'] ?? ''));
    $linha = $rua;
    if ($num !== '') $linha = $rua ? "$rua, $num" : $num;
    $partes = array_filter([
        $linha,
        trim((string) ($in['complemento'] ?? '')),
        trim((string) ($in['bairro'] ?? '')),
        trim((string) ($in['cidade'] ?? 'Aracaju') . ' - ' . strtoupper(trim((string) ($in['uf'] ?? 'SE')) ?: 'SE')),
        $cep ? 'CEP ' . $cep : '',
    ], fn($p) => $p !== '');
    return implode(', ', $partes);
}

function http_get_url(string $url): string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'Saideira/1.0 (https://saideira.devpremium.site)',
        ]);
        $out = curl_exec($ch);
        curl_close($ch);
        return is_string($out) ? $out : '';
    }
    $ctx = stream_context_create(['http' => [
        'timeout' => 8,
        'header' => "User-Agent: Saideira/1.0\r\n",
    ]]);
    $out = @file_get_contents($url, false, $ctx);
    return is_string($out) ? $out : '';
}

function geocodificar_endereco(string $endereco): array
{
    $q = trim($endereco);
    if ($q === '') return [null, null];
    $url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' . rawurlencode($q);
    $raw = http_get_url($url);
    $json = json_decode($raw, true);
    if (!is_array($json) || empty($json[0]['lat'])) return [null, null];
    return [(float) $json[0]['lat'], (float) $json[0]['lng']];
}

function aplicar_endereco_casa(array $in, ?array $atual = null, bool $obrigatorio = false): array
{
    $tem = $in['cep'] ?? $in['logradouro'] ?? $in['rua'] ?? $in['numero'] ?? null;
    if (($tem === null || $tem === '') && $atual && !$obrigatorio) {
        return [
            'cep' => $atual['cep'] ?? null,
            'logradouro' => $atual['logradouro'] ?? null,
            'numero' => $atual['numero'] ?? null,
            'complemento' => $atual['complemento'] ?? null,
            'bairro' => $atual['bairro'] ?? null,
            'cidade' => $atual['cidade'] ?? null,
            'uf' => $atual['uf'] ?? 'SE',
            'endereco' => $atual['endereco'] ?? null,
            'lat' => $atual['lat'] ?? null,
            'lng' => $atual['lng'] ?? null,
        ];
    }
    $cep = formatar_cep((string) ($in['cep'] ?? ''));
    $log = trim((string) ($in['logradouro'] ?? $in['rua'] ?? ''));
    $num = trim((string) ($in['numero'] ?? ''));
    $bairro = trim((string) ($in['bairro'] ?? ''));
    if (strlen($log) < 3) throw new RuntimeException('Informe a rua ou avenida completa.', 400);
    if ($num === '') throw new RuntimeException('Informe o número do endereço.', 400);
    if ($bairro === '') throw new RuntimeException('Informe o bairro.', 400);
    $comp = trim((string) ($in['complemento'] ?? ''));
    $cidade = trim((string) ($in['cidade'] ?? 'Aracaju')) ?: 'Aracaju';
    $uf = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', (string) ($in['uf'] ?? 'SE')) ?: 'SE', 0, 2));
    $payload = [
        'cep' => $cep,
        'logradouro' => $log,
        'numero' => $num,
        'complemento' => $comp ?: null,
        'bairro' => $bairro,
        'cidade' => $cidade,
        'uf' => $uf,
    ];
    $payload['endereco'] = montar_endereco($payload);
    [$lat, $lng] = geocodificar_endereco($payload['endereco'] . ', Brasil');
    $payload['lat'] = $lat;
    $payload['lng'] = $lng;
    return $payload;
}

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

function casa_eid(array $u, array $in = []): int
{
    $pedido = nid('est', (string) ($in['estabelecimentoId'] ?? $in['id'] ?? ''));
    if (($u['papel'] ?? '') === 'admin') {
        if (!$pedido) fail('Informe o estabelecimento.');
        return $pedido;
    }
    $meu = gestor_est_id((int) $u['id']);
    if (!$meu) fail('Nenhuma casa vinculada a esta conta.', 403);
    if ($pedido && $pedido !== $meu) fail('Esta casa não é a sua.', 403);
    return $meu;
}

function cliente_da_casa(int $cliId, int $estId): bool
{
    $st = db()->prepare('SELECT 1 FROM (
        SELECT cliente_id FROM progresso_tampas WHERE cliente_id = ? AND estabelecimento_id = ?
        UNION SELECT cliente_id FROM consumos WHERE cliente_id = ? AND estabelecimento_id = ?
        UNION SELECT cliente_id FROM saideras WHERE cliente_id = ? AND estabelecimento_id = ?
    ) x LIMIT 1');
    $st->execute([$cliId, $estId, $cliId, $estId, $cliId, $estId]);
    return (bool) $st->fetch();
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

function casa_aberta(?string $horario): ?bool
{
    $horario = trim((string) $horario);
    if ($horario === '') return null;
    if (!preg_match_all('/(\d{1,2})/', $horario, $m) || count($m[1]) < 2) return null;
    $ini = (int) $m[1][0];
    $fim = (int) $m[1][1];
    if ($ini > 23 || $fim > 23) return null;
    $h = (int) (new DateTimeImmutable('now'))->format('G');
    if ($ini === $fim) return true;
    if ($ini < $fim) return $h >= $ini && $h < $fim;
    return $h >= $ini || $h < $fim;
}

function br_para_sql(?string $br): ?string
{
    $br = trim((string) $br);
    if ($br === '') return null;
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $br)) return $br;
    if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $br, $m)) return $m[3] . '-' . $m[2] . '-' . $m[1];
    return null;
}

function cliente_elegivel_campanha(int $cliId, array $cam, int $estId): bool
{
    $ids = $cam['cliente_ids_json'] ? (json_decode($cam['cliente_ids_json'], true) ?: []) : [];
    if ($ids) {
        foreach ($ids as $id) {
            $n = is_numeric($id) ? (int) $id : nid('cli', (string) $id);
            if ($n && (int) $n === $cliId) return true;
        }
        return false;
    }
    $st = db()->prepare('SELECT 1 FROM campanha_adesoes WHERE campanha_id = ? AND cliente_id = ?');
    $st->execute([(int) $cam['id'], $cliId]);
    if ($st->fetch()) return true;
    if (($cam['origem'] ?? '') === 'parceiro') return true;
    $publico = $cam['publico'] ?? 'todos';
    if ($publico === 'todos') return true;
    $cli = db()->prepare('SELECT nascimento, ultima_visita FROM clientes WHERE id = ?');
    $cli->execute([$cliId]);
    $c = $cli->fetch();
    if (!$c) return false;
    if ($publico === 'aniversario') {
        return $c['nascimento'] && (int) date('n', strtotime($c['nascimento'])) === (int) date('n');
    }
    if ($publico === 'inativos') {
        if (!$c['ultima_visita']) return true;
        return strtotime($c['ultima_visita']) < time() - 30 * 86400;
    }
    if ($publico === 'quase') {
        $q = db()->prepare('SELECT 1 FROM progresso_tampas WHERE cliente_id = ? AND estabelecimento_id = ? AND atual > 0 AND (meta - atual) <= 2');
        $q->execute([$cliId, $estId]);
        return (bool) $q->fetch();
    }
    return false;
}

function campanha_oferta_ativa(int $cliId, int $estId, int $bebidaId): ?array
{
    $hoje = date('Y-m-d');
    $st = db()->prepare(
        'SELECT c.* FROM campanhas c
         JOIN campanha_estabelecimentos ce ON ce.campanha_id = c.id
         WHERE c.status = "ativa" AND c.disparada = 1 AND c.altera_meta = 1
           AND c.meta_tampas IS NOT NULL AND c.meta_tampas > 0
           AND (c.bebida_id IS NULL OR c.bebida_id = ?)
           AND ce.estabelecimento_id = ?
           AND (c.periodo_inicio IS NULL OR c.periodo_inicio <= ?)
           AND (c.periodo_fim IS NULL OR c.periodo_fim >= ?)
         ORDER BY c.meta_tampas ASC'
    );
    $st->execute([$bebidaId, $estId, $hoje, $hoje]);
    foreach ($st->fetchAll() as $cam) {
        $usou = db()->prepare('SELECT 1 FROM saideras WHERE cliente_id = ? AND estabelecimento_id = ? AND bebida_id = ? AND campanha_id = ? LIMIT 1');
        $usou->execute([$cliId, $estId, $bebidaId, $cam['id']]);
        if ($usou->fetch()) continue;
        if (!cliente_elegivel_campanha($cliId, $cam, $estId)) continue;
        return $cam;
    }
    return null;
}

function hidratar_cliente_ofertas(array &$row, int $cliId): void
{
    $st = db()->prepare('SELECT campanha_id FROM campanha_adesoes WHERE cliente_id = ?');
    $st->execute([$cliId]);
    $row['ofertas'] = array_map(fn($r) => pub('cam', $r['campanha_id']), $st->fetchAll());
    $st = db()->prepare('SELECT campanha_id, estabelecimento_id, bebida_id FROM saideras WHERE cliente_id = ? AND campanha_id IS NOT NULL');
    $st->execute([$cliId]);
    $row['ofertasConsumidas'] = array_map(fn($r) => [
        'campanhaId' => pub('cam', $r['campanha_id']),
        'estabelecimentoId' => pub('est', $r['estabelecimento_id']),
        'bebidaId' => pub('beb', $r['bebida_id']),
    ], $st->fetchAll());
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
    auditar('Saideira conquistada', $codigo);
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
    $oferta = campanha_oferta_ativa($cliId, $estId, $bebidaId);
    $metaOferta = $oferta ? (int) $oferta['meta_tampas'] : 0;
    $camId = $oferta ? (int) $oferta['id'] : null;
    $antes = (int) $p['atual'];
    $total = $antes + $qtd;
    $novas = [];
    $ganhas = 0;
    $ofertaConcluida = false;
    if ($camId && $metaOferta > 0 && $total >= $metaOferta) {
        $novas[] = nova_saidera($cliId, $estId, $bebidaId, $camId);
        $ganhas++;
        $total -= $metaOferta;
        $ofertaConcluida = true;
        $camId = null;
    }
    $extra = intdiv($total, $metaBar);
    for ($i = 0; $i < $extra; $i++) {
        $novas[] = nova_saidera($cliId, $estId, $bebidaId);
        $ganhas++;
    }
    $depois = $total % $metaBar;
    $metaDepois = $ofertaConcluida ? $metaBar : ($metaOferta ?: $metaBar);
    db()->prepare('UPDATE progresso_tampas SET atual = ?, meta = ?, atualizado_em = NOW() WHERE id = ?')
        ->execute([$depois, $metaDepois, $p['id']]);
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
        $titulo = $ganhas ? 'Você ganhou uma Saideira!' : ($qtd . ' Tampa' . ($qtd > 1 ? 's' : '') . ' registrada' . ($qtd > 1 ? 's' : ''));
        $texto = $ganhas
            ? "{$bn} no {$en}. Informe o ID da Saideira à casa para retirar."
            : "{$bn} no {$en}: {$depois}/{$metaDepois}.";
        notificar($cliId, $titulo, $texto, $ganhas ? 'saidera' : 'progresso');
        auditar('Registro de consumo', "{$en} · {$bn} ×{$qtd}");
    }
    return [
        'antes' => $antes,
        'depois' => $depois,
        'meta' => $metaDepois,
        'ganhas' => $ganhas,
        'novas' => $novas,
        'ofertaConcluida' => $ofertaConcluida,
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

function ticket_row_pub(array $row, array $itens = []): array
{
    $id = (int) $row['id'];
    return [
        'id' => pub('tkt', $id),
        'codigo' => $row['codigo'],
        'estabelecimentoId' => pub('est', $row['estabelecimento_id']),
        'itens' => $itens,
        'usado' => (bool) $row['usado'],
        'usadoPor' => $row['usado_por'] ? pub('cli', $row['usado_por']) : null,
        'usadoEm' => iso($row['usado_em']),
        'criadoEm' => iso($row['criado_em']),
        'status' => !$row['usado'] ? 'aberto' : ($row['usado_por'] ? 'usado' : 'cancelado'),
    ];
}

function tickets_pub_lista(array $rows): array
{
    if (!$rows) return [];
    $ids = array_map(fn($r) => (int) $r['id'], $rows);
    $in = implode(',', array_fill(0, count($ids), '?'));
    $it = db()->prepare("SELECT ticket_id, bebida_id, nome, quantidade FROM ticket_itens WHERE ticket_id IN ($in)");
    $it->execute($ids);
    $by = [];
    foreach ($it->fetchAll() as $i) {
        $by[(int) $i['ticket_id']][] = [
            'bebidaId' => pub('beb', $i['bebida_id']),
            'nome' => $i['nome'],
            'quantidade' => (int) $i['quantidade'],
        ];
    }
    return array_map(fn($row) => ticket_row_pub($row, $by[(int) $row['id']] ?? []), $rows);
}

function ticket_pub(int $id): array
{
    $t = db()->prepare('SELECT * FROM tickets WHERE id = ?');
    $t->execute([$id]);
    $row = $t->fetch();
    if (!$row) return [];
    $itens = db()->prepare('SELECT bebida_id, nome, quantidade FROM ticket_itens WHERE ticket_id = ?');
    $itens->execute([$id]);
    return ticket_row_pub($row, array_map(fn($i) => [
        'bebidaId' => pub('beb', $i['bebida_id']),
        'nome' => $i['nome'],
        'quantidade' => (int) $i['quantidade'],
    ], $itens->fetchAll()));
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
    notificar($cliId, $ganhas ? 'Você ganhou uma Saideira!' : 'Tampas adicionadas', "{$resumo} no {$en}.", $ganhas ? 'saidera' : 'progresso');
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
    if (!$s) fail('Saideira não encontrada. Confira o ID com o cliente.');
    if ((int) $s['estabelecimento_id'] !== $estId) fail('Esta Saideira é de outro estabelecimento.');
    return entregar_saidera((int) $s['id'], $funId);
}

function entregar_saidera(int $id, ?int $funId = null): array
{
    $st = db()->prepare('SELECT * FROM saideras WHERE id = ?');
    $st->execute([$id]);
    $s = $st->fetch();
    if (!$s || $s['status'] !== 'disponivel') fail('Esta Saideira não está disponível.');
    if (strtotime($s['expira_em']) < time()) {
        db()->prepare("UPDATE saideras SET status = 'expirada' WHERE id = ?")->execute([$id]);
        fail('Esta Saideira expirou.');
    }
    db()->prepare("UPDATE saideras SET status = 'utilizada', utilizada_em = NOW() WHERE id = ?")->execute([$id]);
    marcar_turno($funId, 0, 1);
    auditar('Entrega de Saideira', $s['codigo']);
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

function apagar_upload_local(?string $path, string $pasta): void
{
    $path = (string) $path;
    $prefixo = 'uploads/' . $pasta . '/';
    if ($path === '' || strncmp($path, $prefixo, strlen($prefixo)) !== 0) return;
    $full = dirname(__DIR__, 2) . '/' . $path;
    if (is_file($full)) @unlink($full);
}

function salvar_avatar_cliente(int $cliId, string $dataUrl): string
{
    $st = db()->prepare('SELECT avatar FROM clientes WHERE id = ?');
    $st->execute([$cliId]);
    $old = (string) ($st->fetch()['avatar'] ?? '');
    if ($dataUrl === '' || $dataUrl === 'null') {
        db()->prepare('UPDATE clientes SET avatar = NULL WHERE id = ?')->execute([$cliId]);
        apagar_upload_local($old, 'clientes');
        return '';
    }
    if (!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,#i', $dataUrl, $m)) {
        fail('Envie uma foto JPG, PNG ou WebP.');
    }
    $raw = preg_replace('#^data:image/\w+;base64,#i', '', $dataUrl);
    $bin = base64_decode($raw, true);
    if (!$bin || strlen($bin) > 2500000) {
        fail('Foto inválida ou maior que 2 MB.');
    }
    $dir = dirname(__DIR__, 2) . '/uploads/clientes';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        fail('Não foi possível criar a pasta de fotos.');
    }
    $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
    $name = $cliId . '-' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $ext;
    if (file_put_contents($dir . '/' . $name, $bin) === false) {
        fail('Não foi possível gravar a foto.');
    }
    $path = 'uploads/clientes/' . $name;
    db()->prepare('UPDATE clientes SET avatar = ? WHERE id = ?')->execute([$path, $cliId]);
    apagar_upload_local($old, 'clientes');
    return $path;
}

function salvar_midia_casa(int $eid, string $campo, string $dataUrl): string
{
    if (!in_array($campo, ['cartaz', 'imagem'], true)) {
        fail('Campo de imagem inválido.');
    }
    if ($dataUrl === '' || $dataUrl === 'null') {
        db()->prepare("UPDATE estabelecimentos SET {$campo} = NULL WHERE id = ?")->execute([$eid]);
        return '';
    }
    if (!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,#i', $dataUrl, $m)) {
        fail('Envie uma imagem JPG, PNG ou WebP.');
    }
    $raw = preg_replace('#^data:image/\w+;base64,#i', '', $dataUrl);
    $bin = base64_decode($raw, true);
    if (!$bin || strlen($bin) > 2500000) {
        fail('Imagem inválida ou maior que 2 MB.');
    }
    $dir = dirname(__DIR__, 2) . '/uploads/casas';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        fail('Não foi possível criar a pasta de uploads.');
    }
    $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
    $name = $eid . '-' . $campo . '-' . substr(bin2hex(random_bytes(3)), 0, 6) . '.' . $ext;
    if (file_put_contents($dir . '/' . $name, $bin) === false) {
        fail('Não foi possível gravar a imagem.');
    }
    $path = 'uploads/casas/' . $name;
    db()->prepare("UPDATE estabelecimentos SET {$campo} = ? WHERE id = ?")->execute([$path, $eid]);
    return $path;
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

function menus_casa_catalogo(): array
{
    return ['dashboard', 'clientes', 'registrar', 'atender', 'bebidas', 'saideras', 'funcionarios', 'inteligencia', 'campanhas', 'config', 'planos'];
}

function menus_casa_fixos(): array
{
    return ['dashboard', 'config', 'planos'];
}

function sanitizar_menus_casa($ids): array
{
    $ok = menus_casa_catalogo();
    $ids = is_array($ids) ? $ids : [];
    $out = [];
    foreach ($ids as $id) {
        $id = (string) $id;
        if (in_array($id, $ok, true) && !in_array($id, $out, true)) $out[] = $id;
    }
    foreach (menus_casa_fixos() as $f) {
        if (!in_array($f, $out, true)) $out[] = $f;
    }
    return $out;
}

function row_plano(array $p): array
{
    $menus = $p['menus_json'] ? json_decode($p['menus_json'], true) : [];
    return [
        'id' => pub('pln', $p['id']),
        'nome' => $p['nome'],
        'descricao' => $p['descricao'] ?? '',
        'preco' => $p['preco'] !== null && $p['preco'] !== '' ? (float) $p['preco'] : null,
        'menus' => sanitizar_menus_casa($menus),
        'aMostra' => (bool) ($p['a_mostra'] ?? 0),
        'status' => $p['status'] ?? 'ativo',
        'casas' => isset($p['casas']) ? (int) $p['casas'] : null,
    ];
}

function plano_padrao_id(): ?int
{
    $row = db()->query("SELECT id FROM planos WHERE status = 'ativo' ORDER BY id ASC LIMIT 1")->fetch();
    return $row ? (int) $row['id'] : null;
}

function garantir_planos(): void
{
    $n = (int) db()->query('SELECT COUNT(*) n FROM planos')->fetch()['n'];
    if ($n > 0) {
        $pid = plano_padrao_id();
        if ($pid) {
            db()->prepare('UPDATE estabelecimentos SET plano_id = ? WHERE plano_id IS NULL')->execute([$pid]);
        }
        return;
    }
    $ins = db()->prepare('INSERT INTO planos (nome, descricao, preco, menus_json, a_mostra, status) VALUES (?,?,?,?,?,?)');
    $ins->execute([
        'Completo',
        'Todos os menus da casa. Bom para quem já opera a Saideira no dia a dia.',
        null,
        json_encode(menus_casa_catalogo()),
        1,
        'ativo',
    ]);
    $completo = (int) db()->lastInsertId();
    $ins->execute([
        'Essencial',
        'QR, clientes, Saideiras e o básico. Sem campanhas nem inteligência.',
        null,
        json_encode(sanitizar_menus_casa(['dashboard', 'clientes', 'registrar', 'atender', 'saideras', 'config', 'planos'])),
        1,
        'ativo',
    ]);
    if ($completo) {
        db()->prepare('UPDATE estabelecimentos SET plano_id = ? WHERE plano_id IS NULL')->execute([$completo]);
    }
}

function garantir_plano_cobrancas(): void
{
    db()->exec('CREATE TABLE IF NOT EXISTS plano_cobrancas (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      estabelecimento_id BIGINT UNSIGNED NOT NULL,
      plano_id BIGINT UNSIGNED NOT NULL,
      plano_de_id BIGINT UNSIGNED DEFAULT NULL,
      valor DECIMAL(10,2) NOT NULL,
      txid VARCHAR(25) NOT NULL,
      pix_payload TEXT NOT NULL,
      status ENUM("pendente","pago","cancelado") NOT NULL DEFAULT "pendente",
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      pago_em DATETIME DEFAULT NULL,
      KEY idx_cob_est (estabelecimento_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
}

function pix_crc16(string $s): string
{
    $crc = 0xFFFF;
    $len = strlen($s);
    for ($i = 0; $i < $len; $i++) {
        $crc ^= (ord($s[$i]) << 8);
        for ($j = 0; $j < 8; $j++) {
            if ($crc & 0x8000) $crc = (($crc << 1) ^ 0x1021) & 0xFFFF;
            else $crc = ($crc << 1) & 0xFFFF;
        }
    }
    return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
}

function pix_tlv(string $id, string $value): string
{
    return $id . str_pad((string) strlen($value), 2, '0', STR_PAD_LEFT) . $value;
}

function pix_ascii(string $s, int $max): string
{
    $map = [
        'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a', 'ä' => 'a',
        'é' => 'e', 'ê' => 'e', 'è' => 'e',
        'í' => 'i', 'ì' => 'i',
        'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ò' => 'o',
        'ú' => 'u', 'ù' => 'u', 'ü' => 'u',
        'ç' => 'c',
        'Á' => 'A', 'À' => 'A', 'Ã' => 'A', 'Â' => 'A',
        'É' => 'E', 'Ê' => 'E', 'Í' => 'I',
        'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O',
        'Ú' => 'U', 'Ç' => 'C',
    ];
    $s = strtr($s, $map);
    $s = preg_replace('/[^A-Za-z0-9 .\-\/]/', '', $s) ?? '';
    $s = trim(preg_replace('/\s+/', ' ', $s) ?? '');
    if ($s === '') $s = 'SAIDEIRA';
    return substr($s, 0, $max);
}

function pix_emv(string $chave, float $valor, string $nome, string $cidade, string $txid): string
{
    $chave = trim($chave);
    $txid = strtoupper(preg_replace('/[^A-Z0-9]/', '', $txid) ?: 'SDPLANO');
    $txid = substr($txid, 0, 25);
    $gui = pix_tlv('00', 'br.gov.bcb.pix') . pix_tlv('01', $chave);
    $payload = pix_tlv('00', '01')
        . pix_tlv('01', '11')
        . pix_tlv('26', $gui)
        . pix_tlv('52', '0000')
        . pix_tlv('53', '986');
    if ($valor > 0) {
        $payload .= pix_tlv('54', number_format($valor, 2, '.', ''));
    }
    $payload .= pix_tlv('58', 'BR')
        . pix_tlv('59', pix_ascii($nome, 25))
        . pix_tlv('60', pix_ascii($cidade, 15))
        . pix_tlv('62', pix_tlv('05', $txid))
        . '6304';
    return $payload . pix_crc16($payload);
}

function row_plano_cobranca(array $c): array
{
    return [
        'id' => pub('cob', $c['id']),
        'estabelecimentoId' => pub('est', $c['estabelecimento_id']),
        'planoId' => pub('pln', $c['plano_id']),
        'planoDeId' => !empty($c['plano_de_id']) ? pub('pln', $c['plano_de_id']) : null,
        'valor' => (float) $c['valor'],
        'txid' => $c['txid'],
        'pix' => $c['pix_payload'],
        'status' => $c['status'],
        'criadoEm' => iso($c['criado_em']),
        'pagoEm' => !empty($c['pago_em']) ? iso($c['pago_em']) : null,
    ];
}

function cancelar_cobrancas_pendentes(int $eid, ?int $exceto = null): void
{
    try {
        if ($exceto) {
            db()->prepare("UPDATE plano_cobrancas SET status = 'cancelado' WHERE estabelecimento_id = ? AND status = 'pendente' AND id <> ?")
                ->execute([$eid, $exceto]);
            return;
        }
        db()->prepare("UPDATE plano_cobrancas SET status = 'cancelado' WHERE estabelecimento_id = ? AND status = 'pendente'")
            ->execute([$eid]);
    } catch (Throwable $e) {
    }
}

function listar_cobrancas_plano(?int $eid = null): array
{
    try {
        garantir_plano_cobrancas();
        if ($eid) {
            $st = db()->prepare('SELECT * FROM plano_cobrancas WHERE estabelecimento_id = ? ORDER BY criado_em DESC LIMIT 30');
            $st->execute([$eid]);
            return array_map('row_plano_cobranca', $st->fetchAll());
        }
        return array_map('row_plano_cobranca', db()->query('SELECT * FROM plano_cobrancas ORDER BY criado_em DESC LIMIT 80')->fetchAll());
    } catch (Throwable $e) {
        return [];
    }
}
