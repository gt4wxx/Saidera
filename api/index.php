<?php
declare(strict_types=1);

header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

require_once __DIR__ . '/lib/app.php';

$path = $_GET['r'] ?? '';
if ($path === 'health') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'data' => [
        'php' => PHP_VERSION,
        'instalado' => saidera_instalado(),
    ]], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!saidera_app()) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode(['ok' => false, 'erro' => 'Instale o Saidera em /instalar.php', 'instalar' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

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
    $code = (int) $e->getCode();
    if ($code < 400 || $code > 599) $code = 500;
    fail($e->getMessage(), $code);
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
        $prefs = is_array($prefs) ? $prefs : [];
        foreach (['push', 'email', 'whatsapp', 'perfilPublico'] as $k) {
            if (array_key_exists($k, $in)) $prefs[$k] = filter_var($in[$k], FILTER_VALIDATE_BOOLEAN);
        }
        $fav = array_key_exists('bebidaFavoritaId', $in) ? nid('beb', $in['bebidaFavoritaId'] ?? '') : false;
        if ($fav) $prefs['bebidaFavoritaId'] = pub('beb', $fav);
        if ($fav === null || $fav === 0) unset($prefs['bebidaFavoritaId']);
        $favSql = $fav ? $fav : (array_key_exists('bebidaFavoritaId', $in) ? null : false);
        if ($favSql === false) {
            db()->prepare('UPDATE clientes SET prefs_json = ? WHERE id = ?')->execute([json_encode($prefs), $cli['id']]);
        } else {
            db()->prepare('UPDATE clientes SET prefs_json = ?, bebida_favorita_id = ? WHERE id = ?')
                ->execute([json_encode($prefs), $favSql, $cli['id']]);
        }
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'perfil' && $method === 'POST') {
        $u = auth_require(['cliente']);
        $cli = cliente_por_usuario((int) $u['id']);
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe o seu nome.');
        $partes = preg_split('/\s+/', $nome);
        $primeiro = $partes[0] ?: $nome;
        $nasc = br_para_sql($in['nascimento'] ?? '');
        db()->prepare('UPDATE clientes SET nome = ?, primeiro_nome = ?, telefone = ?, nascimento = ?, cidade = ?, bairro = ? WHERE id = ?')
            ->execute([
                $nome,
                $primeiro,
                trim($in['telefone'] ?? '') ?: null,
                $nasc,
                trim($in['cidade'] ?? '') ?: $cli['cidade'],
                trim($in['bairro'] ?? '') ?: $cli['bairro'],
                $cli['id'],
            ]);
        if (!empty($in['novaSenha'])) {
            if (strlen($in['novaSenha']) < 6) fail('A nova senha precisa ter pelo menos 6 caracteres.');
            if (empty($in['senhaAtual']) || !password_verify($in['senhaAtual'], $u['senha_hash'])) {
                fail('A senha atual não confere.');
            }
            db()->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')
                ->execute([password_hash($in['novaSenha'], PASSWORD_DEFAULT), $u['id']]);
        }
        auditar('Cliente atualizou o perfil', $nome);
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'perfil/foto' && $method === 'POST') {
        $u = auth_require(['cliente']);
        $cli = cliente_por_usuario((int) $u['id']);
        salvar_avatar_cliente((int) $cli['id'], (string) ($in['dataUrl'] ?? ''));
        auditar('Cliente atualizou a foto', $cli['codigo'] ?? '');
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'campanhas/aderir' && $method === 'POST') {
        $u = auth_require(['cliente']);
        $cli = cliente_por_usuario((int) $u['id']);
        $camId = nid('cam', $in['campanhaId'] ?? '');
        $st = db()->prepare('SELECT * FROM campanhas WHERE id = ? AND status = "ativa" AND disparada = 1');
        $st->execute([$camId]);
        $cam = $st->fetch();
        if (!$cam) fail('Esta oferta não está ativa.');
        $ins = db()->prepare('INSERT IGNORE INTO campanha_adesoes (campanha_id, cliente_id) VALUES (?, ?)');
        $ins->execute([$camId, $cli['id']]);
        if ($ins->rowCount()) {
            db()->prepare('UPDATE campanhas SET participantes = participantes + 1 WHERE id = ?')->execute([$camId]);
        }
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'estabelecimentos' && $method === 'POST') {
        auth_require(['admin']);
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe o nome da casa.');
        if (empty($in['email']) || empty($in['senha'])) fail('Informe e-mail e senha do gestor.');
        $end = aplicar_endereco_casa($in, null, true);
        db()->prepare('INSERT INTO estabelecimentos (nome, tipo, bairro, endereco, cep, logradouro, numero, complemento, cidade, uf, lat, lng, horario, meta_padrao) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([
                $nome,
                in_array($in['tipo'] ?? '', ['bar', 'restaurante'], true) ? $in['tipo'] : 'bar',
                $end['bairro'],
                $end['endereco'],
                $end['cep'],
                $end['logradouro'],
                $end['numero'],
                $end['complemento'],
                $end['cidade'],
                $end['uf'],
                $end['lat'],
                $end['lng'],
                $in['horario'] ?: null,
                max(1, (int) ($in['metaPadrao'] ?? 10)),
            ]);
        $eid = (int) db()->lastInsertId();
        $pid = plano_padrao_id();
        if ($pid) db()->prepare('UPDATE estabelecimentos SET plano_id = ? WHERE id = ?')->execute([$pid, $eid]);
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
        $uid = auth_criar($in['email'], $in['senha'], 'estabelecimento');
        db()->prepare('INSERT INTO estabelecimento_gestores (usuario_id, estabelecimento_id) VALUES (?,?)')->execute([$uid, $eid]);
        auditar('Novo estabelecimento', $nome);
        ok(['id' => pub('est', $eid), 'store' => bootstrap_store(auth_user())], 201);
    }

    if ($path === 'estabelecimentos/salvar' && $method === 'POST') {
        $u = auth_require(['estabelecimento', 'admin']);
        $eid = nid('est', $in['id'] ?? '') ?: gestor_est_id((int) $u['id']);
        $cur = db()->prepare('SELECT * FROM estabelecimentos WHERE id = ?');
        $cur->execute([$eid]);
        $row = $cur->fetch();
        if (!$row) fail('Estabelecimento não encontrado.');
        $tipo = in_array($in['tipo'] ?? '', ['bar', 'restaurante'], true) ? $in['tipo'] : $row['tipo'];
        if ($u['papel'] === 'estabelecimento' && $eid !== gestor_est_id((int) $u['id'])) fail('Esta casa não é a sua.', 403);
        $status = $u['papel'] === 'admin' && isset($in['status'])
            ? (($in['status'] === 'inativo') ? 'inativo' : 'ativo')
            : $row['status'];
        $end = aplicar_endereco_casa($in, $row, false);
        if (array_key_exists('promocao', $in)) {
            db()->prepare('UPDATE estabelecimentos SET promocao = ? WHERE id = ?')->execute([trim((string) $in['promocao']) ?: null, $eid]);
        }
        if ($u['papel'] === 'estabelecimento' && !empty($in['novaSenha'])) {
            if (strlen($in['novaSenha']) < 6) fail('A nova senha precisa ter pelo menos 6 caracteres.');
            db()->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')->execute([password_hash($in['novaSenha'], PASSWORD_DEFAULT), $u['id']]);
        }
        db()->prepare('UPDATE estabelecimentos SET nome = ?, tipo = ?, bairro = ?, meta_padrao = ?, horario = ?, endereco = ?, cep = ?, logradouro = ?, numero = ?, complemento = ?, cidade = ?, uf = ?, lat = ?, lng = ?, status = ? WHERE id = ?')
            ->execute([
                trim($in['nome'] ?? $row['nome']),
                $tipo,
                $end['bairro'] ?: $row['bairro'],
                max(1, (int) ($in['metaPadrao'] ?? $row['meta_padrao'])),
                array_key_exists('horario', $in) ? ($in['horario'] ?: null) : $row['horario'],
                $end['endereco'],
                $end['cep'],
                $end['logradouro'],
                $end['numero'],
                $end['complemento'],
                $end['cidade'],
                $end['uf'],
                $end['lat'],
                $end['lng'],
                $status,
                $eid,
            ]);
        auditar('Estabelecimento atualizado', $in['nome'] ?? $row['nome']);
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
        if (!$eid) fail('Informe o estabelecimento.');
        if (strlen(trim($in['nome'] ?? '')) < 2) fail('Informe o nome do funcionário.');
        $uid = auth_criar($in['email'] ?? '', $in['senha'] ?? '', 'funcionario');
        db()->prepare('INSERT INTO funcionarios (usuario_id, estabelecimento_id, nome, cargo) VALUES (?,?,?,?)')
            ->execute([$uid, $eid, trim($in['nome'] ?? ''), $in['cargo'] ?? 'Garçom']);
        auditar('Novo funcionário', $in['nome'] ?? '');
        ok(['store' => bootstrap_store($u)], 201);
    }

    if ($path === 'parceiros' && $method === 'POST') {
        auth_require(['admin']);
        if (strlen(trim($in['nome'] ?? '')) < 2) fail('Informe o nome do parceiro.');
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
        if ($u['papel'] === 'admin') {
            $origem = !empty($in['parceiroId']) ? 'parceiro' : 'estabelecimento';
        }
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
        if (!$cid) fail('Campanha não encontrada.');
        $n = disparar_campanha($cid, $in['canal'] ?? null);
        ok(['enviados' => $n, 'store' => bootstrap_store(auth_user())]);
    }

    if ($path === 'config' && $method === 'POST') {
        $u = auth_require(['admin']);
        if (isset($in['cidade'])) cfg_set('cidade', trim($in['cidade']));
        if (isset($in['metaPadraoRede'])) cfg_set('meta_padrao_rede', (string) max(1, (int) $in['metaPadraoRede']));
        if (isset($in['validadeSaideraDias'])) cfg_set('validade_saidera_dias', (string) max(1, (int) $in['validadeSaideraDias']));
        if (isset($in['suporteWhatsapp'])) cfg_set('suporte_whatsapp', trim((string) $in['suporteWhatsapp']));
        if (isset($in['suporteEmail'])) cfg_set('suporte_email', trim((string) $in['suporteEmail']));
        if (array_key_exists('msgPlanoBloqueado', $in)) {
            $msg = trim((string) $in['msgPlanoBloqueado']);
            if (function_exists('mb_substr')) $msg = mb_substr($msg, 0, 80);
            else $msg = substr($msg, 0, 80);
            cfg_set('msg_plano_bloqueado', $msg !== '' ? $msg : 'Indisponível');
        }
        if (!empty($in['novaSenha'])) {
            if (strlen($in['novaSenha']) < 6) fail('A nova senha precisa ter pelo menos 6 caracteres.');
            db()->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')->execute([password_hash($in['novaSenha'], PASSWORD_DEFAULT), $u['id']]);
        }
        auditar('Configurações', $in['cidade'] ?? '');
        ok(['store' => bootstrap_store(auth_user())]);
    }

    if ($path === 'planos/escolher' && $method === 'POST') {
        $u = auth_require(['estabelecimento']);
        $eid = gestor_est_id((int) $u['id']);
        $pid = nid('pln', $in['planoId'] ?? '');
        $st = db()->prepare("SELECT * FROM planos WHERE id = ? AND status = 'ativo' AND a_mostra = 1");
        $st->execute([$pid]);
        $p = $st->fetch();
        if (!$p) fail('Este plano não está à mostra ou não está ativo.');
        db()->prepare('UPDATE estabelecimentos SET plano_id = ? WHERE id = ?')->execute([$pid, $eid]);
        auditar('Casa escolheu plano', $p['nome']);
        ok(['store' => bootstrap_store($u)]);
    }

    if (admin_rota($method, $path, $in)) return;

    fail('Rota não encontrada.', 404);
}
