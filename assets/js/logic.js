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

  metaDe(est, bebidaId) {
    const item = (est.bebidas || []).find((b) => b.id === bebidaId);
    if (item && item.meta) return item.meta;
    return est.metaPadrao || 10;
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
        meta: this.metaDe(est, bebidaId),
        atualizadoEm: new Date().toISOString(),
      };
      Store.data.tampas.push(p);
    } else {
      p.meta = this.metaDe(this.est(estId), bebidaId);
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
    const meta = this.metaDe(est, bebidaId);
    const p = this.garantirProgresso(clienteId, estabelecimentoId, bebidaId);
    const antes = p.atual;
    const total = p.atual + quantidade;
    const ganhas = Math.floor(total / meta);
    p.atual = total % meta;
    p.meta = meta;
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

    const novas = [];
    for (let i = 0; i < ganhas; i++) {
      const rec = {
        id: `sai-live-${Date.now()}-${i}`,
        codigo: `SDR-${8800 + Store.data.saideras.length + i}`,
        clienteId,
        estabelecimentoId,
        bebidaId,
        status: "disponivel",
        conquistadaEm: new Date().toISOString(),
        utilizadaEm: null,
      };
      Store.data.saideras.unshift(rec);
      novas.push(rec);
    }

    const cli = this.cliente(clienteId);
    cli.ultimaVisita = new Date().toLocaleDateString("pt-BR");
    cli.ultimaVisitaIso = new Date().toISOString();

    Store.data.notificacoes.unshift({
      id: `ntf-live-${Date.now()}`,
      clienteId,
      titulo: ganhas ? "Você ganhou uma Saidera!" : `${quantidade} Tampa${quantidade > 1 ? "s" : ""} registrada${quantidade > 1 ? "s" : ""}`,
      texto: ganhas
        ? `${this.bebida(bebidaId).nome} no ${est.nome}. Mostre ao garçom para resgatar.`
        : `${this.bebida(bebidaId).nome} no ${est.nome}: ${p.atual}/${meta}.`,
      tipo: ganhas ? "saidera" : "progresso",
      lida: false,
      criadoEm: new Date().toISOString(),
    });

    Store.save();
    return { antes, depois: p.atual, meta, ganhas, novas, progresso: p };
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
    Store.data.notificacoes.unshift({
      id: `ntf-oferta-${Date.now()}`,
      clienteId: Store.demo().clienteId,
      titulo: campanha.titulo,
      texto: campanha.mensagem,
      tipo: "oferta",
      lida: false,
      criadoEm: new Date().toISOString(),
      campanhaId: campanha.id,
    });
    campanha.status = "ativa";
    campanha.disparada = true;
    Store.save();
  },
};

window.Logic = Logic;
