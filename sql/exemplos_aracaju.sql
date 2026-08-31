-- 50 estabelecimentos de exemplo em vários bairros de Aracaju.
-- Use no phpMyAdmin (ou no MySQL da Hostinger) depois do schema já instalado.
-- Não apaga casas reais: só remove o lote anterior deste arquivo (promocao = Exemplo mapa Saideira).

SET NAMES utf8mb4;

DELETE eb FROM estabelecimento_bebidas eb
INNER JOIN estabelecimentos e ON e.id = eb.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE ce FROM campanha_estabelecimentos ce
INNER JOIN estabelecimentos e ON e.id = ce.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE ti FROM ticket_itens ti
INNER JOIN tickets t ON t.id = ti.ticket_id
INNER JOIN estabelecimentos e ON e.id = t.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE t FROM tickets t
INNER JOIN estabelecimentos e ON e.id = t.estabelecimento_id
WHERE e.promocao = 'Exemplo mapa Saideira';

DELETE FROM estabelecimentos WHERE promocao = 'Exemplo mapa Saideira';

INSERT INTO estabelecimentos
  (nome, tipo, bairro, endereco, cep, logradouro, numero, cidade, uf, lat, lng, avaliacao, avaliacoes, status, horario, salao, meta_padrao, promocao)
VALUES
-- Atalaia / orla
('Bar da Orla Atalaia',        'bar',         'Atalaia',          'Av. Santos Dumont, 820, Atalaia, Aracaju - SE',              '49037-000', 'Av. Santos Dumont',              '820',  'Aracaju', 'SE', -10.97890, -37.04010, 4.7, 128, 'ativo', '17h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Sunset Deck Atalaia',        'bar',         'Atalaia',          'Av. Santos Dumont, 1450, Atalaia, Aracaju - SE',             '49037-475', 'Av. Santos Dumont',              '1450', 'Aracaju', 'SE', -10.98340, -37.03680, 4.6, 91,  'ativo', '16h–01h', 'auto', 8,  'Exemplo mapa Saideira'),
('Grill da Beira-Mar',         'restaurante', 'Atalaia',          'Rua Niceu Dantas, 88, Atalaia, Aracaju - SE',                '49037-480', 'Rua Niceu Dantas',               '88',   'Aracaju', 'SE', -10.98120, -37.03990, 4.5, 77,  'ativo', '11h–23h', 'auto', 12, 'Exemplo mapa Saideira'),

