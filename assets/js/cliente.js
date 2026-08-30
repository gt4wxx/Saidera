const ClienteApp = {
  root: null,
  view: "home",
  params: {},
  mapSel: null,
  mapBairro: null,
  mapPage: 1,
  homePage: 1,
  homeQuery: "",
  homePerPage: 10,
  geo: (() => {
    try {
      return JSON.parse(sessionStorage.getItem("saidera_geo") || "null");
    } catch {
      return null;
    }
  })(),

  async boot() {
    this.root = document.getElementById("app");
    const msg = document.getElementById("cli-boot-msg");
    const aviso = setTimeout(() => {
      if (msg) msg.textContent = "Ainda carregando. Confira a internet do celular.";
    }, 4000);
    try {
      const ok = await Store.init({ papel: "cliente" });
      if (!ok) return;
      if (!Store.session?.impersonando && !UI.pwaStandalone() && !UI.pwaCelular()) {
        location.replace("../entrar.php");
        return;
      }
      UI.bindGlobal();
      if (this.geo) Logic.aplicarDistancias(this.geo);
      Store.on(() => this.render());
      Store.startLive();
      window.addEventListener("hashchange", () => this.route());
      this.route();
    } catch (e) {
      if (this.root) {
        this.root.innerHTML = `<main class="landing" style="padding:32px 16px;max-width:480px;margin:0 auto;text-align:center">
          <p class="muted">${this.esc(e.message || "Não foi possível abrir o painel.")}</p>
          <button type="button" class="btn btn-gold btn-block" style="margin-top:16px" onclick="location.reload()">Tentar de novo</button>
        </main>`;
      }
    } finally {
      clearTimeout(aviso);
    }
  },

  me() {
    return Logic.cliente(Store.session?.clienteId) || null;
  },

  badgeFreq(f) {
    return `<span class="badge freq-${f || "baixa"}">${Logic.freqLabel(f)}</span>`;
  },

  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  foto(src) {
    return Logic.avatarUrl(src);
  },

  temFoto(src) {
    return Boolean(src && !/icon-192|brand\//i.test(src));
  },

  vazio(titulo, texto, cta, href) {
    const attr = href === "#/ler" ? "data-camera-go" : "data-go";
    return `<div class="card pad empty-cli">
      <h3>${this.esc(titulo)}</h3>
      <p class="muted small">${this.esc(texto)}</p>
      ${cta ? `<button class="btn btn-gold btn-block" style="margin-top:12px" ${attr}="${href}">${this.esc(cta)}</button>` : ""}
    </div>`;
  },

  async copiar(texto, msg) {
    try {
      await navigator.clipboard.writeText(texto);
      UI.toast(msg || "Copiado.");
    } catch {
      UI.toast("Anote este código: " + texto);
    }
  },

  pedirOndeEstou() {
    UI.pedirLocalizacao()
      .then((geo) => {
        this.geo = geo;
        try {
          sessionStorage.setItem("saidera_geo", JSON.stringify(this.geo));
        } catch {
          /* sessão sem storage */
        }
        Logic.aplicarDistancias(this.geo);
        this.render();
        UI.toast("Lista ordenada pelo que está perto de você.");
      })
      .catch((e) => UI.toast(e.message || "Não deu para ver onde você está."));
  },

  cardRitmo(compacto = false) {
    const me = this.me();
    const painel = Logic.painelCliente(me.id);
    const r = painel.retrato;
    if (!r || !r.tampasPedidas) return "";
    const donutBebidas = painel.ranking.slice(0, 4).map((p, i) => ({
      nome: p.nome,
      n: p.qtd,
      cor: ["#F5B800", "#1B3A5F", "#C4A35A", "#8B1E3F"][i],
    }));
    if (compacto) {
      return `<article class="card pad" style="margin:14px 0" data-go="#/historico">
        <p class="tiny muted">Seu ritmo</p>
        <h3 style="margin:4px 0 8px">${r.favorita?.nome || "Suas bebidas"}</h3>
        <p class="small muted">${r.tampasPedidas} tampas · ${r.visitas} visita${r.visitas === 1 ? "" : "s"} · ${r.frequenciaLabel}</p>
        ${this.badgeFreq(r.frequencia)}
        <p class="tiny gold" style="margin-top:8px">Ver meu histórico ›</p>
      </article>`;
    }
    return `
      <div class="grid-3" style="margin-bottom:12px">
        <div class="kpi"><b>${r.visitas}</b><span>Visitas</span></div>
        <div class="kpi"><b>${r.pedidos}</b><span>Pedidos</span></div>
        <div class="kpi"><b>${r.mediaPorVisita}</b><span>Média por visita</span></div>
      </div>
      ${donutBebidas.length ? `<div class="card pad" style="margin-bottom:12px"><p class="tiny muted" style="margin-bottom:8px">O que você mais pede</p>${UI.donut(donutBebidas, "tampas")}</div>` : ""}
      ${painel.ranking.length ? `<div class="card pad" style="margin-bottom:12px"><p class="tiny muted" style="margin-bottom:8px">Ranking das suas bebidas</p>${UI.rankBars(painel.ranking.slice(0, 5))}</div>` : ""}
      ${painel.casas.length ? `<div class="card pad" style="margin-bottom:12px"><p class="tiny muted" style="margin-bottom:8px">Onde você mais vai</p>${UI.rankBars(painel.casas.slice(0, 5))}</div>` : ""}
    `;
  },

  route() {
    const raw = (location.hash || "#/home").slice(1);
    const parts = raw.split("/").filter(Boolean);
    this.view = parts[0] || "home";
    this.params = { id: parts[1], id2: parts[2] };
    this.render();
    this.root.querySelector(".phone-body")?.scrollTo(0, 0);
  },

  go(h) {
    location.hash = h;
  },

  render() {
    if (!this.root) return;
    if (this.view !== "ler" && window.QR?.stopScan) QR.stopScan();
    if (!this.me()) {
      this.root.innerHTML = `<main class="landing" style="padding:32px 16px;max-width:480px;margin:0 auto;text-align:center">
        <h2>Sua conta não carregou</h2>
        <p class="muted" style="margin:10px 0 16px">Feche o app e abra de novo pelo ícone. Ou entre outra vez.</p>
        <a class="btn btn-gold btn-block" href="../entrar.php">Ir para o login</a>
      </main>`;
      return;
    }
    try {
      const html = {
        home: () => this.home(),
        explorar: () => this.explorar(),
        mapa: () => this.mapa(),
        est: () => this.detalhe(),
        tampas: () => this.tampas(),
        saideras: () => this.saideras(),
        ofertas: () => this.ofertas(),
        perfil: () => this.perfil(),
        qr: () => this.qr(),
        ler: () => this.ler(),
        notificacoes: () => this.notificacoes(),
        historico: () => this.historico(),
        preferencias: () => this.preferencias(),
        privacidade: () => this.privacidade(),
        conta: () => this.conta(),
      }[this.view] || (() => this.home());
      this.root.innerHTML = `<div class="phone-stage"><div class="phone-shell">
        <div class="phone-body">${html()}</div>
        ${this.nav()}
      </div></div>`;
      this.bind();
    } catch (e) {
      this.root.innerHTML = `<main class="landing" style="padding:32px 16px;max-width:480px;margin:0 auto;text-align:center">
        <h2>Não deu para montar a tela</h2>
        <p class="muted" style="margin:10px 0 16px">${this.esc(e.message || "Erro inesperado.")}</p>
        <button type="button" class="btn btn-gold btn-block" onclick="location.reload()">Tentar de novo</button>
      </main>`;
    }
  },

  nav() {
    if (this.view === "qr" || this.view === "ler") return "";
    const items = [
      ["explorar", "Explorar", Icons.compass()],
      ["tampas", "Tampas", Icons.tampas()],
      ["saideras", "Saideiras", Icons.gift()],
      ["ofertas", "Ofertas", Icons.flame()],
      ["perfil", "Perfil", Icons.user()],
    ];
    const on = this.view === "home" ? "explorar" : this.view;
    return `<nav class="bottom-nav">${items
      .map(
        ([id, l, ic]) =>
          `<button class="${on === id ? "on" : ""}" data-go="#/${id === "explorar" ? "home" : id}">${ic}<span>${l}</span></button>`
      )
      .join("")}</nav>`;
  },

  top(extra = "") {
    const me = this.me();
    const unread = Store.all("notificacoes").filter((n) => n.clienteId === me.id && !n.lida).length;
    return `<div class="topbar">
      <div class="logo-row">${Brand.horizontal("brand-h brand-h-sm")}</div>
      <div class="row">
        <button class="icon-btn" data-go="#/qr" title="Meu QR">${Icons.qr()}</button>
        <button class="icon-btn ${unread ? "dot-n" : ""}" data-go="#/notificacoes">${Icons.bell()}</button>
        <img class="avatar" src="${this.foto(me.avatar)}" alt="${this.esc(me.primeiroNome)}" data-go="#/perfil"/>
      </div>
    </div>${extra}`;
  },

  back(title) {
    const outro = this.view === "ler" ? "#/qr" : "#/ler";
    const dica = this.view === "ler" ? "Meu QR" : "Ler QR da casa";
    return `<div class="topbar">
      <button class="icon-btn" data-back>${Icons.back()}</button>
      <strong>${title}</strong>
      <button class="icon-btn" data-go="${outro}" title="${dica}">${Icons.qr()}</button>
    </div>`;
  },

  heroCard() {
    const me = this.me();
    const ganhas = Logic.saiderasDisponiveis(me.id);
    const recente = ganhas[0];
    if (recente) {
      const est = Logic.est(recente.estabelecimentoId);
      const beb = Logic.bebida(recente.bebidaId);
      return `<article class="hero-progress" data-go="#/saideras">
        <div class="bg">${UI.photo(Logic.imagemEst(est), est.nome)}</div>
        <div class="overlay"></div>
        <div class="content">
          <span class="badge badge-gold">VOCÊ GANHOU</span>
          <h2>Você ganhou uma Saideira! 🍺</h2>
          <p>${beb.nome} · ${est.nome}</p>
          <div class="cta-row"><button type="button" class="btn btn-gold btn-sm">Ver Saideira</button></div>
        </div>
      </article>`;
    }
    const list = Store.all("tampas").filter((t) => t.clienteId === me.id && t.atual > 0);
    const p = list.sort((a, b) => b.atual / b.meta - a.atual / a.meta)[0];
    const est = p ? Logic.est(p.estabelecimentoId) : Store.all("estabelecimentos")[0];
    if (!est) {
      return `<article class="hero-progress" data-camera-go="#/ler">
        <div class="content" style="padding:18px">
          <h2>Leia o QR da casa</h2>
          <p class="muted">As Tampas entram no app quando você lê o cupom impresso.</p>
        </div>
      </article>`;
    }
    if (!p) {
      return `<article class="hero-progress" data-go="#/est/${est.id}">
        <div class="bg">${UI.photo(Logic.imagemEst(est), est.nome)}</div>
        <div class="overlay"></div>
        <div class="content">
          <span class="badge badge-gold">COMECE AQUI</span>
          <h2>${est.nome}</h2>
          <p>Leia o QR da casa ou mostre o seu ao garçom.</p>
        </div>
      </article>`;
    }
    const falta = p.meta - p.atual;
    const beb = Logic.bebida(p.bebidaId);
    return `<article class="hero-progress" data-go="#/est/${est.id}">
      <div class="bg">${UI.photo(Logic.imagemEst(est), est.nome)}</div>
      <div class="overlay"></div>
      <div class="content">
        <span class="badge badge-gold">VOCÊ ESTÁ QUASE LÁ 🍺</span>
        <h2>${est.nome}</h2>
        <p>${beb?.nome || "Bebida"} · ${p.atual} / ${p.meta} Tampas</p>
        <div style="margin:12px 0">${UI.tampas(p.atual, p.meta)}</div>
        ${UI.barra(p.atual, p.meta)}
        <p style="margin-top:10px;font-weight:700">Falta apenas ${falta} ${falta === 1 ? "Tampa" : "Tampas"} 🍺</p>
      </div>
    </article>`;
  },

  estMini(e, { campanha, pin } = {}) {
    const me = this.me();
    const drinks = (e.bebidas || [])
      .slice(0, 3)
      .map((b) => {
        const cam = campanha && campanha.bebidaId === b.id ? campanha : Logic.patrocinioEm(e.id, b.id);
        const usada = cam && Logic.ofertaConsumida(me.id, cam.id, e.id, b.id);
        const meta = Logic.metaDe(e, b.id, me.id);
        return `<span class="chip ${cam && !usada ? "patrocinio" : ""}">${b.nome} — ${meta}${cam && !usada ? " · oferta" : usada ? " · casa" : ""}</span>`;
      })
      .join("");
    const camBar = campanha || Logic.patrocinioEm(e.id);
    return `<article class="est-card" ${pin ? `data-pin="${e.id}"` : `data-go="#/est/${e.id}"`}>
      <div class="thumb photo"><img src="${Logic.imagemEst(e)}" alt="${e.nome}" onerror="this.onerror=null;this.src='${Logic.imagemPadraoEst(e)}'"/></div>
      <div class="body">
        <h3>${this.esc(e.nome)}</h3>
        <p class="small muted">📍 ${Logic.tipoEst(e)} · ${this.esc(e.bairro || Logic.enderecoLinha(e))}${e.temDistancia ? " · " + Logic.fmtKm(e.distanciaKm) : ""} ${e.aberto === false ? "· Fechado" : "· Aberto"}</p>
        <div class="chips">${drinks}<span class="chip">Padrão — ${e.metaPadrao}</span></div>
        ${camBar ? `<p class="tiny gold">${Logic.bebida(camBar.bebidaId)?.nome} · ${camBar.metaTampas} Tampas no patrocínio</p>` : e.promocao ? `<p class="tiny gold">${e.promocao}</p>` : ""}
        <button type="button" class="btn btn-dark btn-sm" style="margin-top:8px">Ver estabelecimento</button>
      </div>
    </article>`;
  },

  norm(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  },

  listaEstabelecimentos() {
    const q = this.norm(this.homeQuery.trim());
    const minhas = Logic.idsCasasDoCliente(this.me().id);
    return Store.all("estabelecimentos")
      .filter((e) => e.status === "ativo")
      .filter((e) => {
        if (!q) return true;
        return [e.nome, e.bairro, e.endereco, e.promocao, Logic.tipoEst(e)].some((v) => this.norm(v).includes(q));
      })
      .sort((a, b) => {
        if (a.temDistancia || b.temDistancia) return (a.distanciaKm || 99) - (b.distanciaKm || 99);
        const am = minhas.has(a.id) ? 0 : 1;
        const bm = minhas.has(b.id) ? 0 : 1;
        if (am !== bm) return am - bm;
        return String(a.nome).localeCompare(String(b.nome), "pt-BR");
      });
  },

  pager(page, pages) {
    if (pages <= 1) return "";
    const windowSize = 4;
    const start = Math.min(page, Math.max(1, pages - windowSize + 1));
    const end = Math.min(pages, start + windowSize - 1);
    const nums = [];
    for (let n = start; n <= end; n++) nums.push(n);
    const dots = `<span class="pager-dots" aria-hidden="true">…</span>`;
    const buttons = nums
      .map(
        (n) =>
          `<button type="button" class="pager-num ${n === page ? "on" : ""}" data-page="${n}" aria-label="Página ${n}" ${n === page ? "aria-current='page'" : ""}>${n}</button>`
      )
      .join("");
    return `<nav class="pager" aria-label="Páginas de estabelecimentos">
      <button type="button" class="pager-nav" data-page="${Math.max(1, page - 1)}" ${page === 1 ? "disabled" : ""} aria-label="Página anterior">‹</button>
      ${start > 1 ? dots : ""}
      ${buttons}
      ${end < pages ? dots : ""}
      <button type="button" class="pager-nav" data-page="${Math.min(pages, page + 1)}" ${page === pages ? "disabled" : ""} aria-label="Próxima página">›</button>
    </nav>`;
  },

  home() {
    const me = this.me();
    const list = this.listaEstabelecimentos();
    const per = this.homePerPage;
    const pages = Math.max(1, Math.ceil(list.length / per));
    if (this.homePage > pages) this.homePage = pages;
    if (this.homePage < 1) this.homePage = 1;
    const page = this.homePage;
    const start = (page - 1) * per;
    const slice = list.slice(start, start + per);
    const from = list.length ? start + 1 : 0;
    const to = start + slice.length;
    const titulo = this.homeQuery.trim() ? "Resultados" : this.geo ? "Perto de você" : "Casas da rede";
    const busca = this.homeQuery.trim()
      ? `<p class="tiny muted">${list.length} encontrado${list.length === 1 ? "" : "s"} para “${this.esc(this.homeQuery.trim())}”</p>`
      : `<p class="tiny muted">${from}–${to} de ${list.length}</p>`;
    const minhas = [...Logic.idsCasasDoCliente(me.id)].map((id) => Logic.est(id)).filter(Boolean).slice(0, 4);
    const cidade = Store.data?.meta?.cidade || "Aracaju/SE";
    const semTampas = !Store.all("tampas").some((t) => t.clienteId === me.id);
    return `${this.top()}
      <p class="muted small">${this.esc(cidade)}</p>
      <h1 style="margin:6px 0 4px">${Logic.saudacao(me.primeiroNome)}</h1>
      <p class="muted" style="margin-bottom:14px">Qual vai ser sua Saideira hoje?</p>
      <div class="row" style="gap:8px;margin-bottom:14px">
        <button class="btn btn-gold grow" data-camera-go="#/ler" style="min-height:52px">${Icons.qr()} Ler QR da casa</button>
        <button class="btn btn-dark" data-go="#/qr" style="min-height:52px">Meu QR</button>
      </div>
      ${Brand.banner("secundario", "brand-banner")}
      <div class="row" style="margin:14px 0 8px">
        <div class="search grow">${Icons.search()}<input placeholder="Buscar bar ou restaurante" data-search-home value="${this.esc(this.homeQuery)}"/></div>
        <button class="icon-btn gold" data-go="#/mapa" title="Mapa">${Icons.pin()}</button>
      </div>
      <div class="row" style="gap:8px;margin-bottom:12px">
        <button class="btn btn-ghost btn-sm grow" data-geo>${this.geo ? "Atualizar minha localização" : "Mostrar o que está perto"}</button>
      </div>
      ${semTampas ? this.vazio("Comece pela mesa", "Peça o cupom QR à casa e leia com o celular. As Tampas entram neste aparelho, no bar certo.", "Ler QR da casa", "#/ler") : ""}
      ${this.heroCard()}
      ${this.cardRitmo(true)}
      ${!this.homeQuery.trim() && minhas.length ? `<div style="margin:16px 0 10px"><h2>Onde você já vai</h2></div><div class="stack est-list" style="margin-bottom:16px">${minhas.map((e) => this.estMini(e)).join("")}</div>` : ""}
      <div class="row between" style="margin-bottom:10px" id="lista-bares">
        <div>
          <h2>${titulo}</h2>
          ${busca}
        </div>
        <button class="small gold" data-go="#/mapa">Ver mapa</button>
      </div>
      <div class="stack est-list">${slice.length ? slice.map((e) => this.estMini(e)).join("") : `<p class="muted" style="grid-column:1/-1">Nenhum bar ou restaurante encontrado.</p>`}</div>
      ${this.pager(page, pages)}`;
  },

  explorar() {
    return this.home();
  },

  mapZones() {
    return {
      Atalaia: { l: 18, t: 72, short: "Atalaia" },
      "Coroa do Meio": { l: 16, t: 54, short: "Coroa" },
      Jardins: { l: 50, t: 36, short: "Jardins" },
      "13 de Julho": { l: 40, t: 24, short: "13 Jul" },
      Farolândia: { l: 70, t: 46, short: "Farolândia" },
      Centro: { l: 58, t: 10, short: "Centro" },
      "Siqueira Campos": { l: 46, t: 14, short: "Siqueira" },
      "São José": { l: 30, t: 16, short: "São José" },
      Luzia: { l: 52, t: 28, short: "Luzia" },
      Grageru: { l: 64, t: 32, short: "Grageru" },
      "Inácio Barbosa": { l: 82, t: 52, short: "Inácio" },
      "Ponto Novo": { l: 72, t: 16, short: "Ponto Novo" },
    };
  },

  bairrosMapa() {
    const order = Object.keys(this.mapZones());
    const set = new Set(
      Store.all("estabelecimentos")
        .filter((e) => e.status === "ativo")
        .map((e) => e.bairro)
    );
    return order.filter((b) => set.has(b)).concat([...set].filter((b) => !order.includes(b)));
  },

  estsDoBairro(bairro) {
    return Store.all("estabelecimentos")
      .filter((e) => e.status === "ativo" && (!bairro || e.bairro === bairro))
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  },

  pinPos(est, i, total, zone) {
    const z = zone || this.mapZones()[est.bairro] || { l: 50, t: 50 };
    const angle = (i / Math.max(total, 1)) * Math.PI * 2 + 0.4;
    const r = 3.5 + (i % 5) * 2.1;
    const left = Math.min(90, Math.max(5, z.l + Math.cos(angle) * r));
    const top = Math.min(84, Math.max(8, z.t + Math.sin(angle) * r));
    return { left, top };
  },

  mapa() {
    const bairros = this.bairrosMapa();
    const bairro = this.mapBairro;
    const locais = this.estsDoBairro(bairro);
    const per = this.homePerPage;
    const pages = Math.max(1, Math.ceil(locais.length / per));
    if (this.mapPage > pages) this.mapPage = pages;
    if (this.mapPage < 1) this.mapPage = 1;
    const start = (this.mapPage - 1) * per;
    const slice = locais.slice(start, start + per);
    const sel = this.mapSel && locais.some((e) => e.id === this.mapSel) ? this.mapSel : locais[0]?.id;
    const escolhido = sel ? Logic.est(sel) : null;
    const mapaAlvo = escolhido || { endereco: bairro ? `${bairro}, Aracaju - SE` : "Aracaju, SE" };

    return `${this.back("Mapa")}
      <p class="muted small" style="margin-bottom:10px">Endereço real no Google Maps. Toque numa casa da lista para ver o ponto.</p>
      <div class="pill-tabs" style="margin-bottom:12px">
        <button class="${!bairro ? "on" : ""}" data-map-bairro="">Todos</button>
        ${bairros.map((nome) => `<button class="${bairro === nome ? "on" : ""}" data-map-bairro="${nome}">${nome}</button>`).join("")}
      </div>
      <div class="map-google">
        <iframe title="Google Maps" src="${Logic.mapsEmbed(mapaAlvo)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      </div>
      ${
        escolhido
          ? `<div class="card pad" style="margin-top:12px">
              <div class="row between" style="align-items:flex-start;gap:10px">
                <div>
                  <strong>${escolhido.nome}</strong>
                  <p class="small muted" style="margin-top:4px">${Logic.tipoEst(escolhido)} · ${Logic.enderecoLinha(escolhido)}</p>
                </div>
                <button class="btn btn-gold btn-sm" data-go="#/est/${escolhido.id}">Ver</button>
              </div>
              <a class="btn btn-ghost btn-sm btn-block" style="margin-top:10px" href="${Logic.mapsLink(escolhido)}" target="_blank" rel="noopener">Abrir no Google Maps</a>
            </div>`
          : `<p class="notice" style="margin-top:12px">Nenhuma casa cadastrada neste filtro.</p>`
      }
      <div class="row between" style="margin:16px 0 10px" id="lista-mapa">
        <div>
          <h2>${bairro || "Aracaju"}</h2>
          <p class="tiny muted">${locais.length} estabelecimento${locais.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div class="stack est-list">${slice.length ? slice.map((e) => this.estMini(e, { pin: true })).join("") : `<p class="muted">Nenhum estabelecimento neste bairro.</p>`}</div>
      ${this.pager(this.mapPage, pages)}`;
  },

  detalhe() {
    const e = Logic.est(this.params.id);
    if (!e) return `<p>Estabelecimento não encontrado.</p>`;
    const me = this.me();
    const drinks = (e.bebidas || [])
      .map((b) => {
        const cam = Logic.patrocinioEm(e.id, b.id, me.id);
        const meta = Logic.metaDe(e, b.id, me.id);
        const usada = cam && Logic.ofertaConsumida(me.id, cam.id, e.id, b.id);
        const regra = usada
          ? `Oferta usada · voltou à casa (${Logic.metaOriginal(e, b.id)} Tampas)`
          : cam
            ? `Oferta · ${cam.metaTampas} Tampas (1x)`
            : b.meta
              ? "Configuração própria"
              : "Regra padrão";
        return `<div class="row between pad" style="border-bottom:1px solid #2a2a2a">
          <div><strong>${b.nome}</strong><p class="tiny muted">${regra}</p></div>
          <span class="badge ${cam && !usada ? "badge-gold" : "badge-ghost"}">${meta} Tampas</span>
        </div>`;
      })
      .join("");
    const mineDrinks = (e.bebidas || [])
      .map((b) => {
        const existing = Logic.progresso(me.id, e.id, b.id);
        const cam = Logic.patrocinioEm(e.id, b.id, me.id);
        if (!existing && !cam) return null;
        const usada = cam && Logic.ofertaConsumida(me.id, cam.id, e.id, b.id);
        const meta = usada ? Logic.metaOriginal(e, b.id) : Logic.metaDe(e, b.id, me.id);
        return { b, cam, usada, meta, atual: existing?.atual || 0, disp: Logic.saiderasDisponiveis(me.id, e.id, b.id).length };
      })
      .filter(Boolean);
    const prog = mineDrinks
      .map(({ b, cam, usada, meta, atual, disp }) => {
        const nota = usada
          ? `Oferta concluída neste bar. Meta da casa: ${Logic.metaOriginal(e, b.id)} Tampas`
          : cam
            ? `Oferta (uso único): ${cam.metaTampas} Tampas`
            : "";
        return `<div class="card pad" style="margin-bottom:10px">
          <div class="row between"><strong>${this.esc(b.nome)}</strong><span>${atual} / ${meta}</span></div>
          ${nota ? `<p class="tiny ${usada ? "muted" : "gold"}">${nota}</p>` : ""}
          <div style="margin:8px 0">${UI.tampas(disp ? meta : atual, meta)}</div>
          ${UI.barra(disp ? meta : atual, meta)}
          ${disp ? `<span class="badge badge-green" style="margin-top:8px">SAIDEIRA DISPONÍVEL</span>` : `<p class="small muted" style="margin-top:8px">Faltam ${Math.max(0, meta - atual)}</p>`}
        </div>`;
      })
      .join("");
    return `${this.back(e.nome)}
      <div class="photo" style="height:180px;border-radius:24px;margin-bottom:14px">
        <img src="${Logic.imagemEst(e)}" alt="${e.nome}" onerror="this.onerror=null;this.src='${Logic.imagemPadraoEst(e)}'"/>
        <div class="overlay"></div>
        <div style="position:absolute;bottom:12px;left:14px">
          <h1>${e.nome}</h1>
          <p class="small">${Logic.tipoEst(e)} · ${this.esc(e.bairro || "")} · ${e.aberto === false ? "Fechado agora" : "Aberto agora"}</p>
        </div>
      </div>
          <div class="row wrap" style="margin-bottom:14px">
        <span class="badge badge-gold">${Logic.tipoEst(e)}</span>
        ${Logic.patrocinioEm(e.id) ? `<span class="badge badge-navy">Patrocínio ativo</span>` : `<span class="badge badge-navy">Saideira padrão · ${e.metaPadrao} Tampas</span>`}
        <span class="badge badge-ghost">★ ${e.avaliacao || "—"}</span>
        ${e.horario ? `<span class="badge badge-ghost">${this.esc(e.horario)}</span>` : ""}
      </div>
      <div class="card pad" style="margin-bottom:16px">
        <p class="tiny muted">Endereço</p>
        <p style="margin:4px 0 10px">${this.esc(Logic.enderecoLinha(e))}</p>
        ${e.temDistancia ? `<p class="tiny muted" style="margin-bottom:10px">${Logic.fmtKm(e.distanciaKm)} de você</p>` : ""}
        <div class="map-google" style="height:220px;min-height:200px">
          <iframe title="Google Maps" src="${Logic.mapsEmbed(e)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
        </div>
        <a class="btn btn-ghost btn-sm btn-block" style="margin-top:10px" href="${Logic.mapsLink(e)}" target="_blank" rel="noopener">Abrir no Google Maps</a>
      </div>
      <h2>Bebidas</h2>
      <div class="card" style="margin:10px 0 18px">${drinks}</div>
      <h2>Seu progresso aqui</h2>
      <div style="margin-top:10px">${prog || `<p class="muted">Você ainda não acumulou Tampas neste bar.</p>`}</div>
      ${(() => {
        const retrato = Logic.retratoCliente(me.id, e.id);
        if (!retrato?.tampasPedidas) return "";
        return `<div class="card pad" style="margin-top:14px">
          <p class="tiny muted">Sua relação com esta casa</p>
          <h3 style="margin:6px 0">${retrato.favorita?.nome || "Suas bebidas"}</h3>
          <p class="small muted">${retrato.tampasPedidas} tampas pedidas · ${retrato.visitas} visita${retrato.visitas === 1 ? "" : "s"} · média ${retrato.mediaPorVisita} por visita</p>
          <p style="margin-top:8px">${this.badgeFreq(retrato.frequencia)}</p>
          ${retrato.bebidas.length ? `<div style="margin-top:12px">${UI.rankBars(retrato.bebidas.slice(0, 4))}</div>` : ""}
        </div>`;
      })()}
      <div class="row" style="gap:8px;margin-top:16px">
        <button class="btn btn-gold grow" data-camera-go="#/ler">Ler QR da casa</button>
        <button class="btn btn-dark" data-go="#/qr">Meu QR</button>
      </div>`;
  },

  tampas() {
    const me = this.me();
    const filtro = this.params.id || "todos";
    const list = Store.all("tampas").filter((t) => t.clienteId === me.id);
    const cards = list
      .map((t) => {
        const e = Logic.est(t.estabelecimentoId);
        const b = Logic.bebida(t.bebidaId);
        const disp = Logic.saiderasDisponiveis(me.id, t.estabelecimentoId, t.bebidaId);
        const showAtual = disp.length && t.atual === 0 ? t.meta : t.atual;
        const falta = t.meta - t.atual;
        const quase = falta > 0 && falta <= 2;
        const tipo = disp.length ? "disp" : quase ? "quase" : "outros";
        return { t, e, b, disp, showAtual, falta, quase, tipo };
      })
      .filter((x) => filtro === "todos" || (filtro === "quase" && x.quase) || (filtro === "disp" && x.disp.length));
    const retrato = Logic.retratoCliente(me.id);
    return `${this.top(`<h1>Minhas Tampas</h1><p class="muted" style="margin:4px 0 12px">Progresso por bar e por bebida.</p>`)}
      ${retrato?.tampasPedidas ? `<div class="card pad" style="margin-bottom:14px">
        <p class="tiny muted">Você mais pede</p>
        <h2 style="margin:4px 0">${retrato.favorita?.nome || "—"}</h2>
        <p class="small muted">${retrato.tampasPedidas} tampas em ${retrato.visitas} visita${retrato.visitas === 1 ? "" : "s"} · ${retrato.frequenciaLabel}</p>
      </div>` : ""}
      <div class="pill-tabs" style="margin-bottom:14px">
        <button class="${filtro === "todos" ? "on" : ""}" data-go="#/tampas/todos">Todos</button>
        <button class="${filtro === "quase" ? "on" : ""}" data-go="#/tampas/quase">Quase lá</button>
        <button class="${filtro === "disp" ? "on" : ""}" data-go="#/tampas/disp">Saideira disponível</button>
      </div>
      <div class="stack">${cards.length
        ? cards
        .map(
          ({ t, e, b, disp, showAtual, falta }) => `<article class="card pad">
            <p class="tiny muted">${this.esc(e?.nome || "Casa")} · ${this.esc(e?.bairro || "")}</p>
            <div class="row between"><h3>${this.esc(b?.nome || "Bebida")}</h3><strong>${showAtual} / ${t.meta}</strong></div>
            <div style="margin:10px 0">${UI.tampas(showAtual, t.meta)}</div>
            ${UI.barra(showAtual, t.meta)}
            <div class="row between" style="margin-top:10px">
              ${
                disp.length
                  ? `<span class="badge badge-green">SAIDEIRA DISPONÍVEL</span><button class="btn btn-gold btn-sm" data-go="#/saideras">Ver Saideira</button>`
                  : `<span class="muted small">${falta === 1 ? "Falta 1" : "Faltam " + falta}</span><button class="btn btn-dark btn-sm" data-go="#/est/${e.id}">Ver bar</button>`
              }
            </div>
          </article>`
        )
        .join("")
        : this.vazio(
            filtro === "todos" ? "Nenhuma Tampa ainda" : "Nada neste filtro",
            filtro === "todos" ? "Leia o QR da casa quando pedir. O progresso aparece aqui, por bar e por bebida." : "Quando uma cartela chegar perto ou liberar Saideira, ela entra nesta aba.",
            "Ler QR da casa",
            "#/ler"
          )}</div>`;
  },

  saideras() {
    const me = this.me();
    const tab = this.params.id || "disponiveis";
    const filtro = tab === "utilizadas" ? "utilizada" : tab === "expiradas" ? "expirada" : "disponivel";
    const list = Logic.saiderasDe(me.id, filtro);
    return `${this.top(`<h1>Minhas Saideiras</h1><p class="tiny muted">Cada Saideira vale ${Logic.diasValidade()} dias depois de conquistada.</p>`)}
      <div class="pill-tabs" style="margin:12px 0">
        <button class="${tab === "disponiveis" ? "on" : ""}" data-go="#/saideras/disponiveis">Disponíveis</button>
        <button class="${tab === "utilizadas" ? "on" : ""}" data-go="#/saideras/utilizadas">Utilizadas</button>
        <button class="${tab === "expiradas" ? "on" : ""}" data-go="#/saideras/expiradas">Expiradas</button>
      </div>
      ${
        list.length
          ? list
              .map((s) => {
                const e = Logic.est(s.estabelecimentoId);
                const b = Logic.bebida(s.bebidaId);
                const urgente = s.status === "disponivel" && Logic.diasRestantesSaidera(s) <= 3;
                return `<article class="saidera-card ${s.status}">
                  <span class="badge ${s.status === "disponivel" ? (urgente ? "badge-gold" : "badge-green") : "badge-ghost"}">${s.status === "disponivel" ? "SAIDEIRA DISPONÍVEL" : s.status === "expirada" ? "EXPIRADA" : "UTILIZADA"}</span>
                  <h2 style="margin:8px 0 2px">${b.nome}</h2>
                  <p class="muted">${e.nome}</p>
                  <p class="small" style="margin:8px 0">Conquistada em: ${Logic.fmtDate(s.conquistadaEm)}</p>
                  <p class="small ${urgente ? "gold" : "muted"}">${Logic.validadeLabel(s)}${s.expiraEm ? " · " + Logic.fmtDate(s.expiraEm) : ""}</p>
                  <p class="saidera-id">ID da Saideira</p>
                  <p class="saidera-code">${this.esc(s.codigo)}</p>
                  ${s.status === "disponivel" ? `<p class="small muted" style="margin-top:8px">Mostre este ID à casa para retirar. Se pedirem, mostre também o seu QR.</p>
                  <div class="row" style="gap:8px;margin-top:12px">
                    <button class="btn btn-ghost grow" data-copiar="${this.esc(s.codigo)}">Copiar ID</button>
                    <button class="btn btn-dark grow" data-go="#/qr">Meu QR</button>
                  </div>` : ""}
                </article>`;
              })
              .join("")
          : this.vazio(
              tab === "disponiveis" ? "Nenhuma Saideira pronta" : "Nada nesta aba",
              tab === "disponiveis"
                ? "Complete as Tampas no bar. Quando bater a meta, o ID da Saideira aparece aqui para você retirar."
                : "Quando você retirar ou uma Saideira vencer, o registro fica nesta lista.",
              "Ver minhas Tampas",
              "#/tampas"
            )
      }`;
  },

  ofertas() {
    if (this.params.id) return this.ofertaDetalhe();
    const camps = Logic.campanhasPatrocinio(this.me().id);
    const extra = Store.all("notificacoes").filter((n) => n.clienteId === this.me().id && n.tipo === "oferta" && n.campanhaId);
    if (!camps.length) {
      return `${this.top(`<h1>Ofertas e Saideiras 🔥</h1><p class="muted" style="margin:6px 0 14px">Nenhuma campanha ativa para você no momento.</p>`)}
        ${Brand.banner("story", "brand-story")}
        <p class="notice" style="margin-top:14px">Quando o Admin Saideira ativar um pedido do bar ou um patrocínio de marca, a oferta aparece aqui.</p>`;
    }
    return `${this.top(`<h1>Ofertas e Saideiras 🔥</h1><p class="muted" style="margin:6px 0 14px">Campanhas ativas · Aracaju</p>`)}
      ${Brand.banner("secundario", "brand-banner")}
      ${camps
        .map((c, i) => {
          const par = Store.find("parceiros", c.parceiroId);
          const casa = Logic.est(c.estabelecimentoId || c.estabelecimentos?.[0]);
          const ests = (c.estabelecimentos || []).slice(0, 3).map((id) => Logic.est(id)?.nome).filter(Boolean);
          const img = Logic.imagemEst(casa) || Logic.imagemEst(c.estabelecimentos?.[0]) || Logic.imagemEst(Store.all("estabelecimentos")[i + 1]);
          const selo = c.origem === "estabelecimento" ? casa?.nome || "Sua casa" : par?.selo || par?.nome || "Marca";
          return `<article class="offer-banner photo" data-go="#/ofertas/${c.id}">
            <img src="${img}" alt="" onerror="this.style.display='none'"/>
            <div class="overlay"></div>
            <div class="content">
              <span class="badge badge-navy">${c.origem === "estabelecimento" ? "DA CASA" : "PATROCINADO"} · ${selo}</span>
              <h2 style="margin:8px 0 4px">${c.origem === "estabelecimento" ? c.titulo : Logic.bebida(c.bebidaId)?.nome || par?.nome}</h2>
              <p>${c.mensagem}</p>
              ${c.metaTampas ? `<p class="gold" style="font-weight:800;margin:8px 0">${c.metaTampas} Tampas</p>` : `<p class="gold" style="font-weight:800;margin:8px 0">Compareça e mostre o QR</p>`}
              <p class="small">${ests.join(" · ")}${(c.estabelecimentos || []).length > 3 ? " · +" + (c.estabelecimentos.length - 3) : ""}</p>
              <button type="button" class="btn btn-gold btn-sm" style="margin-top:10px">${c.metaTampas ? "Entrar na oferta" : "Ver convite"}</button>
            </div>
          </article>`;
        })
        .join("")}
      ${extra.length ? `<p class="notice">Você tem oferta nova na caixa de notificações.</p>` : ""}`;
  },

  ofertaDetalhe() {
    const c = Store.find("campanhas", this.params.id);
    if (!c || c.status !== "ativa" || !c.disparada) {
      return `${this.back("Oferta")}
        <p class="muted">Esta oferta ainda não foi ativada pelo Admin Saideira.</p>
        <button class="btn btn-gold" data-go="#/ofertas">Ver ofertas</button>`;
    }
    if (!Logic.clienteNaOferta(this.me().id, c.id)) Logic.aderirCampanha(this.me().id, c.id);
    const par = Store.find("parceiros", c.parceiroId);
    const casa = Logic.est(c.estabelecimentoId || c.estabelecimentos?.[0]);
    const ests = (c.estabelecimentos || []).map((id) => Logic.est(id)).filter(Boolean);
    const me = this.me();
    const daCasa = c.origem === "estabelecimento";
    return `${this.back("Oferta")}
      <span class="badge badge-navy">${daCasa ? "DA CASA · " + (casa?.nome || "") : "PATROCINADO · " + (par?.nome || "")}</span>
      <h1 style="margin:10px 0 6px">${c.titulo}</h1>
      <p class="muted">${c.mensagem}</p>
      <div class="card pad" style="margin:14px 0">
        <p class="tiny muted">${daCasa ? Logic.tipoCampanhaLabel(c.tipo) : "Regra desta oferta"}</p>
        ${
          c.metaTampas
            ? `<h2>${Logic.bebida(c.bebidaId)?.nome} · ${c.metaTampas} Tampas</h2>
        <p class="small muted" style="margin-top:6px">${daCasa && c.publico === "aniversario" ? "Oferta de aniversário: uso único nesta casa." : "Uso único em cada casa: ao bater a meta da oferta, aquele bar volta à quantidade de Tampas da casa."}</p>`
            : `<h2>Compareça e mostre o QR</h2>
        <p class="small muted" style="margin-top:6px">Continue suas Tampas e retire sua Saideira nesta casa.</p>`
        }
      </div>
      <h2 style="margin-bottom:10px">${daCasa ? "Nesta casa" : "Bares e restaurantes da oferta"}</h2>
      <div class="stack">${ests
        .map((e) => {
          if (!c.metaTampas) {
            return `<article class="card pad" data-go="#/est/${e.id}" style="cursor:pointer">
            <p class="tiny muted">${Logic.tipoEst(e)} · ${e.bairro}</p>
            <h3>${e.nome}</h3>
            <p class="tiny gold" style="margin-top:8px">Mostre o QR no salão para consumo e retirada da Saideira.</p>
          </article>`;
          }
          const p = Logic.progresso(me.id, e.id, c.bebidaId);
          const usada = Logic.ofertaConsumida(me.id, c.id, e.id, c.bebidaId);
          const regraCasa = Logic.metaOriginal(e, c.bebidaId);
          const meta = usada ? regraCasa : c.metaTampas || regraCasa;
          const atual = p?.atual || 0;
          return `<article class="card pad" data-go="#/est/${e.id}" style="cursor:pointer">
            <p class="tiny muted">${Logic.tipoEst(e)} · ${e.bairro}</p>
            <div class="row between"><h3>${e.nome}</h3><strong>${atual}/${meta}</strong></div>
            <div style="margin:8px 0">${UI.tampas(atual, meta)}</div>
            ${UI.barra(atual, meta)}
            <p class="tiny ${usada ? "muted" : "gold"}" style="margin-top:8px">${
              usada
                ? `Oferta usada · voltou à regra da casa (${regraCasa} Tampas)`
                : `${Logic.bebida(c.bebidaId)?.nome} · oferta ${c.metaTampas} Tampas (1x)`
            }</p>
          </article>`;
        })
        .join("")}</div>`;
  },

  perfil() {
    const me = this.me();
    const m = Logic.metricasCliente(me.id);
    const painel = Logic.painelCliente(me.id);
    const r = painel.retrato;
    return `${this.top()}
      <div class="stack" style="align-items:center;text-align:center;margin:8px 0 18px">
        <label class="avatar-edit">
          <img class="avatar" src="${this.foto(me.avatar)}" style="width:86px;height:86px;border-radius:28px;object-fit:cover" alt=""/>
          <span class="tiny gold">Trocar foto</span>
          <input type="file" accept="image/*" hidden data-foto-cli/>
        </label>
        <h1>${this.esc(me.nome)}</h1>
        <p class="muted">${me.telefone} · ${me.email}</p>
        <p class="small muted">Nascimento ${me.nascimento} · ${me.cidade}</p>
        ${r?.frequencia ? `<p style="margin-top:8px">${this.badgeFreq(r.frequencia)}</p>` : ""}
        <div class="row" style="gap:8px;justify-content:center;margin-top:10px">
          <button class="btn btn-gold btn-sm" data-camera-go="#/ler">Ler QR da casa</button>
          <button class="btn btn-dark btn-sm" data-go="#/qr">Meu QR</button>
          <button class="btn btn-ghost btn-sm" data-go="#/conta">Editar dados</button>
        </div>
      </div>
      <div class="grid-3" style="margin-bottom:16px">
        <div class="kpi"><b>${m.tampas}</b><span>Tampas</span></div>
        <div class="kpi"><b>${m.saideras}</b><span>Saideiras</span></div>
        <div class="kpi"><b>${m.estabelecimentos}</b><span>Bares</span></div>
      </div>
      <div class="card pad" style="margin-bottom:12px">
        <p class="tiny muted">Bebida que você mais pede</p>
        <h2>${r?.favorita?.nome || "Ainda sem pedidos"}</h2>
        ${r?.favorita ? `<p class="small muted" style="margin-top:6px">${r.favorita.qtd} tampas · ${r.bebidas[0]?.pct || 0}% do que você pede</p>` : `<p class="small muted" style="margin-top:6px">Leia o QR da casa para começar a montar o seu retrato.</p>`}
      </div>
      ${this.cardRitmo()}
      ${["Meus dados", "Histórico", "Preferências", "Privacidade", "Notificações"]
        .map(
          (l, i) =>
            `<button class="card pad btn-block" style="text-align:left;margin-bottom:8px" data-go="${["#/conta", "#/historico", "#/preferencias", "#/privacidade", "#/notificacoes"][i]}"><div class="row between"><span>${l}</span><span class="muted">›</span></div></button>`
        )
        .join("")}
      ${(() => {
        const s = Logic.suporte();
        if (!s.whatsapp && !s.email) return "";
        const limpa = (v) => String(v || "").replace(/[<>&"]/g, "");
        return `<div class="card pad" style="margin-bottom:8px">
          <p class="tiny muted">Precisa de ajuda?</p>
          ${s.whatsapp ? `<a class="btn btn-gold btn-sm" style="margin-top:8px" href="https://wa.me/55${s.whatsapp}" target="_blank" rel="noopener">WhatsApp ${limpa(s.whatsappLabel)}</a>` : ""}
          ${s.email ? `<a class="btn btn-ghost btn-sm" style="margin-top:8px" href="mailto:${limpa(s.email)}">${limpa(s.email)}</a>` : ""}
        </div>`;
      })()}
      ${UI.pwaBox()}
      <button class="btn btn-ghost btn-block" id="sair-app" style="margin-top:8px">${Icons.logout()} Sair</button>`;
  },

  conta() {
    const me = this.me();
    return `${this.back("Meus dados")}
      <p class="muted" style="margin-bottom:14px">Isso aparece para as casas quando você pede e quando elas baixam a sua Saideira.</p>
      <div class="stack" style="align-items:center;text-align:center;margin-bottom:16px">
        <img class="avatar" src="${this.foto(me.avatar)}" style="width:96px;height:96px;border-radius:28px;object-fit:cover" alt=""/>
        <label class="btn btn-gold btn-sm" style="margin-top:10px">
          ${this.temFoto(me.avatar) ? "Trocar foto" : "Colocar minha foto"}
          <input type="file" accept="image/*" hidden data-foto-cli/>
        </label>
        ${this.temFoto(me.avatar) ? `<button type="button" class="btn btn-ghost btn-sm" data-foto-off>Remover foto</button>` : ""}
      </div>
      <div class="field"><span>Nome</span><input id="conta-nome" value="${this.esc(me.nome)}"/></div>
      <div class="field"><span>Telefone</span><input id="conta-tel" type="tel" value="${this.esc(me.telefone)}"/></div>
      <div class="field"><span>Nascimento</span><input id="conta-nasc" placeholder="dd/mm/aaaa" value="${this.esc(me.nascimento)}"/></div>
      <div class="field"><span>Cidade</span><input id="conta-cidade" value="${this.esc(me.cidade)}"/></div>
      <div class="field"><span>Bairro</span><input id="conta-bairro" value="${this.esc(me.bairro)}"/></div>
      <p class="tiny muted" style="margin:16px 0 8px">Trocar senha (opcional)</p>
      <div class="field"><span>Senha atual</span><input id="conta-senha" type="password" autocomplete="current-password"/></div>
      <div class="field"><span>Nova senha</span><input id="conta-nova" type="password" minlength="6" autocomplete="new-password"/></div>
      <button class="btn btn-gold btn-block" style="margin-top:16px" id="conta-salvar">Salvar</button>
      <p class="tiny muted" style="margin-top:10px">E-mail da conta: ${this.esc(me.email)} · ID ${this.esc(me.codigo)}</p>`;
  },

  historico() {
    const me = this.me();
    const painel = Logic.painelCliente(me.id);
    const r = painel.retrato;
    const cons = Store.all("consumos")
      .filter((c) => c.clienteId === me.id)
      .sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")))
      .slice(0, 30);
    return `${this.back("Histórico")}
      ${r?.tampasPedidas ? `<div class="card pad" style="margin-bottom:12px">
        <p class="tiny muted">Seu retrato</p>
        <h2 style="margin:4px 0">${r.favorita?.nome || "Suas bebidas"}</h2>
        <p class="small muted">${r.tampasPedidas} tampas · ${r.visitas} visita${r.visitas === 1 ? "" : "s"} · média ${r.mediaPorVisita}</p>
        <p style="margin-top:8px">${this.badgeFreq(r.frequencia)}</p>
      </div>` : ""}
      ${painel.semana.values.some((v) => v) ? `<div class="card pad" style="margin-bottom:12px"><p class="tiny muted" style="margin-bottom:8px">Seus últimos 7 dias</p>${UI.lineChart(painel.semana.values, painel.semana.labels)}</div>` : ""}
      ${painel.weekday.values.some((v) => v) ? `<div class="card pad" style="margin-bottom:12px"><p class="tiny muted" style="margin-bottom:8px">Quando você mais sai</p>${UI.heatRow(painel.weekday.labels, painel.weekday.values)}</div>` : ""}
      ${painel.ranking.length ? `<div class="card pad" style="margin-bottom:12px"><p class="tiny muted" style="margin-bottom:8px">O que você mais pede</p>${UI.rankBars(painel.ranking.slice(0, 6))}</div>` : ""}
      ${painel.casas.length ? `<div class="card pad" style="margin-bottom:12px">
        <p class="tiny muted" style="margin-bottom:8px">Onde você mais vai</p>
        ${painel.casas
          .map(
            (c) => `<button class="insight-card" style="width:100%;margin:8px 0;text-align:left" data-go="#/est/${c.id}">
              <div>
                <strong>${c.nome}</strong>
                <p class="tiny muted">${c.favorita?.nome || "Sem favorita"} · ${c.tampasPedidas} tampas · ${c.visitas} visita${c.visitas === 1 ? "" : "s"}</p>
                ${this.badgeFreq(c.frequencia)}
              </div>
            </button>`
          )
          .join("")}
      </div>` : ""}
      ${cons.length
        ? cons
            .map((c) => `<div class="card pad" style="margin-bottom:8px">
          <div class="row between"><strong>+${c.quantidade} ${Logic.bebida(c.bebidaId)?.nome || "Bebida"}</strong><span class="small muted">${Logic.fmtDateShort(c.criadoEm)}</span></div>
          <p class="small muted">${Logic.est(c.estabelecimentoId)?.nome || "Casa"}</p>
        </div>`)
            .join("")
        : `<p class="muted">Ainda não há pedidos no seu histórico. Leia o QR da casa para começar.</p>`}`;
  },

  ler() {
    return `${this.back("Ler QR da casa")}
      <p class="muted" style="margin-bottom:14px">Aponte a câmera para o cupom que a casa imprimiu. As Tampas entram neste aparelho, no restaurante certo.</p>
      <div class="scan-stage" style="margin:0 0 16px">
        <div class="scan-frame live" style="margin:0 auto">
          <video id="scan-video-cli" playsinline muted autoplay></video>
          <i></i><i></i><i></i><i></i>
        </div>
      </div>
      <p class="tiny muted" id="scan-hint-cli" style="text-align:center;margin-bottom:14px">Toque em Permitir câmera. No Android e no iPhone o aviso só abre neste toque.</p>
      <button type="button" class="btn btn-gold btn-block" id="abrir-camera" style="margin-bottom:12px">Permitir câmera</button>
      <div class="search">${Icons.search()}<input id="tkt-manual" placeholder="Ou digite o código · TKT-…"/></div>
      <button class="btn btn-gold btn-block" id="tkt-ok" style="margin-top:12px">Adicionar Tampas</button>
      <p class="tiny muted" style="margin-top:12px;text-align:center">Cada cupom é de uso único. Depois de lido, acaba.</p>`;
  },

  async aplicarTicket(codigo) {
    if (this._lendo) return;
    const raw = String(codigo || "").trim();
    if (!raw) {
      UI.toast("Aponte o QR ou digite o código do cupom.");
      return;
    }
    this._lendo = true;
    if (window.QR?.stopScan) QR.stopScan();
    const res = await Logic.resgatarTicket(raw);
    if (!res.ok) {
      this._lendo = false;
      UI.toast(res.erro);
      if (this.view === "ler") this.iniciarScanCliente();
      return;
    }
    const itens = res.ticket.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ");
    this.go("#/tampas");
    this._lendo = false;
    UI.modal({
      center: true,
      html: `${UI.celebrate(
        res.ganhas ? "SAIDEIRA LIBERADA! 🍺" : "TAMPAS ADICIONADAS",
        `${itens} no ${res.est.nome}.`
      )}<button class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Ver minhas Tampas</button>`,
    });
  },

  iniciarScanCliente() {
    const video = this.root.querySelector("#scan-video-cli");
    const hint = this.root.querySelector("#scan-hint-cli");
    if (!video || !window.QR?.startScan) return;
    if (hint) hint.textContent = "Pedindo permissão da câmera…";
    QR.startScan({
      video,
      onCode: (_parsed, raw) => {
        const codigo = QR.parseTicket(raw) || _parsed;
        this.aplicarTicket(codigo);
      },
      onError: (msg) => {
        if (hint) hint.textContent = msg || "Digite o código do cupom abaixo.";
        UI.toast(msg || "Permita a câmera e tente de novo.");
      },
    }).then(() => {
      if (hint && QR.temStream()) hint.textContent = "Aguardando o QR…";
    });
  },

  qr() {
    const me = this.me();
    return `${this.back("Minha Saideira")}
      <div class="qr-stage">
        ${Brand.simbolo(72)}
        ${UI.qrSvg(me.codigo)}
        <h2 style="margin-top:8px">${me.primeiroNome}</h2>
        <p class="muted">ID: ${this.esc(me.codigo)}</p>
        <p style="margin-top:12px">Mostre este QR ao garçom se ele precisar abrir a sua comanda. É o seu ID — pode usar sempre.</p>
        <p class="tiny muted" style="margin-top:10px">O caminho principal continua sendo ler o cupom impresso da casa. Este QR fica aqui se precisar.</p>
        <button class="btn btn-ghost btn-block" style="margin-top:16px" data-copiar="${this.esc(me.codigo)}">Copiar meu ID</button>
        <button class="btn btn-gold btn-block" style="margin-top:8px" data-camera-go="#/ler">Ler QR da casa</button>
      </div>`;
  },

  preferencias() {
    const me = this.me();
    const prefs = Logic.prefsCliente(me.id);
    const retrato = Logic.retratoCliente(me.id);
    const favId = prefs.bebidaFavoritaId || retrato?.favorita?.id || "";
    return `${this.back("Preferências")}
      <p class="muted" style="margin-bottom:14px">A favorita que você escolhe ajuda o bar a te reconhecer. O app também calcula a que você mais pede de verdade.</p>
      ${retrato?.favorita ? `<div class="card pad" style="margin-bottom:14px"><p class="tiny muted">A que você mais pede</p><h3>${this.esc(retrato.favorita.nome)}</h3></div>` : ""}
      <div class="field"><span>Bebida que eu prefiro</span>
        <select id="pref-bebida">
          <option value="">Deixar o app decidir pelo que eu peço</option>
          ${Store.all("bebidas")
            .map((b) => `<option value="${b.id}" ${b.id === favId ? "selected" : ""}>${this.esc(b.nome)}</option>`)
            .join("")}
        </select>
      </div>
      <p class="tiny muted" style="margin-top:12px">Salvo na sua conta. As casas que você frequenta veem isso na ficha.</p>`;
  },

  privacidade() {
    const me = this.me();
    const prefs = Logic.prefsCliente(me.id);
    return `${this.back("Privacidade")}
      <label class="toggle-row">
        <span>Receber ofertas de marcas da rede</span>
        <input type="checkbox" data-pref="perfilPublico" ${prefs.perfilPublico !== false ? "checked" : ""}/>
      </label>
      <p class="muted small" style="margin-top:12px">As casas onde você pede continuam vendo o seu progresso — é assim que as Tampas e a Saideira funcionam. Se desligar, as campanhas de marca deixam de aparecer para você.</p>`;
  },

  notificacoes() {
    const me = this.me();
    const prefs = Logic.prefsCliente(me.id);
    const list = Store.all("notificacoes").filter((n) => n.clienteId === me.id);
    return `${this.back("Notificações")}
      <label class="toggle-row"><span>Alertas no app</span><input type="checkbox" data-pref="push" ${prefs.push !== false ? "checked" : ""}/></label>
      <label class="toggle-row"><span>Avisos por e-mail quando o admin disparar</span><input type="checkbox" data-pref="email" ${prefs.email !== false ? "checked" : ""}/></label>
      <label class="toggle-row"><span>Avisos por WhatsApp quando o admin disparar</span><input type="checkbox" data-pref="whatsapp" ${prefs.whatsapp ? "checked" : ""}/></label>
      <p class="tiny muted" style="margin:16px 0 10px">Sua caixa</p>
      ${
        list.length
          ? list
              .map(
                (n) => `<article class="card pad" style="margin-bottom:8px" ${n.campanhaId ? `data-go="#/ofertas/${n.campanhaId}"` : ""}>
            <strong>${this.esc(n.titulo)}</strong>
            <p class="small muted">${this.esc(n.texto)}</p>
            <p class="tiny muted">${Logic.fmtDate(n.criadoEm)}${n.lida ? "" : " · nova"}</p>
          </article>`
              )
              .join("")
          : this.vazio("Caixa vazia", "Quando você ganhar Tampas, Saideira ou uma oferta, o aviso cai aqui.", "Ver ofertas", "#/ofertas")
      }`;
  },

  bind() {
    UI.fixButtons(this.root);
    const search = this.root.querySelector("[data-search-home]");
    search?.addEventListener("input", (e) => {
      this.homeQuery = e.target.value;
      this.homePage = 1;
      this.render();
      const again = this.root.querySelector("[data-search-home]");
      if (again) {
        again.focus();
        const len = again.value.length;
        again.setSelectionRange(len, len);
      }
    });
    this.root.querySelectorAll("[data-page]").forEach((el) =>
      el.addEventListener("click", () => {
        const n = Number(el.getAttribute("data-page"));
        if (!n || el.disabled) return;
        if (this.view === "mapa") {
          if (n === this.mapPage) return;
          this.mapPage = n;
          this.render();
          const body = this.root.querySelector(".phone-body");
          const list = this.root.querySelector("#lista-mapa");
          if (body && list) body.scrollTop = Math.max(0, list.offsetTop - 12);
          return;
        }
        if (n === this.homePage) return;
        this.homePage = n;
        this.render();
        const body = this.root.querySelector(".phone-body");
        const list = this.root.querySelector("#lista-bares");
        if (body && list) body.scrollTop = Math.max(0, list.offsetTop - 12);
      })
    );
    this.root.querySelector("#sair-app")?.addEventListener("click", async () => {
      await API.sair();
    });
    this.root.querySelectorAll("[data-pref]").forEach((el) =>
      el.addEventListener("change", () => {
        Logic.salvarPrefsCliente(this.me().id, { [el.getAttribute("data-pref")]: el.checked });
        UI.toast("Preferência salva.");
      })
    );
    this.root.querySelector("#pref-bebida")?.addEventListener("change", (e) => {
      Logic.salvarPrefsCliente(this.me().id, { bebidaFavoritaId: e.target.value });
      UI.toast("Bebida favorita atualizada.");
    });
    this.root.querySelector("#tkt-ok")?.addEventListener("click", () => {
      this.aplicarTicket(this.root.querySelector("#tkt-manual")?.value);
    });
    this.root.querySelector("#tkt-manual")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.aplicarTicket(e.target.value);
    });
    this.root.querySelector("[data-geo]")?.addEventListener("click", () => this.pedirOndeEstou());
    this.root.querySelector("#abrir-camera")?.addEventListener("click", () => this.iniciarScanCliente());
    this.root.querySelectorAll("[data-copiar]").forEach((el) =>
      el.addEventListener("click", () => this.copiar(el.getAttribute("data-copiar"), "Código copiado."))
    );
    this.root.querySelector("#conta-salvar")?.addEventListener("click", () => this.salvarConta());
    this.root.querySelectorAll("[data-foto-cli]").forEach((el) =>
      el.addEventListener("change", () => {
        const f = el.files?.[0];
        if (f) this.enviarFoto(f);
      })
    );
    this.root.querySelector("[data-foto-off]")?.addEventListener("click", () => this.enviarFoto(""));
    if (this.view === "ler" && window.QR?.temStream?.()) this.iniciarScanCliente();
    if (this.view === "notificacoes") this.marcarLidas();
  },

  async marcarLidas() {
    if (this._lidas) return;
    const me = this.me();
    if (!Store.all("notificacoes").some((n) => n.clienteId === me.id && !n.lida)) return;
    this._lidas = true;
    try {
      const data = await API.post("notificacoes/ler");
      if (data?.store) Store.replace(data.store);
    } catch {
      /* a caixa continua visível mesmo se o servidor falhar */
    }
    this._lidas = false;
  },

  async enviarFoto(file) {
    try {
      const dataUrl = file === "" ? "" : await Logic.lerAvatarArquivo(file);
      const data = await API.post("perfil/foto", { dataUrl });
      if (data?.store) Store.replace(data.store);
      UI.toast(dataUrl ? "Foto atualizada." : "Foto removida.");
    } catch (e) {
      UI.toast(e.message || "Não deu para salvar a foto.");
    }
  },

  async salvarConta() {
    const body = {
      nome: this.root.querySelector("#conta-nome")?.value,
      telefone: this.root.querySelector("#conta-tel")?.value,
      nascimento: this.root.querySelector("#conta-nasc")?.value,
      cidade: this.root.querySelector("#conta-cidade")?.value,
      bairro: this.root.querySelector("#conta-bairro")?.value,
      senhaAtual: this.root.querySelector("#conta-senha")?.value,
      novaSenha: this.root.querySelector("#conta-nova")?.value,
    };
    try {
      const data = await API.post("perfil", body);
      if (data?.store) Store.replace(data.store);
      UI.toast("Seus dados foram salvos.");
      this.go("#/perfil");
    } catch (e) {
      UI.toast(e.message || "Não deu para salvar.");
    }
  },
};

window.ClienteApp = ClienteApp;
document.addEventListener("DOMContentLoaded", () => ClienteApp.boot());
