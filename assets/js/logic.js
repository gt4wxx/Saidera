const Logic = {
  hoje() {
    return new Date(2026, 7, 19);
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

  campanhasPatrocinio() {
    return Store.all("campanhas").filter((c) => c.status === "ativa" && c.disparada);
  },

  patrocinioEm(estId, bebidaId) {
    return this.campanhasPatrocinio().find(
      (c) => (!bebidaId || c.bebidaId === bebidaId) && (c.estabelecimentos || []).includes(estId)
    );
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
    const cam = this.patrocinioEm(estId, bebidaId);
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
    Store.data.saideras.unshift(rec);
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
    campanha.patrocinioBar = true;
    if (canal) campanha.canal = canal;
    campanha.ativadaEm = new Date().toISOString();
    const beb = this.bebida(campanha.bebidaId);
    const meta = campanha.metaTampas || 6;
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
    Store.all("tampas")
      .filter(
        (t) => t.bebidaId === campanha.bebidaId && (campanha.estabelecimentos || []).includes(t.estabelecimentoId)
      )
      .forEach((t) => {
        t.campanhaId = campanha.id;
        this.ajustarProgressoMeta(t, meta, campanha);
      });
    const cliId = Store.demo().clienteId;
    const jaNotificou = Store.all("notificacoes").some((n) => n.campanhaId === campanha.id && n.clienteId === cliId);
    if (!jaNotificou) {
      Store.data.notificacoes.unshift({
        id: `ntf-oferta-${Date.now()}`,
        clienteId: cliId,
        titulo: campanha.titulo,
        texto: `${campanha.mensagem} ${meta} Tampas nos bares participantes.`,
        tipo: "oferta",
        lida: false,
        criadoEm: new Date().toISOString(),
        campanhaId: campanha.id,
      });
    }
    Store.save();
    return campanha;
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

    Store.save();
    return { antes, depois: p.atual, meta: p.meta, ganhas, novas, progresso: p, ofertaConcluida, metaBar };
  },

  entregarSaidera(saideraId, funcionarioId) {
    const s = Store.find("saideras", saideraId);
    if (!s || s.status !== "disponivel") return null;
    s.status = "utilizada";
    s.utilizadaEm = new Date().toISOString();
    this.marcarTurno(funcionarioId || Store.demo().funcionarioId, { saideras: 1 });
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
    if (!estId) return { labels, values: [18420, 20110, 26340, 24800, 19120, 17640, 21480] };
    const cons = Store.all("consumos").filter((c) => c.estabelecimentoId === estId);
    const values = [18, 26, 41, 38, 22, 19, 28].map((base, i) => {
      const extra = cons.filter((c) => new Date(c.criadoEm).getDay() === (i + 4) % 7).reduce((a, c) => a + c.quantidade, 0);
      return base + (extra % 17);
    });
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
