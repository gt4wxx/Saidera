/**
 * Gera todos os JSON de demonstração do Saidera.
 * IDs fixos do fluxo comercial:
 *   cli-001 Ellisson  |  est-001 Bar do Farol  |  par-001 Heineken (demo)
 *   beb-001 Heineken (meta 8 no Farol)  |  7 tampas iniciais
 */
const fs = require("fs");
const path = require("path");

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260819);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pad = (n, s = 3) => String(n).padStart(s, "0");

const IMAGES = [
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535958636474-b021ee5536cc?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544148103-77d3c512ffd6?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1597290282695-edc43d0e7121?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1485872299829-c673f5194813?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1572116466602-41d1d090dab3?w=900&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=900&q=80&auto=format&fit=crop",
];

const AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop",
];

const BAIRROS = [
  { nome: "Atalaia", lat: -10.9802, lng: -37.0388 },
  { nome: "Coroa do Meio", lat: -10.9751, lng: -37.0456 },
  { nome: "Jardins", lat: -10.9448, lng: -37.0689 },
  { nome: "13 de Julho", lat: -10.9321, lng: -37.0574 },
  { nome: "Farolândia", lat: -10.9587, lng: -37.0812 },
  { nome: "Centro", lat: -10.9095, lng: -37.0717 },
  { nome: "Siqueira Campos", lat: -10.9214, lng: -37.0518 },
  { nome: "São José", lat: -10.9188, lng: -37.0482 },
  { nome: "Luzia", lat: -10.9276, lng: -37.0621 },
  { nome: "Grageru", lat: -10.9365, lng: -37.0734 },
  { nome: "Inácio Barbosa", lat: -10.9512, lng: -37.0921 },
  { nome: "Ponto Novo", lat: -10.9154, lng: -37.0798 },
];

const EST_NOMES = [
  ["Bar do Farol", "Atalaia"],
  ["Point Orla", "Atalaia"],
  ["Boteco 13", "13 de Julho"],
  ["Aracaju Beer House", "Coroa do Meio"],
  ["Bar da Passarela", "Atalaia"],
  ["Esquina 490", "Farolândia"],
  ["Chopp Jardins", "Jardins"],
  ["Bar São José", "São José"],
  ["Orla Lounge", "Atalaia"],
  ["Ponto do Caranguejo", "Atalaia"],
  ["Maré Alta", "Coroa do Meio"],
  ["Boteco do Centro", "Centro"],
  ["Beer House Siqueira", "Siqueira Campos"],
  ["Casa do Malte", "Jardins"],
  ["Deck da Orla", "Atalaia"],
  ["Bar da Lua", "Coroa do Meio"],
  ["Empório 13", "13 de Julho"],
  ["Tap Room Grageru", "Grageru"],
  ["Cervejaria Luzia", "Luzia"],
  ["Bar do Trapiche", "Centro"],
  ["Quintal da Cerveja", "Farolândia"],
  ["Noite Serena", "Jardins"],
  ["Bar da Esquina", "Siqueira Campos"],
  ["Lounge Atlântico", "Atalaia"],
  ["Copo Cheio", "Ponto Novo"],
  ["Bar Farolândia", "Farolândia"],
  ["Mesa 10", "13 de Julho"],
  ["Pub do Morro", "São José"],
  ["Taverna Tropical", "Coroa do Meio"],
  ["Bar da Ponte", "Centro"],
  ["Happy Hour 490", "Farolândia"],
  ["Chopeira do Centro", "Centro"],
  ["Vila do Malte", "Grageru"],
  ["Bar da Praça", "Luzia"],
  ["Sunset Atalaia", "Atalaia"],
  ["Bar do Mercado", "Centro"],
  ["Canto da Orla", "Atalaia"],
  ["Boteco da Luzia", "Luzia"],
  ["Casa Jardins", "Jardins"],
  ["Ponto 13", "13 de Julho"],
  ["Bar do Porto", "Coroa do Meio"],
  ["Litoral Beer", "Atalaia"],
  ["Bar da Folia", "São José"],
  ["Estação Chopp", "Siqueira Campos"],
  ["Bar do Beco", "Centro"],
  ["Orla 300", "Atalaia"],
  ["Malte & Mar", "Coroa do Meio"],
  ["Bar da Areia", "Atalaia"],
  ["Clube da Tampa", "Jardins"],
  ["Boteco Farol", "Atalaia"],
  ["Jardins Pub", "Jardins"],
  ["Bar do Sol", "Inácio Barbosa"],
  ["Coroa Lounge", "Coroa do Meio"],
  ["Sabor e Chopp", "Grageru"],
  ["Bar da Palmeira", "Luzia"],
  ["Noite Dourada", "13 de Julho"],
  ["Ponto do Malte", "Farolândia"],
  ["Bar Recanto", "Ponto Novo"],
  ["Atalaia Deck", "Atalaia"],
  ["Cerveja & Cia", "Siqueira Campos"],
];

