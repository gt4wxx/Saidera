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

  boot() {
    Store.init();
    UI.bindGlobal();
    this.root = document.getElementById("app");
    Store.on(() => this.render());
    window.addEventListener("hashchange", () => this.route());
    this.route();
  },

  me() {
    return Logic.cliente(Store.demo().clienteId);
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
      notificacoes: () => this.notificacoes(),
      historico: () => this.historico(),
      preferencias: () => this.preferencias(),
      privacidade: () => this.privacidade(),
    }[this.view] || (() => this.home());
    this.root.innerHTML = `<div class="phone-stage"><div class="phone-shell">
      <div class="phone-body">${html()}</div>
      ${this.nav()}
    </div></div>${UI.demoWidget()}`;
    this.bind();
  },

  nav() {
    if (this.view === "qr") return "";
    const items = [
      ["explorar", "Explorar", Icons.compass()],
      ["tampas", "Tampas", Icons.tampas()],
      ["saideras", "Saideras", Icons.gift()],
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
        <button class="icon-btn ${unread ? "dot-n" : ""}" data-go="#/notificacoes">${Icons.bell()}</button>
        <img class="avatar" src="${me.avatar}" alt="${me.primeiroNome}" data-go="#/perfil"/>
      </div>
    </div>${extra}`;
  },

  back(title) {
    return `<div class="topbar">
      <button class="icon-btn" data-back>${Icons.back()}</button>
      <strong>${title}</strong>
      <button class="icon-btn" data-go="#/qr">${Icons.qr()}</button>
    </div>`;
  },

  heroCard() {
    const me = this.me();
    const ganhas = Logic.saiderasDisponiveis(me.id);
    const recente = ganhas.find((s) => s.estabelecimentoId === "est-001") || ganhas[0];
    if (recente) {
      const est = Logic.est(recente.estabelecimentoId);
      const beb = Logic.bebida(recente.bebidaId);
      return `<article class="hero-progress" data-go="#/saideras">
        <div class="bg">${UI.photo(Logic.imagemEst(est), est.nome)}</div>
        <div class="overlay"></div>
        <div class="content">
          <span class="badge badge-gold">VOCÊ GANHOU</span>
          <h2>Você ganhou uma Saidera! 🍺</h2>
          <p>${beb.nome} · ${est.nome}</p>
          <div class="cta-row"><button class="btn btn-gold btn-sm">Ver Saidera</button></div>
        </div>
      </article>`;
    }
    const p = Logic.progresso(me.id, "est-001", "beb-001");
    const est = Logic.est("est-001");
    const falta = p.meta - p.atual;
    return `<article class="hero-progress" data-go="#/est/est-001">
      <div class="bg">${UI.photo(Logic.imagemEst(est), est.nome)}</div>
      <div class="overlay"></div>
      <div class="content">
        <span class="badge badge-gold">VOCÊ ESTÁ QUASE LÁ 🍺</span>
        <h2>${est.nome}</h2>
        <p>Heineken · ${p.atual} / ${p.meta} Tampas</p>
        <div style="margin:12px 0">${UI.tampas(p.atual, p.meta)}</div>
        ${UI.barra(p.atual, p.meta)}
        <p style="margin-top:10px;font-weight:700">Falta apenas ${falta} ${falta === 1 ? "Tampa" : "Tampas"} 🍺</p>
        <div class="cta-row"><button class="btn btn-gold btn-sm">Ver progresso</button></div>
      </div>
    </article>`;
  },

  estMini(e, { campanha } = {}) {
    const me = this.me();
    const drinks = e.bebidas
      .slice(0, 3)
      .map((b) => {
        const cam = campanha && campanha.bebidaId === b.id ? campanha : Logic.patrocinioEm(e.id, b.id);
        const usada = cam && Logic.ofertaConsumida(me.id, cam.id, e.id, b.id);
        const meta = Logic.metaDe(e, b.id, me.id);
        return `<span class="chip ${cam && !usada ? "patrocinio" : ""}">${b.nome} — ${meta}${cam && !usada ? " · oferta" : usada ? " · casa" : ""}</span>`;
      })
      .join("");
    const camBar = campanha || Logic.patrocinioEm(e.id);
    return `<article class="est-card" data-go="#/est/${e.id}">
      <div class="thumb photo"><img src="${Logic.imagemEst(e)}" alt="${e.nome}" onerror="this.onerror=null;this.src='${Logic.imagemPadraoEst(e)}'"/></div>
      <div class="body">
        <h3>${e.nome}</h3>
        <p class="small muted">📍 ${Logic.tipoEst(e)} · ${e.bairro} · ${Logic.fmtKm(e.distanciaKm)} · ★ ${e.avaliacao}</p>
        <div class="chips">${drinks}<span class="chip">Padrão — ${e.metaPadrao}</span></div>
        ${camBar ? `<p class="tiny gold">${Logic.bebida(camBar.bebidaId)?.nome} · ${camBar.metaTampas} Tampas no patrocínio</p>` : e.promocao ? `<p class="tiny gold">${e.promocao}</p>` : ""}
        <button class="btn btn-dark btn-sm" style="margin-top:8px">Ver estabelecimento</button>
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
    return Store.all("estabelecimentos")
      .filter((e) => e.status === "ativo")
      .filter((e) => {
        if (!q) return true;
        return [e.nome, e.bairro, e.endereco, e.promocao, Logic.tipoEst(e)].some((v) => this.norm(v).includes(q));
      })
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
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
    const titulo = this.homeQuery.trim() ? "Resultados" : "Próximos de você";
    const busca = this.homeQuery.trim()
      ? `<p class="tiny muted">${list.length} encontrado${list.length === 1 ? "" : "s"} para “${this.homeQuery.trim()}”</p>`
      : `<p class="tiny muted">${from}–${to} de ${list.length}</p>`;
    return `${this.top()}
      <p class="muted small">Aracaju · Dados demonstrativos</p>
      <h1 style="margin:6px 0 4px">${Logic.saudacao(me.primeiroNome)}</h1>
      <p class="muted" style="margin-bottom:14px">Qual vai ser sua Saidera hoje?</p>
      ${Brand.banner("secundario", "brand-banner")}
      <div class="row" style="margin:14px 0 8px">
        <div class="search grow">${Icons.search()}<input placeholder="Buscar bar ou restaurante" data-search-home value="${this.homeQuery.replace(/"/g, "&quot;")}"/></div>
        <button class="icon-btn gold" data-go="#/mapa">${Icons.pin()}</button>
      </div>
      ${this.heroCard()}
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
    const zones = this.mapZones();
    const bairros = this.bairrosMapa();
    const bairro = this.mapBairro;
    const locais = this.estsDoBairro(bairro);
    const per = this.homePerPage;
    const pages = Math.max(1, Math.ceil(locais.length / per));
    if (this.mapPage > pages) this.mapPage = pages;
    if (this.mapPage < 1) this.mapPage = 1;
    const start = (this.mapPage - 1) * per;
    const slice = bairro ? locais.slice(start, start + per) : [];
    const sel = this.mapSel && locais.some((e) => e.id === this.mapSel) ? this.mapSel : locais[0]?.id;
    const escolhido = sel ? Logic.est(sel) : null;

    const pins = bairro
      ? locais
          .map((e, i) => {
            const p = this.pinPos(e, i, locais.length);
            const rest = e.tipo === "restaurante";
            return `<button class="pin ${rest ? "rest" : ""} ${sel === e.id ? "on" : ""}" style="left:${p.left}%;top:${p.top}%" data-pin="${e.id}" title="${e.nome}"></button>`;
          })
          .join("")
      : bairros
          .map((nome) => {
            const z = zones[nome] || { l: 50, t: 50 };
            const n = this.estsDoBairro(nome).length;
            return `<button class="pin-cluster" style="left:${z.l}%;top:${z.t}%" data-map-bairro="${nome}" title="${nome}">${n}</button>`;
          })
          .join("");

    const zonaOn =
      bairro && zones[bairro]
        ? `<div class="map-zone" style="left:${zones[bairro].l}%;top:${zones[bairro].t}%"></div>`
        : "";

    const labels = Object.entries(zones)
      .map(
        ([nome, z]) =>
          `<button class="map-label ${bairro === nome ? "on" : ""}" style="left:${Math.max(2, z.l - 8)}%;top:${Math.max(3, z.t - 8)}%" data-map-bairro="${nome}">${z.short}</button>`
      )
      .join("");

    return `${this.back("Mapa de Aracaju")}
      <p class="muted small" style="margin-bottom:10px">Toque em um bairro para ver todos os bares e restaurantes cadastrados.</p>
      <div class="pill-tabs" style="margin-bottom:12px">
        <button class="${!bairro ? "on" : ""}" data-map-bairro="">Todos</button>
        ${bairros
          .map((nome) => `<button class="${bairro === nome ? "on" : ""}" data-map-bairro="${nome}">${nome}</button>`)
          .join("")}
      </div>
      <div class="map-art ${bairro ? "focused" : ""}">
        <div class="map-water"></div>
        ${zonaOn}
        ${labels}
        ${pins}
        ${
          escolhido && bairro
            ? `<div class="map-pop">
                <div class="row between">
                  <div>
                    <strong>${escolhido.nome}</strong>
                    <p class="small muted">📍 ${Logic.tipoEst(escolhido)} · ${escolhido.bairro} · ${Logic.fmtKm(escolhido.distanciaKm)}</p>
                  </div>
                  <button class="btn btn-gold btn-sm" data-go="#/est/${escolhido.id}">Ver</button>
                </div>
              </div>`
            : `<div class="map-pop">
                <strong>${bairro ? bairro : "Aracaju"}</strong>
                <p class="small muted">${locais.length} estabelecimento${locais.length === 1 ? "" : "s"} cadastrado${locais.length === 1 ? "" : "s"}</p>
              </div>`
        }
      </div>
      ${
        bairro
          ? `<div class="row between" style="margin:16px 0 10px" id="lista-mapa">
              <div>
                <h2>${bairro}</h2>
                <p class="tiny muted">${locais.length} bar${locais.length === 1 ? "" : "es"} e restaurante${locais.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            <div class="stack est-list">${slice.map((e) => this.estMini(e)).join("")}</div>
            ${this.pager(this.mapPage, pages)}`
          : `<p class="notice" style="margin-top:14px">Escolha uma localidade no mapa ou na lista acima para ver todos os estabelecimentos da região.</p>`
      }`;
  },

  detalhe() {
    const e = Logic.est(this.params.id);
    if (!e) return `<p>Estabelecimento não encontrado.</p>`;
    const me = this.me();
    const drinks = e.bebidas
      .map((b) => {
        const cam = Logic.patrocinioEm(e.id, b.id);
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
    const mineDrinks = e.bebidas
      .map((b) => {
        const existing = Logic.progresso(me.id, e.id, b.id);
        const cam = Logic.patrocinioEm(e.id, b.id);
        if (!existing && !cam) return null;
        return Logic.garantirProgresso(me.id, e.id, b.id);
      })
      .filter(Boolean);
    const prog = mineDrinks
      .map((t) => {
        const beb = Logic.bebida(t.bebidaId);
        const cam = Logic.patrocinioEm(e.id, t.bebidaId);
        const disp = Logic.saiderasDisponiveis(me.id, e.id, t.bebidaId).length;
        const usada = cam && Logic.ofertaConsumida(me.id, cam.id, e.id, t.bebidaId);
        const nota = usada
          ? `Oferta concluída neste bar. Meta da casa: ${Logic.metaOriginal(e, t.bebidaId)} Tampas`
          : cam
            ? `Oferta (uso único): ${cam.metaTampas} Tampas`
            : "";
        return `<div class="card pad" style="margin-bottom:10px">
          <div class="row between"><strong>${beb.nome}</strong><span>${t.atual} / ${t.meta}</span></div>
          ${nota ? `<p class="tiny ${usada ? "muted" : "gold"}">${nota}</p>` : ""}
          <div style="margin:8px 0">${UI.tampas(disp ? t.meta : t.atual, t.meta)}</div>
          ${UI.barra(disp ? t.meta : t.atual, t.meta)}
          ${disp ? `<span class="badge badge-green" style="margin-top:8px">SAIDERA DISPONÍVEL</span>` : `<p class="small muted" style="margin-top:8px">Faltam ${t.meta - t.atual}</p>`}
        </div>`;
      })
      .join("");
    return `${this.back(e.nome)}
      <div class="photo" style="height:180px;border-radius:24px;margin-bottom:14px">
        <img src="${Logic.imagemEst(e)}" alt="${e.nome}" onerror="this.onerror=null;this.src='${Logic.imagemPadraoEst(e)}'"/>
        <div class="overlay"></div>
        <div style="position:absolute;bottom:12px;left:14px">
          <h1>${e.nome}</h1>
          <p class="small">${Logic.tipoEst(e)} · ${e.bairro} · ${e.aberto ? "Aberto agora" : "Fechado"} · ${Logic.fmtKm(e.distanciaKm)}</p>
        </div>
      </div>
          <div class="row wrap" style="margin-bottom:14px">
        <span class="badge badge-gold">${Logic.tipoEst(e)}</span>
        ${Logic.patrocinioEm(e.id) ? `<span class="badge badge-navy">Patrocínio ativo</span>` : `<span class="badge badge-navy">Saidera padrão · ${e.metaPadrao} Tampas</span>`}
        <span class="badge badge-ghost">★ ${e.avaliacao}</span>
      </div>
      <h2>Bebidas</h2>
      <div class="card" style="margin:10px 0 18px">${drinks}</div>
      <h2>Seu progresso aqui</h2>
      <div style="margin-top:10px">${prog || `<p class="muted">Você ainda não acumulou Tampas neste bar.</p>`}</div>
      <button class="btn btn-gold btn-block" style="margin-top:16px" data-go="#/qr">Mostrar meu QR Code</button>`;
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
    return `${this.top(`<h1>Minhas Tampas</h1><p class="muted" style="margin:4px 0 12px">Progresso por bar e por bebida.</p>`)}
      <div class="pill-tabs" style="margin-bottom:14px">
        <button class="${filtro === "todos" ? "on" : ""}" data-go="#/tampas/todos">Todos</button>
        <button class="${filtro === "quase" ? "on" : ""}" data-go="#/tampas/quase">Quase lá</button>
        <button class="${filtro === "disp" ? "on" : ""}" data-go="#/tampas/disp">Saidera disponível</button>
      </div>
      <div class="stack">${cards
        .map(
          ({ t, e, b, disp, showAtual, falta }) => `<article class="card pad">
            <p class="tiny muted">${e.nome} · ${e.bairro}</p>
            <div class="row between"><h3>${b.nome}</h3><strong>${showAtual} / ${t.meta}</strong></div>
            <div style="margin:10px 0">${UI.tampas(showAtual, t.meta)}</div>
            ${UI.barra(showAtual, t.meta)}
            <div class="row between" style="margin-top:10px">
              ${
                disp.length
                  ? `<span class="badge badge-green">SAIDERA DISPONÍVEL</span><button class="btn btn-gold btn-sm" data-go="#/saideras">Ver Saidera</button>`
                  : `<span class="muted small">${falta === 1 ? "Falta 1" : "Faltam " + falta}</span><button class="btn btn-dark btn-sm" data-go="#/est/${e.id}">Ver bar</button>`
              }
            </div>
          </article>`
        )
        .join("")}</div>`;
  },

  saideras() {
    const me = this.me();
    const tab = this.params.id || "disponiveis";
    const filtro = tab === "utilizadas" ? "utilizada" : tab === "expiradas" ? "expirada" : "disponivel";
    const list = Logic.saiderasDe(me.id, filtro);
    return `${this.top(`<h1>Minhas Saideras</h1><p class="tiny muted">Cada Saidera vale ${Logic.validadeDias} dias depois de conquistada.</p>`)}
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
                  <span class="badge ${s.status === "disponivel" ? (urgente ? "badge-gold" : "badge-green") : "badge-ghost"}">${s.status === "disponivel" ? "SAIDERA DISPONÍVEL" : s.status === "expirada" ? "EXPIRADA" : "UTILIZADA"}</span>
                  <h2 style="margin:8px 0 2px">${b.nome}</h2>
                  <p class="muted">${e.nome}</p>
                  <p class="small" style="margin:8px 0">Conquistada em: ${Logic.fmtDate(s.conquistadaEm)}</p>
                  <p class="small ${urgente ? "gold" : "muted"}">${Logic.validadeLabel(s)}${s.expiraEm ? " · " + Logic.fmtDate(s.expiraEm) : ""}</p>
                  <p class="tiny">Código: <strong>${s.codigo}</strong></p>
                  ${s.status === "disponivel" ? `<button class="btn btn-gold btn-block" style="margin-top:12px" data-go="#/qr">Mostrar ao garçom</button>` : ""}
                </article>`;
              })
              .join("")
          : `<p class="muted">Nenhuma Saidera nesta lista ainda.</p>`
      }`;
  },

  ofertas() {
    if (this.params.id) return this.ofertaDetalhe();
    const camps = Logic.campanhasPatrocinio(this.me().id);
    const extra = Store.all("notificacoes").filter((n) => n.clienteId === this.me().id && n.tipo === "oferta" && n.campanhaId);
    if (!camps.length) {
      return `${this.top(`<h1>Ofertas e Saideras 🔥</h1><p class="muted" style="margin:6px 0 14px">Nenhuma campanha ativa para você no momento.</p>`)}
        ${Brand.banner("story", "brand-story")}
        <p class="notice" style="margin-top:14px">Quando o Admin Saidera ativar um pedido do bar ou um patrocínio de marca, a oferta aparece aqui.</p>`;
    }
    return `${this.top(`<h1>Ofertas e Saideras 🔥</h1><p class="muted" style="margin:6px 0 14px">Campanhas ativas · Aracaju</p>`)}
      ${Brand.banner("secundario", "brand-banner")}
      ${camps
        .map((c, i) => {
          const par = Store.find("parceiros", c.parceiroId);
          const casa = Logic.est(c.estabelecimentoId || c.estabelecimentos?.[0]);
          const ests = (c.estabelecimentos || []).slice(0, 3).map((id) => Logic.est(id)?.nome).filter(Boolean);
          const img = Logic.imagemEst(casa) || Logic.imagemEst(c.estabelecimentos?.[0]) || Logic.imagemEst(Store.all("estabelecimentos")[i + 1]);
          const selo = c.origem === "estabelecimento" ? casa?.nome || "Sua casa" : par?.selo || "Marca demonstrativa";
          return `<article class="offer-banner photo" data-go="#/ofertas/${c.id}">
            <img src="${img}" alt="" onerror="this.style.display='none'"/>
            <div class="overlay"></div>
            <div class="content">
              <span class="badge badge-navy">${c.origem === "estabelecimento" ? "DA CASA" : "PATROCINADO"} · ${selo}</span>
              <h2 style="margin:8px 0 4px">${c.origem === "estabelecimento" ? c.titulo : Logic.bebida(c.bebidaId)?.nome || par?.nome}</h2>
              <p>${c.mensagem}</p>
              ${c.metaTampas ? `<p class="gold" style="font-weight:800;margin:8px 0">${c.metaTampas} Tampas</p>` : `<p class="gold" style="font-weight:800;margin:8px 0">Compareça e mostre o QR</p>`}
              <p class="small">${ests.join(" · ")}${(c.estabelecimentos || []).length > 3 ? " · +" + (c.estabelecimentos.length - 3) : ""}</p>
              <button class="btn btn-gold btn-sm" style="margin-top:10px">${c.metaTampas ? "Entrar na oferta" : "Ver convite"}</button>
            </div>
          </article>`;
        })
        .join("")}
      ${extra.length ? `<p class="notice">Nova oferta recebida nesta demonstração.</p>` : ""}`;
  },

  ofertaDetalhe() {
    const c = Store.find("campanhas", this.params.id);
    if (!c || c.status !== "ativa" || !c.disparada) {
      return `${this.back("Oferta")}
        <p class="muted">Esta oferta ainda não foi ativada pelo Admin Saidera.</p>
        <button class="btn btn-gold" data-go="#/ofertas">Ver ofertas</button>`;
    }
    Logic.aderirCampanha(this.me().id, c.id);
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
        <p class="small muted" style="margin-top:6px">Continue suas Tampas e retire sua Saidera nesta casa.</p>`
        }
      </div>
      <h2 style="margin-bottom:10px">${daCasa ? "Nesta casa" : "Bares e restaurantes da oferta"}</h2>
      <div class="stack">${ests
        .map((e) => {
          if (!c.metaTampas) {
            return `<article class="card pad" data-go="#/est/${e.id}" style="cursor:pointer">
            <p class="tiny muted">${Logic.tipoEst(e)} · ${e.bairro}</p>
            <h3>${e.nome}</h3>
            <p class="tiny gold" style="margin-top:8px">Mostre o QR no salão para consumo e retirada da Saidera.</p>
          </article>`;
          }
          const p = Logic.garantirProgresso(me.id, e.id, c.bebidaId);
          const usada = Logic.ofertaConsumida(me.id, c.id, e.id, c.bebidaId);
          const regraCasa = Logic.metaOriginal(e, c.bebidaId);
          return `<article class="card pad" data-go="#/est/${e.id}" style="cursor:pointer">
            <p class="tiny muted">${Logic.tipoEst(e)} · ${e.bairro}</p>
            <div class="row between"><h3>${e.nome}</h3><strong>${p.atual}/${p.meta}</strong></div>
            <div style="margin:8px 0">${UI.tampas(p.atual, p.meta)}</div>
            ${UI.barra(p.atual, p.meta)}
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
    return `${this.top()}
      <div class="stack" style="align-items:center;text-align:center;margin:8px 0 18px">
        <img class="avatar" src="${me.avatar}" style="width:86px;height:86px;border-radius:28px"/>
        <h1>${me.nome}</h1>
        <p class="muted">${me.telefone} · ${me.email}</p>
        <p class="small muted">Nascimento ${me.nascimento} · ${me.cidade}</p>
        <button class="btn btn-gold" data-go="#/qr">Meu QR Code</button>
      </div>
      <div class="grid-3" style="margin-bottom:16px">
        <div class="kpi"><b>${m.tampas}</b><span>Tampas</span></div>
        <div class="kpi"><b>${m.saideras}</b><span>Saideras</span></div>
        <div class="kpi"><b>${m.estabelecimentos}</b><span>Bares</span></div>
      </div>
      <div class="card pad" style="margin-bottom:12px">
        <p class="tiny muted">Bebida favorita</p>
        <h2>${m.favorita?.nome || "Heineken"}</h2>
      </div>
      ${["Histórico", "Preferências", "Privacidade", "Notificações"]
        .map(
          (l, i) =>
            `<button class="card pad btn-block" style="text-align:left;margin-bottom:8px" data-go="${["#/historico", "#/preferencias", "#/privacidade", "#/notificacoes"][i]}"><div class="row between"><span>${l}</span><span class="muted">›</span></div></button>`
        )
        .join("")}
      <section class="card pad" style="margin:14px 0">
        <p class="tiny muted">Quem está na demonstração</p>
        <div class="row wrap" style="margin-top:10px;gap:8px">
          ${Logic.clientesDemo()
            .map(
              (c) =>
                `<button class="btn ${c.id === me.id ? "btn-gold" : "btn-dark"} btn-sm" data-demo-cli="${c.id}">${c.primeiroNome}</button>`
            )
            .join("")}
        </div>
        <p class="tiny muted" style="margin-top:8px">Troque para ver Tampas e Saideras de outra pessoa da demo.</p>
      </section>
      ${UI.pwaBox()}
      <a class="btn btn-ghost btn-block" href="../index.html" style="margin-top:8px">${Icons.logout()} Sair</a>`;
  },

  historico() {
    const me = this.me();
    const cons = Store.all("consumos").filter((c) => c.clienteId === me.id).slice(0, 20);
    return `${this.back("Histórico")}
      ${cons
        .map((c) => `<div class="card pad" style="margin-bottom:8px">
          <div class="row between"><strong>+${c.quantidade} ${Logic.bebida(c.bebidaId).nome}</strong><span class="small muted">${Logic.fmtDateShort(c.criadoEm)}</span></div>
          <p class="small muted">${Logic.est(c.estabelecimentoId).nome}</p>
        </div>`)
        .join("")}`;
  },

  qr() {
    const me = this.me();
    return `${this.back("Meu Saidera")}
      <div class="qr-stage">
        ${Brand.simbolo(72)}
        ${UI.qrSvg(me.codigo)}
        <h2 style="margin-top:8px">${me.primeiroNome}</h2>
        <p class="muted">ID: ${me.codigo}</p>
        <p style="margin-top:12px">Mostre este QR Code ao garçom para registrar suas Tampas. É o seu ID — ele pode escanear de novo sempre que precisar.</p>
        <p class="tiny muted" style="margin-top:10px">O código contém ${me.codigo}. Use outro celular no app do garçom e aponte a câmera.</p>
      </div>`;
  },

  preferencias() {
    const me = this.me();
    const prefs = Logic.prefsCliente(me.id);
    return `${this.back("Preferências")}
      <p class="muted" style="margin-bottom:14px">Vale para esta demonstração neste aparelho.</p>
      <div class="field"><span>Bebida favorita</span>
        <select id="pref-bebida">
          ${Store.all("bebidas")
            .slice(0, 12)
            .map((b) => `<option value="${b.id}" ${b.id === prefs.bebidaFavoritaId ? "selected" : ""}>${b.nome}</option>`)
            .join("")}
        </select>
      </div>
      <p class="tiny muted" style="margin-top:12px">Isso aparece no seu perfil e ajuda o bar a te reconhecer.</p>`;
  },

  privacidade() {
    const me = this.me();
    const prefs = Logic.prefsCliente(me.id);
    return `${this.back("Privacidade")}
      <label class="toggle-row">
        <span>Casas da rede podem ver que eu frequento o app</span>
        <input type="checkbox" data-pref="perfilPublico" ${prefs.perfilPublico ? "checked" : ""}/>
      </label>
      <p class="muted small" style="margin-top:12px">Na demo não há envio a servidores. O dado fica só neste navegador (localStorage).</p>`;
  },

  notificacoes() {
    const me = this.me();
    const prefs = Logic.prefsCliente(me.id);
    const list = Store.all("notificacoes").filter((n) => n.clienteId === me.id);
    list.filter((n) => !n.lida).forEach((n) => {
      n.lida = true;
    });
    if (list.some((n) => n.lida)) Store.save(false);
    return `${this.back("Notificações")}
      <label class="toggle-row"><span>Alertas no app</span><input type="checkbox" data-pref="push" ${prefs.push ? "checked" : ""}/></label>
      <label class="toggle-row"><span>E-mail</span><input type="checkbox" data-pref="email" ${prefs.email ? "checked" : ""}/></label>
      <label class="toggle-row"><span>WhatsApp</span><input type="checkbox" data-pref="whatsapp" ${prefs.whatsapp ? "checked" : ""}/></label>
      <p class="tiny muted" style="margin:16px 0 10px">Caixa da demonstração</p>
      ${
        list.length
          ? list
              .map(
                (n) => `<article class="card pad" style="margin-bottom:8px" ${n.campanhaId ? `data-go="#/ofertas/${n.campanhaId}"` : ""}>
            <strong>${n.titulo}</strong>
            <p class="small muted">${n.texto}</p>
            <p class="tiny muted">${Logic.fmtDate(n.criadoEm)}</p>
          </article>`
              )
              .join("")
          : `<p class="muted">Nenhuma notificação ainda.</p>`
      }`;
  },

  bind() {
    this.root.querySelectorAll("[data-go]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.go(el.getAttribute("data-go"));
      })
    );
    this.root.querySelector("[data-back]")?.addEventListener("click", () => history.back());
    this.root.querySelectorAll("[data-pin]").forEach((el) =>
      el.addEventListener("click", () => {
        this.mapSel = el.getAttribute("data-pin");
        const est = Logic.est(this.mapSel);
        if (est?.bairro) this.mapBairro = est.bairro;
        this.render();
      })
    );
    this.root.querySelectorAll("[data-map-bairro]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const nome = el.getAttribute("data-map-bairro") || "";
        this.mapBairro = nome || null;
        this.mapSel = null;
        this.mapPage = 1;
        this.render();
      })
    );
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
    this.root.querySelectorAll("[data-demo-cli]").forEach((b) =>
      b.addEventListener("click", () => {
        const c = Logic.escolherClienteDemo(b.getAttribute("data-demo-cli"));
        if (c) {
          UI.toast(`Agora você é ${c.primeiroNome} nesta demo.`);
          this.go("#/home");
        }
      })
    );
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
  },
};

document.addEventListener("DOMContentLoaded", () => ClienteApp.boot());
