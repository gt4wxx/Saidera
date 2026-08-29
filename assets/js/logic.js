const Logic = {
  hoje() {
    return new Date();
  },

  diasValidade() {
    return Number(Store.data?.meta?.validadeSaideraDias) || 15;
  },

  suporte() {
    const m = Store.data?.meta || {};
    const raw = String(m.suporteWhatsapp || "").trim();
    return {
      whatsapp: raw.replace(/\D/g, ""),
      whatsappLabel: raw,
      email: String(m.suporteEmail || "").trim(),
    };
  },

  hidratar() {
    const demo = Store.data?.meta?.demo;
    if (!demo) return;
    const saved = sessionStorage.getItem("saidera_cliente");
    if (saved && this.cliente(saved)) demo.clienteId = saved;
    if (!Store.data.auditoria) Store.data.auditoria = [];
    if (!Store.data.tickets) Store.data.tickets = [];
    if (!Store.data.meta.cidade) Store.data.meta.cidade = "Aracaju/SE";
    if (Store.data.meta.metaPadraoRede == null) Store.data.meta.metaPadraoRede = 10;
    this.hidratarSaideras();
  },

  hidratarSaideras() {
    const hoje = this.hoje();
    let mudou = false;
    Store.all("saideras").forEach((s) => {
      if (!s.expiraEm && s.conquistadaEm) {
        const d = new Date(s.conquistadaEm);
        d.setDate(d.getDate() + this.diasValidade());
        s.expiraEm = d.toISOString();
        mudou = true;
      }
      if (s.status === "disponivel" && s.expiraEm && new Date(s.expiraEm) < hoje) {
        s.status = "expirada";
        mudou = true;
      }
    });
    if (mudou) Store.save(false);
  },

  diasRestantesSaidera(s) {
    if (!s?.expiraEm) return this.diasValidade();
    return Math.ceil((new Date(s.expiraEm) - this.hoje()) / 86400000);
  },

  validadeLabel(s) {
    if (s.status === "expirada") return "Expirada";
    const n = this.diasRestantesSaidera(s);
    if (n <= 0) return "Expira hoje";
    if (n === 1) return "Expira amanhã";
    return `Expira em ${n} dias`;
  },

  clientesDemo() {
    return [];
  },

  async buscarCliente(q) {
    const c = await API.get("clientes/codigo", { q });
    if (c && !this.cliente(c.id)) {
      Store.data.clientes = Store.data.clientes || [];
      Store.data.clientes.unshift(c);
    }
    return c;
  },

  prefsCliente(clienteId) {
    const c = this.cliente(clienteId);
    if (!c) return {};
    if (!c.prefs) {
      c.prefs = {
        push: true,
        email: true,
        whatsapp: false,
        perfilPublico: true,
        bebidaFavoritaId: c.bebidaFavoritaId || this.primeiraBebida()?.id || "",
      };
    }
    return c.prefs;
  },

  async salvarPrefsCliente(clienteId, patch) {
    const data = await API.post("prefs", patch);
    if (data.store) Store.replace(data.store);
    return this.prefsCliente(clienteId);
  },

  auditar(acao, detalhe) {
    Store.data.auditoria = Store.data.auditoria || [];
    Store.data.auditoria.unshift({
      em: new Date().toISOString(),
      acao,
      detalhe: detalhe || "",
    });
    Store.data.auditoria = Store.data.auditoria.slice(0, 80);
  },

  logsAuditoria() {
    return Store.all("auditoria");
  },

  resumoRede() {
    const ests = Store.all("estabelecimentos");
    const sais = Store.all("saideras");
    const cons = Store.all("consumos");
    const camps = Store.all("campanhas");
    const tampasQtd = cons.reduce((a, c) => a + (c.quantidade || 0), 0);
    const usadas = sais.filter((s) => s.status === "utilizada").length;
    const disp = sais.filter((s) => s.status === "disponivel").length;
    const conversao = sais.length ? Math.round((usadas / sais.length) * 100) : 0;
    const porBairro = {};
    sais.forEach((s) => {
      const b = this.est(s.estabelecimentoId)?.bairro || "Outros";
      porBairro[b] = (porBairro[b] || 0) + 1;
    });
    const maxB = Math.max(1, ...Object.values(porBairro));
    const bairros = Object.entries(porBairro)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, n]) => ({ nome, pct: Math.round((n / maxB) * 100) }));
    const semana = this.semanaTampas();
    return {
      estabelecimentos: ests.length,
      usuarios: Store.all("clientes").length,
      tampas: tampasQtd,
      saideras: sais.length,
      usadas,
      disponiveis: disp,
      expiradas: sais.filter((s) => s.status === "expirada").length,
      parceiros: Store.all("parceiros").length,
      campanhas: camps.length,
      conversao,
      bairros,
      semana,
    };
  },

  saudacao(nome) {
    const h = new Date().getHours();
    const s = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    return `${s}, ${nome} 👋`;
  },

  maskCep(v) {
    const n = String(v || "").replace(/\D/g, "").slice(0, 8);
    return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
  },

  async viaCep(cep) {
    const n = String(cep || "").replace(/\D/g, "");
    if (n.length !== 8) return null;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${n}/json/`);
      const j = await r.json();
      if (!j || j.erro) return null;
      return {
        logradouro: j.logradouro || "",
        bairro: j.bairro || "",
        cidade: j.localidade || "Aracaju",
        uf: j.uf || "SE",
      };
    } catch {
      return null;
    }
  },

  mapsQuery(est) {
    if (!est) return "Aracaju, SE";
    if (est.lat && est.lng) return `${est.lat},${est.lng}`;
    return est.endereco || [est.nome, est.logradouro, est.numero, est.bairro, est.cidade || "Aracaju", est.uf || "SE"].filter(Boolean).join(", ");
  },

  mapsEmbed(est) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(this.mapsQuery(est))}&z=16&hl=pt-BR&output=embed`;
  },

  mapsLink(est) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.mapsQuery(est))}`;
  },

  enderecoLinha(est) {
    return est?.endereco || [est?.logradouro, est?.numero, est?.bairro, est?.cidade].filter(Boolean).join(", ") || "—";
  },

  fmtKm(km) {
    if (km == null || Number.isNaN(km)) return "";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1).replace(".", ",")} km`;
  },

  haversine(lat1, lng1, lat2, lng2) {
    if (lat2 == null || lng2 == null || lat1 == null || lng1 == null) return null;
    const R = 6371;
    const toRad = (n) => (n * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  aplicarDistancias(geo) {
    if (!geo) return;
    Store.all("estabelecimentos").forEach((e) => {
      const km = this.haversine(geo.lat, geo.lng, e.lat, e.lng);
      e.distanciaKm = km == null ? 0 : Math.round(km * 10) / 10;
      e.temDistancia = km != null;
    });
  },

  idsCasasDoCliente(clienteId) {
    const ids = new Set();
    Store.all("tampas").filter((t) => t.clienteId === clienteId).forEach((t) => ids.add(t.estabelecimentoId));
    Store.all("consumos").filter((c) => c.clienteId === clienteId).forEach((c) => ids.add(c.estabelecimentoId));
    Store.all("saideras").filter((s) => s.clienteId === clienteId).forEach((s) => ids.add(s.estabelecimentoId));
    return ids;
  },

  fmtDate(iso) {
    if (!iso) return "—";
    if (iso.includes("/")) return iso;
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  },

  fmtDateShort(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  },

  bebida(id) {
    if (id) {
      const found = Store.find("bebidas", id);
      if (found) return found;
    }
    return { id: id || "", nome: "Bebida" };
  },

  primeiraBebida(est) {
    if (typeof est === "string") est = this.est(est);
    if (est?.bebidas?.[0]) return est.bebidas[0];
    return Store.all("bebidas")[0] || null;
  },

  est(id) {
    return Store.find("estabelecimentos", id);
  },

  tipoEst(est) {
    return est?.tipo === "restaurante" ? "Restaurante" : "Bar";
  },

  urlEntrarCliente(estId) {
    const base = /\/pages\//.test(location.pathname)
      ? new URL("../entrar.php", location.href.split("#")[0])
      : new URL("entrar.php", location.href.split("#")[0]);
    if (estId) base.searchParams.set("casa", estId);
    return base.href;
  },

  menusCasaCatalogo() {
    return [
      { id: "dashboard", nome: "Visão Geral", fixo: true },
      { id: "clientes", nome: "Clientes" },
      { id: "registrar", nome: "Gerar QR" },
      { id: "atender", nome: "QR do cliente" },
      { id: "bebidas", nome: "Bebidas" },
      { id: "saideras", nome: "Saideras" },
      { id: "funcionarios", nome: "Funcionários" },
      { id: "inteligencia", nome: "Conheça seus clientes" },
      { id: "campanhas", nome: "Campanhas" },
      { id: "config", nome: "Configurações", fixo: true },
      { id: "planos", nome: "Planos", fixo: true },
    ];
  },

  menusCasaFixos() {
    return ["dashboard", "config", "planos"];
  },

  plano(id) {
    return Store.find("planos", id);
  },

  planoDaCasa(est) {
    const e = typeof est === "string" ? this.est(est) : est;
    return e?.planoId ? this.plano(e.planoId) : null;
  },

  menusDaCasa(est) {
    const all = this.menusCasaCatalogo().map((m) => m.id);
    const p = this.planoDaCasa(est);
    if (!p || p.status === "inativo") return all;
    const set = new Set([...(p.menus || []), ...this.menusCasaFixos()]);
    return all.filter((id) => set.has(id));
  },

  casaPode(est, menuId) {
    if (menuId === "chamar") menuId = "inteligencia";
    if (menuId === "cliente") menuId = "clientes";
    return this.menusDaCasa(est).includes(menuId);
  },

  msgPlanoBloqueado() {
    const s = String(Store.data?.meta?.msgPlanoBloqueado || "Indisponível").trim();
    return s || "Indisponível";
  },

  labelMenuCasa(id) {
    return this.menusCasaCatalogo().find((m) => m.id === id)?.nome || id;
  },

  imagemPadraoEst(est) {
    const tipo = typeof est === "string" ? this.est(est)?.tipo : est?.tipo;
    return tipo === "restaurante"
      ? "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=900&q=80&auto=format&fit=crop";
  },

  midiaUrl(src) {
    if (!src) return src;
    if (/^(https?:|data:|\/|\.\.\/)/i.test(src)) return src;
    return /\/pages\//.test(location.pathname) ? `../${src}` : src;
  },

  avatarUrl(src) {
    return this.midiaUrl(src || "assets/brand/icon-192.png");
  },

  imagemEst(est) {
    if (typeof est === "string") est = this.est(est);
    if (!est) return this.imagemPadraoEst();
    return this.midiaUrl(est.cartaz || est.imagem || this.imagemPadraoEst(est));
  },

  lerCartazArquivo(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Escolha uma imagem (JPG, PNG ou WEBP)."));
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler esta imagem."));
      };
      img.src = url;
    });
  },

  lerAvatarArquivo(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Escolha uma foto (JPG, PNG ou WEBP)."));
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const side = Math.min(img.width, img.height);
        if (side < 40) {
          reject(new Error("Essa foto está pequena demais."));
          return;
        }
        const sx = Math.round((img.width - side) / 2);
        const sy = Math.round((img.height - side) / 2);
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler esta foto."));
      };
      img.src = url;
    });
  },

  cliente(id) {
    return Store.find("clientes", id);
  },

  funcionario(id) {
    return Store.find("funcionarios", id);
  },

  clientePorCodigo(q) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return null;
    return Store.all("clientes").find(
      (c) =>
        c.codigo.toLowerCase() === s ||
        c.codigo.toLowerCase().replace("-", "") === s.replace("-", "") ||
        c.nome.toLowerCase().includes(s) ||
        c.primeiroNome.toLowerCase() === s
    );
  },

  marcarTurno(funcionarioId, { tampas = 0, saideras = 0 } = {}) {
    const f = this.funcionario(funcionarioId);
    if (!f) return;
    f.tampasHoje = (f.tampasHoje || 0) + tampas;
    f.saiderasEntregues = (f.saiderasEntregues || 0) + saideras;
  },

  metaOriginal(est, bebidaId) {
    if (typeof est === "string") est = this.est(est);
    if (!est) return 10;
    const item = (est.bebidas || []).find((b) => b.id === bebidaId);
    if (!item) return est.metaPadrao || 10;
    if (item.metaOriginal != null) return item.metaOriginal;
    if (item.regra === "patrocinio") return est.metaPadrao || 10;
    if (item.meta) return item.meta;
    return est.metaPadrao || 10;
  },

  metaBase(est, bebidaId) {
    return this.metaOriginal(est, bebidaId);
  },

  campanhasPatrocinio(clienteId) {
    const prefs = clienteId ? this.prefsCliente(clienteId) : {};
    return Store.all("campanhas").filter((c) => {
      if (c.status !== "ativa" || !c.disparada) return false;
      if (clienteId && !this.clienteNoPublico(clienteId, c)) return false;
      if (clienteId && prefs.perfilPublico === false && c.origem === "parceiro") return false;
      return true;
    });
  },

  patrocinioEm(estId, bebidaId, clienteId) {
    return this.campanhasPatrocinio(clienteId).find((c) => {
      if (!c.metaTampas || c.alteraMeta === false) return false;
      if (bebidaId && c.bebidaId !== bebidaId) return false;
      if (!(c.estabelecimentos || []).includes(estId)) return false;
      if (clienteId && !this.clienteNoPublico(clienteId, c)) return false;
      if (!clienteId && c.publico === "aniversario") return false;
      return true;
    });
  },

  mesNiverPad() {
    return String(this.hoje().getMonth() + 1).padStart(2, "0");
  },

  ehAniversarianteMes(cli) {
    return (cli?.nascimento || "").includes(`/${this.mesNiverPad()}/`);
  },

  tipoCampanhaLabel(tipo) {
    return (
      {
        comparecer: "Comparecer",
        aniversario: "Aniversário",
        tampas: "Tampas reduzidas",
        chamar: "Chamar de volta",
      }[tipo] || "Patrocínio"
    );
  },

  publicoCampanhaLabel(publico) {
    return (
      {
        todos: "Quem frequenta e usa o app",
        aniversario: "Aniversariantes do mês",
        inativos: "Sem retornar há 30 dias",
        quase: "Próximos da Saidera",
      }[publico] || "Público da casa"
    );
  },

  modelosCampanhaCasa(est) {
    const nome = est?.nome || "sua casa";
    return {
      comparecer: {
        tipo: "comparecer",
        titulo: `Sua mesa te espera no ${nome}`,
        mensagem: `Sua mesa te espera no ${nome}. Mostre o QR, continue suas Tampas e retire sua Saidera aqui.`,
        publico: "todos",
        metaTampas: null,
        alteraMeta: false,
      },
      aniversario: {
        tipo: "aniversario",
        titulo: `Aniversário no ${nome}`,
        mensagem: `Feliz aniversário! Neste mês sua Saidera chega mais rápido no ${nome}. Mostre o QR e aproveite.`,
        publico: "aniversario",
        metaTampas: 6,
        alteraMeta: true,
      },
      tampas: {
        tipo: "tampas",
        titulo: `Saidera acelerada no ${nome}`,
        mensagem: `Essa semana sua Saidera chega mais rápido no ${nome}. Mostre o QR, complete as Tampas e retire sua rodada.`,
        publico: "todos",
        metaTampas: 6,
        alteraMeta: true,
      },
      chamar: {
        tipo: "chamar",
        titulo: `Chamar de volta · ${nome}`,
        mensagem: `Sua mesa te espera no ${nome}. Faz tempo que você não aparece. Mostre o QR, continue suas Tampas e retire sua Saidera aqui.`,
        publico: "inativos",
        metaTampas: null,
        alteraMeta: false,
      },
    };
  },

  ultimaVisitaMs(cli, estId) {
    if (cli?.ultimaVisitaIso) {
      const n = new Date(cli.ultimaVisitaIso).getTime();
      if (!Number.isNaN(n)) return n;
    }
    const cons = Store.all("consumos").filter((x) => x.clienteId === cli?.id && (!estId || x.estabelecimentoId === estId));
    if (!cons.length) return 0;
    return Math.max(...cons.map((x) => new Date(x.criadoEm).getTime()).filter((n) => !Number.isNaN(n)));
  },

  diasSemVisita(cli, estId) {
    const ms = this.ultimaVisitaMs(cli, estId);
    if (!ms) return null;
    return Math.max(0, Math.floor((this.hoje().getTime() - ms) / 86400000));
  },

  ticketStatus(t) {
    return t.status || (!t.usado ? "aberto" : t.usadoPor ? "usado" : "cancelado");
  },

  inativosDoEst(estId) {
    const corte = this.hoje().getTime() - 30 * 86400000;
    return this.clientesDoEst(estId).filter((c) => {
      const ms = this.ultimaVisitaMs(c, estId);
      return !ms || ms < corte;
    });
  },

  quaseSaideraEst(estId) {
    return Store.all("tampas").filter((t) => t.estabelecimentoId === estId && t.meta - t.atual <= 2 && t.atual > 0);
  },

  aniversariantesEst(estId) {
    return this.clientesDoEst(estId).filter((c) => this.ehAniversarianteMes(c));
  },

  publicoCampanha(cam) {
    const ests = (cam?.estabelecimentos || []).length
      ? cam.estabelecimentos
      : [cam?.estabelecimentoId].filter(Boolean);
    if (!ests.length && !cam?.clienteIds?.length) return [];
    if (cam.clienteIds?.length) {
      return cam.clienteIds.map((id) => this.cliente(id)).filter(Boolean);
    }
    const seen = new Set();
    let clientes = [];
    ests.forEach((estId) => {
      const pool =
        cam.publico === "inativos" || cam.tipo === "chamar" ? this.inativosDoEst(estId) : this.clientesDoEst(estId);
      pool.forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          clientes.push(c);
        }
      });
    });
    if (cam.publico === "aniversario") {
      clientes = clientes.filter((c) => this.ehAniversarianteMes(c));
    } else if (cam.publico === "quase") {
      const ids = new Set(
        Store.all("tampas")
          .filter((t) => ests.includes(t.estabelecimentoId) && t.meta - t.atual <= 2 && t.atual > 0)
          .map((t) => t.clienteId)
      );
      clientes = clientes.filter((c) => ids.has(c.id));
    }
    if (cam.limite) clientes = clientes.slice(0, cam.limite);
    return clientes;
  },

  clienteNoPublico(clienteId, cam) {
    if (!cam || cam.origem !== "estabelecimento") return true;
    if (cam.clienteIds?.length) return cam.clienteIds.includes(clienteId);
    return this.publicoCampanha(cam).some((c) => c.id === clienteId);
  },

  estimarPublicoCasa(estId, publico) {
    return this.publicoCampanha({ estabelecimentoId: estId, estabelecimentos: [estId], publico }).length;
  },

  async solicitarCampanhaCasa(payload) {
    const est = this.est(payload.estabelecimentoId);
    const modelo = this.modelosCampanhaCasa(est)[payload.tipo] || this.modelosCampanhaCasa(est).comparecer;
    const data = await API.post("campanhas", {
      ...payload,
      titulo: payload.titulo || modelo.titulo,
      mensagem: payload.mensagem || modelo.mensagem,
      alteraMeta: modelo.alteraMeta,
    });
    if (data.store) Store.replace(data.store);
    return Store.find("campanhas", data.id) || { id: data.id, ...payload, status: "solicitada" };
  },

  periodoCampanha(dias = 12) {
    const d = this.hoje();
    const fim = new Date(d);
    fim.setDate(fim.getDate() + dias);
    const fmt = (x) => x.toLocaleDateString("pt-BR");
    return { inicio: fmt(d), fim: fmt(fim) };
  },

  periodoTexto(cam) {
    if (!cam?.periodoInicio) return "";
    if (cam.umDia || cam.periodoInicio === cam.periodoFim || !cam.periodoFim) return `no dia ${cam.periodoInicio}`;
    return `de ${cam.periodoInicio} até ${cam.periodoFim}`;
  },

  isoParaBR(iso) {
    if (!iso) return "";
    if (iso.includes("/")) return iso;
    const [y, m, d] = iso.split("-");
    if (!d) return iso;
    return `${d}/${m}/${y}`;
  },

  brParaIso(br) {
    if (!br) return "";
    if (br.includes("-")) return br;
    const [d, m, y] = br.split("/");
    return `${y}-${m}-${d}`;
  },

  bebidasDoParceiro(par) {
    if (typeof par === "string") par = Store.find("parceiros", par);
    if (!par) return [];
    if (par.bebidaIds?.length) return par.bebidaIds.map((id) => this.bebida(id)).filter(Boolean);
    const key = (par.nome || "").toLowerCase();
    const list = Store.all("bebidas").filter((b) => {
      const marca = (b.marca || "").toLowerCase();
      if (!marca || marca === "casa") return false;
      return key.includes(marca) || key.includes(marca.split(" ")[0]);
    });
    return list.length ? list : Store.all("bebidas").slice(0, 1);
  },

  vendeBebida(est, bebidaId) {
    if (typeof est === "string") est = this.est(est);
    return (est?.bebidas || []).some((b) => b.id === bebidaId);
  },

  estsQueVendem(bebidaIds) {
    const ids = (Array.isArray(bebidaIds) ? bebidaIds : [bebidaIds]).filter(Boolean);
    return Store.all("estabelecimentos").filter((e) => e.status === "ativo" && ids.some((id) => this.vendeBebida(e, id)));
  },

  avisarEstabelecimentosParceiro(cam) {
    if (!cam) return;
    Store.data.avisosEstabelecimento = Store.data.avisosEstabelecimento || [];
    const par = Store.find("parceiros", cam.parceiroId);
    const beb = this.bebida(cam.bebidaId);
    const periodo = this.periodoTexto(cam);
    (cam.estabelecimentos || []).forEach((estId, i) => {
      Store.data.avisosEstabelecimento.unshift({
        id: `aviso-${Date.now()}-${i}-${estId}`,
        estabelecimentoId: estId,
        parceiroId: cam.parceiroId,
        campanhaId: cam.id,
        titulo: `Oferta de ${par?.nome || "parceiro"}`,
        texto: `${par?.nome || "Um parceiro"} fez uma oferta de ${cam.metaTampas} Tampas para a Saidera de ${beb?.nome || "bebida"} ${periodo}.`,
        lida: false,
        criadoEm: new Date().toISOString(),
      });
    });
  },

  avisosDoEst(estId) {
    return (Store.data.avisosEstabelecimento || []).filter((a) => a.estabelecimentoId === estId);
  },

  ofertaConsumida(clienteId, campanhaId, estId, bebidaId) {
    const cli = this.cliente(clienteId);
    if ((cli?.ofertasConsumidas || []).some(
      (x) => x.campanhaId === campanhaId && x.estabelecimentoId === estId && x.bebidaId === bebidaId
    )) return true;
    return Store.all("saideras").some(
      (s) =>
        s.clienteId === clienteId &&
        s.campanhaId === campanhaId &&
        (!estId || s.estabelecimentoId === estId) &&
        (!bebidaId || s.bebidaId === bebidaId)
    );
  },

  consumirOferta(clienteId, campanhaId, estId, bebidaId) {
    const cli = this.cliente(clienteId);
    if (!cli || !campanhaId) return;
    cli.ofertasConsumidas = cli.ofertasConsumidas || [];
    if (this.ofertaConsumida(clienteId, campanhaId, estId, bebidaId)) return;
    cli.ofertasConsumidas.push({
      campanhaId,
      estabelecimentoId: estId,
      bebidaId,
      em: new Date().toISOString(),
    });
  },

  ofertaAtivaPara(clienteId, estId, bebidaId) {
    const cam = this.patrocinioEm(estId, bebidaId, clienteId);
    if (!cam || !clienteId) return null;
    if (this.ofertaConsumida(clienteId, cam.id, estId, bebidaId)) return null;
    return cam;
  },

  metaDe(est, bebidaId, clienteId) {
    if (typeof est === "string") est = this.est(est);
    if (!est) return 10;
    if (clienteId) {
      const cam = this.ofertaAtivaPara(clienteId, est.id, bebidaId);
      if (cam?.metaTampas) return cam.metaTampas;
      return this.metaOriginal(est, bebidaId);
    }
    const cam = this.patrocinioEm(est.id, bebidaId);
    if (cam?.metaTampas) return cam.metaTampas;
    return this.metaOriginal(est, bebidaId);
  },

  clienteNaOferta(clienteId, campanhaId) {
    return (this.cliente(clienteId)?.ofertas || []).includes(campanhaId);
  },

  async aderirCampanha(clienteId, campanhaId) {
    const cam = Store.find("campanhas", campanhaId);
    const cli = this.cliente(clienteId);
    if (!cam || !cli) return null;
    cli.ofertas = cli.ofertas || [];
    if (!cli.ofertas.includes(cam.id)) cli.ofertas.push(cam.id);
    try {
      const data = await API.post("campanhas/aderir", { campanhaId });
      if (data?.store) Store.replace(data.store);
    } catch (e) {
      /* a adesão local vale até o próximo bootstrap */
    }
    return Store.find("campanhas", campanhaId) || cam;
  },

  novaSaidera({ clienteId, estabelecimentoId, bebidaId, campanhaId }) {
    const rec = {
      id: `sai-live-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      codigo: `SDR-${8800 + Store.data.saideras.length}`,
      clienteId,
      estabelecimentoId,
      bebidaId,
      status: "disponivel",
      conquistadaEm: new Date().toISOString(),
      utilizadaEm: null,
      campanhaId: campanhaId || null,
    };
    const exp = this.hoje();
    exp.setDate(exp.getDate() + this.diasValidade());
    rec.expiraEm = exp.toISOString();
    Store.data.saideras.unshift(rec);
    this.auditar("Saidera conquistada", `${this.cliente(clienteId)?.primeiroNome || ""} · ${this.bebida(bebidaId)?.nome || ""}`);
    return rec;
  },

  ajustarProgressoMeta(p, novaMeta, campanha) {
    if (!p || !novaMeta || novaMeta < 1) return [];
    const novas = [];
    const est = this.est(p.estabelecimentoId);
    const metaBar = this.metaOriginal(est, p.bebidaId);
    if (p.atual >= novaMeta) {
      novas.push(
        this.novaSaidera({
          clienteId: p.clienteId,
          estabelecimentoId: p.estabelecimentoId,
          bebidaId: p.bebidaId,
          campanhaId: campanha?.id || p.campanhaId,
        })
      );
      const resto = p.atual - novaMeta;
      this.consumirOferta(p.clienteId, campanha?.id || p.campanhaId, p.estabelecimentoId, p.bebidaId);
      const extra = Math.floor(resto / metaBar);
      for (let i = 0; i < extra; i++) {
        novas.push(
          this.novaSaidera({
            clienteId: p.clienteId,
            estabelecimentoId: p.estabelecimentoId,
            bebidaId: p.bebidaId,
          })
        );
      }
      p.atual = resto % metaBar;
      p.meta = metaBar;
    } else {
      p.meta = novaMeta;
    }
    p.atualizadoEm = new Date().toISOString();
    return novas;
  },

  ativarPatrocinio(campanha, { canal } = {}) {
    if (!campanha) return null;
    campanha.status = "ativa";
    campanha.disparada = true;
    if (canal) campanha.canal = canal;
    campanha.ativadaEm = new Date().toISOString();
    this.auditar("Disparo de campanha", campanha.titulo);
    const alteraMeta = campanha.alteraMeta !== false && campanha.metaTampas;
    campanha.patrocinioBar = Boolean(alteraMeta);
    if (alteraMeta) {
      const beb = this.bebida(campanha.bebidaId);
      const meta = campanha.metaTampas;
      const soPublico = campanha.origem === "estabelecimento" && campanha.publico && campanha.publico !== "todos";
      if (!soPublico) {
        (campanha.estabelecimentos || []).forEach((estId) => {
          const est = this.est(estId);
          if (!est) return;
          const item = (est.bebidas || []).find((b) => b.id === campanha.bebidaId);
          if (item) {
            if (item.metaOriginal == null) item.metaOriginal = item.meta || est.metaPadrao || 10;
            item.meta = meta;
            item.regra = "patrocinio";
            item.campanhaId = campanha.id;
          } else {
            est.bebidas = est.bebidas || [];
            est.bebidas.push({
              id: campanha.bebidaId,
              nome: beb?.nome || campanha.bebidaId,
              meta,
              metaOriginal: est.metaPadrao || 10,
              regra: "patrocinio",
              campanhaId: campanha.id,
            });
          }
          est.promocao = `${beb?.nome || "Oferta"} com Saidera em ${meta} Tampas`;
        });
      }
      Store.all("tampas")
        .filter(
          (t) => t.bebidaId === campanha.bebidaId && (campanha.estabelecimentos || []).includes(t.estabelecimentoId)
        )
        .forEach((t) => {
          if (campanha.origem === "estabelecimento" && !this.clienteNoPublico(t.clienteId, campanha)) return;
          t.campanhaId = campanha.id;
          this.ajustarProgressoMeta(t, meta, campanha);
        });
    }
    this.notificarDisparoCampanha(campanha);
    Store.save();
    return campanha;
  },

  notificarDisparoCampanha(cam) {
    const extra = cam.metaTampas ? ` ${cam.metaTampas} Tampas nesta casa.` : "";
    let ids;
    if (cam.origem === "estabelecimento") {
      ids = this.publicoCampanha(cam).map((c) => c.id);
      const soLista = cam.clienteIds?.length || cam.tipo === "chamar" || cam.publico === "aniversario";
      if (!soLista) {
        const demoId = Store.demo().clienteId;
        if (!ids.includes(demoId)) ids.unshift(demoId);
      }
      ids = ids.slice(0, cam.limite || 80);
    } else {
      ids = [Store.demo().clienteId];
    }
    ids.forEach((cliId, i) => {
      const ja = Store.all("notificacoes").some((n) => n.campanhaId === cam.id && n.clienteId === cliId);
      if (ja) return;
      Store.data.notificacoes.unshift({
        id: `ntf-oferta-${Date.now()}-${i}-${cliId}`,
        clienteId: cliId,
        titulo: cam.titulo,
        texto: `${cam.mensagem}${extra}`,
        tipo: "oferta",
        lida: false,
        criadoEm: new Date().toISOString(),
        campanhaId: cam.id,
      });
    });
  },

  progresso(clienteId, estId, bebidaId) {
    return Store.all("tampas").find(
      (t) => t.clienteId === clienteId && t.estabelecimentoId === estId && t.bebidaId === bebidaId
    );
  },

  garantirProgresso(clienteId, estId, bebidaId) {
    let p = this.progresso(clienteId, estId, bebidaId);
    if (!p) {
      const est = this.est(estId);
      p = {
        id: `tmp-live-${Date.now()}`,
        clienteId,
        estabelecimentoId: estId,
        bebidaId,
        atual: 0,
        meta: this.metaDe(est, bebidaId, clienteId),
        atualizadoEm: new Date().toISOString(),
      };
      Store.data.tampas.push(p);
    } else {
      p.meta = this.metaDe(this.est(estId), bebidaId, clienteId);
    }
    return p;
  },

  saiderasDe(clienteId, filtro) {
    return Store.all("saideras").filter((s) => {
      if (s.clienteId !== clienteId) return false;
      if (filtro && s.status !== filtro) return false;
      return true;
    });
  },

  saiderasDisponiveis(clienteId, estId, bebidaId) {
    this.hidratarSaideras();
    return Store.all("saideras").filter(
      (s) =>
        s.clienteId === clienteId &&
        s.status === "disponivel" &&
        (!estId || s.estabelecimentoId === estId) &&
        (!bebidaId || s.bebidaId === bebidaId)
    );
  },

  ticketPorCodigo(q) {
    let s = String(q || "").trim().toUpperCase();
    if (!s) return null;
    const parsed = window.QR?.parseTicket?.(s);
    if (parsed) s = parsed;
    return Store.all("tickets").find((t) => String(t.codigo || "").toUpperCase() === s) || null;
  },

  novoCodigoTicket() {
    let codigo = "";
    do {
      const raw = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(2, 7);
      codigo = `TKT-${(raw + "XXXXX").slice(0, 5)}`;
    } while (this.ticketPorCodigo(codigo));
    return codigo;
  },

  async criarTicket({ estabelecimentoId, itens }) {
    const data = await API.post("tickets", { estabelecimentoId, itens });
    if (data.store) Store.replace(data.store);
    return data.ticket;
  },

  async resgatarTicket(codigo) {
    try {
      const data = await API.post("tickets/resgatar", { codigo });
      if (data.store) Store.replace(data.store);
      return { ok: true, ticket: data.ticket, est: data.est, ganhas: data.ganhas, novas: data.novas };
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  },

  async entregarSaideraPorCodigo(codigo, estabelecimentoId, funcionarioId) {
    try {
      const data = await API.post("saideras/entregar", { codigo, estabelecimentoId, funcionarioId });
      if (data.store) Store.replace(data.store);
      return { ok: true, saidera: data.saidera };
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  },

  async entregarSaidera(saideraId, funcionarioId) {
    try {
      const data = await API.post("saideras/entregar", { saideraId, funcionarioId });
      if (data.store) Store.replace(data.store);
      return data.saidera;
    } catch {
      return null;
    }
  },

  async registrarConsumo(payload) {
    const data = await API.post("consumos", payload);
    if (data.store) Store.replace(data.store);
    return data.resultado;
  },

  entregarPrimeira(clienteId, estabelecimentoId, bebidaId, funcionarioId) {
    const s = this.saiderasDisponiveis(clienteId, estabelecimentoId, bebidaId)[0];
    if (!s) return null;
    return this.entregarSaidera(s.id, funcionarioId);
  },

  preferencias(clienteId, estabelecimentoId) {
    const list = Store.all("consumos").filter(
      (c) => c.clienteId === clienteId && (!estabelecimentoId || c.estabelecimentoId === estabelecimentoId)
    );
    const map = {};
    list.forEach((c) => {
      map[c.bebidaId] = (map[c.bebidaId] || 0) + c.quantidade;
    });
    return Object.entries(map)
      .map(([id, qtd]) => ({ id, qtd, nome: this.bebida(id)?.nome || id }))
      .sort((a, b) => b.qtd - a.qtd);
  },

  metricasCliente(clienteId) {
    const sais = this.saiderasDe(clienteId);
    const ests = new Set(Store.all("consumos").filter((c) => c.clienteId === clienteId).map((c) => c.estabelecimentoId));
    const prefs = this.preferencias(clienteId);
    return {
      tampas: Store.all("consumos").filter((c) => c.clienteId === clienteId).reduce((a, c) => a + (c.quantidade || 0), 0),
      saideras: sais.length,
      usadas: sais.filter((s) => s.status === "utilizada").length,
      disponiveis: sais.filter((s) => s.status === "disponivel").length,
      estabelecimentos: ests.size,
      favorita: prefs[0] ? this.bebida(prefs[0].id) : null,
      tampasPedidas: prefs.reduce((a, p) => a + p.qtd, 0),
    };
  },

  clientesDoEst(estId) {
    const ids = new Set(
      Store.all("tampas")
        .filter((t) => t.estabelecimentoId === estId)
        .map((t) => t.clienteId)
    );
    Store.all("consumos")
      .filter((c) => c.estabelecimentoId === estId)
      .forEach((c) => ids.add(c.clienteId));
    Store.all("saideras")
      .filter((s) => s.estabelecimentoId === estId)
      .forEach((s) => ids.add(s.clienteId));
    return [...ids].map((id) => this.cliente(id)).filter(Boolean);
  },

  diaKey(iso) {
    return String(iso || "").slice(0, 10);
  },

  freqLabel(f) {
    return { alta: "Vem sempre", media: "Regular", baixa: "Pouca frequência", fria: "Sumiu" }[f] || "—";
  },

  retratoCliente(clienteId, estId) {
    const c = this.cliente(clienteId);
    if (!c) return null;
    const cons = Store.all("consumos").filter((x) => x.clienteId === clienteId && (!estId || x.estabelecimentoId === estId));
    const prefs = this.preferencias(clienteId, estId);
    const tampasPedidas = prefs.reduce((a, p) => a + p.qtd, 0);
    const dias = new Set(cons.map((x) => this.diaKey(x.criadoEm)).filter(Boolean));
    const corte45 = this.hoje().getTime() - 45 * 86400000;
    const visitas45 = [...dias].filter((d) => new Date(d + "T12:00:00").getTime() >= corte45).length;
    const diasSem = this.diasSemVisita(c, estId);
    let frequencia = "baixa";
    if (diasSem == null || diasSem >= 30) frequencia = "fria";
    else if (visitas45 >= 4 || tampasPedidas >= 8) frequencia = "alta";
    else if (visitas45 >= 2) frequencia = "media";
    const sais = Store.all("saideras").filter((s) => s.clienteId === clienteId && (!estId || s.estabelecimentoId === estId));
    const tampas = Store.all("tampas").filter((t) => t.clienteId === clienteId && (!estId || t.estabelecimentoId === estId));
    return {
      ...c,
      favorita: prefs[0] || null,
      bebidas: prefs.map((p) => ({ ...p, pct: tampasPedidas ? Math.round((p.qtd / tampasPedidas) * 100) : 0 })),
      pedidos: cons.length,
      tampasPedidas,
      visitas: dias.size,
      visitas45,
      diasSem,
      frequencia,
      frequenciaLabel: this.freqLabel(frequencia),
      tampasAbertas: tampas.reduce((a, t) => a + (t.atual || 0), 0),
      saideras: {
        total: sais.length,
        disp: sais.filter((s) => s.status === "disponivel").length,
        usadas: sais.filter((s) => s.status === "utilizada").length,
        expiradas: sais.filter((s) => s.status === "expirada").length,
      },
      mediaPorVisita: dias.size ? Math.round((tampasPedidas / dias.size) * 10) / 10 : 0,
    };
  },

  painelCasa(estId) {
    const r = this.resumoEst(estId);
    const retratos = this.clientesDoEst(estId).map((c) => this.retratoCliente(c.id, estId)).filter(Boolean);
    const freq = { alta: 0, media: 0, baixa: 0, fria: 0 };
    retratos.forEach((x) => {
      if (freq[x.frequencia] != null) freq[x.frequencia] += 1;
    });
    const cons = Store.all("consumos").filter((c) => c.estabelecimentoId === estId);
    const byDrink = {};
    const drinkCli = {};
    cons.forEach((c) => {
      byDrink[c.bebidaId] = (byDrink[c.bebidaId] || 0) + (c.quantidade || 0);
      drinkCli[c.bebidaId] = drinkCli[c.bebidaId] || new Set();
      drinkCli[c.bebidaId].add(c.clienteId);
    });
    const total = Object.values(byDrink).reduce((a, b) => a + b, 0) || 1;
    const ranking = Object.entries(byDrink)
      .map(([id, qtd]) => ({
        id,
        nome: this.bebida(id)?.nome || "Bebida",
        qtd,
        pct: Math.round((qtd / total) * 100),
        clientes: (drinkCli[id] || new Set()).size,
      }))
      .sort((a, b) => b.qtd - a.qtd);
    const weekday = [0, 0, 0, 0, 0, 0, 0];
    cons.forEach((c) => {
      const d = new Date(c.criadoEm);
      if (!Number.isNaN(d.getTime())) weekday[d.getDay()] += c.quantidade || 0;
    });
    return {
      ...r,
      retratos,
      freq,
      ranking,
      menosSai: ranking.length > 1 ? [...ranking].reverse().slice(0, Math.min(4, ranking.length)) : [],
      topClientes: [...retratos].sort((a, b) => b.tampasPedidas - a.tampasPedidas).slice(0, 6),
      weekday: { labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], values: weekday },
      semana: this.semanaTampas(estId),
    };
  },

  painelCliente(clienteId) {
    const retrato = this.retratoCliente(clienteId);
    const cons = Store.all("consumos").filter((c) => c.clienteId === clienteId);
    const byEst = {};
    cons.forEach((c) => {
      byEst[c.estabelecimentoId] = (byEst[c.estabelecimentoId] || 0) + (c.quantidade || 0);
    });
    const total = Object.values(byEst).reduce((a, b) => a + b, 0) || 1;
    const casas = Object.entries(byEst)
      .map(([id, qtd]) => {
        const r = this.retratoCliente(clienteId, id);
        return {
          id,
          nome: this.est(id)?.nome || "Casa",
          qtd,
          pct: Math.round((qtd / total) * 100),
          frequencia: r?.frequencia,
          frequenciaLabel: r?.frequenciaLabel,
          favorita: r?.favorita,
          visitas: r?.visitas || 0,
          tampasPedidas: r?.tampasPedidas || 0,
        };
      })
      .sort((a, b) => b.qtd - a.qtd);
    const weekday = [0, 0, 0, 0, 0, 0, 0];
    cons.forEach((c) => {
      const d = new Date(c.criadoEm);
      if (!Number.isNaN(d.getTime())) weekday[d.getDay()] += c.quantidade || 0;
    });
    return {
      retrato,
      casas,
      ranking: (retrato?.bebidas || []).map((p) => ({ nome: p.nome, qtd: p.qtd, pct: p.pct })),
      weekday: { labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], values: weekday },
      semana: this.semanaTampas(null, clienteId),
    };
  },

  resumoEst(estId) {
    const cons = Store.all("consumos").filter((c) => c.estabelecimentoId === estId);
    const hojeKey = this.hoje().toISOString().slice(0, 10);
    const hoje = cons.filter((c) => (c.criadoEm || "").slice(0, 10) === hojeKey || new Date(c.criadoEm).toDateString() === this.hoje().toDateString());
    const sais = Store.all("saideras").filter((s) => s.estabelecimentoId === estId);
    const tkts = Store.all("tickets").filter((t) => t.estabelecimentoId === estId);
    const byDrink = {};
    cons.forEach((c) => {
      byDrink[c.bebidaId] = (byDrink[c.bebidaId] || 0) + c.quantidade;
    });
    const drinks = Object.entries(byDrink)
      .map(([id, q]) => ({ id, q, nome: this.bebida(id)?.nome || "Bebida" }))
      .sort((a, b) => b.q - a.q);
    const total = drinks.reduce((a, d) => a + d.q, 0) || 1;
    const mes = this.hoje().getMonth();
    const ano = this.hoje().getFullYear();
    const novos = this.clientesDoEst(estId).filter((c) => {
      const raw = c.clienteDesde;
      if (!raw) return false;
      const d = raw.includes("/") ? new Date(raw.split("/").reverse().join("-")) : new Date(raw);
      return !Number.isNaN(d.getTime()) && d.getMonth() === mes && d.getFullYear() === ano;
    }).length;
    return {
      clientes: this.clientesDoEst(estId).length,
      clientesHoje: new Set(hoje.map((c) => c.clienteId)).size,
      tampasHoje: hoje.reduce((a, c) => a + (c.quantidade || 0), 0),
      saiderasGanhas: sais.length,
      saiderasUsadas: sais.filter((s) => s.status === "utilizada").length,
      saiderasDisp: sais.filter((s) => s.status === "disponivel").length,
      ticketsAbertos: tkts.filter((t) => this.ticketStatus(t) === "aberto").length,
      inativos: this.inativosDoEst(estId).length,
      quase: this.quaseSaideraEst(estId).length,
      niver: this.aniversariantesEst(estId).length,
      novos,
      drinks: drinks.slice(0, 5).map((d) => ({ ...d, pct: Math.round((d.q / total) * 100) })),
    };
  },

  semanaTampas(estId, clienteId) {
    const cons = Store.all("consumos").filter(
      (c) => (!estId || c.estabelecimentoId === estId) && (!clienteId || c.clienteId === clienteId)
    );
    const labels = [];
    const values = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(this.hoje());
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""));
      values.push(cons.filter((c) => (c.criadoEm || "").slice(0, 10) === key).reduce((a, c) => a + (c.quantidade || 0), 0));
    }
    return { labels, values };
  },

  audienciasEstimar(a = {}) {
    const bairros = a.bairros;
    const bebidaId = a.bebidaId;
    const periodoDias = a.periodoDias ?? a.dias;
    const estabelecimentos = a.estabelecimentos ?? a.ests;
    const corte = Date.now() - (Number(periodoDias) || 90) * 86400000;
    const estSet = new Set(estabelecimentos || []);
    const bairroSet = new Set((bairros || []).filter(Boolean));
    const ids = new Set();
    const cons = Store.all("consumos");
    cons.forEach((c) => {
      if (estSet.size && !estSet.has(c.estabelecimentoId)) return;
      if (bebidaId && c.bebidaId !== bebidaId) return;
      if (c.criadoEm && new Date(c.criadoEm).getTime() < corte) return;
      const cli = this.cliente(c.clienteId);
      if (!cli || cli.status === "inativo") return;
      if (bairroSet.size && !bairroSet.has(cli.bairro)) return;
      ids.add(c.clienteId);
    });
    if (!cons.length) {
      Store.all("clientes").forEach((cli) => {
        if (cli.status === "inativo") return;
        if (bairroSet.size && !bairroSet.has(cli.bairro)) return;
        ids.add(cli.id);
      });
    }
    return ids.size;
  },

  ofertarCampanhaCliente(campanha) {
    return this.ativarPatrocinio(campanha);
  },
};

window.Logic = Logic;
