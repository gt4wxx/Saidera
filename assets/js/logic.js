const Logic = {
  hoje() {
    return new Date(2026, 7, 19);
  },

  validadeDias: 15,

  hidratar() {
    const demo = Store.data?.meta?.demo;
    if (!demo) return;
    const saved = sessionStorage.getItem("saidera_cliente");
    if (saved && this.cliente(saved)) demo.clienteId = saved;
    if (!Store.data.auditoria) Store.data.auditoria = [];
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
        d.setDate(d.getDate() + this.validadeDias);
        s.expiraEm = d.toISOString();
        mudou = true;
      }
      if (s.status === "disponivel" && s.expiraEm && new Date(s.expiraEm) < hoje) {
        s.status = "expirada";
        mudou = true;
      }
    });
    const demoSai = Store.all("saideras").find((s) => s.codigo === "SDR-8842" && s.status === "disponivel");
    if (demoSai) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + 3);
      if (demoSai.expiraEm !== d.toISOString()) {
        demoSai.expiraEm = d.toISOString();
        mudou = true;
      }
    }
    if (mudou) Store.save(false);
  },

  diasRestantesSaidera(s) {
    if (!s?.expiraEm) return this.validadeDias;
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
    return ["cli-001", "cli-002", "cli-003"].map((id) => this.cliente(id)).filter(Boolean);
  },

  escolherClienteDemo(id) {
    const c = this.cliente(id);
    if (!c || !Store.data.meta?.demo) return null;
    Store.data.meta.demo.clienteId = id;
    sessionStorage.setItem("saidera_cliente", id);
    Store.save();
    this.auditar("Troca de cliente demo", c.nome);
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
        bebidaFavoritaId: c.bebidaFavoritaId || "beb-001",
      };
    }
    return c.prefs;
  },

  salvarPrefsCliente(clienteId, patch) {
    const prefs = this.prefsCliente(clienteId);
    Object.assign(prefs, patch);
    const c = this.cliente(clienteId);
    if (patch.bebidaFavoritaId) c.bebidaFavoritaId = patch.bebidaFavoritaId;
    Store.save();
    return prefs;
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
    const vivos = Store.all("auditoria");
    const seed = Store.all("consumos")
      .filter((c) => String(c.id || "").startsWith("con-") && !String(c.id).includes("live"))
      .slice(0, 10)
      .map((c) => ({
        em: c.criadoEm,
        acao: "Registro de consumo",
        detalhe: `${this.est(c.estabelecimentoId)?.nome || ""} · ${this.cliente(c.clienteId)?.primeiroNome || ""} · ${this.bebida(c.bebidaId)?.nome || ""}`,
      }));
    return [...vivos, ...seed].slice(0, 40);
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

  fmtKm(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1).replace(".", ",")} km`;
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
    return Store.find("bebidas", id);
  },

  est(id) {
    return Store.find("estabelecimentos", id);
  },

  tipoEst(est) {
    return est?.tipo === "restaurante" ? "Restaurante" : "Bar";
  },

  imagemPadraoEst(est) {
    const tipo = typeof est === "string" ? this.est(est)?.tipo : est?.tipo;
    return tipo === "restaurante"
      ? "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=900&q=80&auto=format&fit=crop";
  },

  imagemEst(est) {
    if (typeof est === "string") est = this.est(est);
    if (!est) return this.imagemPadraoEst();
    return est.cartaz || est.imagem || this.imagemPadraoEst(est);
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
    return Store.all("campanhas").filter((c) => {
      if (c.status !== "ativa" || !c.disparada) return false;
      if (clienteId && !this.clienteNoPublico(clienteId, c)) return false;
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

  inativosDoEst(estId) {
    const corte = this.hoje().getTime() - 30 * 86400000;
    const doBar = this.clientesDoEst(estId).filter((c) => c.id !== "cli-001");
    const frios = doBar.filter((c) => !c.ultimaVisitaIso || new Date(c.ultimaVisitaIso).getTime() < corte);
    const ids = new Set(frios.map((c) => c.id));
    const extraBar = doBar.filter((c) => !ids.has(c.id));
    extraBar.forEach((c) => ids.add(c.id));
    const pool = [...frios, ...extraBar];
    Store.all("clientes").forEach((c) => {
      if (c.id !== "cli-001" && !ids.has(c.id)) pool.push(c);
    });
    return pool.slice(0, 80);
  },

  publicoCampanha(cam) {
    const estId = cam?.estabelecimentoId || (cam?.estabelecimentos || [])[0];
    if (!estId) return [];
    if (cam.clienteIds?.length) {
      return cam.clienteIds.map((id) => this.cliente(id)).filter(Boolean);
    }
    let clientes =
      cam.publico === "inativos" || cam.tipo === "chamar" ? this.inativosDoEst(estId) : this.clientesDoEst(estId);
    if (cam.publico === "aniversario") {
      clientes = this.clientesDoEst(estId).filter((c) => this.ehAniversarianteMes(c));
    } else if (cam.publico === "quase") {
      const ids = new Set(
        Store.all("tampas")
          .filter((t) => t.estabelecimentoId === estId && t.meta - t.atual <= 2 && t.atual > 0)
          .map((t) => t.clienteId)
      );
      clientes = this.clientesDoEst(estId).filter((c) => ids.has(c.id));
    }
    if (cam.limite) clientes = clientes.slice(0, cam.limite);
    return clientes;
  },

  clienteNoPublico(clienteId, cam) {
    if (!cam || cam.origem !== "estabelecimento") return true;
    if (cam.clienteIds?.length) return cam.clienteIds.includes(clienteId);
    if (clienteId === Store.demo()?.clienteId && cam.publico !== "aniversario" && cam.tipo !== "chamar") return true;
    return this.publicoCampanha(cam).some((c) => c.id === clienteId);
  },

  estimarPublicoCasa(estId, publico) {
    const n = this.publicoCampanha({ estabelecimentoId: estId, estabelecimentos: [estId], publico }).length;
    const demo = { todos: 486, aniversario: 36, inativos: 127, quase: 47 };
    return Math.max(n, demo[publico] || n);
  },

  solicitarCampanhaCasa({
    estabelecimentoId,
    tipo,
    publico,
    titulo,
    mensagem,
    bebidaId,
    metaTampas,
    canal,
    clienteIds,
    limite,
  }) {
    const est = this.est(estabelecimentoId);
    const modelo = this.modelosCampanhaCasa(est)[tipo] || this.modelosCampanhaCasa(est).comparecer;
    const alteraMeta = modelo.alteraMeta;
    const per = this.periodoCampanha();
    const ids = [...new Set(clienteIds || [])];
    const cam = {
      id: `cam-casa-${Date.now()}`,
      titulo: titulo || modelo.titulo,
      origem: "estabelecimento",
      estabelecimentoId,
      parceiroId: null,
      status: "solicitada",
      tipo,
      publico: publico || modelo.publico,
      mensagem: mensagem || modelo.mensagem,
      metaTampas: alteraMeta ? Number(metaTampas) || modelo.metaTampas || 6 : null,
      alteraMeta,
      bebidaId: alteraMeta ? bebidaId || est?.bebidas?.[0]?.id || "beb-001" : bebidaId || "beb-001",
      estabelecimentos: [estabelecimentoId],
      periodoInicio: per.inicio,
      periodoFim: per.fim,
      clienteIds: ids,
      limite: ids.length || limite || null,
      publicoPotencial: ids.length || limite || this.estimarPublicoCasa(estabelecimentoId, publico || modelo.publico),
      participantes: 0,
      saideras: 0,
      canal: canal || "push",
      disparada: false,
      patrocinioBar: false,
      solicitadaEm: new Date().toISOString(),
    };
    Store.data.campanhas.unshift(cam);
    this.auditar("Solicitação de campanha", `${est?.nome || "Casa"} · ${cam.titulo}`);
    Store.save();
    return cam;
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
    return list.length ? list : [this.bebida("beb-001")].filter(Boolean);
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
    return (cli?.ofertasConsumidas || []).some(
      (x) => x.campanhaId === campanhaId && x.estabelecimentoId === estId && x.bebidaId === bebidaId
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
    const cli = this.cliente(clienteId);
    const aderiu = (cli?.ofertas || []).includes(cam.id);
    if (aderiu || cam.patrocinioBar) return cam;
    return null;
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

  aderirCampanha(clienteId, campanhaId) {
    const cam = Store.find("campanhas", campanhaId);
    const cli = this.cliente(clienteId);
    if (!cam || !cli) return null;
    cli.ofertas = cli.ofertas || [];
    let mudou = false;
    if (!cli.ofertas.includes(cam.id)) {
      cli.ofertas.push(cam.id);
      cam.participantes = (cam.participantes || 0) + 1;
      mudou = true;
    }
    const antes = Store.data.tampas.length;
    (cam.estabelecimentos || []).forEach((estId) => {
      this.garantirProgresso(clienteId, estId, cam.bebidaId);
    });
    if (mudou || Store.data.tampas.length !== antes) Store.save();
    return cam;
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
    exp.setDate(exp.getDate() + this.validadeDias);
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

  registrarConsumo({ clienteId, estabelecimentoId, bebidaId, quantidade, funcionarioId }) {
    const est = this.est(estabelecimentoId);
    const cam = this.ofertaAtivaPara(clienteId, estabelecimentoId, bebidaId);
    const metaOferta = cam?.metaTampas || null;
    const metaBar = this.metaOriginal(est, bebidaId);
    const p = this.garantirProgresso(clienteId, estabelecimentoId, bebidaId);
    const antes = p.atual;
    let ganhas = 0;
    let ofertaConcluida = false;
    const novas = [];

    if (metaOferta) {
      const total = p.atual + quantidade;
      if (total >= metaOferta) {
        ganhas += 1;
        ofertaConcluida = true;
        novas.push(
          this.novaSaidera({ clienteId, estabelecimentoId, bebidaId, campanhaId: cam.id })
        );
        this.consumirOferta(clienteId, cam.id, estabelecimentoId, bebidaId);
        const resto = total - metaOferta;
        const extra = Math.floor(resto / metaBar);
        ganhas += extra;
        for (let i = 0; i < extra; i++) {
          novas.push(this.novaSaidera({ clienteId, estabelecimentoId, bebidaId }));
        }
        p.atual = resto % metaBar;
        p.meta = metaBar;
      } else {
        p.atual = total;
        p.meta = metaOferta;
      }
    } else {
      const total = p.atual + quantidade;
      const extra = Math.floor(total / metaBar);
      ganhas = extra;
      p.atual = total % metaBar;
      p.meta = metaBar;
      for (let i = 0; i < extra; i++) {
        novas.push(this.novaSaidera({ clienteId, estabelecimentoId, bebidaId }));
      }
    }
    p.atualizadoEm = new Date().toISOString();

    Store.data.consumos.unshift({
      id: `con-live-${Date.now()}`,
      clienteId,
      estabelecimentoId,
      bebidaId,
      quantidade,
      funcionarioId: funcionarioId || Store.demo().funcionarioId,
      criadoEm: new Date().toISOString(),
    });
    this.marcarTurno(funcionarioId || Store.demo().funcionarioId, { tampas: quantidade });

    const cli = this.cliente(clienteId);
    cli.ultimaVisita = new Date().toLocaleDateString("pt-BR");
    cli.ultimaVisitaIso = new Date().toISOString();

    const titulo = ofertaConcluida
      ? "Oferta concluída! Você ganhou uma Saidera"
      : ganhas
        ? "Você ganhou uma Saidera!"
        : `${quantidade} Tampa${quantidade > 1 ? "s" : ""} registrada${quantidade > 1 ? "s" : ""}`;
    const texto = ofertaConcluida
      ? `${this.bebida(bebidaId).nome} no ${est.nome}. A próxima Saidera volta à regra da casa: ${metaBar} Tampas.`
      : ganhas
        ? `${this.bebida(bebidaId).nome} no ${est.nome}. Mostre ao garçom para resgatar.`
        : `${this.bebida(bebidaId).nome} no ${est.nome}: ${p.atual}/${p.meta}.`;

    Store.data.notificacoes.unshift({
      id: `ntf-live-${Date.now()}`,
      clienteId,
      titulo,
      texto,
      tipo: ganhas ? "saidera" : "progresso",
      lida: false,
      criadoEm: new Date().toISOString(),
    });

    this.auditar("Registro de consumo", `${est.nome} · ${cli.primeiroNome} · ${this.bebida(bebidaId).nome} ×${quantidade}`);
    Store.save();
    return { antes, depois: p.atual, meta: p.meta, ganhas, novas, progresso: p, ofertaConcluida, metaBar };
  },

  entregarSaidera(saideraId, funcionarioId) {
    this.hidratarSaideras();
    const s = Store.find("saideras", saideraId);
    if (!s || s.status !== "disponivel") return null;
    if (s.expiraEm && new Date(s.expiraEm) < this.hoje()) {
      s.status = "expirada";
      Store.save();
      return null;
    }
    s.status = "utilizada";
    s.utilizadaEm = new Date().toISOString();
    this.marcarTurno(funcionarioId || Store.demo().funcionarioId, { saideras: 1 });
    this.auditar("Entrega de Saidera", `${this.cliente(s.clienteId)?.primeiroNome || ""} · ${this.bebida(s.bebidaId)?.nome || ""} · ${s.codigo}`);
    Store.save();
    return s;
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
    const tampas = Store.all("tampas").filter((t) => t.clienteId === clienteId);
    const sais = this.saiderasDe(clienteId);
    const ests = new Set(Store.all("consumos").filter((c) => c.clienteId === clienteId).map((c) => c.estabelecimentoId));
    const prefs = this.preferencias(clienteId);
    return {
      tampas: tampas.reduce((a, t) => a + t.atual, 0) + sais.length * 8,
      saideras: sais.length,
      usadas: sais.filter((s) => s.status === "utilizada").length,
      disponiveis: sais.filter((s) => s.status === "disponivel").length,
      estabelecimentos: ests.size,
      favorita: prefs[0] ? this.bebida(prefs[0].id) : this.bebida("beb-001"),
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

  resumoEst(estId) {
    const cons = Store.all("consumos").filter((c) => c.estabelecimentoId === estId);
    const hoje = cons.filter((c) => c.criadoEm.slice(0, 10) === "2026-08-19" || new Date(c.criadoEm).toDateString() === new Date().toDateString());
    const sais = Store.all("saideras").filter((s) => s.estabelecimentoId === estId);
    const byDrink = {};
    cons.forEach((c) => {
      byDrink[c.bebidaId] = (byDrink[c.bebidaId] || 0) + c.quantidade;
    });
    const drinks = Object.entries(byDrink)
      .map(([id, q]) => ({ id, q, nome: this.bebida(id)?.nome }))
      .sort((a, b) => b.q - a.q);
    const total = drinks.reduce((a, d) => a + d.q, 0) || 1;
    return {
      clientesHoje: new Set(hoje.map((c) => c.clienteId)).size || 38,
      tampasHoje: hoje.reduce((a, c) => a + c.quantidade, 0) || 126,
      saiderasGanhas: sais.length,
      saiderasUsadas: sais.filter((s) => s.status === "utilizada").length,
      drinks: drinks.slice(0, 5).map((d) => ({ ...d, pct: Math.round((d.q / total) * 100) })),
    };
  },

  semanaTampas(estId) {
    const labels = ["Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Qua"];
    const cons = Store.all("consumos").filter((c) => !estId || c.estabelecimentoId === estId);
    const values = labels.map((_, i) => {
      const day = (i + 4) % 7;
      return cons.filter((c) => new Date(c.criadoEm).getDay() === day).reduce((a, c) => a + (c.quantidade || 0), 0);
    });
    if (estId && values.every((v) => v === 0)) return { labels, values: [18, 26, 41, 38, 22, 19, 28] };
    return { labels, values };
  },

  audienciasEstimar({ bairros, bebidaId, periodoDias, estabelecimentos }) {
    let n = 620;
    n += (bairros?.length || 0) * 480;
    n += (estabelecimentos?.length || 0) * 210;
    if (bebidaId === "beb-001") n += 900;
    n += Math.round((periodoDias || 90) * 8.4);
    return Math.min(n, 12430);
  },

  ofertarCampanhaCliente(campanha) {
    return this.ativarPatrocinio(campanha);
  },
};

window.Logic = Logic;