const RUAS = [
  "Av. Santos Dumont",
  "Rua Niceu Dantas",
  "Av. Beira Mar",
  "Rua Pacatuba",
  "Av. Francisco Porto",
  "Rua Laranjeiras",
  "Av. Ministro Geraldo",
  "Rua Propriá",
  "Av. Jorge Amado",
  "Rua Estância",
  "Av. Heráclito Rollemberg",
  "Rua Lagarto",
  "Av. Desembargador Maynard",
  "Rua Itabaiana",
];

const NOMES = [
  "Ellisson Costa",
  "Carlos Mendes",
  "Maria Fernanda Lima",
  "João Pedro Alves",
  "Ana Beatriz Souza",
  "Lucas Henrique Dias",
  "Juliana Rocha",
  "Rafael Nunes",
  "Camila Oliveira",
  "Bruno Carvalho",
  "Fernanda Castro",
  "Thiago Barbosa",
  "Patrícia Gomes",
  "Diego Araújo",
  "Larissa Pinto",
  "Gustavo Ferreira",
  "Aline Mendes",
  "Felipe Cardoso",
  "Bruna Teixeira",
  "André Luiz Santos",
  "Vanessa Ribeiro",
  "Marcelo Vieira",
  "Isabela Martins",
  "Rodrigo Cunha",
  "Tatiane Lopes",
  "Eduardo Batista",
  "Priscila Moreira",
  "Vinícius Rocha",
  "Amanda Silva",
  "Paulo Henrique Costa",
  "Letícia Andrade",
  "Ricardo Moura",
  "Sabrina Freitas",
  "Fábio Correia",
  "Natália Duarte",
  "Leandro Pires",
  "Cristina Almeida",
  "Daniel Souza",
  "Renata Campos",
  "Alexandre Tavares",
  "Mônica Azevedo",
  "Igor Nascimento",
  "Carolina Brito",
  "Samuel Reis",
  "Helena Figueiredo",
  "Caio Monteiro",
  "Beatriz Farias",
  "Murilo Guedes",
  "Lorena Passos",
  "Otávio Ramos",
  "Jéssica Melo",
  "Hugo Sampaio",
  "Michele Borges",
  "Renan Prado",
  "Talita Nogueira",
  "César Magalhães",
  "Daniele Cruz",
  "Vitor Hugo Lima",
  "Elaine Barreto",
  "Matheus Oliveira",
  "Sônia Regina Dias",
  "Kleber Antunes",
  "Paula Regina Costa",
  "Rogério Pimentel",
  "Cláudia Regina",
  "Everton Macedo",
  "Simone Vasconcelos",
  "Wagner Lemos",
  "Adriana Pacheco",
  "Nilson Furtado",
  "Raquel Menezes",
  "Sérgio Dantas",
  "Viviane Costa",
  "Márcio Antunes",
  "Luciana Peixoto",
  "Ronaldo Vieira",
  "Gisele Amaral",
  "Flávio Bernardes",
  "Tânia Cristina",
  "Iago Pereira",
  "Kelly Cristina",
  "Danilo Farias",
  "Cíntia Rocha",
  "Alessandro Pinto",
  "Mirella Santos",
  "Heitor Campos",
  "Yasmin Oliveira",
  "Enzo Gabriel Lima",
  "Lara Beatriz Nunes",
  "Davi Lucca Souza",
  "Manuela Costa",
  "Arthur Henrique",
  "Valentina Alves",
  "Bernardo Dias",
  "Heloísa Martins",
  "Benjamin Rocha",
  "Isadora Melo",
  "Joaquim Ferreira",
  "Melissa Andrade",
  "Nathan Barbosa",
  "Rebeca Cardoso",
  "Cauã Teixeira",
  "Esther Gomes",
  "Luan Carvalho",
  "Nicole Ribeiro",
  "Ian Castro",
  "Alícia Vieira",
  "Breno Lopes",
  "Emanuelly Cunha",
  "Davi Santos",
  "Lavínia Moreira",
  "Pietro Alves",
  "Marina Duarte",
  "Theo Nunes",
  "Catarina Lima",
  "Gael Oliveira",
  "Antonella Souza",
  "Ravi Mendes",
  "Cecília Rocha",
  "Noah Martins",
  "Liz Fernandes",
  "Benício Costa",
  "Maya Barbosa",
  "Anthony Silva",
  "Aurora Dias",
  "Lorenzo Pinto",
  "Olívia Cardoso",
  "Miguel Ângelo",
  "Ísis Carvalho",
  "Guilherme Torres",
  "Emanuelle Freitas",
  "Henrique Bastos",
  "Débora Nascimento",
  "Júlio César",
  "Fátima Helena",
  "Antônio Carlos",
  "Aparecida Souza",
  "José Ricardo",
  "Teresa Cristina",
  "Francisco Melo",
  "Neide Oliveira",
  "Sebastião Lima",
  "Irene Costa",
  "Geraldo Santos",
  "Lúcia Helena",
  "Valdir Souza",
  "Cleuza Maria",
  "Ademir Rocha",
  "Marli Ferreira",
  "Osvaldo Dias",
  "Zilda Alves",
];

