<?php
declare(strict_types=1);

header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

$config = __DIR__ . '/config.php';
if (!is_file($config)) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode(['ok' => false, 'erro' => 'Instale o Saidera em /instalar.php', 'instalar' => true]);
    exit;
}

require $config;
require __DIR__ . '/lib/http.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/domain.php';
require __DIR__ . '/lib/bootstrap.php';

$path = $_GET['r'] ?? '';
if (!$path) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
    $path = preg_replace('#^.*?/api(?:/index\.php)?/?#', '', $uri);
}
$path = trim((string) $path, '/');
$method = $_SERVER['REQUEST_METHOD'];

try {
    rota($method, $path);
} catch (Throwable $e) {
    fail($e->getMessage(), 500);
}

function rota(string $method, string $path): void
{
    $in = $method === 'GET' ? $_GET : array_merge($_GET, json_in());

    if ($path === 'auth/login' && $method === 'POST') {
        $u = auth_login($in['email'] ?? '', $in['senha'] ?? '');
        ok(session_payload($u));
    }
    if ($path === 'auth/logout' && $method === 'POST') {
        auth_logout();
        ok(['ok' => true]);
    }
    if ($path === 'auth/registrar-cliente' && $method === 'POST') {
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe seu nome.');
        $uid = auth_criar($in['email'] ?? '', $in['senha'] ?? '', 'cliente');
        $primeiro = explode(' ', $nome)[0];
        $codigo = codigo_unico('SDR', 'clientes');
        db()->prepare('INSERT INTO clientes (usuario_id, codigo, nome, primeiro_nome, telefone, nascimento, cidade, bairro, cliente_desde) VALUES (?,?,?,?,?,?,?,?,CURDATE())')
            ->execute([
                $uid, $codigo, $nome, $primeiro,
                $in['telefone'] ?? null,
                !empty($in['nascimento']) ? $in['nascimento'] : null,
                $in['cidade'] ?? null,
                $in['bairro'] ?? null,
            ]);
        $u = auth_login($in['email'], $in['senha']);
        auditar('Novo cliente', $nome);
        ok(session_payload($u), 201);
    }
    if ($path === 'me' && $method === 'GET') {
        $u = auth_require();
        ok(session_payload($u));
    }
    if ($path === 'bootstrap' && $method === 'GET') {
        $u = auth_require();
        ok(bootstrap_store($u));
    }

    if ($path === 'clientes/codigo' && $method === 'GET') {
        auth_require(['funcionario', 'estabelecimento', 'admin']);
        $c = cliente_por_codigo($in['q'] ?? '');
        if (!$c) fail('Cliente não encontrado.');
        $st = db()->prepare('SELECT email FROM usuarios WHERE id = ?');
        $st->execute([$c['usuario_id']]);
        $c['email'] = $st->fetch()['email'] ?? '';
        ok(row_cliente($c));
    }

    if ($path === 'consumos' && $method === 'POST') {
        $u = auth_require(['funcionario', 'estabelecimento', 'admin']);
        $cli = nid('cli', $in['clienteId'] ?? '');
        $est = nid('est', $in['estabelecimentoId'] ?? '');
        $beb = nid('beb', $in['bebidaId'] ?? '');
        if (!$cli || !$est || !$beb) fail('Dados incompletos.');
        $fun = nid('fun', $in['funcionarioId'] ?? '') ?: (funcionario_por_usuario((int) $u['id'])['id'] ?? null);
        $res = registrar_consumo($cli, $est, $beb, (int) ($in['quantidade'] ?? 1), $fun ? (int) $fun : null);
        ok(['resultado' => $res, 'store' => bootstrap_store($u)]);
    }

    if ($path === 'tickets' && $method === 'POST') {
        $u = auth_require(['estabelecimento', 'admin']);
        $est = nid('est', $in['estabelecimentoId'] ?? '') ?: gestor_est_id((int) $u['id']);
        if (!$est) fail('Estabelecimento não encontrado.');
        $t = criar_ticket((int) $est, $in['itens'] ?? []);
        ok(['ticket' => $t, 'store' => bootstrap_store($u)]);
    }

    if ($path === 'tickets/resgatar' && $method === 'POST') {
        $u = auth_require(['cliente']);
        $cli = cliente_por_usuario((int) $u['id']);
        $res = resgatar_ticket($in['codigo'] ?? '', (int) $cli['id']);
        ok($res + ['store' => bootstrap_store($u)]);
    }

    if ($path === 'saideras/entregar' && $method === 'POST') {
        $u = auth_require(['funcionario', 'estabelecimento', 'admin']);
        $est = nid('est', $in['estabelecimentoId'] ?? '');
        if (!$est && $u['papel'] === 'estabelecimento') $est = gestor_est_id((int) $u['id']);
        if (!$est && $u['papel'] === 'funcionario') {
            $f = funcionario_por_usuario((int) $u['id']);
            $est = $f['estabelecimento_id'] ?? null;
        }
        $fun = nid('fun', $in['funcionarioId'] ?? '') ?: (funcionario_por_usuario((int) $u['id'])['id'] ?? null);
        if (!empty($in['saideraId'])) {
            $sid = nid('sai', $in['saideraId']);
            $res = entregar_saidera((int) $sid, $fun ? (int) $fun : null);
        } else {
            $res = entregar_saidera_codigo($in['codigo'] ?? '', (int) $est, $fun ? (int) $fun : null);
        }
        ok(['saidera' => $res, 'store' => bootstrap_store($u)]);
    }

    if ($path === 'notificacoes/ler' && $method === 'POST') {
        $u = auth_require(['cliente']);
        $cli = cliente_por_usuario((int) $u['id']);
        db()->prepare('UPDATE notificacoes SET lida = 1 WHERE cliente_id = ?')->execute([$cli['id']]);
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'prefs' && $method === 'POST') {
        $u = auth_require(['cliente']);
        $cli = cliente_por_usuario((int) $u['id']);
        $prefs = $cli['prefs_json'] ? json_decode($cli['prefs_json'], true) : [];
        $prefs = array_merge($prefs ?: [], $in);
        $fav = nid('beb', $in['bebidaFavoritaId'] ?? '');
        db()->prepare('UPDATE clientes SET prefs_json = ?, bebida_favorita_id = COALESCE(?, bebida_favorita_id) WHERE id = ?')
            ->execute([json_encode($prefs), $fav, $cli['id']]);
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'estabelecimentos' && $method === 'POST') {
        auth_require(['admin']);
        db()->prepare('INSERT INTO estabelecimentos (nome, tipo, bairro, endereco, horario, meta_padrao) VALUES (?,?,?,?,?,?)')
            ->execute([
                trim($in['nome'] ?? ''),
                $in['tipo'] ?? 'bar',
                $in['bairro'] ?? null,
                $in['endereco'] ?? null,
                $in['horario'] ?? null,
                (int) ($in['metaPadrao'] ?? 10),
            ]);
        $eid = (int) db()->lastInsertId();
        foreach (['Heineken', 'Budweiser', 'Brahma', 'Coca-Cola'] as $nomeBeb) {
            $st = db()->prepare('SELECT id FROM bebidas WHERE nome = ?');
            $st->execute([$nomeBeb]);
            $b = $st->fetch();
            if (!$b) {
                db()->prepare('INSERT INTO bebidas (nome, tipo) VALUES (?, ?)')->execute([$nomeBeb, $nomeBeb === 'Coca-Cola' ? 'nao-alcoolico' : 'cerveja']);
                $bid = (int) db()->lastInsertId();
            } else {
                $bid = (int) $b['id'];
            }
            db()->prepare('INSERT IGNORE INTO estabelecimento_bebidas (estabelecimento_id, bebida_id, regra) VALUES (?, ?, ?)')
                ->execute([$eid, $bid, 'padrao']);
        }
        if (!empty($in['email']) && !empty($in['senha'])) {
            $uid = auth_criar($in['email'], $in['senha'], 'estabelecimento');
            db()->prepare('INSERT INTO estabelecimento_gestores (usuario_id, estabelecimento_id) VALUES (?,?)')->execute([$uid, $eid]);
        }
        auditar('Novo estabelecimento', $in['nome'] ?? '');
        ok(['id' => pub('est', $eid), 'store' => bootstrap_store(auth_user())], 201);
    }

    if ($path === 'estabelecimentos/salvar' && $method === 'POST') {
        $u = auth_require(['estabelecimento', 'admin']);
        $eid = nid('est', $in['id'] ?? '') ?: gestor_est_id((int) $u['id']);
        db()->prepare('UPDATE estabelecimentos SET nome = ?, bairro = ?, meta_padrao = ?, horario = ?, endereco = ? WHERE id = ?')
            ->execute([
                trim($in['nome'] ?? ''),
                $in['bairro'] ?? null,
                (int) ($in['metaPadrao'] ?? 10),
                $in['horario'] ?? null,
                $in['endereco'] ?? null,
                $eid,
            ]);
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'bebidas' && $method === 'POST') {
        $u = auth_require(['estabelecimento', 'admin']);
        $eid = nid('est', $in['estabelecimentoId'] ?? '') ?: gestor_est_id((int) $u['id']);
        db()->prepare('INSERT INTO bebidas (nome, tipo, marca) VALUES (?,?,?)')
            ->execute([trim($in['nome'] ?? 'Nova bebida'), $in['tipo'] ?? 'outros', $in['marca'] ?? 'Casa']);
        $bid = (int) db()->lastInsertId();
        db()->prepare('INSERT INTO estabelecimento_bebidas (estabelecimento_id, bebida_id, meta, regra) VALUES (?,?,?,?)')
            ->execute([$eid, $bid, $in['meta'] ?? null, !empty($in['meta']) ? 'propria' : 'padrao']);
        ok(['id' => pub('beb', $bid), 'store' => bootstrap_store($u)], 201);
    }

    if ($path === 'funcionarios' && $method === 'POST') {
        $u = auth_require(['estabelecimento', 'admin']);
        $eid = nid('est', $in['estabelecimentoId'] ?? '') ?: gestor_est_id((int) $u['id']);
        $uid = auth_criar($in['email'] ?? '', $in['senha'] ?? '', 'funcionario');
        db()->prepare('INSERT INTO funcionarios (usuario_id, estabelecimento_id, nome, cargo) VALUES (?,?,?,?)')
            ->execute([$uid, $eid, trim($in['nome'] ?? ''), $in['cargo'] ?? 'Garçom']);
        auditar('Novo funcionário', $in['nome'] ?? '');
        ok(['store' => bootstrap_store($u)], 201);
    }

    if ($path === 'parceiros' && $method === 'POST') {
        auth_require(['admin']);
        $uid = null;
        if (!empty($in['email']) && !empty($in['senha'])) {
            $uid = auth_criar($in['email'], $in['senha'], 'parceiro');
        }
        db()->prepare('INSERT INTO parceiros (usuario_id, nome, categoria, selo) VALUES (?,?,?,?)')
            ->execute([$uid, trim($in['nome'] ?? ''), $in['categoria'] ?? null, $in['selo'] ?? null]);
        ok(['id' => pub('par', db()->lastInsertId()), 'store' => bootstrap_store(auth_user())], 201);
    }

    if ($path === 'campanhas' && $method === 'POST') {
        $u = auth_require(['estabelecimento', 'parceiro', 'admin']);
        $origem = $u['papel'] === 'parceiro' ? 'parceiro' : 'estabelecimento';
        $eid = nid('est', $in['estabelecimentoId'] ?? '') ?: ($u['papel'] === 'estabelecimento' ? gestor_est_id((int) $u['id']) : null);
        $pid = nid('par', $in['parceiroId'] ?? '') ?: (parceiro_por_usuario((int) $u['id'])['id'] ?? null);
        db()->prepare('INSERT INTO campanhas (titulo, origem, estabelecimento_id, parceiro_id, status, tipo, publico, mensagem, meta_tampas, altera_meta, bebida_id, periodo_inicio, periodo_fim, canal, cliente_ids_json, limite) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([
                trim($in['titulo'] ?? 'Campanha'),
                $origem,
                $eid,
                $pid,
                'solicitada',
                $in['tipo'] ?? null,
                $in['publico'] ?? 'todos',
                $in['mensagem'] ?? '',
                $in['metaTampas'] ?? null,
                !empty($in['alteraMeta']) ? 1 : 0,
                nid('beb', $in['bebidaId'] ?? ''),
                parse_br_date($in['periodoInicio'] ?? null),
                parse_br_date($in['periodoFim'] ?? null),
                $in['canal'] ?? 'push',
                !empty($in['clienteIds']) ? json_encode($in['clienteIds']) : null,
                $in['limite'] ?? null,
            ]);
        $cid = (int) db()->lastInsertId();
        $ests = $in['estabelecimentos'] ?? ($eid ? [pub('est', $eid)] : []);
        $ins = db()->prepare('INSERT IGNORE INTO campanha_estabelecimentos (campanha_id, estabelecimento_id) VALUES (?,?)');
        foreach ($ests as $e) {
            $id = nid('est', is_string($e) ? $e : ($e['id'] ?? ''));
            if ($id) $ins->execute([$cid, $id]);
        }
        auditar('Solicitação de campanha', $in['titulo'] ?? '');
        ok(['id' => pub('cam', $cid), 'store' => bootstrap_store($u)], 201);
    }

    if ($path === 'campanhas/ativar' && $method === 'POST') {
        auth_require(['admin']);
        $cid = nid('cam', $in['id'] ?? '');
        db()->prepare("UPDATE campanhas SET status = 'ativa', disparada = 1 WHERE id = ?")->execute([$cid]);
        auditar('Campanha ativada', (string) $cid);
        ok(['store' => bootstrap_store(auth_user())]);
    }

    if ($path === 'config' && $method === 'POST') {
        auth_require(['admin']);
        if (isset($in['cidade'])) cfg_set('cidade', $in['cidade']);
        if (isset($in['metaPadraoRede'])) cfg_set('meta_padrao_rede', (string) (int) $in['metaPadraoRede']);
        auditar('Configurações', $in['cidade'] ?? '');
        ok(['store' => bootstrap_store(auth_user())]);
    }

    fail('Rota não encontrada.', 404);
}
