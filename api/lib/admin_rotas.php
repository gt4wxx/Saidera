<?php

function admin_rota(string $method, string $path, array $in): bool
{
    if ($method !== 'POST') return false;
    $u = null;

    if ($path === 'estabelecimentos/status') {
        auth_require(['admin']);
        $eid = nid('est', $in['id'] ?? '');
        if (!$eid) fail('Estabelecimento não encontrado.');
        $status = ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo';
        db()->prepare('UPDATE estabelecimentos SET status = ? WHERE id = ?')->execute([$status, $eid]);
        auditar($status === 'ativo' ? 'Casa reativada' : 'Casa desativada', (string) $eid);
        admin_ok_store();
    }

    if ($path === 'estabelecimentos/excluir') {
        auth_require(['admin']);
        $eid = nid('est', $in['id'] ?? '');
        if (!$eid) fail('Estabelecimento não encontrado.');
        db()->prepare("UPDATE estabelecimentos SET status = 'inativo' WHERE id = ?")->execute([$eid]);
        auditar('Casa desativada', (string) $eid);
        admin_ok_store();
    }

    if ($path === 'clientes') {
        auth_require(['admin']);
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe o nome do cliente.');
        $uid = auth_criar($in['email'] ?? '', $in['senha'] ?? '', 'cliente');
        $codigo = codigo_unico('SDR', 'clientes');
        db()->prepare('INSERT INTO clientes (usuario_id, codigo, nome, primeiro_nome, telefone, nascimento, cidade, bairro, cliente_desde) VALUES (?,?,?,?,?,?,?,?,CURDATE())')
            ->execute([
                $uid, $codigo, $nome, explode(' ', $nome)[0],
                $in['telefone'] ?: null,
                !empty($in['nascimento']) ? $in['nascimento'] : null,
                $in['cidade'] ?? cfg('cidade', 'Aracaju/SE'),
                $in['bairro'] ?: null,
            ]);
        auditar('Cliente criado pelo admin', $nome);
        admin_ok_store();
    }

    if ($path === 'clientes/salvar') {
        auth_require(['admin']);
        $cli = nid('cli', $in['id'] ?? '');
        if (!$cli) fail('Cliente não encontrado.');
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe o nome.');
        db()->prepare('UPDATE clientes SET nome = ?, primeiro_nome = ?, telefone = ?, nascimento = ?, cidade = ?, bairro = ?, bebida_favorita_id = ? WHERE id = ?')
            ->execute([
                $nome, explode(' ', $nome)[0],
                $in['telefone'] ?: null,
                !empty($in['nascimento']) ? $in['nascimento'] : null,
                $in['cidade'] ?: null,
                $in['bairro'] ?: null,
                nid('beb', $in['bebidaFavoritaId'] ?? ''),
                $cli,
            ]);
        if (!empty($in['email'])) {
            $st = db()->prepare('SELECT usuario_id FROM clientes WHERE id = ?');
            $st->execute([$cli]);
            $uid = (int) ($st->fetch()['usuario_id'] ?? 0);
            if ($uid) {
                db()->prepare('UPDATE usuarios SET email = ? WHERE id = ?')->execute([strtolower(trim($in['email'])), $uid]);
            }
        }
        if (!empty($in['senha'])) {
            $st = db()->prepare('SELECT usuario_id FROM clientes WHERE id = ?');
            $st->execute([$cli]);
            $uid = (int) ($st->fetch()['usuario_id'] ?? 0);
            if ($uid) {
                if (strlen($in['senha']) < 6) fail('A senha precisa ter pelo menos 6 caracteres.');
                db()->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')->execute([password_hash($in['senha'], PASSWORD_DEFAULT), $uid]);
            }
        }
        auditar('Cliente atualizado', $nome);
        admin_ok_store();
    }

    if ($path === 'clientes/status') {
        auth_require(['admin']);
        $cli = nid('cli', $in['id'] ?? '');
        if (!$cli) fail('Cliente não encontrado.');
        $ativo = ($in['status'] ?? '') === 'inativo' ? 0 : 1;
        $st = db()->prepare('SELECT usuario_id, nome FROM clientes WHERE id = ?');
        $st->execute([$cli]);
        $c = $st->fetch();
        if (!$c) fail('Cliente não encontrado.');
        db()->prepare('UPDATE usuarios SET ativo = ? WHERE id = ?')->execute([$ativo, $c['usuario_id']]);
        auditar($ativo ? 'Cliente reativado' : 'Cliente desativado', $c['nome']);
        admin_ok_store();
    }

    if ($path === 'parceiros/salvar') {
        auth_require(['admin']);
        $pid = nid('par', $in['id'] ?? '');
        if (!$pid) fail('Parceiro não encontrado.');
        db()->prepare('UPDATE parceiros SET nome = ?, categoria = ?, selo = ?, status = ? WHERE id = ?')
            ->execute([
                trim($in['nome'] ?? ''),
                $in['categoria'] ?: null,
                $in['selo'] ?: null,
                ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo',
                $pid,
            ]);
        if (!empty($in['senha']) || !empty($in['email'])) {
            $st = db()->prepare('SELECT usuario_id FROM parceiros WHERE id = ?');
            $st->execute([$pid]);
            $uid = $st->fetch()['usuario_id'] ?? null;
            if ($uid && !empty($in['email'])) {
                db()->prepare('UPDATE usuarios SET email = ? WHERE id = ?')->execute([strtolower(trim($in['email'])), $uid]);
            }
            if ($uid && !empty($in['senha'])) {
                if (strlen($in['senha']) < 6) fail('A senha precisa ter pelo menos 6 caracteres.');
                db()->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')->execute([password_hash($in['senha'], PASSWORD_DEFAULT), $uid]);
            }
        }
        auditar('Parceiro atualizado', $in['nome'] ?? '');
        admin_ok_store();
    }

    if ($path === 'parceiros/status') {
        auth_require(['admin']);
        $pid = nid('par', $in['id'] ?? '');
        if (!$pid) fail('Parceiro não encontrado.');
        $status = ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo';
        db()->prepare('UPDATE parceiros SET status = ? WHERE id = ?')->execute([$status, $pid]);
        auditar($status === 'ativo' ? 'Parceiro reativado' : 'Parceiro desativado', (string) $pid);
        admin_ok_store();
    }

    if ($path === 'funcionarios/salvar') {
        $u = auth_require(['estabelecimento', 'admin']);
        $fid = nid('fun', $in['id'] ?? '');
        if (!$fid) fail('Funcionário não encontrado.');
        db()->prepare('UPDATE funcionarios SET nome = ?, cargo = ?, status = ? WHERE id = ?')
            ->execute([trim($in['nome'] ?? ''), $in['cargo'] ?? 'Garçom', ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo', $fid]);
        if (!empty($in['senha'])) {
            $st = db()->prepare('SELECT usuario_id FROM funcionarios WHERE id = ?');
            $st->execute([$fid]);
            $uid = (int) ($st->fetch()['usuario_id'] ?? 0);
            if ($uid) {
                if (strlen($in['senha']) < 6) fail('A senha precisa ter pelo menos 6 caracteres.');
                db()->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')->execute([password_hash($in['senha'], PASSWORD_DEFAULT), $uid]);
            }
        }
        auditar('Funcionário atualizado', $in['nome'] ?? '');
        admin_ok_store();
    }

    if ($path === 'funcionarios/status') {
        auth_require(['estabelecimento', 'admin']);
        $fid = nid('fun', $in['id'] ?? '');
        if (!$fid) fail('Funcionário não encontrado.');
        $status = ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo';
        db()->prepare('UPDATE funcionarios SET status = ? WHERE id = ?')->execute([$status, $fid]);
        $st = db()->prepare('SELECT usuario_id FROM funcionarios WHERE id = ?');
        $st->execute([$fid]);
        $uid = $st->fetch()['usuario_id'] ?? null;
        if ($uid) db()->prepare('UPDATE usuarios SET ativo = ? WHERE id = ?')->execute([$status === 'ativo' ? 1 : 0, $uid]);
        auditar($status === 'ativo' ? 'Funcionário reativado' : 'Funcionário desativado', (string) $fid);
        admin_ok_store();
    }

    if ($path === 'bebidas/rede') {
        auth_require(['admin']);
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe o nome da bebida.');
        db()->prepare('INSERT INTO bebidas (nome, tipo, marca) VALUES (?,?,?)')
            ->execute([$nome, $in['tipo'] ?? 'cerveja', $in['marca'] ?: null]);
        auditar('Bebida cadastrada', $nome);
        admin_ok_store();
    }

    if ($path === 'bebidas/salvar') {
        auth_require(['admin']);
        $bid = nid('beb', $in['id'] ?? '');
        if (!$bid) fail('Bebida não encontrada.');
        db()->prepare('UPDATE bebidas SET nome = ?, tipo = ?, marca = ? WHERE id = ?')
            ->execute([trim($in['nome'] ?? ''), $in['tipo'] ?? 'cerveja', $in['marca'] ?: null, $bid]);
        auditar('Bebida atualizada', $in['nome'] ?? '');
        admin_ok_store();
    }

    if ($path === 'bebidas/excluir') {
        auth_require(['admin']);
        $bid = nid('beb', $in['id'] ?? '');
        if (!$bid) fail('Bebida não encontrada.');
        $uso = admin_count('SELECT COUNT(*) FROM progresso_tampas WHERE bebida_id = ?', [$bid])
            + admin_count('SELECT COUNT(*) FROM consumos WHERE bebida_id = ?', [$bid])
            + admin_count('SELECT COUNT(*) FROM saideras WHERE bebida_id = ?', [$bid]);
        if ($uso) fail('Esta bebida já tem movimento e não pode ser excluída.');
        db()->prepare('DELETE FROM estabelecimento_bebidas WHERE bebida_id = ?')->execute([$bid]);
        db()->prepare('DELETE FROM bebidas WHERE id = ?')->execute([$bid]);
        auditar('Bebida excluída', (string) $bid);
        admin_ok_store();
    }

    if ($path === 'campanhas/rejeitar' || $path === 'campanhas/encerrar') {
        auth_require(['admin']);
        $cid = nid('cam', $in['id'] ?? '');
        if (!$cid) fail('Campanha não encontrada.');
        db()->prepare("UPDATE campanhas SET status = 'encerrada' WHERE id = ?")->execute([$cid]);
        auditar($path === 'campanhas/rejeitar' ? 'Campanha recusada' : 'Campanha encerrada', (string) $cid);
        admin_ok_store();
    }

    if ($path === 'campanhas/excluir') {
        auth_require(['admin']);
        $cid = nid('cam', $in['id'] ?? '');
        if (!$cid) fail('Campanha não encontrada.');
        $st = db()->prepare('SELECT disparada, titulo FROM campanhas WHERE id = ?');
        $st->execute([$cid]);
        $c = $st->fetch();
        if (!$c) fail('Campanha não encontrada.');
        if ((int) $c['disparada']) fail('Não dá para excluir uma campanha já disparada. Encerre.');
        db()->prepare('DELETE FROM campanhas WHERE id = ?')->execute([$cid]);
        auditar('Campanha excluída', $c['titulo']);
        admin_ok_store();
    }

    if ($path === 'saideras/expirar') {
        auth_require(['admin']);
        $sid = nid('sai', $in['id'] ?? '');
        if (!$sid) fail('Saidera não encontrada.');
        db()->prepare("UPDATE saideras SET status = 'expirada' WHERE id = ? AND status = 'disponivel'")->execute([$sid]);
        auditar('Saidera expirada pelo admin', (string) $sid);
        admin_ok_store();
    }

    if ($path === 'audiencias/contar') {
        auth_require(['admin']);
        $ests = [];
        foreach ($in['estabelecimentos'] ?? [] as $e) {
            $id = nid('est', is_string($e) ? $e : '');
            if ($id) $ests[] = $id;
        }
        $ids = ids_clientes_audiencia([
            'bairros' => $in['bairros'] ?? [],
            'ests' => $ests,
            'bebidaId' => nid('beb', $in['bebidaId'] ?? ''),
            'dias' => (int) ($in['dias'] ?? 90),
        ]);
        ok(['total' => count($ids)]);
    }

    return false;
}