const bebidas = [
  { id: "beb-001", nome: "Heineken", tipo: "cerveja", marca: "Heineken", cor: "#1B7A3D" },
  { id: "beb-002", nome: "Budweiser", tipo: "cerveja", marca: "Budweiser", cor: "#C41E3A" },
  { id: "beb-003", nome: "Stella Artois", tipo: "cerveja", marca: "Stella Artois", cor: "#C9A227" },
  { id: "beb-004", nome: "Brahma", tipo: "cerveja", marca: "Brahma", cor: "#E21B22" },
  { id: "beb-005", nome: "Corona", tipo: "cerveja", marca: "Corona", cor: "#F5D76E" },
  { id: "beb-006", nome: "Coca-Cola", tipo: "nao-alcoolico", marca: "Coca-Cola", cor: "#F40009" },
  { id: "beb-007", nome: "Skol", tipo: "cerveja", marca: "Skol", cor: "#F5B800" },
  { id: "beb-008", nome: "Original", tipo: "cerveja", marca: "Original", cor: "#8B1A1A" },
  { id: "beb-009", nome: "Antarctica", tipo: "cerveja", marca: "Antarctica", cor: "#1E4B9C" },
  { id: "beb-010", nome: "Eisenbahn", tipo: "cerveja", marca: "Eisenbahn", cor: "#2C1810" },
  { id: "beb-011", nome: "Heineken 0.0", tipo: "cerveja", marca: "Heineken", cor: "#1B7A3D" },
  { id: "beb-012", nome: "Guaraná Antarctica", tipo: "nao-alcoolico", marca: "Guaraná Antarctica", cor: "#007A3D" },
  { id: "beb-013", nome: "Água Tônica", tipo: "nao-alcoolico", marca: "Tônica", cor: "#89CFF0" },
  { id: "beb-014", nome: "Energético", tipo: "nao-alcoolico", marca: "Energy", cor: "#0033A0" },
  { id: "beb-015", nome: "Gin Tônica", tipo: "destilado", marca: "Gin House", cor: "#8FD4C1" },
  { id: "beb-016", nome: "Caipirinha", tipo: "coquetel", marca: "Casa", cor: "#8BC34A" },
  { id: "beb-017", nome: "Mojito", tipo: "coquetel", marca: "Casa", cor: "#2E8B57" },
  { id: "beb-018", nome: "Aperol Spritz", tipo: "coquetel", marca: "Aperol", cor: "#FF6B35" },
  { id: "beb-019", nome: "Chopp Pilsen", tipo: "chopp", marca: "Casa", cor: "#F5B800" },
  { id: "beb-020", nome: "Chopp IPA", tipo: "chopp", marca: "Casa", cor: "#C45C26" },
  { id: "beb-021", nome: "Bohemia", tipo: "cerveja", marca: "Bohemia", cor: "#1A1A2E" },
  { id: "beb-022", nome: "Devassa", tipo: "cerveja", marca: "Devassa", cor: "#E8A317" },
  { id: "beb-023", nome: "Spaten", tipo: "cerveja", marca: "Spaten", cor: "#1C3A1C" },
  { id: "beb-024", nome: "Therezópolis", tipo: "cerveja", marca: "Therezópolis", cor: "#3D2B1F" },
  { id: "beb-025", nome: "Suco Natural", tipo: "nao-alcoolico", marca: "Casa", cor: "#FF8C00" },
];

const PROMOCOES = [
  "Happy hour até 20h",
  "Saidera acelerada nesta semana",
  "Dobro de Tampas na sexta",
  "Chopp em destaque",
  "Noite especial na orla",
  null,
  null,
  null,
];

function jitter(v) {
  return +(v + (rand() - 0.5) * 0.018).toFixed(5);
}

