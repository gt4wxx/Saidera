<?php

function admin_rota(string $method, string $path, array $in): bool
{
    if ($method !== 'POST') return false;
    $u = null;

    if ($path === 'admin/voltar') {
        auth_start();
        $aid = (int) ($_SESSION['admin_uid'] ?? 0);
        if (!$aid) fail('Não há painel de admin para voltar.');
        $st = db()->prepare("SELECT * FROM usuarios WHERE id = ? AND ativo = 1 AND papel = 'admin'");
        $st->execute([$aid]);
        $admin = $st->fetch();
        if (!$admin) fail('Admin original não encontrado.');
        $_SESSION['uid'] = $aid;
        unset($_SESSION['admin_uid']);
        session_regenerate_id(true);
        ok(['session' => session_payload($admin)]);
    }

    if ($path === 'admin/entrar-conta') {
        $admin = auth_require(['admin']);
        $papel = (string) ($in['papel'] ?? '');
        $pub = (string) ($in['id'] ?? '');
        $uid = 0;
        $rotulo = '';
        if ($papel === 'cliente') {
            $id = nid('cli', $pub);
            $st = db()->prepare('SELECT usuario_id, nome FROM clientes WHERE id = ?');
            $st->execute([$id]);
            $row = $st->fetch();
            $uid = (int) ($row['usuario_id'] ?? 0);
            $rotulo = (string) ($row['nome'] ?? '');
        } elseif ($papel === 'funcionario') {
            $id = nid('fun', $pub);
            $st = db()->prepare('SELECT usuario_id, nome FROM funcionarios WHERE id = ?');
            $st->execute([$id]);
            $row = $st->fetch();
            $uid = (int) ($row['usuario_id'] ?? 0);
            $rotulo = (string) ($row['nome'] ?? '');
        } elseif ($papel === 'parceiro') {
            $id = nid('par', $pub);
            $st = db()->prepare('SELECT usuario_id, nome FROM parceiros WHERE id = ?');
            $st->execute([$id]);
            $row = $st->fetch();
            $uid = (int) ($row['usuario_id'] ?? 0);
            $rotulo = (string) ($row['nome'] ?? '');
        } elseif ($papel === 'estabelecimento') {
            $id = nid('est', $pub);
            $st = db()->prepare('SELECT g.usuario_id, e.nome FROM estabelecimento_gestores g JOIN estabelecimentos e ON e.id = g.estabelecimento_id WHERE g.estabelecimento_id = ? LIMIT 1');
            $st->execute([$id]);
            $row = $st->fetch();
            $uid = (int) ($row['usuario_id'] ?? 0);
            $rotulo = (string) ($row['nome'] ?? '');
        } else {
            fail('Informe o tipo da conta.');
        }
        if (!$uid) fail('Esta conta ainda não tem login. Cadastre e-mail e senha primeiro.');
        $st = db()->prepare('SELECT * FROM usuarios WHERE id = ? AND ativo = 1');
        $st->execute([$uid]);
        $alvo = $st->fetch();
        if (!$alvo) fail('Esta conta está inativa ou sem usuário.');
        if (($alvo['papel'] ?? '') === 'admin') fail('Não é possível entrar como outro admin.');
        $_SESSION['admin_uid'] = (int) $admin['id'];
        $_SESSION['uid'] = $uid;
        session_regenerate_id(true);
        auditar('Admin entrou na conta', ($alvo['papel'] ?? $papel) . ' · ' . $rotulo);
        ok(['session' => session_payload($alvo)]);
    }

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

    if ($path === 'clientes/excluir') {
        auth_require(['admin']);
        $cli = nid('cli', $in['id'] ?? '');
        if (!$cli) fail('Cliente não encontrado.');
        $st = db()->prepare('SELECT usuario_id, nome FROM clientes WHERE id = ?');
        $st->execute([$cli]);
        $c = $st->fetch();
        if (!$c) fail('Cliente não encontrado.');
        db()->prepare('UPDATE usuarios SET ativo = 0 WHERE id = ?')->execute([$c['usuario_id']]);
        auditar('Cliente excluído pelo admin', $c['nome']);
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

    if ($path === 'parceiros/excluir') {
        auth_require(['admin']);
        $pid = nid('par', $in['id'] ?? '');
        if (!$pid) fail('Parceiro não encontrado.');
        db()->prepare("UPDATE parceiros SET status = 'inativo' WHERE id = ?")->execute([$pid]);
        $st = db()->prepare('SELECT usuario_id, nome FROM parceiros WHERE id = ?');
        $st->execute([$pid]);
        $p = $st->fetch();
        if (!empty($p['usuario_id'])) {
            db()->prepare('UPDATE usuarios SET ativo = 0 WHERE id = ?')->execute([$p['usuario_id']]);
        }
        auditar('Parceiro excluído pelo admin', (string) ($p['nome'] ?? $pid));
        admin_ok_store();
    }

    if ($path === 'funcionarios/salvar') {
        $u = auth_require(['estabelecimento', 'admin']);
        $fid = nid('fun', $in['id'] ?? '');
        if (!$fid) fail('Funcionário não encontrado.');
        $st = db()->prepare('SELECT estabelecimento_id FROM funcionarios WHERE id = ?');
        $st->execute([$fid]);
        $funRow = $st->fetch();
        if (!$funRow) fail('Funcionário não encontrado.');
        if ($u['papel'] === 'estabelecimento') {
            $meu = gestor_est_id((int) $u['id']);
            if (!$meu || (int) $funRow['estabelecimento_id'] !== $meu) fail('Este funcionário não é da sua casa.');
            $in['estabelecimentoId'] = pub('est', $meu);
        }
        $eid = nid('est', $in['estabelecimentoId'] ?? '') ?: null;
        if ($eid) {
            db()->prepare('UPDATE funcionarios SET nome = ?, cargo = ?, status = ?, estabelecimento_id = ? WHERE id = ?')
                ->execute([trim($in['nome'] ?? ''), $in['cargo'] ?? 'Garçom', ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo', $eid, $fid]);
        } else {
            db()->prepare('UPDATE funcionarios SET nome = ?, cargo = ?, status = ? WHERE id = ?')
                ->execute([trim($in['nome'] ?? ''), $in['cargo'] ?? 'Garçom', ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo', $fid]);
        }
        if (!empty($in['email'])) {
            $st = db()->prepare('SELECT usuario_id FROM funcionarios WHERE id = ?');
            $st->execute([$fid]);
            $uid = (int) ($st->fetch()['usuario_id'] ?? 0);
            if ($uid) db()->prepare('UPDATE usuarios SET email = ? WHERE id = ?')->execute([strtolower(trim($in['email'])), $uid]);
        }
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
        $u = auth_require(['estabelecimento', 'admin']);
        $fid = nid('fun', $in['id'] ?? '');
        if (!$fid) fail('Funcionário não encontrado.');
        if ($u['papel'] === 'estabelecimento') {
            $st = db()->prepare('SELECT estabelecimento_id FROM funcionarios WHERE id = ?');
            $st->execute([$fid]);
            $funRow = $st->fetch();
            $meu = gestor_est_id((int) $u['id']);
            if (!$funRow || !$meu || (int) $funRow['estabelecimento_id'] !== $meu) fail('Este funcionário não é da sua casa.');
        }
        $status = ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo';
        db()->prepare('UPDATE funcionarios SET status = ? WHERE id = ?')->execute([$status, $fid]);
        $st = db()->prepare('SELECT usuario_id FROM funcionarios WHERE id = ?');
        $st->execute([$fid]);
        $uid = $st->fetch()['usuario_id'] ?? null;
        if ($uid) db()->prepare('UPDATE usuarios SET ativo = ? WHERE id = ?')->execute([$status === 'ativo' ? 1 : 0, $uid]);
        auditar($status === 'ativo' ? 'Funcionário reativado' : 'Funcionário desativado', (string) $fid);
        admin_ok_store();
    }

    if ($path === 'funcionarios/excluir') {
        auth_require(['admin']);
        $fid = nid('fun', $in['id'] ?? '');
        if (!$fid) fail('Funcionário não encontrado.');
        db()->prepare("UPDATE funcionarios SET status = 'inativo' WHERE id = ?")->execute([$fid]);
        $st = db()->prepare('SELECT usuario_id, nome FROM funcionarios WHERE id = ?');
        $st->execute([$fid]);
        $f = $st->fetch();
        if (!empty($f['usuario_id'])) {
            db()->prepare('UPDATE usuarios SET ativo = 0 WHERE id = ?')->execute([$f['usuario_id']]);
        }
        auditar('Funcionário excluído pelo admin', (string) ($f['nome'] ?? $fid));
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
        if (!$sid) fail('Saideira não encontrada.');
        db()->prepare("UPDATE saideras SET status = 'expirada' WHERE id = ? AND status = 'disponivel'")->execute([$sid]);
        auditar('Saideira expirada pelo admin', (string) $sid);
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

    if ($path === 'tampas/ajustar') {
        auth_require(['admin']);
        $cli = nid('cli', $in['clienteId'] ?? '');
        $eid = nid('est', $in['estabelecimentoId'] ?? '');
        $bid = nid('beb', $in['bebidaId'] ?? '');
        if (!$cli || !$eid || !$bid) fail('Informe cliente, casa e bebida.');
        if (!empty($in['quantidade'])) {
            $res = registrar_consumo($cli, $eid, $bid, (int) $in['quantidade'], null, false);
            auditar('Admin adicionou Tampas', pub('cli', $cli) . ' · ×' . (int) $in['quantidade']);
            admin_ok_store(['resultado' => $res]);
        }
        $p = garantir_progresso($cli, $eid, $bid);
        $meta = max(1, (int) $p['meta']);
        $atual = max(0, min($meta - 1, (int) ($in['atual'] ?? 0)));
        db()->prepare('UPDATE progresso_tampas SET atual = ?, atualizado_em = NOW() WHERE id = ?')->execute([$atual, $p['id']]);
        auditar('Admin ajustou Tampas', pub('cli', $cli) . " · {$atual}/{$meta}");
        admin_ok_store();
    }

    if ($path === 'saideras/conceder') {
        auth_require(['admin']);
        $cli = nid('cli', $in['clienteId'] ?? '');
        $eid = nid('est', $in['estabelecimentoId'] ?? '');
        $bid = nid('beb', $in['bebidaId'] ?? '');
        if (!$cli || !$eid || !$bid) fail('Informe cliente, casa e bebida.');
        $s = nova_saidera($cli, $eid, $bid);
        $beb = db()->prepare('SELECT nome FROM bebidas WHERE id = ?');
        $beb->execute([$bid]);
        notificar($cli, 'Você ganhou uma Saideira!', ($beb->fetch()['nome'] ?? 'Bebida') . ' · ' . $s['codigo'] . ' (crédito do suporte).', 'saidera');
        auditar('Admin concedeu Saideira', $s['codigo']);
        admin_ok_store(['saidera' => $s]);
    }

    if ($path === 'saideras/prorrogar') {
        auth_require(['admin']);
        $sid = nid('sai', $in['id'] ?? '');
        if (!$sid) fail('Saideira não encontrada.');
        $dias = max(1, min(90, (int) ($in['dias'] ?? 15)));
        $st = db()->prepare('SELECT codigo, expira_em, status FROM saideras WHERE id = ?');
        $st->execute([$sid]);
        $s = $st->fetch();
        if (!$s) fail('Saideira não encontrada.');
        $base = strtotime($s['expira_em']) > time() ? $s['expira_em'] : date('Y-m-d H:i:s');
        $exp = (new DateTimeImmutable($base))->modify('+' . $dias . ' days')->format('Y-m-d H:i:s');
        db()->prepare("UPDATE saideras SET expira_em = ?, status = IF(status = 'expirada', 'disponivel', status) WHERE id = ?")->execute([$exp, $sid]);
        auditar('Admin prorrogou Saideira', $s['codigo'] . ' · +' . $dias . 'd');
        admin_ok_store();
    }

    if ($path === 'saideras/restaurar') {
        auth_require(['admin']);
        $sid = nid('sai', $in['id'] ?? '');
        if (!$sid) fail('Saideira não encontrada.');
        $dias = (int) cfg('validade_saidera_dias', 15);
        $exp = (new DateTimeImmutable())->modify('+' . $dias . ' days')->format('Y-m-d H:i:s');
        db()->prepare("UPDATE saideras SET status = 'disponivel', utilizada_em = NULL, expira_em = ? WHERE id = ?")->execute([$exp, $sid]);
        auditar('Admin restaurou Saideira', (string) $sid);
        admin_ok_store();
    }

    if ($path === 'tickets/cancelar') {
        $u = auth_require(['admin', 'estabelecimento', 'funcionario']);
        $tid = nid('tkt', $in['id'] ?? '');
        if (!$tid) fail('Cupom não encontrado.');
        $st = db()->prepare('SELECT codigo, usado, estabelecimento_id FROM tickets WHERE id = ?');
        $st->execute([$tid]);
        $t = $st->fetch();
        if (!$t) fail('Cupom não encontrado.');
        if ($u['papel'] === 'estabelecimento') {
            $eid = gestor_est_id((int) $u['id']);
            if (!$eid || (int) $t['estabelecimento_id'] !== $eid) fail('Este cupom não é da sua casa.');
        }
        if ($u['papel'] === 'funcionario') {
            $f = funcionario_por_usuario((int) $u['id']);
            if (!$f || (int) $t['estabelecimento_id'] !== (int) $f['estabelecimento_id']) fail('Este cupom não é da sua casa.');
        }
        if ((int) $t['usado']) fail('Este cupom já foi usado ou cancelado.');
        db()->prepare('UPDATE tickets SET usado = 1, usado_por = NULL, usado_em = NOW() WHERE id = ?')->execute([$tid]);
        $quem = $u['papel'] === 'admin' ? 'Admin' : ($u['papel'] === 'funcionario' ? 'Garçom' : 'Casa');
        auditar($quem . ' cancelou cupom', $t['codigo']);
        admin_ok_store();
    }

    if ($path === 'clientes/codigo-reset') {
        auth_require(['admin']);
        $cli = nid('cli', $in['id'] ?? '');
        if (!$cli) fail('Cliente não encontrado.');
        $codigo = codigo_unico('SDR', 'clientes');
        db()->prepare('UPDATE clientes SET codigo = ? WHERE id = ?')->execute([$codigo, $cli]);
        auditar('Admin resetou QR do cliente', $codigo);
        admin_ok_store(['codigo' => $codigo]);
    }

    if ($path === 'notificacoes/enviar') {
        $u = auth_require(['admin', 'estabelecimento']);
        $cli = nid('cli', $in['clienteId'] ?? '');
        $titulo = trim($in['titulo'] ?? '');
        $texto = trim($in['texto'] ?? '');
        if (!$cli) fail('Informe o cliente.');
        if (strlen($titulo) < 2) fail('Informe o título do aviso.');
        if ($u['papel'] === 'estabelecimento') {
            $eid = gestor_est_id((int) $u['id']);
            if (!$eid || !cliente_da_casa($cli, $eid)) fail('Este cliente não frequenta a sua casa.');
        }
        notificar($cli, $titulo, $texto ?: $titulo, 'sistema');
        auditar($u['papel'] === 'admin' ? 'Admin enviou aviso' : 'Casa enviou aviso', $titulo);
        admin_ok_store();
    }

    if ($path === 'estabelecimentos/bebida') {
        $u = auth_require(['admin', 'estabelecimento']);
        $eid = casa_eid($u, $in);
        $bid = nid('beb', $in['bebidaId'] ?? '');
        if (!$bid) fail('Informe a bebida.');
        $meta = isset($in['meta']) && $in['meta'] !== '' && $in['meta'] !== null ? max(1, (int) $in['meta']) : null;
        $regra = in_array($in['regra'] ?? '', ['padrao', 'propria', 'patrocinio'], true) ? $in['regra'] : ($meta ? 'propria' : 'padrao');
        db()->prepare('INSERT INTO estabelecimento_bebidas (estabelecimento_id, bebida_id, meta, regra) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE meta = VALUES(meta), regra = VALUES(regra)')
            ->execute([$eid, $bid, $meta, $regra]);
        auditar($u['papel'] === 'admin' ? 'Admin atualizou cardápio' : 'Casa atualizou cardápio', pub('est', $eid) . ' · ' . pub('beb', $bid));
        admin_ok_store();
    }

    if ($path === 'estabelecimentos/bebida-remover') {
        $u = auth_require(['admin', 'estabelecimento']);
        $eid = casa_eid($u, $in);
        $bid = nid('beb', $in['bebidaId'] ?? '');
        if (!$bid) fail('Informe a bebida.');
        db()->prepare('DELETE FROM estabelecimento_bebidas WHERE estabelecimento_id = ? AND bebida_id = ?')->execute([$eid, $bid]);
        auditar($u['papel'] === 'admin' ? 'Admin removeu bebida da casa' : 'Casa removeu bebida do cardápio', pub('est', $eid) . ' · ' . pub('beb', $bid));
        admin_ok_store();
    }

    if ($path === 'estabelecimentos/midia') {
        $u = auth_require(['admin', 'estabelecimento']);
        $eid = casa_eid($u, $in);
        if (array_key_exists('promocao', $in)) {
            db()->prepare('UPDATE estabelecimentos SET promocao = ? WHERE id = ?')->execute([trim((string) $in['promocao']) ?: null, $eid]);
        }
        $campo = $in['campo'] ?? '';
        if ($campo === 'cartaz' || $campo === 'imagem') {
            salvar_midia_casa($eid, $campo, (string) ($in['dataUrl'] ?? ''));
        }
        auditar($u['papel'] === 'admin' ? 'Admin atualizou vitrine da casa' : 'Casa atualizou vitrine', (string) $eid);
        admin_ok_store();
    }

    if ($path === 'campanhas/salvar') {
        auth_require(['admin']);
        $cid = nid('cam', $in['id'] ?? '');
        if (!$cid) fail('Campanha não encontrada.');
        $st = db()->prepare('SELECT * FROM campanhas WHERE id = ?');
        $st->execute([$cid]);
        $c = $st->fetch();
        if (!$c) fail('Campanha não encontrada.');
        if ((int) $c['disparada']) fail('Campanha já disparada. Encerre para parar; não edita depois do envio.');
        db()->prepare('UPDATE campanhas SET titulo = ?, tipo = ?, publico = ?, mensagem = ?, meta_tampas = ?, altera_meta = ?, bebida_id = ?, periodo_inicio = ?, periodo_fim = ?, canal = ?, parceiro_id = ? WHERE id = ?')
            ->execute([
                trim($in['titulo'] ?? $c['titulo']),
                $in['tipo'] ?? $c['tipo'],
                $in['publico'] ?? $c['publico'],
                $in['mensagem'] ?? $c['mensagem'],
                $in['metaTampas'] !== '' && $in['metaTampas'] !== null ? (int) $in['metaTampas'] : null,
                !empty($in['alteraMeta']) ? 1 : 0,
                nid('beb', $in['bebidaId'] ?? '') ?: null,
                parse_br_date($in['periodoInicio'] ?? null) ?: $c['periodo_inicio'],
                parse_br_date($in['periodoFim'] ?? null) ?: $c['periodo_fim'],
                $in['canal'] ?? $c['canal'],
                nid('par', $in['parceiroId'] ?? '') ?: $c['parceiro_id'],
                $cid,
            ]);
        if (isset($in['estabelecimentos']) && is_array($in['estabelecimentos'])) {
            db()->prepare('DELETE FROM campanha_estabelecimentos WHERE campanha_id = ?')->execute([$cid]);
            $ins = db()->prepare('INSERT IGNORE INTO campanha_estabelecimentos (campanha_id, estabelecimento_id) VALUES (?,?)');
            foreach ($in['estabelecimentos'] as $e) {
                $id = nid('est', is_string($e) ? $e : '');
                if ($id) $ins->execute([$cid, $id]);
            }
        }
        auditar('Campanha editada', $in['titulo'] ?? $c['titulo']);
        admin_ok_store();
    }

    if ($path === 'parceiros/bebidas') {
        auth_require(['admin']);
        $pid = nid('par', $in['id'] ?? '');
        if (!$pid) fail('Parceiro não encontrado.');
        db()->prepare('DELETE FROM parceiro_bebidas WHERE parceiro_id = ?')->execute([$pid]);
        $ins = db()->prepare('INSERT IGNORE INTO parceiro_bebidas (parceiro_id, bebida_id) VALUES (?,?)');
        foreach ($in['bebidaIds'] ?? [] as $b) {
            $bid = nid('beb', is_string($b) ? $b : '');
            if ($bid) $ins->execute([$pid, $bid]);
        }
        auditar('Bebidas do parceiro', (string) $pid);
        admin_ok_store();
    }

    if ($path === 'planos') {
        auth_require(['admin']);
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe o nome do plano.');
        $menus = sanitizar_menus_casa($in['menus'] ?? []);
        $precoRaw = $in['preco'] ?? null;
        $preco = $precoRaw === '' || $precoRaw === null ? null : (float) $precoRaw;
        db()->prepare('INSERT INTO planos (nome, descricao, preco, menus_json, a_mostra, status) VALUES (?,?,?,?,?,?)')
            ->execute([
                $nome,
                trim($in['descricao'] ?? '') ?: null,
                $preco,
                json_encode($menus),
                !empty($in['aMostra']) ? 1 : 0,
                ($in['status'] ?? 'ativo') === 'inativo' ? 'inativo' : 'ativo',
            ]);
        auditar('Plano criado', $nome);
        admin_ok_store();
    }

    if ($path === 'planos/salvar') {
        auth_require(['admin']);
        $pid = nid('pln', $in['id'] ?? '');
        if (!$pid) fail('Plano não encontrado.');
        $nome = trim($in['nome'] ?? '');
        if (strlen($nome) < 2) fail('Informe o nome do plano.');
        $menus = sanitizar_menus_casa($in['menus'] ?? []);
        $precoRaw = $in['preco'] ?? null;
        $preco = $precoRaw === '' || $precoRaw === null ? null : (float) $precoRaw;
        db()->prepare('UPDATE planos SET nome = ?, descricao = ?, preco = ?, menus_json = ?, a_mostra = ?, status = ? WHERE id = ?')
            ->execute([
                $nome,
                trim($in['descricao'] ?? '') ?: null,
                $preco,
                json_encode($menus),
                !empty($in['aMostra']) ? 1 : 0,
                ($in['status'] ?? 'ativo') === 'inativo' ? 'inativo' : 'ativo',
                $pid,
            ]);
        auditar('Plano atualizado', $nome);
        admin_ok_store();
    }

    if ($path === 'planos/status') {
        auth_require(['admin']);
        $pid = nid('pln', $in['id'] ?? '');
        if (!$pid) fail('Plano não encontrado.');
        $status = ($in['status'] ?? '') === 'inativo' ? 'inativo' : 'ativo';
        db()->prepare('UPDATE planos SET status = ? WHERE id = ?')->execute([$status, $pid]);
        auditar($status === 'ativo' ? 'Plano reativado' : 'Plano desativado', (string) $pid);
        admin_ok_store();
    }

    if ($path === 'planos/mostra') {
        auth_require(['admin']);
        $pid = nid('pln', $in['id'] ?? '');
        if (!$pid) fail('Plano não encontrado.');
        $mostra = !empty($in['aMostra']) ? 1 : 0;
        db()->prepare('UPDATE planos SET a_mostra = ? WHERE id = ?')->execute([$mostra, $pid]);
        auditar($mostra ? 'Plano à mostra para as casas' : 'Plano escondido das casas', (string) $pid);
        admin_ok_store();
    }

    if ($path === 'planos/atribuir') {
        auth_require(['admin']);
        $eid = nid('est', $in['estabelecimentoId'] ?? $in['id'] ?? '');
        $pid = nid('pln', $in['planoId'] ?? '');
        if (!$eid) fail('Informe a casa.');
        if ($pid) {
            $st = db()->prepare('SELECT id FROM planos WHERE id = ?');
            $st->execute([$pid]);
            if (!$st->fetch()) fail('Plano não encontrado.');
        }
        db()->prepare('UPDATE estabelecimentos SET plano_id = ? WHERE id = ?')->execute([$pid ?: null, $eid]);
        cancelar_cobrancas_pendentes($eid);
        auditar('Plano atribuído à casa', pub('est', $eid));
        admin_ok_store();
    }

    if ($path === 'planos/cobranca-pagar') {
        auth_require(['admin']);
        garantir_plano_cobrancas();
        $cid = nid('cob', $in['id'] ?? '');
        if (!$cid) fail('Cobrança não encontrada.');
        $st = db()->prepare('SELECT * FROM plano_cobrancas WHERE id = ?');
        $st->execute([$cid]);
        $c = $st->fetch();
        if (!$c) fail('Cobrança não encontrada.');
        if ($c['status'] === 'pago') fail('Esta cobrança já foi marcada como paga.');
        db()->prepare("UPDATE plano_cobrancas SET status = 'pago', pago_em = NOW() WHERE id = ?")->execute([$cid]);
        db()->prepare('UPDATE estabelecimentos SET plano_id = ? WHERE id = ?')->execute([(int) $c['plano_id'], (int) $c['estabelecimento_id']]);
        cancelar_cobrancas_pendentes((int) $c['estabelecimento_id'], $cid);
        auditar('Pix do plano confirmado', $c['txid']);
        admin_ok_store();
    }

    if ($path === 'planos/cobranca-cancelar') {
        $u = auth_require(['admin', 'estabelecimento']);
        garantir_plano_cobrancas();
        $cid = nid('cob', $in['id'] ?? '');
        if (!$cid) fail('Cobrança não encontrada.');
        $st = db()->prepare('SELECT * FROM plano_cobrancas WHERE id = ?');
        $st->execute([$cid]);
        $c = $st->fetch();
        if (!$c) fail('Cobrança não encontrada.');
        if ($c['status'] === 'pago') fail('Cobrança já paga. Não dá para cancelar.');
        if ($u['papel'] === 'estabelecimento') {
            $eid = gestor_est_id((int) $u['id']);
            if ((int) $c['estabelecimento_id'] !== (int) $eid) fail('Cobrança de outra casa.');
        }
        db()->prepare("UPDATE plano_cobrancas SET status = 'cancelado' WHERE id = ?")->execute([$cid]);
        auditar('Pix do plano cancelado', $c['txid']);
        if ($u['papel'] === 'admin') admin_ok_store();
        ok(['store' => bootstrap_store($u)]);
    }

    if ($path === 'saideras/entregar-admin') {
        auth_require(['admin']);
        $sid = nid('sai', $in['id'] ?? $in['saideraId'] ?? '');
        if (!$sid) fail('Saideira não encontrada.');
        entregar_saidera($sid, null);
        admin_ok_store();
    }

    return false;
}
