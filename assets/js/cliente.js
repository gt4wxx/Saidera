const ClienteApp = {
  root: null,
  view: "home",
  params: {},
  mapSel: null,
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
      <div class="logo-row"><div class="logo-mark">S</div><span>Saidera</span></div>
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
        <div class="bg">${UI.photo(est.imagem)}</div>
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
      <div class="bg">${UI.photo(est.imagem)}</div>
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

  estMini(e) {
    const drinks = e.bebidas
      .slice(0, 3)
      .map((b) => {
        const meta = b.meta || e.metaPadrao;
        return `<span class="chip">${b.nome} — ${meta}</span>`;
      })
      .join("");
    return `<article class="est-card" data-go="#/est/${e.id}">
      <div class="thumb photo"><img src="${e.imagem}" alt="${e.nome}" onerror="this.style.display='none'"/></div>
      <div class="body">
        <h3>${e.nome}</h3>
        <p class="small muted">📍 ${Logic.tipoEst(e)} · ${e.bairro} · ${Logic.fmtKm(e.distanciaKm)} · ★ ${e.avaliacao}</p>
        <div class="chips">${drinks}<span class="chip">Padrão — ${e.metaPadrao}</span></div>
        ${e.promocao ? `<p class="tiny gold">${e.promocao}</p>` : ""}
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
      <p class="muted" style="margin-bottom:16px">Qual vai ser sua Saidera hoje?</p>
      <div class="row" style="margin-bottom:8px">
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

  mapa() {
    const pins = [
      ["est-001", "18%", "72%", "Atalaia"],
      ["est-002", "28%", "68%", "Atalaia"],
      ["est-005", "38%", "74%", "Atalaia"],
      ["est-009", "48%", "70%", "Atalaia"],
      ["est-004", "22%", "58%", "Coroa"],
      ["est-011", "32%", "54%", "Coroa"],
      ["est-007", "55%", "38%", "Jardins"],
      ["est-003", "46%", "32%", "13 Jul"],
      ["est-006", "70%", "48%", "Farolândia"],
      ["est-012", "62%", "18%", "Centro"],
      ["est-013", "52%", "22%", "Siqueira"],
      ["est-008", "42%", "20%", "São José"],
    ];
    const sel = this.mapSel || "est-001";
    const e = Logic.est(sel);
    return `${this.back("Mapa de Aracaju")}
      <div class="map-art">
        <div class="map-water"></div>
        <div class="map-label" style="left:8%;top:70%">Atalaia</div>
        <div class="map-label" style="left:8%;top:52%">Coroa do Meio</div>
        <div class="map-label" style="left:48%;top:34%">Jardins</div>
        <div class="map-label" style="left:38%;top:24%">13 de Julho</div>
        <div class="map-label" style="left:66%;top:44%">Farolândia</div>
        <div class="map-label" style="left:58%;top:10%">Centro</div>
        <div class="map-label" style="left:44%;top:12%">Siqueira</div>
        <div class="map-label" style="left:30%;top:14%">São José</div>
        <div class="map-label" style="left:50%;top:28%">Luzia</div>
        <div class="map-label" style="left:62%;top:30%">Grageru</div>
        ${pins
          .map(
            ([id, l, t]) =>
              `<button class="pin ${sel === id ? "on" : ""}" style="left:${l};top:${t}" data-pin="${id}" title="${Logic.est(id).nome}"></button>`
          )
          .join("")}
        <div class="map-pop">
          <div class="row between">
            <div>
              <strong>${e.nome}</strong>
              <p class="small muted">📍 ${Logic.tipoEst(e)} · ${e.bairro} · ${Logic.fmtKm(e.distanciaKm)}</p>
            </div>
            <button class="btn btn-gold btn-sm" data-go="#/est/${e.id}">Ver</button>
          </div>
        </div>
      </div>`;
  },

  detalhe() {
    const e = Logic.est(this.params.id);
    if (!e) return `<p>Estabelecimento não encontrado.</p>`;
    const me = this.me();
    const drinks = e.bebidas
      .map((b) => {
        const meta = b.meta || e.metaPadrao;
        const regra = b.meta ? "Configuração própria" : "Regra padrão";
        return `<div class="row between pad" style="border-bottom:1px solid #2a2a2a">
          <div><strong>${b.nome}</strong><p class="tiny muted">${regra}</p></div>
          <span class="badge badge-gold">${meta} Tampas</span>
        </div>`;
      })
      .join("");
    const mine = Store.all("tampas").filter((t) => t.clienteId === me.id && t.estabelecimentoId === e.id);
    const prog = mine
      .map((t) => {
        const beb = Logic.bebida(t.bebidaId);
        const disp = Logic.saiderasDisponiveis(me.id, e.id, t.bebidaId).length;
        return `<div class="card pad" style="margin-bottom:10px">
          <div class="row between"><strong>${beb.nome}</strong><span>${t.atual} / ${t.meta}</span></div>
          <div style="margin:8px 0">${UI.tampas(disp ? t.meta : t.atual, t.meta)}</div>
          ${UI.barra(disp ? t.meta : t.atual, t.meta)}
          ${disp ? `<span class="badge badge-green" style="margin-top:8px">SAIDERA DISPONÍVEL</span>` : `<p class="small muted" style="margin-top:8px">Faltam ${t.meta - t.atual}</p>`}
        </div>`;
      })
      .join("");
    return `${this.back(e.nome)}
      <div class="photo" style="height:180px;border-radius:24px;margin-bottom:14px">
        <img src="${e.imagem}" alt="${e.nome}" onerror="this.style.display='none'"/>
        <div class="overlay"></div>
        <div style="position:absolute;bottom:12px;left:14px">
          <h1>${e.nome}</h1>
          <p class="small">${Logic.tipoEst(e)} · ${e.bairro} · ${e.aberto ? "Aberto agora" : "Fechado"} · ${Logic.fmtKm(e.distanciaKm)}</p>
        </div>
      </div>
          <div class="row wrap" style="margin-bottom:14px">
        <span class="badge badge-gold">${Logic.tipoEst(e)}</span>
        <span class="badge badge-navy">Saidera padrão · ${e.metaPadrao} Tampas</span>
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
    const list = Logic.saiderasDe(me.id, tab === "utilizadas" ? "utilizada" : "disponivel");
    return `${this.top(`<h1>Minhas Saideras</h1>`)}
      <div class="pill-tabs" style="margin:12px 0">
        <button class="${tab === "disponiveis" ? "on" : ""}" data-go="#/saideras/disponiveis">Disponíveis</button>
        <button class="${tab === "utilizadas" ? "on" : ""}" data-go="#/saideras/utilizadas">Utilizadas</button>
      </div>
      ${
        list.length
          ? list
              .map((s) => {
                const e = Logic.est(s.estabelecimentoId);
                const b = Logic.bebida(s.bebidaId);
                return `<article class="saidera-card ${s.status}">
                  <span class="badge ${s.status === "disponivel" ? "badge-green" : "badge-ghost"}">${s.status === "disponivel" ? "SAIDERA DISPONÍVEL" : "UTILIZADA"}</span>
                  <h2 style="margin:8px 0 2px">${b.nome}</h2>
                  <p class="muted">${e.nome}</p>
                  <p class="small" style="margin:8px 0">Conquistada em: ${Logic.fmtDate(s.conquistadaEm)}</p>
                  <p class="tiny">Código: <strong>${s.codigo}</strong></p>
                  ${s.status === "disponivel" ? `<button class="btn btn-gold btn-block" style="margin-top:12px" data-go="#/qr">Mostrar ao garçom</button>` : ""}
                </article>`;
              })
              .join("")
          : `<p class="muted">Nenhuma Saidera nesta lista ainda.</p>`
      }`;
  },

  ofertas() {
    const camps = Store.all("campanhas").filter((c) => c.status === "ativa" || c.disparada);
    const extra = Store.all("notificacoes").filter((n) => n.clienteId === this.me().id && n.tipo === "oferta" && n.campanhaId);
    return `${this.top(`<h1>Ofertas e Saideras 🔥</h1><p class="muted" style="margin:6px 0 14px">Marcas demonstrativas · Aracaju</p>`)}
      ${camps
        .slice(0, 8)
        .map((c, i) => {
          const par = Store.find("parceiros", c.parceiroId);
          const ests = (c.estabelecimentos || []).slice(0, 3).map((id) => Logic.est(id)?.nome).filter(Boolean);
          return `<article class="offer-banner photo" data-go="#/est/${c.estabelecimentos[0]}">
            <img src="${Store.all("estabelecimentos")[i + 1].imagem}" alt="" onerror="this.style.display='none'"/>
            <div class="overlay"></div>
            <div class="content">
              <span class="badge badge-navy">PATROCINADO · ${par?.selo || "Marca demonstrativa"}</span>
              <h2 style="margin:8px 0 4px">${Logic.bebida(c.bebidaId)?.nome || par?.nome}</h2>
              <p>${c.mensagem}</p>
              <p class="gold" style="font-weight:800;margin:8px 0">${c.metaTampas} Tampas</p>
              <p class="small">${ests.join(" · ")}</p>
              <button class="btn btn-gold btn-sm" style="margin-top:10px">Ver estabelecimentos</button>
            </div>
          </article>`;
        })
        .join("")}
      ${extra.length ? `<p class="notice">Nova oferta recebida nesta demonstração.</p>` : ""}`;
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
            `<button class="card pad btn-block" style="text-align:left;margin-bottom:8px" data-go="${i === 0 ? "#/historico" : "#/perfil"}"><div class="row between"><span>${l}</span><span class="muted">›</span></div></button>`
        )
        .join("")}
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
        ${UI.qrSvg()}
        <h2 style="margin-top:8px">${me.primeiroNome}</h2>
        <p class="muted">ID: ${me.codigo}</p>
        <p style="margin-top:12px">Mostre este QR Code ao garçom para registrar suas Tampas. É o seu ID — ele pode escanear de novo sempre que precisar.</p>
      </div>`;
  },

  notificacoes() {
    const me = this.me();
    const list = Store.all("notificacoes").filter((n) => n.clienteId === me.id);
    return `${this.back("Notificações")}
      ${list
        .map(
          (n) => `<article class="card pad" style="margin-bottom:8px;opacity:${n.lida ? 0.7 : 1}">
            <strong>${n.titulo}</strong>
            <p class="small muted">${n.texto}</p>
            <p class="tiny muted">${Logic.fmtDate(n.criadoEm)}</p>
          </article>`
        )
        .join("")}`;
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
        if (!n || n === this.homePage || el.disabled) return;
        this.homePage = n;
        this.render();
        const body = this.root.querySelector(".phone-body");
        const list = this.root.querySelector("#lista-bares");
        if (body && list) body.scrollTop = Math.max(0, list.offsetTop - 12);
      })
    );
  },
};

document.addEventListener("DOMContentLoaded", () => ClienteApp.boot());