function isoDaysAgo(days, hour) {
  const d = new Date(2026, 7, 19, hour ?? randInt(18, 23), randInt(0, 59));
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function dateBR(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

function phone() {
  return `(79) 9${randInt(8000, 9999)}-${randInt(1000, 9999)}`;
}

function slugEmail(nome, i) {
  const s = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return `${s}${i > 3 ? i : ""}@email.com`;
}

const estabelecimentos = EST_NOMES.map(([nome, bairroNome], i) => {
  const bairro = BAIRROS.find((b) => b.nome === bairroNome) || BAIRROS[i % BAIRROS.length];
  const metaPadrao = 10;
  const drinkSet = [0, 1, 2, 3, 4, 5];
  if (i > 0) {
    const extra = randInt(2, 6);
    while (drinkSet.length < 6 + extra) {
      const n = randInt(6, 24);
      if (!drinkSet.includes(n)) drinkSet.push(n);
    }
  }
  const customMetas = {};
  if (i === 0) {
    customMetas["beb-001"] = 8;
    customMetas["beb-002"] = 6;
    customMetas["beb-003"] = 10;
  } else if (i === 1) {
    customMetas["beb-002"] = 6;
    customMetas["beb-001"] = 8;
  } else if (i === 6) {
    customMetas["beb-003"] = 10;
    customMetas["beb-001"] = 8;
  } else if (rand() > 0.55) {
    customMetas["beb-001"] = pick([6, 8, 10]);
    if (rand() > 0.5) customMetas["beb-002"] = pick([5, 6, 8]);
  }

  const dist =
    i === 0 ? 0.85 : i === 1 ? 1.1 : i === 4 ? 0.6 : +(0.4 + rand() * 8.5).toFixed(2);

  return {
    id: `est-${pad(i + 1)}`,
    nome,
    bairro: bairro.nome,
    endereco: `${pick(RUAS)}, ${randInt(80, 1800)} — ${bairro.nome}, Aracaju/SE`,
    lat: jitter(bairro.lat),
    lng: jitter(bairro.lng),
    distanciaKm: dist,
    avaliacao: +(3.8 + rand() * 1.2).toFixed(1),
    avaliacoes: randInt(40, 890),
    imagem: IMAGES[i % IMAGES.length],
    status: i % 17 === 16 ? "inativo" : "ativo",
    aberto: i % 11 !== 10,
    horario: "18h às 02h",
    metaPadrao,
    promocao: i === 0 ? "Heineken com Saidera em 8 Tampas" : pick(PROMOCOES),
    clientes: i === 0 ? 1284 : randInt(80, 980),
    tampas: i === 0 ? 18921 : randInt(400, 9000),
    saideras: i === 0 ? 1742 : randInt(20, 700),
    bebidas: drinkSet.map((di) => {
      const b = bebidas[di];
      const meta = customMetas[b.id] || null;
      return {
        id: b.id,
        nome: b.nome,
        meta,
        regra: meta ? "propria" : "padrao",
      };
    }),
    destaque: i < 13,
  };
});

const clientes = [];
for (let i = 0; i < 150; i++) {
  const nome = NOMES[i] || `Cliente ${i + 1}`;
  const nascYear = randInt(1972, 2004);
  const nasc = `${pad(randInt(1, 28), 2)}/${pad(randInt(1, 12), 2)}/${nascYear}`;
  const desdeDays = i === 0 ? 68 : randInt(10, 400);
  clientes.push({
    id: `cli-${pad(i + 1)}`,
    nome: i === 0 ? "Ellisson Costa" : nome,
    primeiroNome: (i === 0 ? "Ellisson Costa" : nome).split(" ")[0],
    codigo: i === 0 ? "SDR-28491" : `SDR-${28000 + i}`,
    telefone: i === 0 ? "(79) 99812-4490" : phone(),
    email: i === 0 ? "ellisson.costa@email.com" : slugEmail(nome, i),
    nascimento: i === 0 ? "02/11/1994" : nasc,
    cidade: "Aracaju",
    bairro: pick(BAIRROS).nome,
    avatar: i === 0 ? AVATARS[0] : AVATARS[i % AVATARS.length],
    clienteDesde: i === 0 ? "12/06/2026" : dateBR(isoDaysAgo(desdeDays, 12)),
    ultimaVisita: i === 0 ? "18/08/2026" : dateBR(isoDaysAgo(randInt(0, 45), 20)),
    ultimaVisitaIso: i === 0 ? "2026-08-18T21:40:00.000Z" : isoDaysAgo(randInt(0, 45), 20),
    status: i % 23 === 0 ? "inativo" : "ativo",
    bebidaFavoritaId: i === 0 ? "beb-001" : pick(bebidas.slice(0, 10)).id,
  });
}

const tampas = [];
const consumos = [];
const saideras = [];
let consumoN = 1;
let saideraN = 1;
let tampaN = 1;

function addTampa(clienteId, estabelecimentoId, bebidaId, atual, opts = {}) {
  const est = estabelecimentos.find((e) => e.id === estabelecimentoId);
  const drink = est.bebidas.find((b) => b.id === bebidaId) || { meta: null };
  const meta = drink.meta || est.metaPadrao;
  tampas.push({
    id: `tmp-${pad(tampaN++, 4)}`,
    clienteId,
    estabelecimentoId,
    bebidaId,
    atual,
    meta,
    atualizadoEm: opts.atualizadoEm || isoDaysAgo(randInt(0, 20), 21),
  });
}

function addConsumo(clienteId, estabelecimentoId, bebidaId, qtd, daysAgo, funcionarioId) {
  const iso = isoDaysAgo(daysAgo, randInt(18, 23));
  consumos.push({
    id: `con-${pad(consumoN++, 4)}`,
    clienteId,
    estabelecimentoId,
    bebidaId,
    quantidade: qtd,
    funcionarioId: funcionarioId || "fun-001",
    criadoEm: iso,
  });
  return iso;
}

function addSaidera(clienteId, estabelecimentoId, bebidaId, status, daysAgo, codigo) {
  const conquistada = isoDaysAgo(daysAgo, 22);
  const rec = {
    id: `sai-${pad(saideraN++, 4)}`,
    codigo: codigo || `SDR-${8000 + saideraN}`,
    clienteId,
    estabelecimentoId,
    bebidaId,
    status,
    conquistadaEm: conquistada,
    utilizadaEm: status === "utilizada" ? isoDaysAgo(Math.max(0, daysAgo - randInt(0, 4)), 23) : null,
  };
  saideras.push(rec);
  return rec;
}

addTampa("cli-001", "est-001", "beb-001", 7, { atualizadoEm: "2026-08-18T21:40:00.000Z" });
addTampa("cli-001", "est-001", "beb-002", 3, { atualizadoEm: "2026-08-08T20:10:00.000Z" });
addTampa("cli-001", "est-001", "beb-006", 8, { atualizadoEm: "2026-08-15T19:20:00.000Z" });
addTampa("cli-001", "est-001", "beb-004", 2, { atualizadoEm: "2026-08-10T22:00:00.000Z" });
addTampa("cli-001", "est-002", "beb-002", 4, { atualizadoEm: "2026-08-16T21:00:00.000Z" });
addTampa("cli-001", "est-007", "beb-003", 0, { atualizadoEm: "2026-08-19T18:00:00.000Z" });
addTampa("cli-001", "est-004", "beb-001", 5, { atualizadoEm: "2026-08-12T20:30:00.000Z" });

addSaidera("cli-001", "est-007", "beb-003", "disponivel", 0, "SDR-8842");
addSaidera("cli-001", "est-001", "beb-001", "utilizada", 12, "SDR-7710");
addSaidera("cli-001", "est-001", "beb-001", "utilizada", 28, "SDR-6601");
addSaidera("cli-001", "est-001", "beb-001", "utilizada", 45, "SDR-5512");
addSaidera("cli-001", "est-002", "beb-001", "utilizada", 20, "SDR-4490");
addSaidera("cli-001", "est-004", "beb-001", "utilizada", 33, "SDR-3388");
addSaidera("cli-001", "est-005", "beb-001", "utilizada", 50, "SDR-2201");
addSaidera("cli-001", "est-009", "beb-002", "utilizada", 18, "SDR-1994");
addSaidera("cli-001", "est-015", "beb-001", "utilizada", 60, "SDR-1022");
addSaidera("cli-001", "est-001", "beb-002", "utilizada", 40, "SDR-0981");
addSaidera("cli-001", "est-011", "beb-001", "utilizada", 22, "SDR-0877");

const histEllisson = [
  [1, "est-001", "beb-001", 2],
  [7, "est-001", "beb-001", 3],
  [11, "est-001", "beb-002", 1],
  [14, "est-001", "beb-001", 2],
  [18, "est-001", "beb-006", 3],
  [21, "est-001", "beb-004", 2],
  [3, "est-002", "beb-002", 2],
  [8, "est-002", "beb-002", 2],
  [0, "est-007", "beb-003", 2],
  [4, "est-004", "beb-001", 2],
  [9, "est-004", "beb-001", 3],
];
histEllisson.forEach(([d, e, b, q]) => addConsumo("cli-001", e, b, q, d, "fun-001"));

addTampa("cli-002", "est-001", "beb-002", 6);
addSaidera("cli-002", "est-001", "beb-002", "disponivel", 0, "SDR-9102");
addConsumo("cli-002", "est-001", "beb-002", 2, 0, "fun-002");

addTampa("cli-003", "est-001", "beb-006", 4);
addConsumo("cli-003", "est-001", "beb-006", 2, 1, "fun-001");

for (let i = 3; i < 48; i++) {
  const drink = pick(estabelecimentos[0].bebidas.slice(0, 6));
  const meta = drink.meta || 10;
  const atual = randInt(0, meta - 1);
  addTampa(clientes[i].id, "est-001", drink.id, atual);
  addConsumo(clientes[i].id, "est-001", drink.id, randInt(1, 3), randInt(0, 25), pick(["fun-001", "fun-002"]));
  if (rand() > 0.7) addSaidera(clientes[i].id, "est-001", drink.id, rand() > 0.4 ? "utilizada" : "disponivel", randInt(1, 40));
}

for (let i = 3; i < clientes.length; i++) {
  const nPlaces = randInt(1, 4);
  const usedEst = new Set();
  for (let p = 0; p < nPlaces; p++) {
    let est = estabelecimentos[randInt(0, 40)];
    if (usedEst.has(est.id)) continue;
    usedEst.add(est.id);
    const drink = pick(est.bebidas);
    const meta = drink.meta || est.metaPadrao;
    const atual = randInt(0, meta);
    addTampa(clientes[i].id, est.id, drink.id, atual === meta ? meta - 1 : atual);
    const visits = randInt(1, 4);
    for (let v = 0; v < visits; v++) {
      addConsumo(clientes[i].id, est.id, drink.id, randInt(1, 3), randInt(0, 70), pick(["fun-001", "fun-002", "fun-003"]));
    }
    if (rand() > 0.72) {
      addSaidera(clientes[i].id, est.id, drink.id, rand() > 0.35 ? "utilizada" : "disponivel", randInt(0, 55));
    }
  }
}

while (consumos.length < 500) {
  const c = pick(clientes.slice(3));
  const e = pick(estabelecimentos.slice(0, 45));
  const d = pick(e.bebidas);
  addConsumo(c.id, e.id, d.id, randInt(1, 3), randInt(0, 80), pick(["fun-001", "fun-002", "fun-003", "fun-004"]));
}

while (saideras.length < 120) {
  const c = pick(clientes.slice(3));
  const e = pick(estabelecimentos.slice(0, 45));
  const d = pick(e.bebidas);
  addSaidera(c.id, e.id, d.id, rand() > 0.28 ? "utilizada" : "disponivel", randInt(0, 70));
}

const cargos = ["Garçom", "Garçom", "Garçom", "Atendente", "Gerente"];
const funNomes = [
  "João Silva",
  "Carlos Santos",
  "Marcos Lima",
  "Ana Souza",
  "Pedro Henrique",
  "Luiza Mendes",
  "Rafael Costa",
  "Bianca Lopes",
];
const funcionarios = funNomes.map((nome, i) => ({
  id: `fun-${pad(i + 1)}`,
  nome,
  cargo: i < 4 ? ["Garçom", "Garçom", "Gerente", "Atendente"][i] : pick(cargos),
  estabelecimentoId: i < 4 ? "est-001" : pick(estabelecimentos.slice(0, 12)).id,
  status: "ativo",
  tampasHoje: i === 0 ? 42 : i === 1 ? 31 : i === 2 ? 12 : i === 3 ? 18 : randInt(4, 40),
  saiderasEntregues: i === 0 ? 5 : i === 1 ? 3 : i === 2 ? 1 : i === 3 ? 2 : randInt(0, 6),
  avatar: AVATARS[(i + 2) % AVATARS.length],
}));

const PARCEIRO_NOMES = [
  ["Heineken Brasil", "Cerveja"],
  ["Budweiser Demo", "Cerveja"],
  ["Stella Artois Demo", "Cerveja"],
  ["Ambev Showcase", "Bebidas"],
  ["Corona Demo", "Cerveja"],
  ["Coca-Cola Demo", "Não alcoólico"],
  ["Spaten Demo", "Cerveja"],
  ["Eisenbahn Demo", "Cerveja"],
  ["Energético Norte", "Energético"],
  ["Gin House SE", "Destilados"],
  ["Chopp Local ARU", "Chopp"],
  ["Sucos da Orla", "Não alcoólico"],
];

const parceiros = PARCEIRO_NOMES.map(([nome, categoria], i) => ({
  id: `par-${pad(i + 1)}`,
  nome,
  categoria,
  marcaDemonstrativa: true,
  selo: "Marca demonstrativa",
  status: i < 8 ? "ativo" : "ativo",
  estabelecimentos: i === 0 ? 18 : randInt(4, 22),
  clientesAlcancados: i === 0 ? 12430 : randInt(800, 9000),
  participacoes: i === 0 ? 2870 : randInt(120, 3000),
  tampas: i === 0 ? 18921 : randInt(400, 12000),
  saideras: i === 0 ? 1742 : randInt(40, 1200),
  campanhasAtivas: i === 0 ? 4 : randInt(0, 3),
  logoCor: ["#1B7A3D", "#C41E3A", "#C9A227", "#14213D", "#F5D76E", "#F40009", "#1C3A1C", "#2C1810", "#0033A0", "#8FD4C1", "#F5B800", "#FF8C00"][i],
}));

const campanhas = [];
const campanhaTitulos = [
  ["Saidera Heineken — Agosto", "par-001", "ativa"],
  ["Fim de semana Budweiser", "par-002", "ativa"],
  ["Stella na Orla", "par-003", "ativa"],
  ["Happy Hour Demo", "par-001", "ativa"],
  ["Coroa do Meio — Inverno", "par-001", "encerrada"],
  ["Atalaia Sunset", "par-005", "ativa"],
  ["Jardins Premium", "par-003", "analise"],
  ["Centro Revive", "par-004", "solicitada"],
  ["Energia na Noite", "par-009", "ativa"],
  ["Chopp Local — Semana", "par-011", "ativa"],
  ["Coca no Bar", "par-006", "encerrada"],
  ["Spaten Experience", "par-007", "analise"],
  ["Eisenbahn Seleção", "par-008", "solicitada"],
  ["Gin Tônica SE", "par-010", "rascunho"],
  ["Sucos da Orla Verão", "par-012", "encerrada"],
  ["Heineken 0.0 Conscious", "par-001", "ativa"],
  ["Farolândia Beer Week", "par-002", "encerrada"],
  ["13 de Julho Special", "par-003", "ativa"],
  ["Siqueira Campos Night", "par-004", "rascunho"],
  ["Grageru Malte Fest", "par-001", "encerrada"],
];

campanhaTitulos.forEach(([titulo, parceiroId, status], i) => {
  campanhas.push({
    id: `cam-${pad(i + 1)}`,
    titulo,
    parceiroId,
    status,
    mensagem:
      i === 0
        ? "Essa semana sua Saidera chega mais rápido."
        : i === 1
          ? "Seu fim de semana merece uma Saidera."
          : pick([
              "Acelere suas Tampas neste mês.",
              "Uma rodada especial te espera.",
              "Sua próxima Saidera está mais perto.",
              "Noite dourada nos bares participantes.",
            ]),
    metaTampas: i === 0 ? 6 : i === 1 ? 5 : pick([5, 6, 8, 10]),
    bebidaId: i === 0 || i === 3 || i === 15 ? "beb-001" : i === 1 ? "beb-002" : i === 2 ? "beb-003" : pick(["beb-001", "beb-002", "beb-003", "beb-005", "beb-006"]),
    estabelecimentos: i === 0 ? ["est-001", "est-002", "est-004", "est-005", "est-009"] : estabelecimentos.slice(i, i + randInt(3, 8)).map((e) => e.id),
    periodoInicio: "01/08/2026",
    periodoFim: "31/08/2026",
    publicoPotencial: i === 0 ? 12430 : randInt(400, 8000),
    participantes: i === 0 ? 2870 : randInt(80, 3000),
    saideras: i === 0 ? 1742 : randInt(20, 900),
    canal: pick(["push", "email", "whatsapp"]),
    solicitadaEm: isoDaysAgo(randInt(1, 25), 10),
  });
});

const notificacoes = [
  {
    id: "ntf-001",
    clienteId: "cli-001",
    titulo: "Falta só 1 Tampa!",
    texto: "Heineken no Bar do Farol. Sua Saidera está a uma Tampa de distância.",
    tipo: "progresso",
    lida: false,
    criadoEm: isoDaysAgo(0, 12),
  },
  {
    id: "ntf-002",
    clienteId: "cli-001",
    titulo: "Saidera disponível",
    texto: "Você conquistou uma Saidera de Stella Artois no Chopp Jardins.",
    tipo: "saidera",
    lida: false,
    criadoEm: isoDaysAgo(0, 18),
  },
  {
    id: "ntf-003",
    clienteId: "cli-001",
    titulo: "Oferta Heineken",
    texto: "Essa semana sua Saidera chega mais rápido em 3 bares da orla.",
    tipo: "oferta",
    lida: true,
    criadoEm: isoDaysAgo(1, 9),
  },
];

const ntfExtras = [
  ["Bem-vindo ao Saidera", "Sua conta está pronta. Mostre o QR Code no bar e comece a juntar Tampas.", "sistema"],
  ["Point Orla te espera", "Budweiser com meta especial de 6 Tampas.", "oferta"],
  ["Você visitou 9 estabelecimentos", "Continue explorando Aracaju e desbloqueie novas Saideras.", "sistema"],
  ["Aniversariantes no Farol", "O Bar do Farol preparou uma surpresa para aniversariantes do mês.", "oferta"],
  ["Tampas registradas", "João Silva registrou 2 Heineken para você ontem à noite.", "progresso"],
  ["Nova casa no app", "Atalaia Deck acabou de entrar no Saidera.", "sistema"],
  ["Quase lá no Beer House", "Você está a 3 Tampas da Saidera de Heineken.", "progresso"],
  ["Campanha da orla", "Sunset Atalaia com meta reduzida até domingo.", "oferta"],
];
ntfExtras.forEach((n, i) => {
  notificacoes.push({
    id: `ntf-${pad(i + 4)}`,
    clienteId: "cli-001",
    titulo: n[0],
    texto: n[1],
    tipo: n[2],
    lida: i > 3,
    criadoEm: isoDaysAgo(i + 2, 11),
  });
});
for (let i = notificacoes.length; i < 30; i++) {
  const c = pick(clientes);
  notificacoes.push({
    id: `ntf-${pad(i + 1)}`,
    clienteId: c.id,
    titulo: pick(["Você está quase lá", "Nova oferta na sua região", "Saidera disponível", "Bar novo perto de você"]),
    texto: pick([
      "Faltam poucas Tampas para a próxima Saidera.",
      "Uma marca demonstrativa acelerou a meta nesta semana.",
      "Passe no estabelecimento e mostre seu QR Code.",
      "Explore os bares da orla e junte Tampas.",
    ]),
    tipo: pick(["progresso", "oferta", "saidera", "sistema"]),
    lida: rand() > 0.4,
    criadoEm: isoDaysAgo(randInt(0, 20), randInt(9, 22)),
  });
}

const audiencias = [
  {
    id: "aud-001",
    nome: "Heineken · Orla · 90 dias",
    campanhaId: "cam-001",
    parceiroId: "par-001",
    cidade: "Aracaju",
    bairros: ["Atalaia", "Coroa do Meio", "13 de Julho"],
    estabelecimentos: ["est-001", "est-002", "est-004", "est-005", "est-009", "est-011", "est-015", "est-024"],
    bebidaId: "beb-001",
    periodoDias: 90,
    estimado: 3842,
    canal: "push",
  },
  {
    id: "aud-002",
    nome: "Budweiser · Fim de semana",
    campanhaId: "cam-002",
    parceiroId: "par-002",
    cidade: "Aracaju",
    bairros: ["Atalaia", "Jardins"],
    estabelecimentos: ["est-001", "est-002", "est-007", "est-009", "est-049"],
    bebidaId: "beb-002",
    periodoDias: 30,
    estimado: 2210,
    canal: "whatsapp",
  },
  {
    id: "aud-003",
    nome: "Stella · Jardins premium",
    campanhaId: "cam-003",
    parceiroId: "par-003",
    cidade: "Aracaju",
    bairros: ["Jardins", "Grageru", "Luzia"],
    estabelecimentos: ["est-007", "est-014", "est-018", "est-022"],
    bebidaId: "beb-003",
    periodoDias: 60,
    estimado: 1560,
    canal: "email",
  },
];

const meta = {
  versao: "1.0.0",
  geradoEm: "2026-08-19T12:00:00.000Z",
  aviso: "Todos os dados são fictícios e destinam-se exclusivamente à demonstração comercial do Saidera.",
  cidade: "Aracaju/SE",
  demo: {
    clienteId: "cli-001",
    estabelecimentoId: "est-001",
    parceiroId: "par-001",
    funcionarioId: "fun-001",
  },
};

const outDir = path.join(__dirname, "..", "data");
fs.mkdirSync(outDir, { recursive: true });

const files = {
  meta,
  estabelecimentos,
  clientes,
  bebidas,
  consumos,
  tampas,
  saideras,
  funcionarios,
  parceiros,
  campanhas,
  notificacoes,
  audiencias,
};

Object.entries(files).forEach(([name, data]) => {
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 2), "utf8");
});

const bundle = `/* gerado automaticamente — não editar */\nwindow.SAIDERA_SEED = ${JSON.stringify(files)};\n`;
fs.writeFileSync(path.join(__dirname, "..", "assets", "js", "data-seed.js"), bundle, "utf8");

console.log("OK", {
  estabelecimentos: estabelecimentos.length,
  clientes: clientes.length,
  bebidas: bebidas.length,
  consumos: consumos.length,
  tampas: tampas.length,
  saideras: saideras.length,
  funcionarios: funcionarios.length,
  parceiros: parceiros.length,
  campanhas: campanhas.length,
  notificacoes: notificacoes.length,
  audiencias: audiencias.length,
});
