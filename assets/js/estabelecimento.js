const EstApp = {
  root: null,
  view: "dashboard",
  params: {},
  estId: "est-001",
  qty: 1,
  drinkId: "beb-001",
  clienteSel: "cli-001",
  campForm: { tipo: null, publico: "todos", mensagem: "", meta: 6, bebidaId: "beb-001", canal: "push" },
  volta: { qtd: 10, ids: [], mensagem: "" },
  cliPage: 1,
  cliPerPage: 10,
  cliQuery: "",

  boot() {
    Store.init();
    UI.bindGlobal();
    this.root = document.getElementById("app");
    Store.on(() => this.render());
    window.addEventListener("hashchange", () => this.route());
    this.route();
  },

  est() {
    return Logic.est(this.estId);
  },

  aplicarQtdVolta(qtd) {
    const list = Logic.inativosDoEst(this.estId);
    const n = Math.max(1, Math.min(Number(qtd) || 1, list.length));
    this.volta.qtd = n;
    this.volta.ids = list.slice(0, n).map((c) => c.id);
  },

  aplicarModeloCamp(tipo, publico) {
    const modelo = Logic.modelosCampanhaCasa(this.est())[tipo] || Logic.modelosCampanhaCasa(this.est()).comparecer;
    this.campForm.tipo = tipo;
    this.campForm.publico = publico || modelo.publico;
    this.campForm.mensagem = modelo.mensagem;
    this.campForm.meta = modelo.metaTampas || 6;
    this.campForm.bebidaId = this.est()?.bebidas?.[0]?.id || "beb-001";
  },

  syncCampForm() {
    const msg = this.root.querySelector("#camp-msg")?.value;
    const meta = this.root.querySelector("#camp-meta")?.value;
    const bebida = this.root.querySelector("#camp-bebida")?.value;
    const canal = this.root.querySelector("#camp-canal")?.value;
    if (msg != null) this.campForm.mensagem = msg;
    if (meta != null) this.campForm.meta = Number(meta) || 6;
    if (bebida) this.campForm.bebidaId = bebida;
    if (canal) this.campForm.canal = canal;
  },

  route() {
    const parts = (location.hash || "#/dashboard").slice(1).split("/").filter(Boolean);
    this.view = parts[0] || "dashboard";
    this.params.id = parts[1];
    this.render();
  },

  render() {
    const map = {
      dashboard: () => this.dashboard(),
      clientes: () => this.clientes(),
      cliente: () => this.perfilCliente(),
      registrar: () => this.registrar(),
      bebidas: () => this.bebidas(),
      saideras: () => this.saideras(),
      funcionarios: () => this.funcionarios(),
      inteligencia: () => this.inteligencia(),
      chamar: () => this.chamar(),
      campanhas: () => this.campanhas(),
      config: () => this.config(),
    };
    const html = (map[this.view] || map.dashboard)();
    this.root.innerHTML = `<div class="dash-app">
      <div class="sidebar-scrim" data-close-menu></div>
      ${this.sidebar()}
      <main class="dash-main">
        <div class="dash-head">
          <div class="row">
            <button class="icon-btn menu-btn" data-menu>${Icons.menu()}</button>
            <div>
              <p class="tiny muted">SAIDERA · Estabelecimento · Dados demonstrativos</p>
              <h1 id="view-title"></h1>
            </div>
          </div>
          <div class="row">
            <div class="search wide search">${Icons.search()}<input placeholder="Buscar cliente" data-jump-search value="${this.view === "clientes" ? this.cliQuery.replace(/"/g, "&quot;") : ""}"/></div>
            <a class="btn btn-gold btn-sm" href="#/registrar">Registrar consumo</a>
          </div>
        </div>
        ${html}
      </main>
    </div>${UI.demoWidget()}`;
    const titles = {
      dashboard: "Visão geral",
      clientes: "Clientes",
      cliente: this.params.id ? Logic.cliente(this.params.id)?.nome : "Cliente",
      registrar: "Registrar consumo",
      bebidas: "Bebidas",
      saideras: "Saideras",
      funcionarios: "Funcionários",
      inteligencia: "Conheça seus clientes",
      chamar: "Chamar de volta",
      campanhas: "Campanhas",
      config: "Configurações",
    };
    const t = this.root.querySelector("#view-title");
    if (t) t.textContent = titles[this.view] || "Painel";
    this.bind();
  },

  sidebar() {
    const items = [
      ["dashboard", "Visão Geral", Icons.home()],
      ["clientes", "Clientes", Icons.users()],
      ["registrar", "Registrar consumo", Icons.plus()],
      ["bebidas", "Bebidas", Icons.beer()],
      ["saideras", "Saideras", Icons.gift()],
      ["funcionarios", "Funcionários", Icons.user()],
      ["inteligencia", "Conheça seus clientes", Icons.spark()],
      ["campanhas", "Campanhas", Icons.megaphone()],
      ["config", "Configurações", Icons.settings()],
    ];
    return `<aside class="sidebar" id="sidebar">
      <div class="logo-row pad"><div class="logo-mark">S</div><div><strong>SAIDERA</strong><p class="tiny muted">${this.est().nome}</p></div></div>
      <nav>${items
        .map(
          ([id, l, ic]) =>
            `<a class="${this.view === id || (id === "inteligencia" && this.view === "chamar") ? "on" : ""}" href="#/${id}">${ic}<span>${l}</span></a>`
        )
        .join("")}</nav>
      <div class="side-foot">
        <p class="tiny muted">Marcas e números fictícios para apresentação.</p>
        <a class="btn btn-ghost btn-sm btn-block" href="../index.html">${Icons.logout()} Trocar perfil</a>
      </div>
    </aside>`;
  },

  dashboard() {
    const r = Logic.resumoEst(this.estId);
    const week = Logic.semanaTampas(this.estId);
    const recent = this.recentes();
    return `<div class="kpis">
      ${[
        ["Clientes hoje", r.clientesHoje],
        ["Tampas registradas", r.tampasHoje],
        ["Saideras conquistadas", 12],
        ["Saideras utilizadas", 9],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`)
        .join("")}
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <section class="panel">
        <h3>Tampas nos últimos 7 dias</h3>
        ${UI.lineChart(week.values, week.labels)}
      </section>
      <section class="panel">
        <h3>Bebidas mais consumidas</h3>
        ${UI.bars(r.drinks.length ? r.drinks : [
          { nome: "Heineken", pct: 38 },
          { nome: "Budweiser", pct: 22 },
          { nome: "Brahma", pct: 17 },
          { nome: "Stella", pct: 13 },
          { nome: "Outras", pct: 10 },
        ])}
      </section>
    </div>
    <section class="panel">
      <div class="row between" style="margin-bottom:12px"><h3>Clientes recentes</h3><a class="gold small" href="#/clientes">Ver CRM</a></div>
      ${recent}
    </section>`;
  },

  recentes() {
    const ids = ["cli-001", "cli-002", "cli-003"];
    return ids
      .map((id) => {
        const c = Logic.cliente(id);
        const drinkId = id === "cli-002" ? "beb-002" : id === "cli-003" ? "beb-006" : "beb-001";
        const p = Logic.garantirProgresso(id, this.estId, drinkId);
        const disp = Logic.saiderasDisponiveis(id, this.estId, drinkId);
        const falta = p.meta - p.atual;
        const beb = Logic.bebida(drinkId);
        const action = disp.length
          ? `<button class="btn btn-gold btn-sm" data-entregar="${id}|${drinkId}">Entregar Saidera</button>`
          : `<a class="btn btn-dark btn-sm" href="#/registrar/${id}">+ Registrar consumo</a>`;
        return `<div class="row between" style="padding:12px 0;border-top:1px solid #2a2a2a">
          <div class="person">
            <img src="${c.avatar}" alt=""/>
            <div>
              <strong>${c.primeiroNome}</strong>
              <p class="small muted">${beb.nome} · ${disp.length ? p.meta : p.atual} / ${p.meta}</p>
            </div>
          </div>
          <div class="row">
            ${disp.length ? `<span class="badge badge-green">Saidera disponível</span>` : `<span class="muted small">${falta === 1 ? "Falta 1" : "Faltam " + falta}</span>`}
            ${action}
          </div>
        </div>`;
      })
      .join("");
  },

  pager(page, pages, label = "Páginas") {
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
    return `<nav class="pager" aria-label="${label}">
      <button type="button" class="pager-nav" data-page="${Math.max(1, page - 1)}" ${page === 1 ? "disabled" : ""} aria-label="Página anterior">‹</button>
      ${start > 1 ? dots : ""}
      ${buttons}
      ${end < pages ? dots : ""}
      <button type="button" class="pager-nav" data-page="${Math.min(pages, page + 1)}" ${page === pages ? "disabled" : ""} aria-label="Próxima página">›</button>
    </nav>`;
  },

  clientesFiltrados() {
    const q = (this.cliQuery || "").trim().toLowerCase();
    return Logic.clientesDoEst(this.estId).filter((c) => {
      if (!q) return true;
      return [c.nome, c.codigo, c.email, c.telefone, c.primeiroNome].some((v) => (v || "").toLowerCase().includes(q));
    });
  },

  clientes() {
    const list = this.clientesFiltrados();
    const per = this.cliPerPage;
    const pages = Math.max(1, Math.ceil(list.length / per));
    if (this.cliPage > pages) this.cliPage = pages;
    if (this.cliPage < 1) this.cliPage = 1;
    const page = this.cliPage;
    const start = (page - 1) * per;
    const slice = list.slice(start, start + per);
    const from = list.length ? start + 1 : 0;
    const to = start + slice.length;
    const rows = slice
      .map((c) => {
        const prefs = Logic.preferencias(c.id, this.estId);
        const fav = prefs[0] ? Logic.bebida(prefs[0].id) : Logic.bebida(c.bebidaFavoritaId);
        const p = Store.all("tampas").find((t) => t.clienteId === c.id && t.estabelecimentoId === this.estId);
        const sais = Store.all("saideras").filter((s) => s.clienteId === c.id && s.estabelecimentoId === this.estId);
        const disp = sais.filter((s) => s.status === "disponivel").length;
        return `<tr data-href="#/cliente/${c.id}">
          <td><div class="person"><img src="${c.avatar}" alt=""/><div><strong>${c.nome}</strong><p class="tiny muted">${c.codigo}</p></div></div></td>
          <td>${fav?.nome || "—"}</td>
          <td>${p ? p.atual + "/" + p.meta : "—"}</td>
          <td>${sais.length}</td>
          <td>${c.ultimaVisita}</td>
          <td>${disp ? `<span class="badge badge-green">Saidera</span>` : `<span class="badge badge-ghost">${c.status}</span>`}</td>
        </tr>`;
      })
      .join("");
    const busca = this.cliQuery.trim()
      ? `${list.length} encontrado${list.length === 1 ? "" : "s"} para “${this.cliQuery.trim()}”`
      : `${from}–${to} de ${list.length} clientes com movimento nesta casa`;
    return `<section class="panel">
      <p class="muted small" style="margin-bottom:12px">${busca}</p>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Favorita</th><th>Tampas</th><th>Saideras</th><th>Última visita</th><th>Status</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="muted">${this.cliQuery.trim() ? "Nenhum cliente encontrado." : "Nenhum cliente nesta casa ainda."}</td></tr>`}</tbody>
      </table></div>
      ${this.pager(page, pages, "Páginas de clientes")}
    </section>`;
  },

  perfilCliente() {
    const c = Logic.cliente(this.params.id);
    if (!c) return `<p>Cliente não encontrado.</p>`;
    const prefs = Logic.preferencias(c.id, this.estId);
    const sais = Store.all("saideras").filter((s) => s.clienteId === c.id && s.estabelecimentoId === this.estId);
    const hist = Store.all("consumos")
      .filter((x) => x.clienteId === c.id && x.estabelecimentoId === this.estId)
      .slice(0, 12);
    return `<div class="grid-2">
      <section class="panel">
        <div class="person" style="margin-bottom:16px">
          <img src="${c.avatar}" style="width:64px;height:64px;border-radius:18px" alt=""/>
          <div>
            <h2>${c.nome}</h2>
            <p class="muted small">Cliente desde ${c.clienteDesde}</p>
          </div>
        </div>
        <p>Última visita: <strong>${c.ultimaVisita}</strong></p>
        <p>Nascimento: <strong>${c.nascimento}</strong></p>
        <p>Telefone: <strong>${c.telefone}</strong></p>
        <p>E-mail: <strong>${c.email}</strong></p>
        <div class="kpis" style="margin-top:16px">
          <div class="kpi"><b>${sais.length}</b><span>Conquistadas</span></div>
          <div class="kpi"><b>${sais.filter((s) => s.status === "utilizada").length}</b><span>Utilizadas</span></div>
          <div class="kpi"><b>${sais.filter((s) => s.status === "disponivel").length}</b><span>Disponíveis</span></div>
        </div>
        <a class="btn btn-gold btn-block" style="margin-top:14px" href="#/registrar/${c.id}">Registrar consumo</a>
      </section>
      <section class="panel">
        <h3>Preferências</h3>
        ${prefs
          .slice(0, 6)
          .map(
            (p, i) => `<div class="row between" style="padding:8px 0"><span>${p.nome}</span><strong>${p.qtd} consumos ${i === 0 ? "· favorita" : ""}</strong></div>`
          )
          .join("") || "<p class='muted'>Sem histórico ainda.</p>"}
        <h3 style="margin-top:18px">Histórico</h3>
        ${hist
          .map(
            (h) =>
              `<div class="row between" style="padding:8px 0;border-top:1px solid #2a2a2a"><span>${Logic.fmtDateShort(h.criadoEm)}</span><strong>+${h.quantidade} ${Logic.bebida(h.bebidaId).nome}</strong></div>`
          )
          .join("")}
      </section>
    </div>`;
  },

  registrar() {
    const preset = this.params.id || this.clienteSel;
    const c = Logic.cliente(preset);
    const est = this.est();
    const drinks = est.bebidas;
    const p = c ? Logic.garantirProgresso(c.id, this.estId, this.drinkId) : null;
    return `<section class="panel" style="max-width:720px">
      <div class="search" style="margin-bottom:14px">${Icons.search()}<input id="busca-cli" placeholder="Buscar cliente ou escanear QR Code" value="${c ? c.nome : ""}"/></div>
      <div class="row" style="margin-bottom:16px">
        <button class="btn btn-navy btn-sm" id="scan-qr">${Icons.qr()} Escanear QR Code</button>
        <button class="btn btn-dark btn-sm" data-pick="cli-001">Ellisson</button>
        <button class="btn btn-dark btn-sm" data-pick="cli-002">Carlos</button>
        <button class="btn btn-dark btn-sm" data-pick="cli-003">Maria</button>
      </div>
      ${
        c
          ? `<div class="person" style="margin-bottom:18px">
              <img src="${c.avatar}" alt=""/>
              <div><strong>${c.nome}</strong><p class="small muted">${c.codigo} · última visita ${c.ultimaVisita}</p></div>
            </div>
            <h3 style="margin-bottom:10px">Bebida</h3>
            <div class="drink-pick" id="drinks">
              ${drinks
                .map((d) => {
                  const meta = Logic.metaDe(est, d.id, c.id);
                  const cam = Logic.patrocinioEm(this.estId, d.id);
                  return `<button class="${this.drinkId === d.id ? "on" : ""}" data-drink="${d.id}"><strong>${d.nome}</strong><p class="tiny muted">${meta} Tampas${cam ? " · oferta" : ""}</p></button>`;
                })
                .join("")}
            </div>
            <div class="row between" style="margin:18px 0">
              <div>
                <p class="tiny muted">Progresso atual</p>
                <strong>${Logic.bebida(this.drinkId).nome} · ${p.atual}/${p.meta}</strong>
                <div style="margin-top:8px">${UI.tampas(p.atual, p.meta)}</div>
              </div>
              <div class="qty">
                <button id="qty-minus">−</button>
                <strong id="qty-val" style="min-width:24px;text-align:center">${this.qty}</strong>
                <button id="qty-plus">+</button>
              </div>
            </div>
            <button class="btn btn-gold btn-block" id="do-reg" style="min-height:56px;font-size:1.02rem">REGISTRAR ${this.qty} TAMPA${this.qty > 1 ? "S" : ""}</button>`
          : `<p class="muted">Busque um cliente para começar. Na demo, use Ellisson.</p>`
      }
    </section>`;
  },

  bebidas() {
    const est = this.est();
    return `<div class="row between" style="margin-bottom:14px">
      <div class="kpi" style="min-width:220px"><span>Saidera padrão</span><b>${est.metaPadrao} Tampas</b></div>
      <div class="row">
        <button class="btn btn-dark" id="scan-nota">Escanear nota</button>
        <button class="btn btn-gold" id="add-drink">+ Adicionar bebida</button>
        <button class="btn btn-ghost" id="edit-meta">Editar configuração</button>
      </div>
    </div>
    <section class="panel">
      ${est.bebidas
        .map((b) => {
          const cam = Logic.patrocinioEm(est.id, b.id);
          const meta = Logic.metaDe(est, b.id);
          const regra = cam ? `Patrocínio ativo · ${cam.titulo}` : b.meta ? "Configuração própria" : "Regra padrão";
          return `<div class="row between" style="padding:14px 0;border-bottom:1px solid #2a2a2a">
            <div><strong>${b.nome}</strong><p class="tiny muted">${regra}</p></div>
            <span class="badge ${cam ? "badge-gold" : "badge-ghost"}">${meta} Tampas</span>
          </div>`;
        })
        .join("")}
    </section>`;
  },

  saideras() {
    const list = Store.all("saideras").filter((s) => s.estabelecimentoId === this.estId).slice(0, 40);
    return `<section class="panel"><div class="table-wrap"><table class="data">
      <thead><tr><th>Código</th><th>Cliente</th><th>Bebida</th><th>Status</th><th>Conquistada</th><th></th></tr></thead>
      <tbody>${list
        .map((s) => {
          const c = Logic.cliente(s.clienteId);
          return `<tr>
            <td>${s.codigo}</td><td>${c?.nome || "—"}</td><td>${Logic.bebida(s.bebidaId)?.nome}</td>
            <td><span class="badge ${s.status === "disponivel" ? "badge-green" : "badge-ghost"}">${s.status}</span></td>
            <td>${Logic.fmtDate(s.conquistadaEm)}</td>
            <td>${s.status === "disponivel" ? `<button class="btn btn-gold btn-sm" data-entregar-id="${s.id}">Entregar</button>` : ""}</td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div></section>`;
  },

  funcionarios() {
    const list = Store.all("funcionarios").filter((f) => f.estabelecimentoId === this.estId);
    return `<p class="notice" style="margin-bottom:14px">O registro no salão agora é no app do garçom. Este painel continua para o gerente.</p>
      <a class="btn btn-gold btn-sm" href="garcom.html" style="margin-bottom:14px">Abrir app do garçom</a>
      <div class="grid-2">${list
      .map(
        (f) => `<article class="panel">
          <div class="person"><img src="${f.avatar}" alt=""/><div><h3>${f.nome}</h3><p class="muted small">${f.cargo}</p></div>
            <span class="badge badge-green" style="margin-left:auto">Ativo</span></div>
          <div class="kpis" style="margin-top:12px">
            <div class="kpi"><b>${f.tampasHoje}</b><span>Tampas hoje</span></div>
            <div class="kpi"><b>${f.saiderasEntregues}</b><span>Saideras entregues</span></div>
          </div>
        </article>`
      )
      .join("")}</div>`;
  },

  inteligencia() {
    const inativos = Logic.clientesDoEst(this.estId)
      .filter((c) => c.id !== "cli-001")
      .slice(20, 28);
    const quase = Store.all("tampas")
      .filter((t) => t.estabelecimentoId === this.estId && t.meta - t.atual <= 2 && t.atual > 0)
      .slice(0, 6);
    const niver = Logic.clientesDoEst(this.estId).filter((c) => Logic.ehAniversarianteMes(c) || c.nascimento?.includes("/11/")).slice(0, 6);
    return `<div class="kpis">
      ${[
        ["Clientes cadastrados", "1.284"],
        ["Clientes recorrentes", "486"],
        ["Novos este mês", "94"],
        ["Clientes que retornaram", "312"],
        ["Próximos da Saidera", "47"],
        ["Aniversariantes do mês", "36"],
        ["Sem retornar há 30 dias", "127"],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`)
        .join("")}
    </div>
    <div class="grid-2">
      <section class="panel">
        <h3>Bebidas preferidas</h3>
        ${UI.bars([
          { nome: "Heineken", pct: 34 },
          { nome: "Budweiser", pct: 21 },
          { nome: "Brahma", pct: 16 },
          { nome: "Coca-Cola", pct: 12 },
          { nome: "Stella", pct: 9 },
        ])}
      </section>
      <section class="panel">
        <h3>Clientes próximos da Saidera</h3>
        ${quase
          .map((t) => {
            const c = Logic.cliente(t.clienteId);
            return `<div class="row between" style="padding:8px 0"><div><strong>${c?.primeiroNome}</strong><p class="tiny muted">${Logic.bebida(t.bebidaId).nome} ${t.atual}/${t.meta}</p></div><button class="btn btn-gold btn-sm" data-solicitar="quase">Acelerar</button></div>`;
          })
          .join("")}
      </section>
    </div>
    <div class="grid-2" style="margin-top:14px">
      <section class="panel">
        <h3>Aniversariantes</h3>
        ${niver.map((c) => `<div class="row between" style="padding:8px 0"><span>${c.nome}</span><span class="muted small">${c.nascimento}</span></div>`).join("")}
        <button class="btn btn-gold btn-sm btn-block" style="margin-top:12px" data-solicitar="aniversario">Campanha de aniversário</button>
      </section>
      <section class="panel">
        <h3>Clientes inativos</h3>
        ${inativos
          .map((c) => {
            const t = Store.all("tampas").find((x) => x.clienteId === c.id && x.estabelecimentoId === this.estId);
            return `<div class="row between" style="padding:8px 0">
              <div><strong>${c.nome}</strong><p class="tiny muted">${Logic.bebida(t?.bebidaId || "beb-001").nome} · ${t ? t.atual + "/" + t.meta : "—"} · última visita há 37 dias</p></div>
            </div>`;
          })
          .join("")}
        <a class="btn btn-gold btn-block" style="margin-top:12px" href="#/chamar">Chamar de volta</a>
      </section>
    </div>`;
  },

  chamar() {
    const list = Logic.inativosDoEst(this.estId);
    if (!this.volta.ids.length) this.aplicarQtdVolta(this.volta.qtd);
    const modelo = Logic.modelosCampanhaCasa(this.est()).chamar;
    const msg = this.volta.mensagem || modelo.mensagem;
    const sel = new Set(this.volta.ids);
    const chips = [10, 20, 50, list.length].filter((n, i, a) => n <= list.length && a.indexOf(n) === i);
    return `<section class="panel" style="max-width:720px">
      <p class="muted" style="margin-bottom:14px">Escolha quantos clientes inativos entram no disparo. Ao terminar, peça ao Admin Saidera para ativar o “chamar de volta”.</p>
      <div class="field"><span>Quantos clientes</span>
        <div class="row wrap" style="margin-top:8px;gap:8px">
          <input id="volta-qtd" type="number" min="1" max="${list.length}" value="${this.volta.qtd}" style="max-width:120px"/>
          <div class="chips">${chips
            .map(
              (n) =>
                `<button type="button" class="chip ${this.volta.qtd === n ? "on" : ""}" data-volta-qtd="${n}">${n === list.length ? "Todos (" + n + ")" : n}</button>`
            )
            .join("")}</div>
        </div>
      </div>
      <p class="notice" style="margin:14px 0"><strong data-volta-count>${sel.size}</strong> cliente${sel.size === 1 ? "" : "s"} selecionado${sel.size === 1 ? "" : "s"} para o disparo.</p>
      <div class="check-list volta-list">
        ${list
          .map((c, i) => {
            const t = Store.all("tampas").find((x) => x.clienteId === c.id && x.estabelecimentoId === this.estId);
            const dias = 30 + ((i * 7) % 40);
            return `<label>
              <input type="checkbox" value="${c.id}" ${sel.has(c.id) ? "checked" : ""}/>
              <div>
                <strong>${c.nome}</strong>
                <p class="tiny muted">${Logic.bebida(t?.bebidaId || "beb-001")?.nome || "Saidera"} · última visita há ${dias} dias</p>
              </div>
            </label>`;
          })
          .join("")}
      </div>
      <div class="field" style="margin-top:14px"><span>Mensagem pronta</span>
        <textarea id="volta-msg" rows="3">${msg}</textarea>
      </div>
      <button class="btn btn-gold btn-block" style="margin-top:16px" id="pedir-volta">Pedir disparo ao Admin Saidera</button>
    </section>`;
  },

  campanhas() {
    const est = this.est();
    const form = this.campForm;
    const modelos = Logic.modelosCampanhaCasa(est);
    const tipos = [
      ["comparecer", "Comparecer", "Chamar quem já frequenta a casa e usa o app para consumo e retirada da Saidera.", Icons.megaphone()],
      ["aniversario", "Aniversário", "Oferta pronta para quem faz aniversário neste mês.", Icons.gift()],
      ["tampas", "Tampas reduzidas", "Saidera mais rápida: menos Tampas nesta casa.", Icons.tampas()],
    ];
    const publicos = [
      ["todos", "Quem frequenta"],
      ["aniversario", "Aniversariantes"],
      ["quase", "Quase Saidera"],
      ["inativos", "Inativos"],
    ];
    const drinks = (est.bebidas || []).slice(0, 10);
    const estimado = form.tipo ? Logic.estimarPublicoCasa(this.estId, form.publico) : 0;
    const list = Store.all("campanhas").filter(
      (c) => c.estabelecimentoId === this.estId || (c.estabelecimentos || []).includes(this.estId)
    );
    const alteraMeta = form.tipo === "tampas" || form.tipo === "aniversario";
    return `<section class="panel" style="margin-bottom:16px">
      <h3>Nova campanha em massa</h3>
      <p class="muted" style="margin:6px 0 14px">Escolha o tipo. A mensagem e o público já vêm prontos — ajuste se quiser e envie ao Admin Saidera para validar e disparar.</p>
      <div class="tipo-pick">
        ${tipos
          .map(
            ([id, nome, desc, ic]) =>
              `<button type="button" class="tipo-card ${form.tipo === id ? "on" : ""}" data-camp-tipo="${id}">
                <span class="gold">${ic}</span>
                <h3>${nome}</h3>
                <p class="tiny muted">${desc}</p>
              </button>`
          )
          .join("")}
      </div>
      ${
        form.tipo
          ? `<div style="margin-top:18px">
        <p class="tiny muted" style="margin-bottom:8px">Para quem dispara</p>
        <div class="chips" style="margin-bottom:14px">
          ${publicos
            .map(
              ([id, nome]) =>
                `<button type="button" class="chip ${form.publico === id ? "on" : ""}" data-camp-publico="${id}">${nome}</button>`
            )
            .join("")}
        </div>
        <div class="form-grid">
          ${
            alteraMeta
              ? `<div class="field"><span>Bebida da oferta</span>
            <select id="camp-bebida">
              ${drinks
                .map((b) => `<option value="${b.id}" ${b.id === form.bebidaId ? "selected" : ""}>${b.nome}</option>`)
                .join("")}
            </select>
          </div>
          <div class="field"><span>Nova meta de Tampas</span><input id="camp-meta" type="number" min="3" max="12" value="${form.meta}"/></div>`
              : ""
          }
          <div class="field"><span>Canal</span>
            <select id="camp-canal">
              ${["push", "whatsapp", "email"]
                .map((c) => `<option value="${c}" ${form.canal === c ? "selected" : ""}>${c}</option>`)
                .join("")}
            </select>
          </div>
        </div>
        <div class="field" style="margin-top:12px"><span>Mensagem pronta</span>
          <textarea id="camp-msg" rows="3">${form.mensagem || modelos[form.tipo].mensagem}</textarea>
        </div>
        <p class="notice" style="margin:14px 0">Destinatários estimados: <strong>${estimado.toLocaleString("pt-BR")}</strong> · ${Logic.publicoCampanhaLabel(form.publico)} · ${form.canal}. O Admin vê este pedido e ativa o disparo.</p>
        <button class="btn btn-gold btn-block" id="enviar-camp-casa">Enviar ao Admin Saidera</button>
      </div>`
          : ""
      }
    </section>
    <section class="panel">
      <h3 style="margin-bottom:8px">Campanhas desta casa</h3>
      ${
        list
          .map((c) => {
            const p = Store.find("parceiros", c.parceiroId);
            const on = c.status === "ativa" && c.disparada;
            const origem = c.origem === "estabelecimento" ? "Sua solicitação" : p?.nome || "Parceiro";
            const tipo = c.tipo ? Logic.tipoCampanhaLabel(c.tipo) : "Patrocínio";
            return `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a;align-items:flex-start">
          <div>
            <strong>${c.titulo}</strong>
            <p class="tiny muted">${origem} · ${tipo}${c.publico ? " · " + Logic.publicoCampanhaLabel(c.publico) : ""} · ${c.status}${on ? " · visível no app" : c.status === "solicitada" ? " · aguardando admin" : ""}</p>
            ${c.mensagem ? `<p class="small muted" style="margin-top:4px">${c.mensagem}</p>` : ""}
          </div>
          <span class="badge ${on ? "badge-gold" : c.status === "solicitada" ? "badge-navy" : "badge-ghost"}">${c.metaTampas ? c.metaTampas + " Tampas" : "Mensagem"}</span>
        </div>`;
          })
          .join("") || "<p class='muted'>Nenhuma campanha neste estabelecimento.</p>"
      }
    </section>`;
  },

  config() {
    const est = this.est();
    const img = Logic.imagemEst(est);
    const custom = Boolean(est.cartaz);
    return `<section class="panel" style="max-width:560px">
      <div class="field"><span>Nome</span><input id="cfg-nome" value="${est.nome}"/></div>
      <div class="field" style="margin-top:10px"><span>Bairro</span><input id="cfg-bairro" value="${est.bairro}"/></div>
      <div class="field" style="margin-top:10px"><span>Saidera padrão</span><input id="cfg-meta" type="number" value="${est.metaPadrao}"/></div>
      <div class="field" style="margin-top:16px"><span>Cartaz da casa</span>
        <p class="tiny muted">Esta foto aparece no app do cliente (lista, perfil da casa e ofertas). Se você não enviar um cartaz, fica a imagem padrão.</p>
      </div>
      <div class="cartaz-preview">
        <img id="cfg-cartaz-img" src="${img}" alt="Cartaz do estabelecimento" onerror="this.onerror=null;this.src='${Logic.imagemPadraoEst(est)}'"/>
        <span class="badge ${custom ? "badge-gold" : "badge-ghost"}">${custom ? "Cartaz da casa" : "Imagem padrão"}</span>
      </div>
      <input type="file" id="cfg-cartaz" accept="image/jpeg,image/png,image/webp,image/*" hidden/>
      <div class="row wrap" style="margin-top:12px;gap:8px">
        <button class="btn btn-navy" type="button" id="pick-cartaz">Enviar cartaz</button>
        ${custom ? `<button class="btn btn-ghost" type="button" id="reset-cartaz">Usar imagem padrão</button>` : ""}
      </div>
      <button class="btn btn-gold" style="margin-top:16px" id="save-cfg">Salvar</button>
    </section>`;
  },

  afterRegister(res, cliente, bebida) {
    if (res.ganhas) {
      UI.modal({
        center: true,
        html: `${UI.celebrate(
          res.ofertaConcluida ? "OFERTA CONCLUÍDA! 🍺" : "SAIDERA LIBERADA! 🍺",
          res.ofertaConcluida
            ? `${cliente.primeiroNome} usou a oferta neste bar. Próximo ciclo pela regra da casa (${res.metaBar} Tampas): ${res.depois}/${res.meta}.`
            : `${cliente.primeiroNome} conquistou ${res.ganhas} Saidera de ${bebida.nome}. Ciclo atual: ${res.depois}/${res.meta}.`
        )}
          <button class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Continuar</button>`,
      });
    } else {
      UI.modal({
        center: true,
        html: `<h2>${this.qty} Tampa${this.qty > 1 ? "s" : ""} adicionada${this.qty > 1 ? "s" : ""} 🍺</h2>
          <p class="muted" style="margin:10px 0 16px">${cliente.primeiroNome} agora possui ${res.depois}/${res.meta} Tampas de ${bebida.nome}.</p>
          ${UI.tampas(res.depois, res.meta)}
          <button class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Fechar</button>`,
      });
    }
  },

  bind() {
    this.root.querySelector("[data-menu]")?.addEventListener("click", () => this.root.querySelector("#sidebar")?.classList.toggle("open"));
    this.root.querySelectorAll("[data-href]").forEach((tr) => tr.addEventListener("click", () => (location.hash = tr.getAttribute("data-href"))));
    this.root.querySelectorAll("[data-page]").forEach((el) =>
      el.addEventListener("click", () => {
        const n = Number(el.getAttribute("data-page"));
        if (!n || el.disabled || n === this.cliPage) return;
        this.cliPage = n;
        this.render();
        this.root.querySelector(".table-wrap")?.scrollIntoView({ block: "start", behavior: "smooth" });
      })
    );
    const buscaHead = this.root.querySelector("[data-jump-search]");
    buscaHead?.addEventListener("input", (e) => {
      if (this.view !== "clientes") return;
      this.cliQuery = e.target.value;
      this.cliPage = 1;
      this.render();
      const again = this.root.querySelector("[data-jump-search]");
      if (again) {
        again.focus();
        const len = again.value.length;
        again.setSelectionRange(len, len);
      }
    });
    buscaHead?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || this.view === "clientes") return;
      const q = buscaHead.value.toLowerCase();
      const c = Store.all("clientes").find((x) => x.nome.toLowerCase().includes(q) || x.codigo.toLowerCase().includes(q));
      if (c) location.hash = `#/cliente/${c.id}`;
      else UI.toast("Cliente não encontrado na demonstração.");
    });
    this.root.querySelectorAll("[data-entregar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const [cid, bid] = btn.getAttribute("data-entregar").split("|");
        const s = Logic.entregarPrimeira(cid, this.estId, bid);
        if (s) UI.toast(`Saidera ${s.codigo} entregue.`);
      })
    );
    this.root.querySelectorAll("[data-entregar-id]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const s = Logic.entregarSaidera(btn.getAttribute("data-entregar-id"));
        if (s) UI.toast(`Saidera ${s.codigo} entregue.`);
      })
    );
    this.root.querySelectorAll("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => {
        this.clienteSel = b.getAttribute("data-pick");
        location.hash = `#/registrar/${this.clienteSel}`;
        this.route();
      })
    );
    this.root.querySelectorAll("[data-drink]").forEach((b) =>
      b.addEventListener("click", () => {
        this.drinkId = b.getAttribute("data-drink");
        this.render();
      })
    );
    this.root.querySelector("#qty-minus")?.addEventListener("click", () => {
      this.qty = Math.max(1, this.qty - 1);
      this.render();
    });
    this.root.querySelector("#qty-plus")?.addEventListener("click", () => {
      this.qty = Math.min(12, this.qty + 1);
      this.render();
    });
    this.root.querySelector("#do-reg")?.addEventListener("click", () => {
      const cid = this.params.id || this.clienteSel;
      const c = Logic.cliente(cid);
      const b = Logic.bebida(this.drinkId);
      const res = Logic.registrarConsumo({
        clienteId: cid,
        estabelecimentoId: this.estId,
        bebidaId: this.drinkId,
        quantidade: this.qty,
      });
      this.afterRegister(res, c, b);
    });
    this.root.querySelector("#scan-qr")?.addEventListener("click", () => {
      UI.modal({
        center: true,
        html: `<h2>Escanear QR Code</h2><p class="muted" style="margin:10px 0">Simulação de leitura. Cliente encontrado:</p>
          <div class="person"><img src="${Logic.cliente("cli-001").avatar}"/><div><strong>Ellisson Costa</strong><p class="small muted">SDR-28491</p></div></div>
          <button class="btn btn-gold btn-block" style="margin-top:16px" id="use-ellisson">Usar este cliente</button>`,
      });
      setTimeout(() => {
        document.getElementById("use-ellisson")?.addEventListener("click", () => {
          document.querySelector(".modal-bg")?.remove();
          location.hash = "#/registrar/cli-001";
        });
      }, 50);
    });
    this.root.querySelector("#scan-nota")?.addEventListener("click", () => {
      const m = UI.modal({
        center: true,
        html: `<h2>Analisando nota...</h2><p class="muted">Leitura demonstrativa.</p><div class="skel" style="height:10px;margin-top:16px"></div>`,
      });
      setTimeout(() => {
        m.el.querySelector(".modal").innerHTML = `<h2>Encontramos 6 bebidas</h2>
          <p class="muted" style="margin:8px 0 12px">Selecione para adicionar ao cardápio.</p>
          ${["Heineken", "Budweiser", "Stella Artois", "Brahma", "Corona", "Coca-Cola"].map((n) => `<label class="row" style="padding:8px 0"><input type="checkbox" checked/> ${n}</label>`).join("")}
          <button class="btn btn-gold btn-block" data-close-modal style="margin-top:12px">Adicionar selecionadas</button>`;
      }, 1100);
    });
    this.root.querySelector("#add-drink")?.addEventListener("click", () => {
      UI.modal({
        center: true,
        html: `<h2>Nova bebida</h2><div class="field" style="margin:12px 0"><span>Nome</span><input id="nd-nome" placeholder="Ex.: Chopp IPA"/></div>
          <div class="field"><span>Meta (vazio = padrão)</span><input id="nd-meta" type="number" placeholder="10"/></div>
          <button class="btn btn-gold btn-block" style="margin-top:12px" id="nd-ok">Adicionar</button>`,
      });
      document.getElementById("nd-ok")?.addEventListener("click", () => {
        const nome = document.getElementById("nd-nome").value || "Nova bebida";
        const meta = Number(document.getElementById("nd-meta").value) || null;
        const id = `beb-live-${Date.now()}`;
        Store.data.bebidas.push({ id, nome, tipo: "outros", marca: "Casa", cor: "#F5B800" });
        this.est().bebidas.push({ id, nome, meta, regra: meta ? "propria" : "padrao" });
        Store.save();
        document.querySelector(".modal-bg")?.remove();
        UI.toast("Bebida adicionada na demonstração.");
      });
    });
    this.root.querySelector("#edit-meta")?.addEventListener("click", () => {
      const est = this.est();
      UI.modal({
        center: true,
        html: `<h2>Saidera padrão</h2><div class="field" style="margin:12px 0"><span>Tampas</span><input id="meta-pad" type="number" value="${est.metaPadrao}"/></div>
          <button class="btn btn-gold btn-block" id="meta-ok">Salvar</button>`,
      });
      document.getElementById("meta-ok")?.addEventListener("click", () => {
        est.metaPadrao = Number(document.getElementById("meta-pad").value) || 10;
        Store.save();
        document.querySelector(".modal-bg")?.remove();
      });
    });
    this.root.querySelector("#save-cfg")?.addEventListener("click", () => {
      const est = this.est();
      est.nome = this.root.querySelector("#cfg-nome")?.value?.trim() || est.nome;
      est.bairro = this.root.querySelector("#cfg-bairro")?.value?.trim() || est.bairro;
      est.metaPadrao = Number(this.root.querySelector("#cfg-meta")?.value) || est.metaPadrao || 10;
      Store.save();
      UI.toast("Configurações salvas.");
    });
    this.root.querySelector("#pick-cartaz")?.addEventListener("click", () => this.root.querySelector("#cfg-cartaz")?.click());
    this.root.querySelector("#cfg-cartaz")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = await Logic.lerCartazArquivo(file);
        const est = this.est();
        const anterior = est.cartaz;
        est.cartaz = data;
        try {
          Store.save();
          UI.toast("Cartaz enviado. O cliente já vê esta imagem no app.");
        } catch {
          est.cartaz = anterior;
          UI.toast("A imagem é grande demais. Tente outra foto.");
        }
      } catch (err) {
        UI.toast(err.message || "Não foi possível usar esta imagem.");
      }
    });
    this.root.querySelector("#reset-cartaz")?.addEventListener("click", () => {
      this.est().cartaz = null;
      Store.save();
      UI.toast("Voltamos à imagem padrão.");
    });
    this.root.querySelectorAll("[data-solicitar]").forEach((b) =>
      b.addEventListener("click", () => {
        const preset = b.getAttribute("data-solicitar") || "comparecer";
        if (preset === "inativos") {
          this.aplicarQtdVolta(this.volta.qtd || 10);
          location.hash = "#/chamar";
          return;
        }
        const map = { aniversario: ["aniversario", "aniversario"], quase: ["tampas", "quase"], comparecer: ["comparecer", "todos"] };
        const [tipo, publico] = map[preset] || ["comparecer", "todos"];
        this.aplicarModeloCamp(tipo, publico);
        location.hash = "#/campanhas";
        this.view = "campanhas";
        this.render();
      })
    );
    this.root.querySelectorAll("[data-volta-qtd]").forEach((b) =>
      b.addEventListener("click", () => {
        this.volta.mensagem = this.root.querySelector("#volta-msg")?.value || this.volta.mensagem;
        this.aplicarQtdVolta(b.getAttribute("data-volta-qtd"));
        this.render();
      })
    );
    this.root.querySelector("#volta-qtd")?.addEventListener("change", (e) => {
      this.volta.mensagem = this.root.querySelector("#volta-msg")?.value || this.volta.mensagem;
      this.aplicarQtdVolta(e.target.value);
      this.render();
    });
    this.root.querySelectorAll(".volta-list input")?.forEach((cb) =>
      cb.addEventListener("change", () => {
        this.volta.ids = [...this.root.querySelectorAll(".volta-list input:checked")].map((i) => i.value);
        this.volta.qtd = this.volta.ids.length || 1;
        const q = this.root.querySelector("#volta-qtd");
        if (q) q.value = this.volta.qtd;
        const n = this.root.querySelector("[data-volta-count]");
        if (n) n.textContent = String(this.volta.ids.length);
      })
    );
    this.root.querySelector("#pedir-volta")?.addEventListener("click", () => {
      this.volta.mensagem = this.root.querySelector("#volta-msg")?.value || this.volta.mensagem;
      this.volta.ids = [...this.root.querySelectorAll(".volta-list input:checked")].map((i) => i.value);
      if (!this.volta.ids.length) {
        UI.toast("Selecione pelo menos um cliente.");
        return;
      }
      const modelo = Logic.modelosCampanhaCasa(this.est()).chamar;
      const cam = Logic.solicitarCampanhaCasa({
        estabelecimentoId: this.estId,
        tipo: "chamar",
        publico: "inativos",
        titulo: modelo.titulo,
        mensagem: this.volta.mensagem || modelo.mensagem,
        canal: "push",
        clienteIds: this.volta.ids,
        limite: this.volta.ids.length,
      });
      UI.modal({
        center: true,
        html: `<h2>Pedido de disparo enviado</h2>
          <p class="muted" style="margin:10px 0">Chamar de volta para <strong>${cam.limite} cliente${cam.limite === 1 ? "" : "s"}</strong>.</p>
          <p class="notice">O Admin Saidera valida e ativa o disparo. Nada entra no app até lá.</p>
          <button class="btn btn-gold btn-block" style="margin-top:12px" data-close-modal>Ok</button>`,
      });
    });
    this.root.querySelectorAll("[data-camp-tipo]").forEach((b) =>
      b.addEventListener("click", () => {
        this.syncCampForm();
        this.aplicarModeloCamp(b.getAttribute("data-camp-tipo"));
        this.render();
      })
    );
    this.root.querySelectorAll("[data-camp-publico]").forEach((b) =>
      b.addEventListener("click", () => {
        this.syncCampForm();
        this.campForm.publico = b.getAttribute("data-camp-publico");
        this.render();
      })
    );
    this.root.querySelector("#enviar-camp-casa")?.addEventListener("click", () => {
      this.syncCampForm();
      if (!this.campForm.tipo) {
        UI.toast("Escolha o tipo da campanha.");
        return;
      }
      const modelo = Logic.modelosCampanhaCasa(this.est())[this.campForm.tipo];
      const payload = {
        estabelecimentoId: this.estId,
        tipo: this.campForm.tipo,
        publico: this.campForm.publico,
        titulo: modelo.titulo,
        mensagem: this.campForm.mensagem || modelo.mensagem,
        bebidaId: this.campForm.bebidaId,
        metaTampas: this.campForm.meta,
        canal: this.campForm.canal,
      };
      this.campForm.tipo = null;
      const cam = Logic.solicitarCampanhaCasa(payload);
      UI.modal({
        center: true,
        html: `<h2>Pedido enviado ao Admin Saidera</h2>
          <p class="muted" style="margin:10px 0 6px">${cam.titulo}</p>
          <p class="small muted">${Logic.publicoCampanhaLabel(cam.publico)} · ${cam.publicoPotencial.toLocaleString("pt-BR")} destinatários · canal ${cam.canal}.</p>
          <p class="notice" style="margin:12px 0">Nada entra no app até o Admin validar e ativar o disparo.</p>
          <button class="btn btn-gold btn-block" data-close-modal>Ok</button>`,
      });
    });
    const busca = this.root.querySelector("#busca-cli");
    busca?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = busca.value.toLowerCase();
        const c = Store.all("clientes").find((x) => x.nome.toLowerCase().includes(q) || x.codigo.toLowerCase().includes(q));
        if (c) {
          this.clienteSel = c.id;
          location.hash = `#/registrar/${c.id}`;
        } else UI.toast("Cliente não encontrado na demonstração.");
      }
    });
  },
};

document.addEventListener("DOMContentLoaded", () => EstApp.boot());
