-- Apaga só os 50 estabelecimentos de exemplo (sql/exemplos_aracaju.sql).
-- Não mexe em casas reais: filtra por promocao = 'Exemplo mapa Saideira'.
-- Cole no phpMyAdmin, aba SQL, e execute.

SET NAMES utf8mb4;

DELETE eb FROM estabelecimento_bebidas eb
INNER JOIN estabelecimentos e ON e.id = eb.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE ce FROM campanha_estabelecimentos ce
INNER JOIN estabelecimentos e ON e.id = ce.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE ca FROM campanha_adesoes ca
INNER JOIN campanhas c ON c.id = ca.campanha_id
INNER JOIN estabelecimentos e ON e.id = c.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE c FROM campanhas c
INNER JOIN estabelecimentos e ON e.id = c.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE ti FROM ticket_itens ti
INNER JOIN tickets t ON t.id = ti.ticket_id
INNER JOIN estabelecimentos e ON e.id = t.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE t FROM tickets t
INNER JOIN estabelecimentos e ON e.id = t.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE p FROM progresso_tampas p
INNER JOIN estabelecimentos e ON e.id = p.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE c FROM consumos c
INNER JOIN estabelecimentos e ON e.id = c.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE s FROM saideras s
INNER JOIN estabelecimentos e ON e.id = s.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE f FROM funcionarios f
INNER JOIN estabelecimentos e ON e.id = f.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE g FROM estabelecimento_gestores g
INNER JOIN estabelecimentos e ON e.id = g.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE a FROM avisos_estabelecimento a
INNER JOIN estabelecimentos e ON e.id = a.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE pc FROM plano_cobrancas pc
INNER JOIN estabelecimentos e ON e.id = pc.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE FROM estabelecimentos WHERE promocao = 'Exemplo mapa Saideira';

SELECT COUNT(*) AS exemplos_restantes
FROM estabelecimentos
WHERE promocao = 'Exemplo mapa Saideira';
