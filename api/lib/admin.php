<?php

function admin_count(string $sql, array $args = []): int
{
    $st = db()->prepare($sql);
    $st->execute($args);
    return (int) $st->fetchColumn();
}

function admin_contagens(): array
{
    return [
        'estabelecimentos' => admin_count('SELECT COUNT(*) FROM estabelecimentos'),
        'estabelecimentosAtivos' => admin_count("SELECT COUNT(*) FROM estabelecimentos WHERE status = 'ativo'"),
        'clientes' => admin_count('SELECT COUNT(*) FROM clientes'),
        'usuarios' => admin_count('SELECT COUNT(*) FROM usuarios WHERE ativo = 1'),
        'parceiros' => admin_count('SELECT COUNT(*) FROM parceiros'),
        'campanhas' => admin_count('SELECT COUNT(*) FROM campanhas'),
        'campanhasPendentes' => admin_count("SELECT COUNT(*) FROM campanhas WHERE status = 'solicitada' OR (status = 'ativa' AND disparada = 0)"),
        'tampas' => admin_count('SELECT COALESCE(SUM(quantidade),0) FROM consumos'),
        'progressos' => admin_count('SELECT COUNT(*) FROM progresso_tampas'),
        'saideras' => admin_count('SELECT COUNT(*) FROM saideras'),
        'saiderasDisponiveis' => admin_count("SELECT COUNT(*) FROM saideras WHERE status = 'disponivel'"),
        'saiderasUsadas' => admin_count("SELECT COUNT(*) FROM saideras WHERE status = 'utilizada'"),
        'saiderasExpiradas' => admin_count("SELECT COUNT(*) FROM saideras WHERE status = 'expirada'"),
        'funcionarios' => admin_count('SELECT COUNT(*) FROM funcionarios'),
        'bebidas' => admin_count('SELECT COUNT(*) FROM bebidas'),
    ];
}

function admin_semana(): array
{
    $labels = [];
    $values = [];
    for ($i = 6; $i >= 0; $i--) {
        $d = (new DateTimeImmutable("-$i days"))->format('Y-m-d');
        $labels[] = (new DateTimeImmutable($d))->format('d/m');
        $values[] = admin_count('SELECT COALESCE(SUM(quantidade),0) FROM consumos WHERE DATE(criado_em) = ?', [$d]);
    }
    return ['labels' => $labels, 'values' => $values];
}