-- Coroa do Meio
('Coroa Beer',                 'bar',         'Coroa do Meio',    'Av. Beira Mar, 340, Coroa do Meio, Aracaju - SE',            '49035-000', 'Av. Beira Mar',                  '340',  'Aracaju', 'SE', -10.97580, -37.04410, 4.3, 52,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Espetto da Ponte',           'restaurante', 'Coroa do Meio',    'Rua Dr. Bezerra de Menezes, 55, Coroa do Meio, Aracaju - SE','49035-240', 'Rua Dr. Bezerra de Menezes',     '55',   'Aracaju', 'SE', -10.97390, -37.04720, 4.6, 83,  'ativo', '11h–00h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Jardins
('Jardins Pub',                'bar',         'Jardins',          'Av. Ministro Geraldo Barreto Sobral, 210, Jardins, Aracaju - SE', '49025-040', 'Av. Ministro Geraldo Barreto Sobral', '210', 'Aracaju', 'SE', -10.94420, -37.06740, 4.8, 156, 'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Empório 12 Jardins',         'restaurante', 'Jardins',          'Rua José Auzier, 120, Jardins, Aracaju - SE',                '49025-740', 'Rua José Auzier',                '120',  'Aracaju', 'SE', -10.94610, -37.07080, 4.5, 98,  'ativo', '12h–00h', 'auto', 12, 'Exemplo mapa Saideira'),

-- 13 de Julho
('Treze Bar',                  'bar',         '13 de Julho',      'Av. Hermes Fontes, 800, 13 de Julho, Aracaju - SE',          '49020-000', 'Av. Hermes Fontes',              '800',  'Aracaju', 'SE', -10.93140, -37.05620, 4.6, 119, 'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Casa 13',                    'restaurante', '13 de Julho',      'Rua Vila Cristina, 310, 13 de Julho, Aracaju - SE',          '49020-150', 'Rua Vila Cristina',              '310',  'Aracaju', 'SE', -10.93360, -37.05910, 4.4, 66,  'ativo', '11h–23h', 'auto', 10, 'Exemplo mapa Saideira'),
('Botequim de Julho',          'bar',         '13 de Julho',      'Av. Hermes Fontes, 1240, 13 de Julho, Aracaju - SE',         '49020-000', 'Av. Hermes Fontes',              '1240', 'Aracaju', 'SE', -10.92980, -37.05480, 4.3, 54,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Farolândia
('Farol Beer',                 'bar',         'Farolândia',       'Av. Ministro Geraldo Barreto Sobral, 1550, Farolândia, Aracaju - SE', '49030-270', 'Av. Ministro Geraldo Barreto Sobral', '1550', 'Aracaju', 'SE', -10.95810, -37.08020, 4.5, 102, 'ativo', '18h–03h', 'auto', 10, 'Exemplo mapa Saideira'),
('Campus Bar',                 'bar',         'Farolândia',       'Rua Francisco Ângelo Martins, 90, Farolândia, Aracaju - SE', '49030-670', 'Rua Francisco Ângelo Martins',   '90',   'Aracaju', 'SE', -10.96040, -37.08350, 4.2, 88,  'ativo', '19h–03h', 'auto', 8,  'Exemplo mapa Saideira'),
('Alto da Farolândia',         'restaurante', 'Farolândia',       'Av. Paulo Barreto de Menezes, 400, Farolândia, Aracaju - SE','49030-015', 'Av. Paulo Barreto de Menezes',   '400',  'Aracaju', 'SE', -10.95660, -37.07840, 4.6, 73,  'ativo', '11h–00h', 'auto', 12, 'Exemplo mapa Saideira'),

-- Centro
('Centro Bar',                 'bar',         'Centro',           'Rua João Pessoa, 220, Centro, Aracaju - SE',                 '49010-130', 'Rua João Pessoa',                '220',  'Aracaju', 'SE', -10.91020, -37.07110, 4.1, 47,  'ativo', '16h–00h', 'auto', 10, 'Exemplo mapa Saideira'),
('Largo 24 Grill',             'restaurante', 'Centro',           'Praça Olímpio Campos, 24, Centro, Aracaju - SE',             '49010-020', 'Praça Olímpio Campos',           '24',   'Aracaju', 'SE', -10.90840, -37.07320, 4.4, 81,  'ativo', '11h–23h', 'auto', 10, 'Exemplo mapa Saideira'),
('Calçadão Pub',               'bar',         'Centro',           'Rua Laranjeiras, 512, Centro, Aracaju - SE',                 '49010-000', 'Rua Laranjeiras',                '512',  'Aracaju', 'SE', -10.91110, -37.06940, 4.3, 59,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Siqueira Campos
('Siqueira Pub',               'bar',         'Siqueira Campos',  'Av. Barão de Maruim, 640, Siqueira Campos, Aracaju - SE',    '49015-400', 'Av. Barão de Maruim',            '640',  'Aracaju', 'SE', -10.92100, -37.05090, 4.2, 38,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Bar do Campo',               'bar',         'Siqueira Campos',  'Rua Pacatuba, 155, Siqueira Campos, Aracaju - SE',           '49015-280', 'Rua Pacatuba',                   '155',  'Aracaju', 'SE', -10.92280, -37.05340, 4.4, 61,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- São José
('São José Beer',              'bar',         'São José',         'Av. Coelho e Campos, 330, São José, Aracaju - SE',           '49015-140', 'Av. Coelho e Campos',            '330',  'Aracaju', 'SE', -10.91820, -37.04710, 4.3, 44,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Esquina José',               'restaurante', 'São José',         'Rua Estância, 78, São José, Aracaju - SE',                   '49015-180', 'Rua Estância',                   '78',   'Aracaju', 'SE', -10.92010, -37.04960, 4.1, 33,  'ativo', '11h–23h', 'auto', 12, 'Exemplo mapa Saideira'),

-- Luzia
('Luzia Lounge',               'bar',         'Luzia',            'Av. Hermes Fontes, 1680, Luzia, Aracaju - SE',               '49045-000', 'Av. Hermes Fontes',              '1680', 'Aracaju', 'SE', -10.92710, -37.06140, 4.6, 87,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Bar da Luzia',               'bar',         'Luzia',            'Rua José Seabra Batista, 200, Luzia, Aracaju - SE',          '49045-280', 'Rua José Seabra Batista',        '200',  'Aracaju', 'SE', -10.92900, -37.06420, 4.3, 49,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Grageru
('Grageru Grill',              'restaurante', 'Grageru',          'Av. Ministro Geraldo Barreto Sobral, 80, Grageru, Aracaju - SE', '49025-040', 'Av. Ministro Geraldo Barreto Sobral', '80', 'Aracaju', 'SE', -10.93600, -37.07260, 4.7, 112, 'ativo', '11h–00h', 'auto', 10, 'Exemplo mapa Saideira'),
('Boteco G',                   'bar',         'Grageru',          'Rua Dep. João Andrade, 415, Grageru, Aracaju - SE',          '49025-540', 'Rua Dep. João Andrade',          '415',  'Aracaju', 'SE', -10.93820, -37.07510, 4.4, 68,  'ativo', '18h–02h', 'auto', 8,  'Exemplo mapa Saideira'),
('Empório Grageru',            'bar',         'Grageru',          'Av. Chanceler Osvaldo Aranha, 90, Grageru, Aracaju - SE',    '49025-020', 'Av. Chanceler Osvaldo Aranha',   '90',   'Aracaju', 'SE', -10.93440, -37.07080, 4.5, 75,  'ativo', '16h–00h', 'auto', 10, 'Exemplo mapa Saideira'),

-- Inácio Barbosa
('Inácio Beer',                'bar',         'Inácio Barbosa',   'Av. Dr. José Machado de Souza, 520, Inácio Barbosa, Aracaju - SE', '49040-790', 'Av. Dr. José Machado de Souza', '520', 'Aracaju', 'SE', -10.95080, -37.09140, 4.3, 57,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Barbosa Pub',                'bar',         'Inácio Barbosa',   'Rua José Aloísio de Campos, 140, Inácio Barbosa, Aracaju - SE', '49040-840', 'Rua José Aloísio de Campos',  '140',  'Aracaju', 'SE', -10.95310, -37.09400, 4.2, 36,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Ponto Novo
('Ponto Novo Bar',             'bar',         'Ponto Novo',       'Av. Maranhão, 980, Ponto Novo, Aracaju - SE',                '49097-000', 'Av. Maranhão',                   '980',  'Aracaju', 'SE', -10.91510, -37.07910, 4.1, 42,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Novo Boteco',                'bar',         'Ponto Novo',       'Rua Lagarto, 260, Ponto Novo, Aracaju - SE',                 '49097-140', 'Rua Lagarto',                    '260',  'Aracaju', 'SE', -10.91700, -37.08160, 4.4, 51,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Aruana / zona de expansão
('Aruana Sunset',              'bar',         'Aruana',           'Av. Oceânica, 100, Aruana, Aracaju - SE',                    '49000-000', 'Av. Oceânica',                   '100',  'Aracaju', 'SE', -11.00180, -37.08690, 4.6, 79,  'ativo', '16h–00h', 'auto', 10, 'Exemplo mapa Saideira'),
('Praia Aruana',               'restaurante', 'Aruana',           'Rua das Dunas, 45, Aruana, Aracaju - SE',                    '49000-000', 'Rua das Dunas',                  '45',   'Aracaju', 'SE', -11.00420, -37.08940, 4.5, 63,  'ativo', '11h–23h', 'auto', 12, 'Exemplo mapa Saideira'),
('Dunas Bar',                  'bar',         'Aruana',           'Av. Oceânica, 480, Aruana, Aracaju - SE',                    '49000-000', 'Av. Oceânica',                   '480',  'Aracaju', 'SE', -10.99960, -37.08480, 4.3, 40,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Mosqueiro
('Mosqueiro Fish',             'restaurante', 'Mosqueiro',        'Av. Oceânica, 2200, Mosqueiro, Aracaju - SE',                '49000-000', 'Av. Oceânica',                   '2200', 'Aracaju', 'SE', -11.07580, -37.14840, 4.7, 84,  'ativo', '11h–22h', 'auto', 10, 'Exemplo mapa Saideira'),
('Porto Mosqueiro',            'bar',         'Mosqueiro',        'Rua do Porto, 12, Mosqueiro, Aracaju - SE',                  '49000-000', 'Rua do Porto',                   '12',   'Aracaju', 'SE', -11.07810, -37.15100, 4.4, 47,  'ativo', '12h–00h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Aeroporto
('Hangar Bar',                 'bar',         'Aeroporto',        'Av. Sen. Júlio César Leite, 300, Aeroporto, Aracaju - SE',  '49037-830', 'Av. Sen. Júlio César Leite',     '300',  'Aracaju', 'SE', -10.98710, -37.07280, 4.2, 39,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Escala Beer',                'bar',         'Aeroporto',        'Rua São Cristóvão, 880, Aeroporto, Aracaju - SE',            '49037-850', 'Rua São Cristóvão',              '880',  'Aracaju', 'SE', -10.98940, -37.07520, 4.1, 28,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Jabotiana
('Jabotiana Pub',              'bar',         'Jabotiana',        'Av. Dr. José Machado de Souza, 1100, Jabotiana, Aracaju - SE', '49095-000', 'Av. Dr. José Machado de Souza', '1100', 'Aracaju', 'SE', -10.94810, -37.10280, 4.3, 55,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Vila Jaboti',                'restaurante', 'Jabotiana',        'Rua José Carlos Silva, 70, Jabotiana, Aracaju - SE',         '49095-240', 'Rua José Carlos Silva',          '70',   'Aracaju', 'SE', -10.95040, -37.10520, 4.5, 62,  'ativo', '11h–23h', 'auto', 12, 'Exemplo mapa Saideira'),

-- São Conrado
('Conrado Bar',                'bar',         'São Conrado',      'Av. Paulo Barreto de Menezes, 980, São Conrado, Aracaju - SE', '49042-000', 'Av. Paulo Barreto de Menezes', '980',  'Aracaju', 'SE', -10.96120, -37.09380, 4.4, 58,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('São Conrado Grill',          'restaurante', 'São Conrado',      'Rua José Seabra Batista, 900, São Conrado, Aracaju - SE',    '49042-180', 'Rua José Seabra Batista',        '900',  'Aracaju', 'SE', -10.96350, -37.09640, 4.2, 35,  'ativo', '11h–00h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Industrial / zona norte
('Industrial Beer',            'bar',         'Industrial',       'Av. Tancredo Neves, 450, Industrial, Aracaju - SE',         '49040-000', 'Av. Tancredo Neves',             '450',  'Aracaju', 'SE', -10.90500, -37.08760, 4.0, 31,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Galpão Norte',               'bar',         'Industrial',       'Rua Boquim, 210, Industrial, Aracaju - SE',                 '49040-120', 'Rua Boquim',                     '210',  'Aracaju', 'SE', -10.90720, -37.09010, 4.3, 46,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Getúlio Vargas
('GV Boteco',                  'bar',         'Getúlio Vargas',   'Av. João Ribeiro, 300, Getúlio Vargas, Aracaju - SE',        '49055-000', 'Av. João Ribeiro',               '300',  'Aracaju', 'SE', -10.91240, -37.06210, 4.2, 37,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Vargas Pub',                 'bar',         'Getúlio Vargas',   'Rua Itabaiana, 118, Getúlio Vargas, Aracaju - SE',           '49055-160', 'Rua Itabaiana',                  '118',  'Aracaju', 'SE', -10.91460, -37.06470, 4.1, 29,  'ativo', '17h–01h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Cirurgia
('Bar da Cirurgia',            'bar',         'Cirurgia',         'Rua Propriá, 90, Cirurgia, Aracaju - SE',                    '49055-440', 'Rua Propriá',                    '90',   'Aracaju', 'SE', -10.91620, -37.05480, 4.3, 43,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Largo da Cirurgia',          'restaurante', 'Cirurgia',         'Av. Barão de Maruim, 220, Cirurgia, Aracaju - SE',           '49010-040', 'Av. Barão de Maruim',            '220',  'Aracaju', 'SE', -10.91840, -37.05720, 4.4, 50,  'ativo', '11h–23h', 'auto', 12, 'Exemplo mapa Saideira'),

-- Capucho
('Capucho Beer',               'bar',         'Capucho',          'Av. Presidente Tancredo Neves, 1200, Capucho, Aracaju - SE', '49080-000', 'Av. Presidente Tancredo Neves',  '1200', 'Aracaju', 'SE', -10.92840, -37.09360, 4.5, 72,  'ativo', '18h–02h', 'auto', 10, 'Exemplo mapa Saideira'),
('Shopping Side Bar',          'bar',         'Capucho',          'Av. Ministro Geraldo Barreto Sobral, 2200, Capucho, Aracaju - SE', '49080-270', 'Av. Ministro Geraldo Barreto Sobral', '2200', 'Aracaju', 'SE', -10.93070, -37.09610, 4.3, 64,  'ativo', '16h–00h', 'auto', 8,  'Exemplo mapa Saideira'),

-- Santa Maria
('Santa Maria Grill',          'restaurante', 'Santa Maria',      'Av. Maranhão, 2100, Santa Maria, Aracaju - SE',              '49042-490', 'Av. Maranhão',                   '2100', 'Aracaju', 'SE', -10.99180, -37.09810, 4.2, 34,  'ativo', '11h–23h', 'auto', 10, 'Exemplo mapa Saideira'),
('Vila Santa',                 'bar',         'Santa Maria',      'Rua Santa Maria, 60, Santa Maria, Aracaju - SE',             '49042-500', 'Rua Santa Maria',                '60',   'Aracaju', 'SE', -10.99420, -37.10060, 4.1, 27,  'ativo', '18h–01h', 'auto', 8,  'Exemplo mapa Saideira');

-- Liga as casas de exemplo às 3 primeiras bebidas cadastradas (se existirem).
INSERT IGNORE INTO estabelecimento_bebidas (estabelecimento_id, bebida_id, meta, regra)
SELECT e.id, b.id, NULL, 'padrao'
FROM estabelecimentos e
CROSS JOIN (SELECT id FROM bebidas ORDER BY id ASC LIMIT 3) b
WHERE e.promocao = 'Exemplo mapa Saideira';