function admin_bairros(): array
{
    $rows = db()->query("SELECT COALESCE(NULLIF(e.bairro,''), 'Sem bairro') bairro, COUNT(*) n
        FROM saideras s JOIN estabelecimentos e ON e.id = s.estabelecimento_id
        GROUP BY bairro ORDER BY n DESC LIMIT 8")->fetchAll();
    $max = max(1, ...array_map(fn($r) => (int) $r['n'], $rows ?: [['n' => 1]]));
    return array_map(fn($r) => [
        'nome' => $r['bairro'],
        'n' => (int) $r['n'],
        'pct' => (int) round(((int) $r['n'] / $max) * 100),
    ], $rows);
}

function admin_mapa_est(): array
{
    $out = [];
    $cli = db()->query('SELECT estabelecimento_id, COUNT(DISTINCT cliente_id) n FROM (
        SELECT estabelecimento_id, cliente_id FROM progresso_tampas
        UNION SELECT estabelecimento_id, cliente_id FROM consumos
        UNION SELECT estabelecimento_id, cliente_id FROM saideras
    ) x GROUP BY estabelecimento_id')->fetchAll();
    foreach ($cli as $r) $out[(int) $r['estabelecimento_id']]['clientes'] = (int) $r['n'];
    foreach (db()->query('SELECT estabelecimento_id, COALESCE(SUM(atual),0) n FROM progresso_tampas GROUP BY estabelecimento_id')->fetchAll() as $r) {
        $out[(int) $r['estabelecimento_id']]['tampas'] = (int) $r['n'];
    }
    foreach (db()->query('SELECT estabelecimento_id, COUNT(*) n FROM saideras GROUP BY estabelecimento_id')->fetchAll() as $r) {
        $out[(int) $r['estabelecimento_id']]['saideras'] = (int) $r['n'];
    }
    foreach (db()->query('SELECT estabelecimento_id, COUNT(*) n FROM funcionarios GROUP BY estabelecimento_id')->fetchAll() as $r) {
        $out[(int) $r['estabelecimento_id']]['funcionarios'] = (int) $r['n'];
    }
    return $out;
}

function ids_clientes_audiencia(array $f): array
{
    $sql = 'SELECT DISTINCT c.id FROM clientes c JOIN usuarios u ON u.id = c.usuario_id WHERE u.ativo = 1';
    $args = [];
    if (!empty($f['bairros']) && is_array($f['bairros'])) {
        $ph = implode(',', array_fill(0, count($f['bairros']), '?'));
        $sql .= " AND c.bairro IN ($ph)";
        $args = array_merge($args, $f['bairros']);
    }
    $precisaJoin = !empty($f['ests']) || !empty($f['bebidaId']) || !empty($f['dias']);
    if ($precisaJoin) {
        $sql .= ' AND c.id IN (SELECT cliente_id FROM consumos con WHERE 1=1';
        if (!empty($f['ests']) && is_array($f['ests'])) {
            $ph = implode(',', array_fill(0, count($f['ests']), '?'));
            $sql .= " AND con.estabelecimento_id IN ($ph)";
            $args = array_merge($args, $f['ests']);
        }
        if (!empty($f['bebidaId'])) {
            $sql .= ' AND con.bebida_id = ?';
            $args[] = (int) $f['bebidaId'];
        }
        if (!empty($f['dias'])) {
            $sql .= ' AND con.criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            $args[] = (int) $f['dias'];
        }
        $sql .= ')';
    }
    $st = db()->prepare($sql);
    $st->execute($args);
    return array_map(fn($r) => (int) $r['id'], $st->fetchAll());
}

function ids_clientes_campanha(array $cam): array
{
    if (!empty($cam['cliente_ids_json'])) {
        $raw = json_decode($cam['cliente_ids_json'], true) ?: [];
        $ids = [];
        foreach ($raw as $id) {
            $n = nid('cli', is_string($id) ? $id : (string) $id);
            if ($n) $ids[] = $n;
        }
        return array_values(array_unique($ids));
    }
    $ests = [];
    if (!empty($cam['estabelecimento_id'])) $ests[] = (int) $cam['estabelecimento_id'];
    $lig = db()->prepare('SELECT estabelecimento_id FROM campanha_estabelecimentos WHERE campanha_id = ?');
    $lig->execute([$cam['id']]);
    foreach ($lig->fetchAll() as $r) $ests[] = (int) $r['estabelecimento_id'];
    $ests = array_values(array_unique($ests));

    $sql = 'SELECT c.id, c.nascimento, c.ultima_visita FROM clientes c JOIN usuarios u ON u.id = c.usuario_id WHERE u.ativo = 1';
    $args = [];
    if ($ests) {
        $ph = implode(',', array_fill(0, count($ests), '?'));
        $sql .= " AND c.id IN (
            SELECT cliente_id FROM progresso_tampas WHERE estabelecimento_id IN ($ph)
            UNION SELECT cliente_id FROM consumos WHERE estabelecimento_id IN ($ph)
            UNION SELECT cliente_id FROM saideras WHERE estabelecimento_id IN ($ph)
        )";
        $args = array_merge($args, $ests, $ests, $ests);
    }
    $st = db()->prepare($sql);
    $st->execute($args);
    $rows = $st->fetchAll();
    $publico = $cam['publico'] ?? 'todos';
    $hojeMes = (int) date('n');
    $corte = (new DateTimeImmutable('-30 days'))->format('Y-m-d H:i:s');
    $quase = [];
    if ($publico === 'quase' && $ests) {
        $ph = implode(',', array_fill(0, count($ests), '?'));
        $q = db()->prepare("SELECT cliente_id FROM progresso_tampas WHERE estabelecimento_id IN ($ph) AND atual > 0 AND (meta - atual) <= 2");
        $q->execute($ests);
        $quase = array_map(fn($r) => (int) $r['cliente_id'], $q->fetchAll());
    }
    $ids = [];
    foreach ($rows as $c) {
        $id = (int) $c['id'];
        if ($publico === 'aniversario') {
            if (!$c['nascimento'] || (int) date('n', strtotime($c['nascimento'])) !== $hojeMes) continue;
        } elseif ($publico === 'inativos') {
            if ($c['ultima_visita'] && $c['ultima_visita'] >= $corte) continue;
        } elseif ($publico === 'quase') {
            if (!in_array($id, $quase, true)) continue;
        }
        $ids[] = $id;
    }
    if (!empty($cam['limite'])) $ids = array_slice($ids, 0, (int) $cam['limite']);
    return $ids;
}

function disparar_campanha(int $cid, ?string $canal = null): int
{
    $st = db()->prepare('SELECT * FROM campanhas WHERE id = ?');
    $st->execute([$cid]);
    $cam = $st->fetch();
    if (!$cam) throw new RuntimeException('Campanha não encontrada.', 404);
    $ids = ids_clientes_campanha($cam);
    $titulo = $cam['titulo'];
    $texto = $cam['mensagem'] ?: $cam['titulo'];
    foreach ($ids as $cli) {
        notificar($cli, $titulo, $texto, 'campanha', $cid);
    }
    if ($canal) {
        db()->prepare("UPDATE campanhas SET status = 'ativa', disparada = 1, canal = ?, publico_potencial = ?, participantes = ? WHERE id = ?")
            ->execute([$canal, count($ids), count($ids), $cid]);
    } else {
        db()->prepare("UPDATE campanhas SET status = 'ativa', disparada = 1, publico_potencial = ?, participantes = ? WHERE id = ?")
            ->execute([count($ids), count($ids), $cid]);
    }
    auditar('Campanha disparada', $titulo . ' · ' . count($ids) . ' destinatários');
    return count($ids);
}

function admin_ok_store($extra = []): void
{
    ok($extra + ['store' => bootstrap_store(auth_user())]);
}
