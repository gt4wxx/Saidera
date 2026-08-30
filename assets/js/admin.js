const AdminApp = {
  root: null,
  view: "dashboard",
  params: {},
  q: { est: "", cli: "", fun: "", par: "", beb: "", sai: "", tam: "", cam: "", tkt: "", log: "" },
  f: {
    estStatus: "", estTipo: "",
    cliStatus: "",
    funStatus: "", funCasa: "",
    parStatus: "",
    bebTipo: "",
    camStatus: "",
    tamCasa: "", tamQuase: "",
    saiStatus: "", saiCasa: "",
    tktStatus: "", tktCasa: "",
    dashFaixa: "7",
    dashCasa: "",
  },
  novo: {},
  camDispId: "",
  dispCanal: "",
  camPrefill: null,
  dashFaixa: 7,
  dashDia: "",
  dashBairro: "",
  geo: null,
  aud: { bairros: [], ests: [], bebidaId: "", dias: 90, canal: "push" },
  audPronto: false,

  menus() {
    return [
      ["dashboard", "Dashboard", Icons.home()],
      ["estabelecimentos", "Estabelecimentos", Icons.building()],
      ["clientes", "Clientes", Icons.users()],
      ["equipe", "Equipe", Icons.user()],
      ["parceiros", "Parceiros", Icons.spark()],
      ["bebidas", "Bebidas", Icons.beer()],
      ["campanhas", "Campanhas", Icons.megaphone()],
      ["disparos", "Disparos", Icons.send()],
      ["audiencias", "Audiências", Icons.users()],
      ["tampas", "Tampas", Icons.tampas()],
      ["saideras", "Saideiras", Icons.gift()],
      ["tickets", "Cupons QR", Icons.qr()],
      ["planos", "Planos", Icons.shield()],
      ["relatorios", "Relatórios", Icons.chart()],
      ["auditoria", "Auditoria", Icons.clipboard()],
      ["config", "Configurações", Icons.settings()],
    ];
  },

  async boot() {
    const ok = await Store.init({ papel: "admin" });
    if (!ok) return;
    UI.bindGlobal();
    this.root = document.getElementById("app");
    this.prepararAud();
    try {
      this.geo = JSON.parse(sessionStorage.getItem("saidera_admin_geo") || "null");
      if (this.geo) Logic.aplicarDistancias(this.geo);
    } catch {
      this.geo = null;
    }
    Store.on(() => this.render());
    window.addEventListener("hashchange", () => this.route());
    this.route();
  },

  prepararAud() {
    if (this.audPronto) return;
    this.aud.ests = Store.all("estabelecimentos").filter((e) => e.status === "ativo").map((e) => e.id);
    this.aud.bebidaId = "";
    this.aud.bairros = [];
    this.audPronto = true;
  },

  route() {
    const parts = (location.hash || "#/dashboard").slice(1).split("/").filter(Boolean);
    this.view = parts[0] || "dashboard";
    this.params.id = parts[1];
    this.render();
  },

  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  empty(msg) {
    return `<p class="muted empty-msg">${this.esc(msg)}</p>`;
  },

  avatar(src) {
    if (!src) return Brand.src("icon-192.png");
    return Logic.midiaUrl(src);
  },

  badge(status) {
    const on = status === "ativo" || status === "disponivel" || status === "ativa" || status === "disparada";
    const gold = status === "solicitada" || status === "pendente";
    const cls = gold ? "badge-gold" : on ? "badge-green" : "badge-ghost";
    return `<span class="badge ${cls}">${this.esc(status || "—")}</span>`;
  },

  n(v) {
    return Number(v || 0).toLocaleString("pt-BR");
  },

  filtrar(lista, q, campos) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return lista;
    return lista.filter((item) => campos.some((c) => String(item[c] || "").toLowerCase().includes(s)));
  },

  chips(key, pares) {
    const cur = this.f[key] ?? "";
    return `<div class="chips">${pares.map(([v, lab]) => `<button type="button" class="chip ${cur === v ? "on" : ""}" data-filtro="${key}" data-val="${this.esc(v)}">${this.esc(lab)}</button>`).join("")}</div>`;
  },

  selCasa(key) {
    const cur = this.f[key] || "";
    return `<select class="filtro-sel" data-filtro-sel="${key}">
      <option value="">Todas as casas</option>
      ${Store.all("estabelecimentos").map((e) => `<option value="${e.id}" ${e.id === cur ? "selected" : ""}>${this.esc(e.nome)}</option>`).join("")}
    </select>`;
  },

  toolbar(inputId, qKey, ph, extra = "") {
    return `<div class="toolbar">
      <div class="search">${Icons.search()}<input id="${inputId}" placeholder="${this.esc(ph)}" value="${this.esc(this.q[qKey] || "")}"/></div>
      ${extra}
    </div>`;
  },

  formNovo(key, titulo, inner) {
    const on = !!this.novo[key];
    return `<section class="panel form-novo" style="margin-bottom:14px">
      <button type="button" class="form-novo-toggle" data-novo="${key}">
        <strong>${on ? "Fechar cadastro" : titulo}</strong>
        <span class="tiny muted">${on ? "recolher" : "abrir formulário"}</span>
      </button>
      ${on ? `<div class="form-novo-body">${inner}</div>` : ""}
    </section>`;
  },

  casasDaBebida(bebId) {
    return Store.all("estabelecimentos").filter((e) => Logic.vendeBebida(e, bebId));
  },

  camStatus(c) {
    if (c.status === "encerrada") return "encerrada";
    if (c.status === "ativa" && c.disparada) return "disparada";
    if (c.status === "solicitada" || (c.status === "ativa" && !c.disparada)) return "pendente";
    return c.status || "—";
  },

  contagens() {
    return Store.data?.meta?.contagens || {};
  },

  async apply(data, msg) {
    if (data?.store) Store.replace(data.store);
    if (msg) UI.toast(msg);
  },

  async post(path, body, msg) {
    try {
      const data = await API.post(path, body);
      await this.apply(data, msg);
      return data;
    } catch (e) {
      UI.toast(e.message);
      return null;
    }
  },

  val(id) {
    return this.root.querySelector(id)?.value?.trim() || "";
  },

  nascIso(br) {
    if (!br) return "";
    if (/^\d{4}-/.test(br)) return br.slice(0, 10);
    const m = String(br).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  },

  idadeDe(br) {
    const iso = this.nascIso(br);
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const hoje = new Date();
    let n = hoje.getFullYear() - d.getFullYear();
    const m = hoje.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) n -= 1;
    return n >= 0 && n < 130 ? n : null;
  },

  bairrosReais() {
    const set = new Set();
    Store.all("clientes").forEach((c) => c.bairro && set.add(c.bairro));
    Store.all("estabelecimentos").forEach((e) => e.bairro && set.add(e.bairro));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  },

  render() {
    const items = this.menus();
    const map = {
      dashboard: () => this.dashboard(),
      estabelecimentos: () => this.estabelecimentos(),
      clientes: () => this.clientes(),
      equipe: () => this.equipe(),
      parceiros: () => this.parceiros(),
      bebidas: () => this.bebidas(),
      campanhas: () => this.campanhas(),
      disparos: () => this.disparos(),
      audiencias: () => this.audiencias(),
      tampas: () => this.tampas(),
      saideras: () => this.saideras(),
      tickets: () => this.tickets(),
      planos: () => this.planos(),
      cliente: () => this.fichaCliente(),
      casa: () => this.fichaCasa(),
      parceiro: () => this.fichaParceiro(),
      relatorios: () => this.relatorios(),
      auditoria: () => this.auditoria(),
      config: () => this.config(),
    };
    const menuOn = this.view === "cliente" ? "clientes" : this.view === "casa" ? "estabelecimentos" : this.view === "parceiro" ? "parceiros" : this.view;
    const titulo = this.view === "cliente"
      ? (Logic.cliente(this.params.id)?.nome || "Cliente")
      : this.view === "casa"
        ? (Logic.est(this.params.id)?.nome || "Casa")
        : this.view === "parceiro"
          ? (Store.find("parceiros", this.params.id)?.nome || "Parceiro")
          : items.find((i) => i[0] === this.view)?.[1] || "Painel";
    const html = (map[this.view] || map.dashboard)();
    const voltar = this.view === "cliente"
      ? `<a class="btn btn-ghost btn-sm" href="#/clientes">Voltar</a>`
      : this.view === "casa"
        ? `<a class="btn btn-ghost btn-sm" href="#/estabelecimentos">Voltar</a>`
        : this.view === "parceiro"
          ? `<a class="btn btn-ghost btn-sm" href="#/parceiros">Voltar</a>`
          : "";
    this.root.innerHTML = `<div class="dash-app">
      <div class="sidebar-scrim" data-close-menu></div>
      <aside class="sidebar" id="sidebar">
        ${Brand.sideHead("Admin")}
        <nav>${items.map(([id, l, ic]) => `<a class="${menuOn === id ? "on" : ""}" href="#/${id}">${ic}${l}</a>`).join("")}</nav>
        <div class="side-foot">
          <p class="tiny muted">${this.esc(Store.session?.email || "")}</p>
          <a class="btn btn-ghost btn-sm btn-block" href="../index.php?sair=1">Sair</a>
        </div>
      </aside>
      <main class="dash-main">
        <div class="dash-head">
          <div class="row"><button class="icon-btn menu-btn" data-menu>${Icons.menu()}</button>
          <div><p class="tiny muted">Painel real da rede</p><h1>${titulo}</h1></div></div>
          ${voltar}
        </div>
        ${html}
      </main>
    </div>`;
    this.bind();
  },

  dashboard() {
    const c = this.contagens();
    const r = Logic.resumoRede();
    const faixa = Number(this.f.dashFaixa || this.dashFaixa || 7);
    const casaId = this.f.dashCasa || "";
    const semana = Logic.semanaTampas(casaId || null, null, faixa);
    const bairros = (r.bairros || []).map((b) => ({ ...b, on: this.dashBairro === (b.chave || b.nome) }));
    const pendentes = Store.all("campanhas").filter((x) => this.camStatus(x) === "pendente");
    const cuponsAbertos = Store.all("tickets").filter((t) => this.ticketStatus(t) === "aberto");
    const quase = Store.all("tampas").filter((t) => t.meta - t.atual <= 2 && t.atual > 0);
    const logs = Logic.logsAuditoria().slice(0, 6);
    const kpis = [
      ["Casas ativas", c.estabelecimentosAtivos ?? r.estabelecimentos, "#/estabelecimentos"],
      ["Clientes", c.clientes ?? r.usuarios, "#/clientes"],
      ["Tampas somadas", c.tampas ?? r.tampas, "#/tampas"],
      ["Saideiras disponíveis", c.saiderasDisponiveis ?? r.disponiveis, "#/saideras"],
      ["Saideiras usadas", c.saiderasUsadas ?? r.usadas, "#/saideras"],
      ["Campanhas pendentes", pendentes.length, "#/disparos"],
      ["Cupons QR abertos", cuponsAbertos.length, "#/tickets"],
      ["Quase na Saideira", quase.length, "#/tampas"],
    ];
    const perto = this.geo
      ? Store.all("estabelecimentos")
          .filter((e) => e.status === "ativo" && e.temDistancia)
          .sort((a, b) => (a.distanciaKm || 99) - (b.distanciaKm || 99))
          .slice(0, 6)
      : [];
    const diaCons = this.dashDia
      ? Store.all("consumos").filter((x) => Logic.consumoNoDia(x, this.dashDia) && (!casaId || x.estabelecimentoId === casaId))
      : [];
    const cliBairro = this.dashBairro
      ? Store.all("clientes").filter((x) => (x.bairro || "Outros") === this.dashBairro)
      : [];
    return `${Brand.banner("principal", "brand-banner-hero")}
      <p class="tiny muted" style="margin-bottom:12px">Toque num KPI, num ponto do gráfico ou num bairro. Use a localização para ver as casas perto de você.</p>
      <div class="kpis">${kpis.map(([l, v, href]) => `<a class="kpi kpi-go" href="${href}"><span>${l}</span><b>${this.n(v)}</b></a>`).join("")}</div>
      <div class="atalhos">
        <a class="btn btn-gold btn-sm" href="#/campanhas">Nova campanha</a>
        <a class="btn btn-navy btn-sm" href="#/disparos">Validar disparos</a>
        <a class="btn btn-ghost btn-sm" href="#/tickets">Cupons QR</a>
        <button type="button" class="btn btn-ghost btn-sm" data-act="admin-geo">${this.geo ? "Atualizar localização" : "Ativar localização"}</button>
      </div>
      ${this.geo ? `<p class="tiny muted" style="margin:8px 0 12px">Localização ligada${perto[0] ? " · casa mais perto: " + this.esc(perto[0].nome) + " (" + perto[0].distanciaKm + " km)" : ""}.</p>` : ""}
      ${pendentes.length ? `<p class="notice" style="margin-bottom:14px">${pendentes.length} campanha(s) aguardando validação. <a href="#/disparos" style="color:#F5B800">Ir para disparos</a></p>` : ""}
      ${cuponsAbertos.length ? `<section class="panel" style="margin-bottom:14px"><h3>Cupons QR abertos</h3>${cuponsAbertos.slice(0, 6).map((t) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid #2a2a2a"><span>${this.esc(t.codigo)} · ${this.esc(Logic.est(t.estabelecimentoId)?.nome || "—")}</span><a class="btn btn-ghost btn-sm" href="#/tickets">Ver</a></div>`).join("")}</section>` : ""}
      ${perto.length ? `<section class="panel" style="margin-bottom:14px"><h3>Casas perto de você</h3>${perto.map((e) => `<a class="row between" href="#/casa/${e.id}" style="padding:8px 0;border-bottom:1px solid #2a2a2a;color:inherit;text-decoration:none"><span>${this.esc(e.nome)}</span><span class="tiny muted">${e.distanciaKm} km · ${this.esc(e.bairro || "")}</span></a>`).join("")}</section>` : ""}
      <div class="grid-2">
        <section class="panel">
          <h3>Tampas nos últimos ${faixa} dias</h3>
          <div class="row wrap" style="gap:8px;align-items:center;margin-bottom:8px">
            ${this.chips("dashFaixa", [["7", "7 dias"], ["14", "14 dias"], ["30", "30 dias"]])}
            <select data-filtro-sel="dashCasa" style="margin-left:auto;min-width:160px">
              <option value="">Toda a rede</option>
              ${Store.all("estabelecimentos").map((e) => `<option value="${e.id}" ${casaId === e.id ? "selected" : ""}>${this.esc(e.nome)}</option>`).join("")}
            </select>
          </div>
          ${semana.values?.some((v) => v) ? UI.lineChart(semana.values, semana.labels, semana.keys, this.dashDia) : this.empty("Ainda não há consumos registrados.")}
          ${this.dashDia ? `<p class="tiny muted" style="margin-top:10px">${diaCons.length} consumo(s) em ${this.esc(this.dashDia)}. <button type="button" class="btn btn-ghost btn-sm" data-dash-dia="">Limpar dia</button></p>
            ${diaCons.slice(0, 8).map((x) => `<a href="#/cliente/${x.clienteId}" class="row between" style="padding:6px 0;color:inherit;text-decoration:none"><span>+${x.quantidade} ${this.esc(Logic.bebida(x.bebidaId)?.nome || "")} · ${this.esc(Logic.cliente(x.clienteId)?.nome || "")}</span></a>`).join("")}` : `<p class="tiny muted" style="margin-top:8px">Toque num ponto para ver o dia.</p>`}
        </section>
        <section class="panel">
          <h3>Saideiras por bairro</h3>
          ${bairros.length ? UI.bars(bairros) : this.empty("Nenhuma Saideira conquistada ainda.")}
          ${this.dashBairro ? `<p class="tiny muted" style="margin-top:10px">${cliBairro.length} cliente(s) em ${this.esc(this.dashBairro)}. <button type="button" class="btn btn-ghost btn-sm" data-dash-bairro="">Limpar</button></p>
            ${cliBairro.slice(0, 8).map((x) => `<a href="#/cliente/${x.id}" style="display:block;padding:6px 0;color:inherit">${this.esc(x.nome)}</a>`).join("")}` : `<p class="tiny muted" style="margin-top:8px">Toque numa barra para filtrar o bairro.</p>`}
        </section>
      </div>
      <section class="panel" style="margin-top:14px">
        <h3>Últimos eventos</h3>
        ${logs.length ? logs.map((l) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a"><div><strong>${this.esc(l.acao)}</strong><p class="tiny muted">${this.esc(l.detalhe)}</p></div><span class="muted small">${Logic.fmtDate(l.em)}</span></div>`).join("") : this.empty("Nenhum evento ainda.")}
      </section>`;
  },

  estabelecimentos() {
    const q = this.q.est;
    let list = this.filtrar(Store.all("estabelecimentos"), q, ["nome", "bairro", "endereco", "gestorEmail"]);
    if (this.f.estStatus) list = list.filter((e) => e.status === this.f.estStatus);
    if (this.f.estTipo) list = list.filter((e) => e.tipo === this.f.estTipo);
    const form = `<p class="tiny muted" style="margin:6px 0 10px">Endereço completo com CEP. Ele aparece no Google Maps do app do cliente.</p>
      <div class="form-grid">
        <div class="field"><span>Nome</span><input id="ne-nome" placeholder="Nome da casa"/></div>
        <div class="field"><span>Tipo</span><select id="ne-tipo"><option value="bar">Bar</option><option value="restaurante">Restaurante</option></select></div>
        <div class="field"><span>E-mail do gestor</span><input id="ne-email" type="email" placeholder="gestor@casa.com"/></div>
        <div class="field"><span>Senha do gestor</span><input id="ne-senha" type="password" placeholder="Mínimo 6 caracteres"/></div>
        <div class="field"><span>CEP</span><input id="ne-cep" inputmode="numeric" placeholder="49000-000" maxlength="9"/></div>
        <div class="field"><span>Rua / avenida</span><input id="ne-rua" placeholder="Rua, avenida ou travessa"/></div>
        <div class="field"><span>Número</span><input id="ne-num" placeholder="123"/></div>
        <div class="field"><span>Complemento</span><input id="ne-comp" placeholder="Sala, loja, andar (opcional)"/></div>
        <div class="field"><span>Bairro</span><input id="ne-bairro" placeholder="Bairro"/></div>
        <div class="field"><span>Cidade</span><input id="ne-cidade" value="Aracaju"/></div>
        <div class="field"><span>UF</span><input id="ne-uf" value="SE" maxlength="2"/></div>
        <div class="field"><span>Horário</span><input id="ne-hora" placeholder="18h às 2h"/></div>
        <div class="field"><span>Meta de Tampas</span><input id="ne-meta" type="number" min="1" value="${Store.data?.meta?.metaPadraoRede || 10}"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="est-criar">Cadastrar casa</button>`;
    return `${this.formNovo("est", "Cadastrar nova casa", form)}
    <section class="panel">
      ${this.toolbar("q-est", "est", "Filtrar por nome, bairro ou e-mail", `${this.chips("estStatus", [["", "Todas"], ["ativo", "Ativas"], ["inativo", "Inativas"]])} ${this.chips("estTipo", [["", "Tipo"], ["bar", "Bar"], ["restaurante", "Restaurante"]])}`)}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Casa</th><th>Tipo</th><th>Gestor</th><th>Clientes</th><th>Tampas</th><th>Saideiras</th><th>Equipe</th><th>Plano</th><th>Meta</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((e) => `<tr>
          <td><strong>${this.esc(e.nome)}</strong><p class="tiny muted">${this.esc(Logic.enderecoLinha(e))}</p></td>
          <td>${this.esc(Logic.tipoEst(e))}</td>
          <td>${this.esc(e.gestorEmail || "—")}</td>
          <td>${this.n(e.qtdClientes)}</td>
          <td>${this.n(e.qtdTampas)}</td>
          <td>${this.n(e.qtdSaideras)}</td>
          <td>${this.n(e.qtdFuncionarios)}</td>
          <td>${this.esc(Logic.planoDaCasa(e)?.nome || "Completo")}</td>
          <td>${e.metaPadrao}</td>
          <td>${this.badge(e.status)}</td>
          <td class="table-actions">
            <a class="btn btn-ghost btn-sm" href="#/casa/${e.id}">Ficha</a>
            <button class="btn btn-ghost btn-sm" data-act="est-editar" data-id="${e.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-act="entrar-conta" data-papel="estabelecimento" data-id="${e.id}">Entrar</button>
            <button class="btn btn-ghost btn-sm" data-act="est-status" data-id="${e.id}">${e.status === "ativo" ? "Desativar" : "Ativar"}</button>
            <button class="btn btn-danger btn-sm" data-act="est-excluir" data-id="${e.id}">Excluir</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma casa cadastrada.")}
    </section>`;
  },

  clientes() {
    let list = this.filtrar(Store.all("clientes"), this.q.cli, ["nome", "codigo", "email", "bairro", "telefone", "cidade"]);
    if (this.f.cliStatus) list = list.filter((c) => c.status === this.f.cliStatus);
    const form = `<div class="form-grid">
        <div class="field"><span>Nome</span><input id="nc-nome"/></div>
        <div class="field"><span>E-mail</span><input id="nc-email" type="email"/></div>
        <div class="field"><span>Senha</span><input id="nc-senha" type="password"/></div>
        <div class="field"><span>Telefone</span><input id="nc-tel"/></div>
        <div class="field"><span>Bairro</span><input id="nc-bairro"/></div>
        <div class="field"><span>Nascimento</span><input id="nc-nasc" type="date"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="cli-criar">Cadastrar cliente</button>`;
    return `${this.formNovo("cli", "Cadastrar novo cliente", form)}
    <section class="panel">
      ${this.toolbar("q-cli", "cli", "Filtrar por nome, código ou e-mail", this.chips("cliStatus", [["", "Todos"], ["ativo", "Ativos"], ["inativo", "Inativos"]]))}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Código</th><th>Contato</th><th>Onde mora</th><th>Tampas</th><th>Saideiras</th><th>Última visita</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((c) => `<tr>
          <td><div class="person"><img src="${this.avatar(c.avatar)}" alt=""/><strong>${this.esc(c.nome)}</strong></div></td>
          <td>${this.esc(c.codigo)}</td>
          <td>${this.esc(c.email || "—")}<p class="tiny muted">${this.esc(c.telefone || "")}</p></td>
          <td>${this.esc(c.bairro || "—")}${c.cidade ? `<p class="tiny muted">${this.esc(c.cidade)}</p>` : ""}</td>
          <td>${c.tampasTotal != null ? this.n(c.tampasTotal) : "—"}</td>
          <td>${c.saiderasTotal != null ? this.n(c.saiderasTotal) : "—"}</td>
          <td>${this.esc(c.ultimaVisita || "—")}</td>
          <td>${this.badge(c.status)}</td>
          <td class="table-actions">
            <a class="btn btn-ghost btn-sm" href="#/cliente/${c.id}">Ficha</a>
            <button class="btn btn-ghost btn-sm" data-act="cli-editar" data-id="${c.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-act="entrar-conta" data-papel="cliente" data-id="${c.id}">Entrar</button>
            <button class="btn btn-ghost btn-sm" data-act="cli-status" data-id="${c.id}">${c.status === "ativo" ? "Desativar" : "Ativar"}</button>
            <button class="btn btn-danger btn-sm" data-act="cli-excluir" data-id="${c.id}">Excluir</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhum cliente cadastrado.")}
    </section>`;
  },

  equipe() {
    const casas = Store.all("estabelecimentos");
    let list = this.filtrar(Store.all("funcionarios"), this.q.fun, ["nome", "cargo", "email"]).map((f) => ({
      ...f,
      casa: Logic.est(f.estabelecimentoId)?.nome || "—",
    }));
    if (this.f.funStatus) list = list.filter((f) => f.status === this.f.funStatus);
    if (this.f.funCasa) list = list.filter((f) => f.estabelecimentoId === this.f.funCasa);
    const form = `<div class="form-grid">
        <div class="field"><span>Nome</span><input id="nf-nome"/></div>
        <div class="field"><span>E-mail</span><input id="nf-email" type="email"/></div>
        <div class="field"><span>Senha</span><input id="nf-senha" type="password"/></div>
        <div class="field"><span>Cargo</span><input id="nf-cargo" value="Garçom"/></div>
        <div class="field"><span>Casa</span>
          <select id="nf-est">${casas.map((e) => `<option value="${e.id}">${this.esc(e.nome)}</option>`).join("") || `<option value="">Cadastre uma casa primeiro</option>`}</select>
        </div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="fun-criar" ${casas.length ? "" : "disabled"}>Cadastrar</button>`;
    return `${this.formNovo("fun", "Cadastrar garçom / funcionário", form)}
    <section class="panel">
      ${this.toolbar("q-fun", "fun", "Filtrar por nome ou e-mail", `${this.chips("funStatus", [["", "Todos"], ["ativo", "Ativos"], ["inativo", "Inativos"]])} ${this.selCasa("funCasa")}`)}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Nome</th><th>Casa</th><th>Cargo</th><th>E-mail</th><th>Tampas hoje</th><th>Saideiras entregues</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((f) => `<tr>
          <td><strong>${this.esc(f.nome)}</strong></td>
          <td>${this.esc(f.casa)}</td>
          <td>${this.esc(f.cargo)}</td>
          <td>${this.esc(f.email || "—")}</td>
          <td>${this.n(f.tampasHoje)}</td>
          <td>${this.n(f.saiderasEntregues)}</td>
          <td>${this.badge(f.status)}</td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" data-act="fun-editar" data-id="${f.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-act="entrar-conta" data-papel="funcionario" data-id="${f.id}">Entrar</button>
            <button class="btn btn-ghost btn-sm" data-act="fun-status" data-id="${f.id}">${f.status === "ativo" ? "Desativar" : "Ativar"}</button>
            <button class="btn btn-danger btn-sm" data-act="fun-excluir" data-id="${f.id}">Excluir</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhum funcionário cadastrado.")}
    </section>`;
  },

  parceiros() {
    let list = this.filtrar(Store.all("parceiros"), this.q.par, ["nome", "email", "categoria", "selo"]);
    if (this.f.parStatus) list = list.filter((p) => p.status === this.f.parStatus);
    const form = `<div class="form-grid">
        <div class="field"><span>Nome</span><input id="np-nome"/></div>
        <div class="field"><span>E-mail</span><input id="np-email" type="email"/></div>
        <div class="field"><span>Senha</span><input id="np-senha" type="password"/></div>
        <div class="field"><span>Categoria</span><input id="np-cat" placeholder="Cerveja, destilado…"/></div>
        <div class="field"><span>Selo</span><input id="np-selo" placeholder="Marca no app"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="par-criar">Cadastrar parceiro</button>`;
    return `${this.formNovo("par", "Cadastrar novo parceiro", form)}
    <section class="panel" style="margin-bottom:14px">
      ${this.toolbar("q-par", "par", "Filtrar por nome, e-mail ou selo", this.chips("parStatus", [["", "Todos"], ["ativo", "Ativos"], ["inativo", "Inativos"]]))}
    </section>
    <div class="grid-2">${list.length ? list.map((p) => {
      const bebs = (p.bebidaIds || []).map((id) => Logic.bebida(id)?.nome).filter(Boolean);
      return `<article class="panel">
      <div class="row between"><h3>${this.esc(p.nome)}</h3>${this.badge(p.status)}</div>
      <p class="muted small">${this.esc(p.categoria || "Sem categoria")}${p.selo ? " · " + this.esc(p.selo) : ""}</p>
      <p class="tiny muted">${this.esc(p.email || "Sem login")}</p>
      <p class="tiny muted" style="margin-top:6px">${bebs.length ? this.esc(bebs.join(", ")) : "Nenhuma bebida vinculada"}</p>
      <div class="kpis" style="margin-top:10px">
        <div class="kpi"><b>${this.n(p.campanhasAtivas)}</b><span>Ativas</span></div>
        <div class="kpi"><b>${this.n(p.campanhas)}</b><span>Campanhas</span></div>
        <div class="kpi"><b>${this.n(p.estabelecimentos)}</b><span>Casas</span></div>
      </div>
      <div class="table-actions" style="margin-top:12px">
        <a class="btn btn-gold btn-sm" href="#/parceiro/${p.id}">Ficha</a>
        <button class="btn btn-ghost btn-sm" data-act="par-editar" data-id="${p.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-act="entrar-conta" data-papel="parceiro" data-id="${p.id}">Entrar</button>
        <button class="btn btn-ghost btn-sm" data-act="par-status" data-id="${p.id}">${p.status === "ativo" ? "Desativar" : "Ativar"}</button>
        <button class="btn btn-danger btn-sm" data-act="par-excluir" data-id="${p.id}">Excluir</button>
      </div>
    </article>`;
    }).join("") : `<section class="panel">${this.empty("Nenhum parceiro cadastrado.")}</section>`}</div>`;
  },

  fichaParceiro() {
    const p = Store.find("parceiros", this.params.id);
    if (!p) return `<section class="panel">${this.empty("Parceiro não encontrado.")}<a class="btn btn-ghost" href="#/parceiros">Voltar</a></section>`;
    const cams = Store.all("campanhas").filter((c) => c.parceiroId === p.id);
    const bebs = Store.all("bebidas");
    const marcadas = new Set(p.bebidaIds || []);
    return `<div class="kpis">
      <div class="kpi"><span>Campanhas ativas</span><b>${this.n(p.campanhasAtivas)}</b></div>
      <div class="kpi"><span>Campanhas</span><b>${this.n(p.campanhas)}</b></div>
      <div class="kpi"><span>Casas alcançadas</span><b>${this.n(p.estabelecimentos)}</b></div>
      <div class="kpi"><span>Status</span><b>${this.esc(p.status)}</b></div>
    </div>
    <section class="panel" style="margin-bottom:14px">
      <p class="tiny muted">${this.esc(p.categoria || "Sem categoria")} · ${this.esc(p.email || "sem login")}${p.selo ? " · " + this.esc(p.selo) : ""}</p>
      <div class="table-actions wrap" style="margin-top:12px">
        <button class="btn btn-gold btn-sm" data-act="entrar-conta" data-papel="parceiro" data-id="${p.id}">Entrar na conta</button>
        <button class="btn btn-ghost btn-sm" data-act="par-editar" data-id="${p.id}">Editar cadastro</button>
        <button class="btn btn-ghost btn-sm" data-act="par-status" data-id="${p.id}">${p.status === "ativo" ? "Desativar" : "Ativar"}</button>
        <button class="btn btn-danger btn-sm" data-act="par-excluir" data-id="${p.id}">Excluir</button>
      </div>
    </section>
    <section class="panel" style="margin-bottom:14px">
      <h3>Bebidas desta marca</h3>
      <p class="tiny muted" style="margin:6px 0 10px">O que o parceiro patrocina. Usado nas campanhas e no app da casa.</p>
      <div class="check-list" id="par-bebs">${bebs.map((b) => `<label><input type="checkbox" value="${b.id}" ${marcadas.has(b.id) ? "checked" : ""}/> ${this.esc(b.nome)}${b.marca ? ` · ${this.esc(b.marca)}` : ""}</label>`).join("") || this.empty("Cadastre bebidas primeiro.")}</div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="par-bebs" data-id="${p.id}" ${bebs.length ? "" : "disabled"}>Salvar bebidas</button>
    </section>
    <section class="panel">
      <h3>Campanhas</h3>
      ${cams.length ? cams.map((c) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a"><div><strong>${this.esc(c.titulo)}</strong><p class="tiny muted">${this.esc(this.camStatus(c))} · ${this.n(c.publicoPotencial || 0)} destinatários</p></div>${this.badge(this.camStatus(c))}</div>`).join("") : this.empty("Nenhuma campanha deste parceiro.")}
    </section>`;
  },

  bebidas() {
    let list = this.filtrar(Store.all("bebidas"), this.q.beb, ["nome", "tipo", "marca"]);
    if (this.f.bebTipo) list = list.filter((b) => b.tipo === this.f.bebTipo);
    const form = `<div class="form-grid">
        <div class="field"><span>Nome</span><input id="nb-nome"/></div>
        <div class="field"><span>Tipo</span>
          <select id="nb-tipo"><option value="cerveja">Cerveja</option><option value="nao-alcoolico">Não alcoólico</option><option value="destilado">Destilado</option><option value="outros">Outros</option></select>
        </div>
        <div class="field"><span>Marca</span><input id="nb-marca"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="beb-criar">Cadastrar bebida</button>`;
    return `${this.formNovo("beb", "Cadastrar bebida da rede", form)}
    <section class="panel">
      ${this.toolbar("q-beb", "beb", "Filtrar por nome ou marca", this.chips("bebTipo", [["", "Todos"], ["cerveja", "Cerveja"], ["nao-alcoolico", "Não alcoólico"], ["destilado", "Destilado"], ["outros", "Outros"]]))}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Marca</th><th>Casas que vendem</th><th></th></tr></thead>
        <tbody>${list.map((b) => {
          const casas = this.casasDaBebida(b.id);
          return `<tr>
          <td><strong>${this.esc(b.nome)}</strong></td>
          <td>${this.esc(b.tipo)}</td>
          <td>${this.esc(b.marca || "—")}</td>
          <td>${casas.length ? this.esc(casas.map((e) => e.nome).join(", ")) : "Nenhuma"}</td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" data-act="beb-editar" data-id="${b.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-act="beb-excluir" data-id="${b.id}">Excluir</button>
          </td>
        </tr>`;
        }).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma bebida no catálogo.")}
    </section>`;
  },

  campanhas() {
    const q = this.q.cam;
    let list = this.filtrar(Store.all("campanhas"), q, ["titulo", "status", "tipo", "mensagem"]);
    if (this.f.camStatus) list = list.filter((c) => this.camStatus(c) === this.f.camStatus);
    const casas = Store.all("estabelecimentos").filter((e) => e.status === "ativo");
    const pars = Store.all("parceiros").filter((p) => p.status === "ativo");
    const bebs = Store.all("bebidas");
    const pre = this.camPrefill || {};
    const estsOn = pre.estabelecimentos?.length ? new Set(pre.estabelecimentos) : null;
    const form = `<div class="form-grid">
        <div class="field"><span>Título</span><input id="cam-titulo" value="${this.esc(pre.titulo || "")}"/></div>
        <div class="field"><span>Tipo</span>
          <select id="cam-tipo">
            <option value="comparecer">Comparecer</option>
            <option value="aniversario">Aniversário</option>
            <option value="tampas">Tampas reduzidas</option>
            <option value="chamar">Chamar de volta</option>
          </select>
        </div>
        <div class="field"><span>Público</span>
          <select id="cam-pub">
            <option value="todos">Quem frequenta</option>
            <option value="aniversario">Aniversariantes do mês</option>
            <option value="inativos">Sem voltar há 30 dias</option>
            <option value="quase">Próximos da Saideira</option>
          </select>
        </div>
        <div class="field"><span>Parceiro (opcional)</span>
          <select id="cam-par"><option value="">Rede / casa</option>${pars.map((p) => `<option value="${p.id}">${this.esc(p.nome)}</option>`).join("")}</select>
        </div>
        <div class="field"><span>Bebida (opcional)</span>
          <select id="cam-beb"><option value="">Todas / não especifica</option>${bebs.map((b) => `<option value="${b.id}" ${b.id === pre.bebidaId ? "selected" : ""}>${this.esc(b.nome)}</option>`).join("")}</select>
        </div>
        <div class="field"><span>Meta de Tampas</span><input id="cam-meta" type="number" min="1" placeholder="Vazio = não altera"/></div>
        <div class="field"><span>Início</span><input id="cam-ini" type="date"/></div>
        <div class="field"><span>Fim</span><input id="cam-fim" type="date"/></div>
        <div class="field"><span>Canal</span>
          <select id="cam-canal"><option value="push">Push</option><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option></select>
        </div>
      </div>
      <div class="field" style="margin-top:10px"><span>Mensagem</span><textarea id="cam-msg" rows="3"></textarea></div>
      <p class="tiny muted" style="margin:10px 0 6px">Casas participantes${pre.estabelecimentos ? " · pré-selecionadas da audiência" : ""}</p>
      <div class="check-list" id="cam-ests">${casas.map((e) => `<label><input type="checkbox" value="${e.id}" ${!estsOn || estsOn.has(e.id) ? "checked" : ""}/> ${this.esc(e.nome)}</label>`).join("") || this.empty("Cadastre uma casa primeiro.")}</div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="cam-criar">Criar campanha</button>`;
    return `${this.formNovo("cam", "Criar nova campanha", form)}
    <section class="panel">
      ${this.toolbar("q-cam", "cam", "Filtrar campanhas", this.chips("camStatus", [["", "Todas"], ["pendente", "Pendentes"], ["disparada", "Disparadas"], ["encerrada", "Encerradas"]]))}
      ${list.length ? list.map((c) => {
        const p = Store.find("parceiros", c.parceiroId);
        const casa = Logic.est(c.estabelecimentoId || c.estabelecimentos?.[0]);
        const st = this.camStatus(c);
        const pend = st === "pendente";
        const on = st === "disparada";
        const origem = c.origem === "estabelecimento" ? casa?.nome || "Casa / rede" : p?.nome || "Parceiro";
        const dest = Logic.publicoCampanha(c).length;
        const beb = Logic.bebida(c.bebidaId);
        const periodo = [c.periodoInicio, c.periodoFim].filter(Boolean).join(" a ");
        return `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a;align-items:flex-start;gap:12px">
          <div>
            <strong>${this.esc(c.titulo)}</strong>
            <p class="tiny muted">${this.esc(origem)} · ${this.esc(Logic.tipoCampanhaLabel(c.tipo))} · ${this.esc(Logic.publicoCampanhaLabel(c.publico))} · ${(c.estabelecimentos || []).length} casa(s) · ${this.n(dest)} destinatários${beb ? " · " + this.esc(beb.nome) : ""}${periodo ? " · " + this.esc(periodo) : ""}</p>
            ${c.mensagem ? `<p class="small muted" style="margin-top:4px">${this.esc(c.mensagem)}</p>` : ""}
          </div>
          <div class="table-actions" style="flex-shrink:0">
            ${this.badge(st)}
            ${pend ? `<button class="btn btn-ghost btn-sm" data-act="cam-editar" data-id="${c.id}">Editar</button><button class="btn btn-gold btn-sm" data-act="cam-ativar" data-id="${c.id}">Validar e disparar</button><button class="btn btn-ghost btn-sm" data-act="cam-rejeitar" data-id="${c.id}">Recusar</button><button class="btn btn-danger btn-sm" data-act="cam-excluir" data-id="${c.id}">Excluir</button>` : ""}
            ${on ? `<button class="btn btn-ghost btn-sm" data-act="cam-encerrar" data-id="${c.id}">Encerrar</button>` : ""}
          </div>
        </div>`;
      }).join("") : this.empty("Nenhuma campanha ainda.")}
    </section>`;
  },

  disparos() {
    const pendentes = Store.all("campanhas").filter((c) => this.camStatus(c) === "pendente");
    const enviadas = Store.all("campanhas").filter((c) => c.disparada).slice(0, 8);
    const cam = pendentes.find((c) => c.id === this.camDispId) || pendentes[0];
    const dest = cam ? Logic.publicoCampanha(cam) : [];
    const canal = this.dispCanal || cam?.canal || "push";
    return `<section class="panel" style="max-width:720px;margin-bottom:14px">
      <h3>Validar e disparar</h3>
      <p class="tiny muted" style="margin:6px 0 12px">O disparo notifica o público desta campanha — não a segmentação solta de Audiências.</p>
      <div class="field"><span>Campanha pendente</span>
        <select id="cam-disp">${pendentes.length
          ? pendentes.map((c) => {
              const origem = c.origem === "estabelecimento" ? Logic.est(c.estabelecimentoId)?.nome : Store.find("parceiros", c.parceiroId)?.nome;
              return `<option value="${c.id}" ${cam && c.id === cam.id ? "selected" : ""}>${this.esc(c.titulo)} · ${this.esc(origem || "rede")}</option>`;
            }).join("")
          : `<option value="">Nenhuma solicitação pendente</option>`}
        </select>
      </div>
      ${cam ? `<p class="tiny muted" style="margin:10px 0 0">${this.esc(Logic.tipoCampanhaLabel(cam.tipo))} · ${this.esc(Logic.publicoCampanhaLabel(cam.publico))} · ${(cam.estabelecimentos || []).length} casa(s)${cam.bebidaId ? ` · ${this.esc(Logic.bebida(cam.bebidaId)?.nome || "")}` : ""}</p>` : ""}
      <div class="field" style="margin-top:10px"><span>Canal do disparo</span>
        <div class="pill-tabs" style="margin-top:8px">
          ${["push", "email", "whatsapp"].map((c) => `<button type="button" class="${canal === c ? "on" : ""}" data-canal="${c}">${c}</button>`).join("")}
        </div>
      </div>
      <p class="notice" style="margin:14px 0">${cam ? `${this.n(dest.length)} cliente(s) no público desta campanha.` : "Escolha uma campanha pendente."}</p>
      ${dest.length ? `<p class="tiny muted" style="margin-bottom:12px">${dest.slice(0, 8).map((x) => this.esc(x.nome)).join(", ")}${dest.length > 8 ? ` e mais ${dest.length - 8}` : ""}</p>` : ""}
      <button class="btn btn-gold btn-block" data-act="cam-disparar" ${pendentes.length ? "" : "disabled"}>Validar e disparar</button>
    </section>
    <section class="panel" style="max-width:720px">
      <h3>Últimos disparos</h3>
      ${enviadas.length ? enviadas.map((c) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a"><div><strong>${this.esc(c.titulo)}</strong><p class="tiny muted">${this.n(c.participantes || c.publicoPotencial || 0)} enviados · ${this.esc(c.canal || "push")}</p></div>${this.badge(this.camStatus(c))}</div>`).join("") : this.empty("Nenhuma campanha disparada ainda.")}
    </section>`;
  },

  audiencias() {
    const a = this.aud;
    const bairros = this.bairrosReais();
    const estimado = Logic.audienciasEstimar(a);
    const casas = Store.all("estabelecimentos");
    return `<div class="grid-2">
      <section class="panel">
        <h3>Segmentação real</h3>
        <p class="tiny muted" style="margin:6px 0 10px">Conta só quem está no banco, com os filtros abaixo.</p>
        <div class="field"><span>Cidade</span><input value="${this.esc(Store.data?.meta?.cidade || "")}" disabled/></div>
        <p class="tiny muted" style="margin:12px 0 6px">Bairros com cadastro</p>
        <div class="chips">${bairros.length ? bairros.map((b) => `<button type="button" class="chip ${a.bairros.includes(b) ? "on" : ""}" data-bairro="${this.esc(b)}">${this.esc(b)}</button>`).join("") : this.empty("Nenhum bairro cadastrado ainda.")}</div>
        <div class="field" style="margin-top:12px"><span>Consumidores de</span>
          <select id="aud-bebida">
            <option value="">Todas as bebidas</option>
            ${Store.all("bebidas").map((b) => `<option value="${b.id}" ${b.id === a.bebidaId ? "selected" : ""}>${this.esc(b.nome)}</option>`).join("")}
          </select>
        </div>
        <div class="field"><span>Período</span><input id="aud-dias" type="number" min="1" value="${a.dias}"/> dias</div>
        <p class="tiny muted" style="margin:12px 0 6px">Casas</p>
        <div class="check-list">${casas.map((e) => `<label><input type="checkbox" data-aud-est="${e.id}" ${a.ests.includes(e.id) ? "checked" : ""}/> ${this.esc(e.nome)}</label>`).join("") || this.empty("Nenhuma casa.")}</div>
      </section>
      <section class="panel" style="display:grid;place-items:center;text-align:center;min-height:280px">
        <div>
          <p class="tiny muted">Clientes nesta audiência</p>
          <h1 style="font-size:3rem;color:var(--gold)">${this.n(estimado)}</h1>
          <p>pessoas reais · sem dado inventado</p>
          <button class="btn btn-gold" style="margin-top:16px" data-act="aud-usar">Usar na próxima campanha</button>
          <p class="tiny muted" style="margin-top:8px">Leva casas e bebida para o formulário de Campanhas.</p>
        </div>
      </section>
    </div>`;
  },

  tampas() {
    const q = this.q.tam;
    const c = this.contagens();
    let list = Store.all("tampas");
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((t) => {
        const cli = Logic.cliente(t.clienteId);
        const est = Logic.est(t.estabelecimentoId);
        const beb = Logic.bebida(t.bebidaId);
        return [cli?.nome, cli?.codigo, est?.nome, beb?.nome].some((x) => String(x || "").toLowerCase().includes(s));
      });
    }
    if (this.f.tamCasa) list = list.filter((t) => t.estabelecimentoId === this.f.tamCasa);
    if (this.f.tamQuase) list = list.filter((t) => t.meta - t.atual <= 2 && t.atual > 0);
    const quaseN = Store.all("tampas").filter((t) => t.meta - t.atual <= 2 && t.atual > 0).length;
    return `<div class="kpis">
      <div class="kpi"><span>Cartões de progresso</span><b>${this.n(c.progressos ?? Store.all("tampas").length)}</b></div>
      <div class="kpi"><span>Tampas somadas nos consumos</span><b>${this.n(c.tampas)}</b></div>
      <div class="kpi"><span>Quase na Saideira</span><b>${this.n(quaseN)}</b></div>
      <div class="kpi"><span>Consumos recentes</span><b>${this.n(Store.all("consumos").length)}</b></div>
    </div>
    <section class="panel">
      ${this.toolbar("q-tam", "tam", "Filtrar por cliente, casa ou bebida", `${this.selCasa("tamCasa")} ${this.chips("tamQuase", [["", "Todos"], ["quase", "Quase lá"]])}`)}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Casa</th><th>Bebida</th><th>Progresso</th><th>Atualizado</th><th></th></tr></thead>
        <tbody>${list.map((t) => `<tr>
          <td>${this.esc(Logic.cliente(t.clienteId)?.nome || "—")}</td>
          <td>${this.esc(Logic.est(t.estabelecimentoId)?.nome || "—")}</td>
          <td>${this.esc(Logic.bebida(t.bebidaId)?.nome || "—")}</td>
          <td>${t.atual}/${t.meta} ${UI.barra(t.atual, t.meta)}</td>
          <td>${Logic.fmtDate(t.atualizadoEm)}</td>
          <td class="table-actions"><button class="btn btn-ghost btn-sm" data-act="tam-ajustar" data-id="${t.id}">Ajustar</button></td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhum progresso de Tampas ainda.")}
    </section>`;
  },

  saideras() {
    const q = this.q.sai;
    const c = this.contagens();
    let list = Store.all("saideras");
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((x) => {
        const cli = Logic.cliente(x.clienteId);
        const est = Logic.est(x.estabelecimentoId);
        return [x.codigo, x.status, cli?.nome, est?.nome].some((v) => String(v || "").toLowerCase().includes(s));
      });
    }
    if (this.f.saiStatus) list = list.filter((x) => x.status === this.f.saiStatus);
    if (this.f.saiCasa) list = list.filter((x) => x.estabelecimentoId === this.f.saiCasa);
    return `<div class="kpis">
      <div class="kpi"><span>Total</span><b>${this.n(c.saideras)}</b></div>
      <div class="kpi"><span>Disponíveis</span><b>${this.n(c.saiderasDisponiveis)}</b></div>
      <div class="kpi"><span>Utilizadas</span><b>${this.n(c.saiderasUsadas)}</b></div>
      <div class="kpi"><span>Expiradas</span><b>${this.n(c.saiderasExpiradas)}</b></div>
    </div>
    <section class="panel">
      ${this.toolbar("q-sai", "sai", "Filtrar por código, cliente ou casa", `${this.selCasa("saiCasa")} ${this.chips("saiStatus", [["", "Todas"], ["disponivel", "Disponíveis"], ["utilizada", "Usadas"], ["expirada", "Expiradas"]])}`)}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Código</th><th>Cliente</th><th>Casa</th><th>Bebida</th><th>Validade</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((s) => `<tr>
          <td>${this.esc(s.codigo)}</td>
          <td>${this.esc(Logic.cliente(s.clienteId)?.nome || "—")}</td>
          <td>${this.esc(Logic.est(s.estabelecimentoId)?.nome || "—")}</td>
          <td>${this.esc(Logic.bebida(s.bebidaId)?.nome || "—")}</td>
          <td>${this.esc(Logic.validadeLabel(s))}</td>
          <td>${this.badge(s.status)}</td>
          <td class="table-actions">${this.saiAcoes(s)}</td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma Saideira conquistada ainda.")}
    </section>`;
  },

  saiAcoes(s) {
    const bits = [];
    if (s.status === "disponivel") {
      bits.push(`<button class="btn btn-ghost btn-sm" data-act="sai-entregar" data-id="${s.id}">Entregar</button>`);
      bits.push(`<button class="btn btn-ghost btn-sm" data-act="sai-prorrogar" data-id="${s.id}">Prorrogar</button>`);
      bits.push(`<button class="btn btn-ghost btn-sm" data-act="sai-expirar" data-id="${s.id}">Expirar</button>`);
    } else {
      bits.push(`<button class="btn btn-ghost btn-sm" data-act="sai-restaurar" data-id="${s.id}">Restaurar</button>`);
    }
    return bits.join("");
  },

  ticketStatus(t) {
    return t.status || (!t.usado ? "aberto" : t.usadoPor ? "usado" : "cancelado");
  },

  tickets() {
    const q = this.q.tkt;
    const c = this.contagens();
    let list = Store.all("tickets");
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((t) => {
        const est = Logic.est(t.estabelecimentoId);
        const cli = Logic.cliente(t.usadoPor);
        const itens = (t.itens || []).map((i) => i.nome).join(" ");
        return [t.codigo, t.status, est?.nome, cli?.nome, itens].some((v) => String(v || "").toLowerCase().includes(s));
      });
    }
    if (this.f.tktStatus) list = list.filter((t) => this.ticketStatus(t) === this.f.tktStatus);
    if (this.f.tktCasa) list = list.filter((t) => t.estabelecimentoId === this.f.tktCasa);
    const todos = Store.all("tickets");
    const abertos = todos.filter((t) => this.ticketStatus(t) === "aberto").length;
    const usados = todos.filter((t) => this.ticketStatus(t) === "usado").length;
    const cancelados = todos.filter((t) => this.ticketStatus(t) === "cancelado").length;
    return `<div class="kpis">
      <div class="kpi"><span>Cupons</span><b>${this.n(c.tickets ?? todos.length)}</b></div>
      <div class="kpi"><span>Abertos</span><b>${this.n(c.ticketsAbertos ?? abertos)}</b></div>
      <div class="kpi"><span>Usados</span><b>${this.n(usados)}</b></div>
      <div class="kpi"><span>Cancelados</span><b>${this.n(cancelados)}</b></div>
    </div>
    <section class="panel">
      <p class="tiny muted" style="margin-bottom:12px">QR gerado pela casa. Cancelar impede o cliente de ler o cupom.</p>
      ${this.toolbar("q-tkt", "tkt", "Filtrar por código, casa ou cliente", `${this.selCasa("tktCasa")} ${this.chips("tktStatus", [["", "Todos"], ["aberto", "Abertos"], ["usado", "Usados"], ["cancelado", "Cancelados"]])}`)}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Código</th><th>Casa</th><th>Itens</th><th>Status</th><th>Quando</th><th></th></tr></thead>
        <tbody>${list.map((t) => {
          const st = this.ticketStatus(t);
          const itens = (t.itens || []).map((i) => `${i.quantidade}× ${i.nome}`).join(", ");
          return `<tr>
            <td><strong>${this.esc(t.codigo)}</strong></td>
            <td>${this.esc(Logic.est(t.estabelecimentoId)?.nome || "—")}</td>
            <td>${this.esc(itens || "—")}</td>
            <td>${this.badge(st)}</td>
            <td>${t.usadoEm ? Logic.fmtDate(t.usadoEm) : Logic.fmtDate(t.criadoEm)}</td>
            <td class="table-actions">${st === "aberto" ? `<button class="btn btn-ghost btn-sm" data-act="tkt-cancelar" data-id="${t.id}">Cancelar</button>` : t.usadoPor ? `<a class="btn btn-ghost btn-sm" href="#/cliente/${t.usadoPor}">Cliente</a>` : ""}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>` : this.empty("Nenhum cupom gerado ainda.")}
    </section>`;
  },

  checksMenus(livres) {
    const allowed = new Set(livres || Logic.menusCasaCatalogo().map((m) => m.id));
    return `<div class="check-list" data-pln-menus>${Logic.menusCasaCatalogo()
      .map((m) => {
        const bloqueado = !m.fixo && !allowed.has(m.id);
        return `<label class="${m.fixo ? "is-fixo" : ""}${bloqueado ? " is-block" : ""}">
          <input type="checkbox" data-menu-pln="${m.id}" data-fixo="${m.fixo ? "1" : "0"}" ${bloqueado ? "checked" : ""} ${m.fixo ? "disabled" : ""}/>
          <div>
            <strong>${this.esc(m.nome)}</strong>
            <p class="tiny muted">${m.fixo ? "Sempre livre" : bloqueado ? "Bloqueado — fica turvo na casa" : "Marque para bloquear"}</p>
          </div>
        </label>`;
      })
      .join("")}</div>`;
  },

  menusDoForm(root = this.root) {
    const box = root.querySelector("[data-pln-menus]") || root;
    const blocked = new Set();
    box.querySelectorAll("[data-menu-pln]").forEach((el) => {
      if (el.getAttribute("data-fixo") === "1") return;
      if (el.checked) blocked.add(el.getAttribute("data-menu-pln"));
    });
    return Logic.menusCasaCatalogo()
      .map((m) => m.id)
      .filter((id) => !blocked.has(id));
  },

  ligarMenusPlano(root) {
    if (!root) return;
    root.querySelectorAll("[data-pln-menus] label").forEach((lab) => {
      const inp = lab.querySelector("[data-menu-pln]");
      const hint = lab.querySelector(".tiny");
      if (!inp || inp.disabled) return;
      const sync = () => {
        lab.classList.toggle("is-block", inp.checked);
        if (hint) hint.textContent = inp.checked ? "Bloqueado — fica turvo na casa" : "Livre neste plano";
      };
      inp.addEventListener("change", sync);
      sync();
    });
  },

  resumoMenusPlano(p) {
    const livres = new Set(p.menus || []);
    const bloqueados = Logic.menusCasaCatalogo()
      .filter((m) => !m.fixo && !livres.has(m.id))
      .map((m) => m.nome);
    if (!bloqueados.length) return `<span class="tiny muted">Nenhum menu bloqueado</span>`;
    return `<strong>Bloqueados:</strong> ${this.esc(bloqueados.join(", "))}`;
  },

  planos() {
    const list = Store.all("planos");
    const form = `<div class="form-grid">
        <div class="field"><span>Nome</span><input id="npn-nome" placeholder="Ex.: Completo"/></div>
        <div class="field"><span>Preço (opcional)</span><input id="npn-preco" type="number" min="0" step="0.01" placeholder="0"/></div>
      </div>
      <div class="field" style="margin-top:10px"><span>Descrição</span><textarea id="npn-desc" rows="2" placeholder="O que a casa ganha neste plano"></textarea></div>
      <label class="toggle-row" style="margin:12px 0"><span>À mostra para os estabelecimentos</span><input type="checkbox" id="npn-mostra" checked/></label>
      <p class="tiny muted" style="margin-bottom:8px">Marque só os menus que a casa <strong>não</strong> usa neste plano. Eles continuam no menu, mas o conteúdo fica turvo.</p>
      ${this.checksMenus(Logic.menusCasaCatalogo().map((m) => m.id))}
      <button class="btn btn-gold" style="margin-top:12px" data-act="pln-criar">Cadastrar plano</button>`;
    const cobrancas = Store.all("cobrancasPlano");
    const pend = cobrancas.filter((c) => c.status === "pendente");
    const pixOk = Boolean(Store.data?.meta?.pixChave);
    const cobRows = cobrancas
      .slice(0, 40)
      .map((c) => {
        const casa = Logic.est(c.estabelecimentoId);
        const pl = Logic.plano(c.planoId);
        const lab = { pendente: "Aguardando Pix", pago: "Pago", cancelado: "Cancelado" }[c.status] || c.status;
        return `<tr>
          <td><strong>${this.esc(casa?.nome || "Casa")}</strong><p class="tiny muted">${this.esc(c.txid)}</p></td>
          <td>${this.esc(pl?.nome || "—")}<p class="tiny muted">${this.esc(Logic.fmtReais(c.valor))}</p></td>
          <td><span class="badge ${c.status === "pago" ? "badge-green" : c.status === "pendente" ? "badge-gold" : "badge-ghost"}">${lab}</span></td>
          <td>${this.esc(Logic.fmtDate(c.criadoEm))}</td>
          <td class="table-actions">${
            c.status === "pendente"
              ? `<button class="btn btn-gold btn-sm" data-act="cob-pagar" data-id="${c.id}">Confirmar Pix</button>
                 <button class="btn btn-ghost btn-sm" data-act="cob-cancelar" data-id="${c.id}">Cancelar</button>`
              : ""
          }</td>
        </tr>`;
      })
      .join("");
    return `${this.formNovo("pln", "Cadastrar novo plano", form)}
    <section class="panel" style="margin-bottom:14px">
      <h3>Mensagem dos menus bloqueados</h3>
      <p class="tiny muted" style="margin:6px 0 10px">Aparece na casa quando o menu existe no plano, mas não está liberado. O conteúdo fica turvo; no toque ou no mouse a logo reforça e mostra este texto.</p>
      <div class="field"><span>Texto</span><input id="pln-msg" maxlength="80" value="${this.esc(Store.data?.meta?.msgPlanoBloqueado || "Indisponível")}" placeholder="Indisponível"/></div>
      <button class="btn btn-navy btn-sm" style="margin-top:10px" data-act="pln-msg">Salvar mensagem</button>
    </section>
    ${
      pixOk
        ? ""
        : `<p class="notice" style="margin-bottom:14px">Cadastre a chave Pix em Configurações. Sem ela, a casa não consegue pedir um plano com preço.</p>`
    }
    <section class="panel" style="margin-bottom:14px">
      <h3>Pix dos planos</h3>
      <p class="tiny muted" style="margin:6px 0 12px">${pend.length ? `${pend.length} aguardando confirmação.` : "Nenhum Pix pendente."} Quando a casa pede um plano com preço, o Pix sai com esse valor. Confirme aqui depois de cair no extrato.</p>
      ${
        cobrancas.length
          ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Casa</th><th>Plano</th><th>Status</th><th>Pedido</th><th></th></tr></thead>
        <tbody>${cobRows}</tbody>
      </table></div>`
          : this.empty("Nenhuma cobrança ainda.")
      }
    </section>
    <section class="panel">
      <p class="muted small" style="margin-bottom:12px">O plano define quais menus a casa usa livremente. Os outros continuam no menu, turvos. Se estiver à mostra, a casa pode pedir. Com preço, gera Pix e só muda depois que você confirmar. Visão Geral, Configurações e Planos ficam sempre livres.</p>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Plano</th><th>Menus bloqueados</th><th>À mostra</th><th>Casas</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((p) => `<tr>
          <td><strong>${this.esc(p.nome)}</strong><p class="tiny muted">${this.esc(p.descricao || "")}${p.preco != null ? " · R$ " + Number(p.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}</p></td>
          <td>${this.resumoMenusPlano(p)}</td>
          <td>${p.aMostra ? `<span class="badge badge-gold">À mostra</span>` : `<span class="badge badge-ghost">Só admin</span>`}</td>
          <td>${this.n(p.casas ?? Store.all("estabelecimentos").filter((e) => e.planoId === p.id).length)}</td>
          <td>${this.badge(p.status)}</td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" data-act="pln-editar" data-id="${p.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-act="pln-mostra" data-id="${p.id}">${p.aMostra ? "Esconder" : "Deixar à mostra"}</button>
            <button class="btn btn-ghost btn-sm" data-act="pln-status" data-id="${p.id}">${p.status === "ativo" ? "Desativar" : "Ativar"}</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhum plano ainda. Cadastre o primeiro.")}
    </section>`;
  },

  fichaCliente() {
    const c = Logic.cliente(this.params.id);
    if (!c) return `<section class="panel">${this.empty("Cliente não encontrado.")}<a class="btn btn-ghost" href="#/clientes">Voltar</a></section>`;
    const tampas = Store.all("tampas").filter((t) => t.clienteId === c.id);
    const sais = Store.all("saideras").filter((s) => s.clienteId === c.id);
    const consTodos = Store.all("consumos").filter((x) => x.clienteId === c.id);
    const cons = consTodos.slice(0, 16);
    const tkts = Store.all("tickets").filter((t) => t.usadoPor === c.id);
    const avisos = Store.all("notificacoes").filter((n) => n.clienteId === c.id).slice(0, 8);
    const casasIds = [...Logic.idsCasasDoCliente(c.id)];
    const fav = Logic.bebida(c.bebidaFavoritaId || c.prefs?.bebidaFavoritaId);
    const prefs = c.prefs || {};
    const idade = this.idadeDe(c.nascimento);
    return `<div class="kpis">
      <a class="kpi kpi-go" href="#/tampas"><span>Tampas em aberto</span><b>${this.n(tampas.reduce((a, t) => a + t.atual, 0))}</b></a>
      <a class="kpi kpi-go" href="#/saideras"><span>Saideiras</span><b>${this.n(sais.length)}</b></a>
      <div class="kpi"><span>Casas</span><b>${this.n(casasIds.length)}</b></div>
      <div class="kpi"><span>Consumos</span><b>${this.n(consTodos.length)}</b></div>
    </div>
    <section class="panel" style="margin-bottom:14px">
      <div class="person" style="margin-bottom:12px">
        <img src="${this.avatar(c.avatar)}" alt=""/>
        <div>
          <h3>${this.esc(c.nome)}</h3>
          <p class="tiny muted">${this.esc(c.email || "sem e-mail")} · ${this.esc(c.telefone || "sem telefone")}</p>
          <p class="tiny muted">${this.esc(c.bairro || "sem bairro")}${c.cidade ? " · " + this.esc(c.cidade) : ""} · QR ${this.esc(c.codigo)}</p>
          <p class="tiny muted">Desde ${this.esc(c.clienteDesde || "—")} · última visita ${this.esc(c.ultimaVisita || "—")}${c.nascimento ? " · nasc. " + this.esc(c.nascimento) : ""}${idade != null ? " · " + idade + " anos" : ""}</p>
          <p class="tiny muted">Favorita: ${this.esc(fav?.nome || "—")} · avisos ${prefs.push === false ? "off" : "on"} · e-mail ${prefs.email === false ? "off" : "on"} · WhatsApp ${prefs.whatsapp ? "on" : "off"} · perfil ${prefs.perfilPublico === false ? "privado" : "público"}</p>
        </div>
      </div>
      ${casasIds.length ? `<p class="tiny muted" style="margin-bottom:10px">Frequenta: ${casasIds.map((id) => `<a href="#/casa/${id}" style="color:#F5B800">${this.esc(Logic.est(id)?.nome || id)}</a>`).join(" · ")}</p>` : ""}
      <div class="table-actions wrap">
        <button class="btn btn-gold btn-sm" data-act="entrar-conta" data-papel="cliente" data-id="${c.id}">Entrar na conta</button>
        <button class="btn btn-navy btn-sm" data-act="cli-aviso" data-id="${c.id}">Enviar aviso</button>
        <button class="btn btn-ghost btn-sm" data-act="sai-conceder" data-id="${c.id}">Conceder Saideira</button>
        <button class="btn btn-ghost btn-sm" data-act="tam-ajustar-cli" data-id="${c.id}">Ajustar Tampas</button>
        <button class="btn btn-ghost btn-sm" data-act="cli-qr" data-id="${c.id}">Novo código QR</button>
        <button class="btn btn-ghost btn-sm" data-act="cli-editar" data-id="${c.id}">Editar cadastro</button>
        <button class="btn btn-ghost btn-sm" data-act="cli-status" data-id="${c.id}">${c.status === "ativo" ? "Desativar acesso" : "Reativar acesso"}</button>
        <button class="btn btn-danger btn-sm" data-act="cli-excluir" data-id="${c.id}">Excluir</button>
      </div>
    </section>
    <div class="grid-2">
      <section class="panel">
        <h3>Tampas</h3>
        ${tampas.length ? tampas.map((t) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a">
          <div><strong>${this.esc(Logic.bebida(t.bebidaId)?.nome || "Bebida")}</strong><p class="tiny muted">${this.esc(Logic.est(t.estabelecimentoId)?.nome || "—")} · ${t.atual}/${t.meta}</p></div>
          <button class="btn btn-ghost btn-sm" data-act="tam-ajustar" data-id="${t.id}">Ajustar</button>
        </div>`).join("") : this.empty("Nenhum progresso ainda.")}
      </section>
      <section class="panel">
        <h3>Saideiras</h3>
        ${sais.length ? sais.map((s) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a;gap:8px">
          <div><strong>${this.esc(s.codigo)}</strong><p class="tiny muted">${this.esc(Logic.bebida(s.bebidaId)?.nome || "—")} · ${this.esc(Logic.est(s.estabelecimentoId)?.nome || "—")}</p></div>
          <div class="table-actions">${this.saiAcoes(s)}</div>
        </div>`).join("") : this.empty("Nenhuma Saideira.")}
      </section>
    </div>
    <section class="panel" style="margin-top:14px">
      <h3>Consumos recentes</h3>
      ${cons.length ? cons.map((x) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid #2a2a2a"><span>+${x.quantidade} ${this.esc(Logic.bebida(x.bebidaId)?.nome || "Bebida")} · ${this.esc(Logic.est(x.estabelecimentoId)?.nome || "")}</span><span class="muted small">${Logic.fmtDate(x.criadoEm)}</span></div>`).join("") : this.empty("Nenhum consumo.")}
      ${tkts.length ? `<p class="tiny muted" style="margin-top:14px">Cupons lidos: ${tkts.map((t) => t.codigo).join(", ")}</p>` : ""}
    </section>
    ${avisos.length ? `<section class="panel" style="margin-top:14px">
      <h3>Avisos no app</h3>
      ${avisos.map((n) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid #2a2a2a"><span>${this.esc(n.titulo || n.texto || n.mensagem || "Aviso")}</span><span class="muted small">${Logic.fmtDate(n.criadoEm || n.em)}</span></div>`).join("")}
    </section>` : ""}`;
  },

  fichaCasa() {
    const e = Logic.est(this.params.id);
    if (!e) return `<section class="panel">${this.empty("Casa não encontrada.")}<a class="btn btn-ghost" href="#/estabelecimentos">Voltar</a></section>`;
    const noCard = new Set((e.bebidas || []).map((b) => b.id));
    const rede = Store.all("bebidas");
    const equipe = Store.all("funcionarios").filter((f) => f.estabelecimentoId === e.id);
    const tkts = Store.all("tickets").filter((t) => t.estabelecimentoId === e.id).slice(0, 12);
    const img = this.avatar(e.cartaz || e.imagem || Logic.imagemPadraoEst(e));
    return `<div class="kpis">
      <div class="kpi"><span>Clientes</span><b>${this.n(e.qtdClientes)}</b></div>
      <div class="kpi"><span>Tampas</span><b>${this.n(e.qtdTampas)}</b></div>
      <div class="kpi"><span>Saideiras</span><b>${this.n(e.qtdSaideras)}</b></div>
      <div class="kpi"><span>Equipe</span><b>${this.n(equipe.length)}</b></div>
    </div>
    <section class="panel" style="margin-bottom:14px">
      <p class="tiny muted">${this.esc(Logic.tipoEst(e))} · ${this.esc(Logic.enderecoLinha(e))} · gestor ${this.esc(e.gestorEmail || "—")} · plano ${this.esc(Logic.planoDaCasa(e)?.nome || "Completo")}</p>
      ${(() => {
        const cob = Logic.cobrancaPendente(e.id);
        if (!cob) return "";
        const pl = Logic.plano(cob.planoId);
        return `<p class="notice" style="margin-top:12px">Pix pendente: ${this.esc(pl?.nome || "plano")} · ${this.esc(Logic.fmtReais(cob.valor))} · ${this.esc(cob.txid)}. Confirme em Planos depois de cair no extrato.</p>`;
      })()}
      <div class="row wrap" style="gap:8px;margin-top:12px;align-items:flex-end">
        <div class="field" style="margin:0;min-width:220px"><span>Plano desta casa</span>
          <select id="casa-plano">${Store.all("planos").map((p) => `<option value="${p.id}" ${e.planoId === p.id ? "selected" : ""}>${this.esc(p.nome)}${p.aMostra ? "" : " (só admin)"}</option>`).join("")}</select>
        </div>
        <button class="btn btn-gold btn-sm" data-act="entrar-conta" data-papel="estabelecimento" data-id="${e.id}">Entrar na casa</button>
        <button class="btn btn-navy btn-sm" data-act="casa-plano" data-id="${e.id}">Salvar plano</button>
        <button class="btn btn-ghost btn-sm" data-act="est-editar" data-id="${e.id}">Editar endereço</button>
        <button class="btn btn-ghost btn-sm" data-act="est-status" data-id="${e.id}">${e.status === "ativo" ? "Desativar" : "Ativar"}</button>
        <button class="btn btn-danger btn-sm" data-act="est-excluir" data-id="${e.id}">Excluir</button>
      </div>
      <p class="tiny muted" style="margin-top:12px">Link do app desta casa (QR na mesa): <span style="word-break:break-all;color:#F5B800">${this.esc(Logic.urlEntrarCliente(e.id))}</span></p>
    </section>
    <div class="grid-2">
      <section class="panel">
        <h3>Vitrine no app</h3>
        <div class="cartaz-preview" style="margin:12px 0"><img src="${img}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:14px" onerror="this.style.display='none'"/></div>
        <div class="field"><span>Promoção curta</span><input id="casa-promo" value="${this.esc(e.promocao || "")}" placeholder="Ex.: Happy hour até 20h"/></div>
        <div class="table-actions wrap" style="margin-top:10px">
          <button class="btn btn-gold btn-sm" data-act="casa-promo" data-id="${e.id}">Salvar promoção</button>
          <button class="btn btn-navy btn-sm" data-act="casa-cartaz" data-id="${e.id}">Enviar cartaz</button>
          ${e.cartaz ? `<button class="btn btn-ghost btn-sm" data-act="casa-cartaz-reset" data-id="${e.id}">Tirar cartaz</button>` : ""}
        </div>
        <input type="file" id="casa-cartaz-file" accept="image/jpeg,image/png,image/webp,image/*" hidden/>
      </section>
      <section class="panel">
        <h3>Cardápio desta casa</h3>
        <p class="tiny muted" style="margin:6px 0 10px">O que o cliente e o garçom veem. Meta vazia usa a padrão da casa (${e.metaPadrao}).</p>
        ${(e.bebidas || []).length ? e.bebidas.map((b) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid #2a2a2a;gap:8px">
          <div><strong>${this.esc(b.nome)}</strong><p class="tiny muted">${b.meta ? b.meta + " Tampas" : "Padrão"} · ${this.esc(b.regra || "padrao")}</p></div>
          <button class="btn btn-danger btn-sm" data-act="casa-beb-off" data-id="${e.id}" data-beb="${b.id}">Tirar</button>
        </div>`).join("") : this.empty("Nenhuma bebida vinculada.")}
        <div class="row wrap" style="gap:8px;margin-top:12px">
          <select id="casa-beb-nova" style="flex:1;min-width:160px">${rede.filter((b) => !noCard.has(b.id)).map((b) => `<option value="${b.id}">${this.esc(b.nome)}</option>`).join("") || `<option value="">Todas já estão no cardápio</option>`}</select>
          <input id="casa-beb-meta" type="number" min="1" placeholder="Meta" style="width:90px"/>
          <button class="btn btn-gold btn-sm" data-act="casa-beb-on" data-id="${e.id}" ${rede.some((b) => !noCard.has(b.id)) ? "" : "disabled"}>Incluir</button>
        </div>
      </section>
    </div>
    <section class="panel" style="margin-top:14px">
      <h3>Equipe</h3>
      ${equipe.length ? equipe.map((f) => `<div class="row between" style="padding:8px 0"><span>${this.esc(f.nome)} · ${this.esc(f.cargo)}</span>${this.badge(f.status)}</div>`).join("") : this.empty("Nenhum funcionário.")}
      ${tkts.length ? `<h3 style="margin-top:16px">Últimos cupons</h3>${tkts.map((t) => `<div class="row between" style="padding:8px 0"><span>${this.esc(t.codigo)} · ${this.esc(this.ticketStatus(t))}</span><span class="muted small">${Logic.fmtDate(t.criadoEm)}</span></div>`).join("")}` : ""}
    </section>`;
  },

  relatorios() {
    const c = this.contagens();
    const r = Logic.resumoRede();
    const ofertas = Store.all("campanhas").filter((x) => x.disparada).length;
    const totalCam = c.campanhas || Store.all("campanhas").length;
    const tkts = Store.all("tickets");
    const porCasa = Store.all("estabelecimentos")
      .map((e) => ({
        nome: e.nome,
        clientes: e.qtdClientes || 0,
        tampas: e.qtdTampas || 0,
        saideras: e.qtdSaideras || 0,
        cupons: tkts.filter((t) => t.estabelecimentoId === e.id).length,
      }))
      .sort((a, b) => b.saideras - a.saideras);
    const maxCasa = Math.max(1, ...porCasa.map((x) => x.saideras));
    const cons = Store.all("consumos");
    const porBeb = Store.all("bebidas")
      .map((b) => ({
        nome: b.nome,
        casas: this.casasDaBebida(b.id).length,
        tampas: cons.filter((x) => x.bebidaId === b.id).reduce((a, x) => a + (x.quantidade || 0), 0),
        saideras: Store.all("saideras").filter((s) => s.bebidaId === b.id).length,
      }))
      .sort((a, b) => b.tampas - a.tampas);
    return `<div class="kpis">
      <div class="kpi"><span>Conversão (usadas / total)</span><b>${r.conversao}%</b></div>
      <div class="kpi"><span>Disponíveis</span><b>${this.n(c.saiderasDisponiveis)}</b></div>
      <div class="kpi"><span>Campanhas disparadas</span><b>${this.n(ofertas)}</b></div>
      <div class="kpi"><span>Cupons QR</span><b>${this.n(tkts.length)}</b></div>
    </div>
    <section class="panel" style="margin-bottom:14px">
      <h3>Rede</h3>
      ${UI.bars([
        { nome: "Conversão de Saideira", pct: r.conversao },
        { nome: "Saideiras ainda disponíveis", pct: c.saideras ? Math.round(((c.saiderasDisponiveis || 0) / c.saideras) * 100) : 0 },
        { nome: "Campanhas já disparadas", pct: totalCam ? Math.round((ofertas / totalCam) * 100) : 0 },
        { nome: "Cupons já usados", pct: tkts.length ? Math.round((tkts.filter((t) => this.ticketStatus(t) === "usado").length / tkts.length) * 100) : 0 },
      ])}
    </section>
    <section class="panel" style="margin-bottom:14px">
      <h3>Por casa</h3>
      ${porCasa.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Casa</th><th>Clientes</th><th>Tampas</th><th>Saideiras</th><th>Cupons</th></tr></thead>
        <tbody>${porCasa.map((e) => `<tr><td>${this.esc(e.nome)}</td><td>${this.n(e.clientes)}</td><td>${this.n(e.tampas)}</td><td>${this.n(e.saideras)}</td><td>${this.n(e.cupons)}</td></tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma casa.")}
      ${porCasa.some((x) => x.saideras) ? `<div style="margin-top:14px">${UI.bars(porCasa.slice(0, 8).map((x) => ({ nome: x.nome, pct: Math.round((x.saideras / maxCasa) * 100) })))}</div>` : ""}
    </section>
    <section class="panel">
      <h3>Por bebida</h3>
      ${porBeb.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Bebida</th><th>Casas</th><th>Tampas (consumos)</th><th>Saideiras</th></tr></thead>
        <tbody>${porBeb.map((b) => `<tr><td>${this.esc(b.nome)}</td><td>${this.n(b.casas)}</td><td>${this.n(b.tampas)}</td><td>${this.n(b.saideras)}</td></tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma bebida no catálogo.")}
    </section>`;
  },

  auditoria() {
    let logs = Logic.logsAuditoria();
    if (this.q.log) {
      const s = this.q.log.toLowerCase();
      logs = logs.filter((l) => [l.acao, l.detalhe].some((v) => String(v || "").toLowerCase().includes(s)));
    }
    return `<section class="panel">
      ${this.toolbar("q-log", "log", "Buscar ação ou detalhe")}
      ${logs.length ? logs.map((l) => `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a"><div><strong>${this.esc(l.acao)}</strong><p class="tiny muted">${this.esc(l.detalhe || "")}</p></div><span class="muted small">${Logic.fmtDate(l.em)}</span></div>`).join("") : this.empty("Nenhum evento ainda.")}
    </section>`;
  },

  config() {
    const m = Store.data?.meta || {};
    return `<div class="cfg-grid">
      <section class="panel">
        <h3>Rede</h3>
        <p class="tiny muted" style="margin:6px 0 10px">Cidade e meta padrão usadas no cadastro de casas e no app.</p>
        <div class="field"><span>Cidade da operação</span><input id="cfg-cidade" value="${this.esc(m.cidade || "")}"/></div>
        <div class="field" style="margin-top:10px"><span>Meta padrão de Tampas</span><input id="cfg-meta-rede" type="number" min="1" value="${m.metaPadraoRede ?? 10}"/></div>
      </section>
      <section class="panel">
        <h3>Validade</h3>
        <p class="tiny muted" style="margin:6px 0 10px">Prazo das Saideiras conquistadas a partir de agora.</p>
        <div class="field"><span>Validade da Saideira (dias)</span><input id="cfg-validade" type="number" min="1" value="${m.validadeSaideraDias ?? 15}"/></div>
      </section>
      <section class="panel">
        <h3>Planos</h3>
        <p class="tiny muted" style="margin:6px 0 10px">Texto sobre o conteúdo turvo quando o menu não está no plano da casa.</p>
        <div class="field"><span>Mensagem de menu bloqueado</span><input id="cfg-pln-msg" maxlength="80" value="${this.esc(m.msgPlanoBloqueado || "Indisponível")}" placeholder="Indisponível"/></div>
      </section>
      <section class="panel">
        <h3>Pix da rede</h3>
        <p class="tiny muted" style="margin:6px 0 10px">Quando a casa pede um plano com preço, o app gera um Pix com este valor para esta chave. CPF, CNPJ, e-mail, celular com DDD ou chave aleatória.</p>
        <div class="field"><span>Chave Pix</span><input id="cfg-pix-chave" value="${this.esc(m.pixChave || "")}" placeholder="e-mail, CPF, celular ou chave aleatória"/></div>
        <div class="field" style="margin-top:10px"><span>Nome no Pix</span><input id="cfg-pix-nome" maxlength="25" value="${this.esc(m.pixNome || "Saideira")}" placeholder="Saideira"/></div>
        <div class="field" style="margin-top:10px"><span>Cidade no Pix</span><input id="cfg-pix-cidade" maxlength="15" value="${this.esc(m.pixCidade || "Aracaju")}" placeholder="Aracaju"/></div>
      </section>
      <section class="panel">
        <h3>Suporte</h3>
        <p class="tiny muted" style="margin:6px 0 10px">Aparece no app do cliente e da casa quando alguém precisa de ajuda.</p>
        <div class="field"><span>WhatsApp</span><input id="cfg-whats" placeholder="79 99999-0000" value="${this.esc(m.suporteWhatsapp || "")}"/></div>
        <div class="field" style="margin-top:10px"><span>E-mail</span><input id="cfg-email" type="email" placeholder="suporte@saidera.app" value="${this.esc(m.suporteEmail || "")}"/></div>
      </section>
      <section class="panel">
        <h3>Senha do admin</h3>
        <div class="field"><span>Nova senha</span><input id="cfg-senha" type="password" placeholder="Deixe vazio para não trocar"/></div>
      </section>
      <section class="panel">
        <h3>App no celular</h3>
        <p class="tiny muted" style="margin:6px 0 10px">O painel do admin abre no computador, no navegador. Instalar o app é opcional.</p>
        ${UI.pwaBox() || `<p class="tiny muted">Já está no app deste aparelho.</p>`}
      </section>
    </div>
    <button class="btn btn-gold" style="margin-top:14px" data-act="cfg-salvar">Salvar configurações</button>`;
  },

  modalForm(titulo, campos, onOk) {
    const html = `<h2 style="margin-bottom:12px">${titulo}</h2>
      <div class="form-grid">${campos}</div>
      <div class="row" style="margin-top:16px;gap:8px">
        <button class="btn btn-gold" id="modal-ok">Salvar</button>
        <button class="btn btn-ghost" data-close-modal>Cancelar</button>
      </div>`;
    const m = UI.modal({ html });
    this.ligarCep(m.el, "[name=cep], #ed-cep", { rua: "[name=logradouro]", bairro: "[name=bairro]", cidade: "[name=cidade]", uf: "[name=uf]" });
    this.ligarMenusPlano(m.el);
    m.el.querySelector("#modal-ok")?.addEventListener("click", async () => {
      const ok = await onOk(m.el);
      if (ok !== false) m.close();
    });
  },

  bind() {
    UI.fixButtons(this.root);
    this.ligarMenusPlano(this.root);
    const keep = (id, key) => {
      this.root.querySelector(id)?.addEventListener("input", (e) => {
        this.q[key] = e.target.value;
        this.render();
        const el = this.root.querySelector(id);
        if (el) {
          el.focus();
          const n = el.value.length;
          el.setSelectionRange(n, n);
        }
      });
    };
    keep("#q-est", "est");
    keep("#q-cli", "cli");
    keep("#q-fun", "fun");
    keep("#q-par", "par");
    keep("#q-beb", "beb");
    keep("#q-sai", "sai");
    keep("#q-tam", "tam");
    keep("#q-cam", "cam");
    keep("#q-tkt", "tkt");
    keep("#q-log", "log");

    this.root.querySelectorAll("[data-filtro]").forEach((b) =>
      b.addEventListener("click", () => {
        const key = b.getAttribute("data-filtro");
        this.f[key] = b.getAttribute("data-val") || "";
        this.render();
      })
    );
    this.root.querySelectorAll("[data-filtro-sel]").forEach((el) =>
      el.addEventListener("change", () => {
        this.f[el.getAttribute("data-filtro-sel")] = el.value;
        this.render();
      })
    );
    this.root.querySelectorAll("[data-novo]").forEach((b) =>
      b.addEventListener("click", () => {
        const key = b.getAttribute("data-novo");
        this.novo[key] = !this.novo[key];
        this.render();
      })
    );
    this.root.querySelector("#cam-disp")?.addEventListener("change", (e) => {
      this.camDispId = e.target.value;
      const cam = Store.find("campanhas", this.camDispId);
      this.dispCanal = cam?.canal || "";
      this.render();
    });

    this.root.querySelectorAll("[data-bairro]").forEach((b) =>
      b.addEventListener("click", () => {
        const n = b.getAttribute("data-bairro");
        const i = this.aud.bairros.indexOf(n);
        if (i >= 0) this.aud.bairros.splice(i, 1);
        else this.aud.bairros.push(n);
        this.render();
      })
    );
    this.root.querySelector("#aud-bebida")?.addEventListener("change", (e) => {
      this.aud.bebidaId = e.target.value;
      this.render();
    });
    this.root.querySelector("#aud-dias")?.addEventListener("change", (e) => {
      this.aud.dias = Number(e.target.value) || 90;
      this.render();
    });
    this.root.querySelectorAll("[data-aud-est]").forEach((el) =>
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-aud-est");
        if (el.checked) {
          if (!this.aud.ests.includes(id)) this.aud.ests.push(id);
        } else this.aud.ests = this.aud.ests.filter((x) => x !== id);
        this.render();
      })
    );
    this.root.querySelectorAll("[data-canal]").forEach((b) =>
      b.addEventListener("click", () => {
        this.dispCanal = b.getAttribute("data-canal");
        this.aud.canal = this.dispCanal;
        this.render();
      })
    );
    const dashClick = (sel, campo) => {
      this.root.querySelectorAll(sel).forEach((el) => {
        const aplicar = () => {
          const atual = el.getAttribute(sel.slice(1, -1)) || "";
          this[campo] = this[campo] === atual ? "" : atual;
          this.render();
        };
        el.addEventListener("click", aplicar);
        el.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            aplicar();
          }
        });
      });
    };
    dashClick("[data-dash-dia]", "dashDia");
    dashClick("[data-dash-bairro]", "dashBairro");
    this.ligarCep(this.root, "#ne-cep", { rua: "#ne-rua", bairro: "#ne-bairro", cidade: "#ne-cidade", uf: "#ne-uf" });
    this.root.querySelector("#casa-cartaz-file")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file || !this.params.id) return;
      try {
        const dataUrl = await Logic.lerCartazArquivo(file);
        await this.post("estabelecimentos/midia", { id: this.params.id, campo: "cartaz", dataUrl }, "Cartaz salvo. O cliente já vê no app.");
      } catch (err) {
        UI.toast(err.message);
      }
    });
  },

  ligarCep(box, cepSel, campos) {
    const cep = box.querySelector(cepSel);
    if (!cep) return;
    cep.addEventListener("input", () => {
      cep.value = Logic.maskCep(cep.value);
    });
    cep.addEventListener("blur", async () => {
      const d = await Logic.viaCep(cep.value);
      if (!d) return;
      const set = (sel, v) => {
        const el = box.querySelector(sel);
        if (el && v) el.value = v;
      };
      set(campos.rua, d.logradouro);
      set(campos.bairro, d.bairro);
      set(campos.cidade, d.cidade);
      set(campos.uf, d.uf);
    });
  },

  estsMarcadas(sel) {
    return [...(this.root.querySelectorAll(`${sel} input:checked`) || [])].map((x) => x.value);
  },

  optsCasaBebida(c, estId, bebId) {
    const casas = Store.all("estabelecimentos");
    const bebs = estId ? Logic.est(estId)?.bebidas || Store.all("bebidas") : Store.all("bebidas");
    return {
      casas: casas.map((e) => `<option value="${e.id}" ${e.id === estId ? "selected" : ""}>${this.esc(e.nome)}</option>`).join(""),
      bebs: bebs.map((b) => `<option value="${b.id}" ${b.id === bebId ? "selected" : ""}>${this.esc(b.nome)}</option>`).join(""),
      cliente: c,
    };
  },

  async onAct(act, id, el) {
    if (act === "admin-geo") {
      try {
        this.geo = await UI.pedirLocalizacao();
        sessionStorage.setItem("saidera_admin_geo", JSON.stringify(this.geo));
        Logic.aplicarDistancias(this.geo);
        this.render();
        UI.toast("Localização ligada. As casas perto de você aparecem no dashboard.");
      } catch (e) {
        UI.toast(e.message || "Não deu para ativar a localização.");
      }
      return;
    }
    if (act === "entrar-conta") {
      const papel = el?.getAttribute("data-papel") || "";
      try {
        const data = await API.post("admin/entrar-conta", { papel, id });
        const pag = data?.session?.pagina;
        if (!pag) {
          UI.toast("Conta aberta, mas sem página de destino.");
          return;
        }
        location.href = /\/pages\//.test(location.pathname) ? `../${pag}` : pag;
      } catch (e) {
        UI.toast(e.message || "Não deu para entrar nesta conta.");
      }
      return;
    }
    if (act === "cli-excluir") {
      const c = Store.find("clientes", id);
      if (!c || !confirm(`Excluir ${c.nome}? O acesso some; o histórico fica para auditoria.`)) return;
      const data = await this.post("clientes/excluir", { id }, "Cliente excluído.");
      if (data && this.view === "cliente") location.hash = "#/clientes";
      return;
    }
    if (act === "est-excluir") {
      const e = Store.find("estabelecimentos", id);
      if (!e || !confirm(`Excluir ${e.nome}? A casa some do app do cliente.`)) return;
      const data = await this.post("estabelecimentos/excluir", { id }, "Casa excluída.");
      if (data && this.view === "casa") location.hash = "#/estabelecimentos";
      return;
    }
    if (act === "fun-excluir") {
      const f = Store.find("funcionarios", id);
      if (!f || !confirm(`Excluir ${f.nome}? O login do garçom deixa de funcionar.`)) return;
      await this.post("funcionarios/excluir", { id }, "Funcionário excluído.");
      return;
    }
    if (act === "par-excluir") {
      const p = Store.find("parceiros", id);
      if (!p || !confirm(`Excluir ${p.nome}? O login do parceiro deixa de funcionar.`)) return;
      const data = await this.post("parceiros/excluir", { id }, "Parceiro excluído.");
      if (data && this.view === "parceiro") location.hash = "#/parceiros";
      return;
    }
    if (act === "pln-criar") {
      const data = await this.post("planos", {
        nome: this.val("#npn-nome"),
        descricao: this.val("#npn-desc"),
        preco: this.val("#npn-preco"),
        aMostra: this.root.querySelector("#npn-mostra")?.checked,
        menus: this.menusDoForm(),
      }, "Plano cadastrado. Atribua na ficha da casa para valer.");
      if (data) {
        this.novo.pln = false;
        this.render();
      }
      return;
    }
    if (act === "pln-editar") {
      const p = Store.find("planos", id);
      if (!p) return;
      this.modalForm("Editar plano", `
        <div class="field"><span>Nome</span><input name="nome" value="${this.esc(p.nome)}"/></div>
        <div class="field"><span>Preço</span><input name="preco" type="number" min="0" step="0.01" value="${p.preco != null ? p.preco : ""}"/></div>
        <div class="field"><span>Descrição</span><textarea name="descricao" rows="2">${this.esc(p.descricao || "")}</textarea></div>
        <label class="toggle-row"><span>À mostra para os estabelecimentos</span><input type="checkbox" name="aMostra" ${p.aMostra ? "checked" : ""}/></label>
        <p class="tiny muted" style="margin:10px 0 6px">Marque os menus que a casa <strong>não</strong> usa. Visão Geral, Configurações e Planos ficam sempre livres.</p>
        ${this.checksMenus(p.menus)}
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("planos/salvar", {
          id: p.id,
          nome: g("nome"),
          descricao: g("descricao"),
          preco: g("preco"),
          aMostra: box.querySelector('[name="aMostra"]')?.checked,
          status: p.status,
          menus: this.menusDoForm(box),
        }, "Plano atualizado.");
        return Boolean(data);
      });
      return;
    }
    if (act === "pln-mostra") {
      const p = Store.find("planos", id);
      if (!p) return;
      await this.post("planos/mostra", { id, aMostra: !p.aMostra }, p.aMostra ? "Plano escondido das casas." : "Plano à mostra para as casas.");
      return;
    }
    if (act === "pln-status") {
      const p = Store.find("planos", id);
      if (!p) return;
      const prox = p.status === "ativo" ? "inativo" : "ativo";
      await this.post("planos/status", { id, status: prox }, prox === "ativo" ? "Plano reativado." : "Plano desativado.");
      return;
    }
    if (act === "casa-plano") {
      await this.post("planos/atribuir", { estabelecimentoId: id, planoId: this.val("#casa-plano") }, "Plano da casa atualizado.");
      return;
    }
    if (act === "cob-pagar") {
      const c = Store.find("cobrancasPlano", id);
      const pl = Logic.plano(c?.planoId);
      const casa = Logic.est(c?.estabelecimentoId);
      if (!confirm(`Confirmar o Pix de ${Logic.fmtReais(c?.valor)} e passar ${casa?.nome || "a casa"} para o plano ${pl?.nome || ""}?`)) return;
      await this.post("planos/cobranca-pagar", { id }, "Pix confirmado. Plano da casa atualizado.");
      return;
    }
    if (act === "cob-cancelar") {
      if (!confirm("Cancelar este Pix? A casa continua no plano atual.")) return;
      await this.post("planos/cobranca-cancelar", { id }, "Cobrança cancelada.");
      return;
    }
    if (act === "pln-msg") {
      await this.post("config", { msgPlanoBloqueado: this.val("#pln-msg") }, "Mensagem dos menus bloqueados atualizada.");
      return;
    }
    if (act === "est-criar") {
      const data = await this.post("estabelecimentos", {
        nome: this.val("#ne-nome"),
        tipo: this.val("#ne-tipo"),
        email: this.val("#ne-email"),
        senha: this.val("#ne-senha"),
        bairro: this.val("#ne-bairro"),
        cep: this.val("#ne-cep"),
        logradouro: this.val("#ne-rua"),
        numero: this.val("#ne-num"),
        complemento: this.val("#ne-comp"),
        cidade: this.val("#ne-cidade") || "Aracaju",
        uf: this.val("#ne-uf") || "SE",
        horario: this.val("#ne-hora"),
        metaPadrao: this.val("#ne-meta"),
      }, "Casa e login do gestor criados.");
      if (data) {
        this.novo.est = false;
        this.render();
      }
      return;
    }
    if (act === "est-editar") {
      const e = Store.find("estabelecimentos", id);
      if (!e) return;
      this.modalForm("Editar casa", `
        <div class="field"><span>Nome</span><input name="nome" value="${this.esc(e.nome)}"/></div>
        <div class="field"><span>Tipo</span><select name="tipo"><option value="bar" ${e.tipo === "bar" ? "selected" : ""}>Bar</option><option value="restaurante" ${e.tipo === "restaurante" ? "selected" : ""}>Restaurante</option></select></div>
        <div class="field"><span>CEP</span><input name="cep" id="ed-cep" inputmode="numeric" maxlength="9" value="${this.esc(e.cep || "")}"/></div>
        <div class="field"><span>Rua / avenida</span><input name="logradouro" value="${this.esc(e.logradouro || "")}"/></div>
        <div class="field"><span>Número</span><input name="numero" value="${this.esc(e.numero || "")}"/></div>
        <div class="field"><span>Complemento</span><input name="complemento" value="${this.esc(e.complemento || "")}"/></div>
        <div class="field"><span>Bairro</span><input name="bairro" value="${this.esc(e.bairro || "")}"/></div>
        <div class="field"><span>Cidade</span><input name="cidade" value="${this.esc(e.cidade || "Aracaju")}"/></div>
        <div class="field"><span>UF</span><input name="uf" maxlength="2" value="${this.esc(e.uf || "SE")}"/></div>
        <div class="field"><span>Horário</span><input name="horario" value="${this.esc(e.horario || "")}"/></div>
        <div class="field"><span>Meta</span><input name="metaPadrao" type="number" value="${e.metaPadrao || 10}"/></div>
        <div class="field"><span>Status</span><select name="status"><option value="ativo" ${e.status === "ativo" ? "selected" : ""}>Ativo</option><option value="inativo" ${e.status === "inativo" ? "selected" : ""}>Inativo</option></select></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("estabelecimentos/salvar", {
          id: e.id, nome: g("nome"), tipo: g("tipo"), cep: g("cep"), logradouro: g("logradouro"),
          numero: g("numero"), complemento: g("complemento"), bairro: g("bairro"),
          cidade: g("cidade"), uf: g("uf"), horario: g("horario"), metaPadrao: g("metaPadrao"), status: g("status"),
        }, "Casa atualizada.");
        return Boolean(data);
      });
      return;
    }
    if (act === "est-status") {
      const e = Store.find("estabelecimentos", id);
      if (!e) return;
      const prox = e.status === "ativo" ? "inativo" : "ativo";
      if (prox === "inativo" && !confirm(`Desativar ${e.nome}? A casa some do app do cliente.`)) return;
      await this.post("estabelecimentos/status", { id, status: prox }, prox === "ativo" ? "Casa reativada." : "Casa desativada.");
      return;
    }
    if (act === "cli-criar") {
      const data = await this.post("clientes", {
        nome: this.val("#nc-nome"),
        email: this.val("#nc-email"),
        senha: this.val("#nc-senha"),
        telefone: this.val("#nc-tel"),
        bairro: this.val("#nc-bairro"),
        nascimento: this.val("#nc-nasc"),
        cidade: Store.data?.meta?.cidade,
      }, "Cliente cadastrado.");
      if (data) {
        this.novo.cli = false;
        this.render();
      }
      return;
    }
    if (act === "cli-editar") {
      const c = Store.find("clientes", id);
      if (!c) return;
      const bebs = Store.all("bebidas").map((b) => `<option value="${b.id}" ${b.id === c.bebidaFavoritaId ? "selected" : ""}>${this.esc(b.nome)}</option>`).join("");
      this.modalForm("Editar cliente", `
        <div class="field"><span>Nome</span><input name="nome" value="${this.esc(c.nome)}"/></div>
        <div class="field"><span>E-mail</span><input name="email" type="email" value="${this.esc(c.email || "")}"/></div>
        <div class="field"><span>Nova senha</span><input name="senha" type="password" placeholder="Vazio = manter"/></div>
        <div class="field"><span>Telefone</span><input name="telefone" value="${this.esc(c.telefone || "")}"/></div>
        <div class="field"><span>Bairro</span><input name="bairro" value="${this.esc(c.bairro || "")}"/></div>
        <div class="field"><span>Cidade</span><input name="cidade" value="${this.esc(c.cidade || "")}"/></div>
        <div class="field"><span>Nascimento</span><input name="nascimento" type="date" value="${this.nascIso(c.nascimento)}"/></div>
        <div class="field"><span>Bebida favorita</span><select name="bebidaFavoritaId"><option value="">—</option>${bebs}</select></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("clientes/salvar", {
          id: c.id, nome: g("nome"), email: g("email"), senha: g("senha"), telefone: g("telefone"),
          bairro: g("bairro"), nascimento: g("nascimento"), bebidaFavoritaId: g("bebidaFavoritaId"),
          cidade: g("cidade") || c.cidade,
        }, "Cliente atualizado.");
        return Boolean(data);
      });
      return;
    }
    if (act === "cli-status") {
      const c = Store.find("clientes", id);
      if (!c) return;
      const prox = c.status === "ativo" ? "inativo" : "ativo";
      if (prox === "inativo" && !confirm(`Desativar o acesso de ${c.nome}?`)) return;
      await this.post("clientes/status", { id, status: prox }, prox === "ativo" ? "Cliente reativado." : "Cliente desativado.");
      return;
    }
    if (act === "fun-criar") {
      const data = await this.post("funcionarios", {
        nome: this.val("#nf-nome"),
        email: this.val("#nf-email"),
        senha: this.val("#nf-senha"),
        cargo: this.val("#nf-cargo") || "Garçom",
        estabelecimentoId: this.val("#nf-est"),
      }, "Funcionário cadastrado.");
      if (data) {
        this.novo.fun = false;
        this.render();
      }
      return;
    }
    if (act === "fun-editar") {
      const f = Store.find("funcionarios", id);
      if (!f) return;
      const casas = Store.all("estabelecimentos");
      this.modalForm("Editar funcionário", `
        <div class="field"><span>Nome</span><input name="nome" value="${this.esc(f.nome)}"/></div>
        <div class="field"><span>E-mail</span><input name="email" type="email" value="${this.esc(f.email || "")}"/></div>
        <div class="field"><span>Cargo</span><input name="cargo" value="${this.esc(f.cargo || "")}"/></div>
        <div class="field"><span>Casa</span><select name="estabelecimentoId">${casas.map((e) => `<option value="${e.id}" ${e.id === f.estabelecimentoId ? "selected" : ""}>${this.esc(e.nome)}</option>`).join("")}</select></div>
        <div class="field"><span>Status</span><select name="status"><option value="ativo" ${f.status === "ativo" ? "selected" : ""}>Ativo</option><option value="inativo" ${f.status === "inativo" ? "selected" : ""}>Inativo</option></select></div>
        <div class="field"><span>Nova senha</span><input name="senha" type="password" placeholder="Vazio = manter"/></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("funcionarios/salvar", {
          id: f.id, nome: g("nome"), email: g("email"), cargo: g("cargo"),
          estabelecimentoId: g("estabelecimentoId"), status: g("status"), senha: g("senha"),
        }, "Funcionário atualizado.");
        return Boolean(data);
      });
      return;
    }
    if (act === "fun-status") {
      const f = Store.find("funcionarios", id);
      if (!f) return;
      const prox = f.status === "ativo" ? "inativo" : "ativo";
      if (prox === "inativo" && !confirm(`Desativar ${f.nome}?`)) return;
      await this.post("funcionarios/status", { id, status: prox }, prox === "ativo" ? "Reativado." : "Desativado.");
      return;
    }
    if (act === "par-criar") {
      const data = await this.post("parceiros", {
        nome: this.val("#np-nome"),
        email: this.val("#np-email"),
        senha: this.val("#np-senha"),
        categoria: this.val("#np-cat"),
        selo: this.val("#np-selo"),
      }, "Parceiro cadastrado.");
      if (data) {
        this.novo.par = false;
        this.render();
      }
      return;
    }
    if (act === "par-bebs") {
      const bebidaIds = [...(this.root.querySelectorAll("#par-bebs input:checked") || [])].map((x) => x.value);
      await this.post("parceiros/bebidas", { id, bebidaIds }, "Bebidas do parceiro salvas.");
      return;
    }
    if (act === "par-editar") {
      const p = Store.find("parceiros", id);
      if (!p) return;
      this.modalForm("Editar parceiro", `
        <div class="field"><span>Nome</span><input name="nome" value="${this.esc(p.nome)}"/></div>
        <div class="field"><span>Categoria</span><input name="categoria" value="${this.esc(p.categoria || "")}"/></div>
        <div class="field"><span>Selo</span><input name="selo" value="${this.esc(p.selo || "")}"/></div>
        <div class="field"><span>E-mail</span><input name="email" type="email" value="${this.esc(p.email || "")}"/></div>
        <div class="field"><span>Nova senha</span><input name="senha" type="password"/></div>
        <div class="field"><span>Status</span><select name="status"><option value="ativo" ${p.status === "ativo" ? "selected" : ""}>Ativo</option><option value="inativo" ${p.status === "inativo" ? "selected" : ""}>Inativo</option></select></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("parceiros/salvar", {
          id: p.id, nome: g("nome"), categoria: g("categoria"), selo: g("selo"), email: g("email"), senha: g("senha"), status: g("status"),
        }, "Parceiro atualizado.");
        return Boolean(data);
      });
      return;
    }
    if (act === "par-status") {
      const p = Store.find("parceiros", id);
      if (!p) return;
      const prox = p.status === "ativo" ? "inativo" : "ativo";
      if (prox === "inativo" && !confirm(`Desativar ${p.nome}?`)) return;
      await this.post("parceiros/status", { id, status: prox }, prox === "ativo" ? "Reativado." : "Desativado.");
      return;
    }
    if (act === "beb-criar") {
      const data = await this.post("bebidas/rede", { nome: this.val("#nb-nome"), tipo: this.val("#nb-tipo"), marca: this.val("#nb-marca") }, "Bebida cadastrada.");
      if (data) {
        this.novo.beb = false;
        this.render();
      }
      return;
    }
    if (act === "beb-editar") {
      const b = Store.find("bebidas", id);
      if (!b) return;
      this.modalForm("Editar bebida", `
        <div class="field"><span>Nome</span><input name="nome" value="${this.esc(b.nome)}"/></div>
        <div class="field"><span>Tipo</span><select name="tipo">${["cerveja", "nao-alcoolico", "destilado", "outros"].map((t) => `<option value="${t}" ${b.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><span>Marca</span><input name="marca" value="${this.esc(b.marca || "")}"/></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("bebidas/salvar", { id: b.id, nome: g("nome"), tipo: g("tipo"), marca: g("marca") }, "Bebida atualizada.");
        return Boolean(data);
      });
      return;
    }
    if (act === "beb-excluir") {
      const b = Store.find("bebidas", id);
      if (!b || !confirm(`Excluir ${b.nome}? Só funciona se ainda não tiver movimento.`)) return;
      await this.post("bebidas/excluir", { id }, "Bebida excluída.");
      return;
    }
    if (act === "cam-criar") {
      const ests = this.estsMarcadas("#cam-ests");
      const data = await this.post("campanhas", {
        titulo: this.val("#cam-titulo"),
        tipo: this.val("#cam-tipo"),
        publico: this.val("#cam-pub"),
        parceiroId: this.val("#cam-par"),
        bebidaId: this.val("#cam-beb"),
        metaTampas: this.val("#cam-meta") || null,
        alteraMeta: Boolean(this.val("#cam-meta")),
        periodoInicio: this.val("#cam-ini"),
        periodoFim: this.val("#cam-fim"),
        canal: this.val("#cam-canal"),
        mensagem: this.val("#cam-msg"),
        estabelecimentoId: ests[0] || "",
        estabelecimentos: ests,
      }, "Campanha criada. Valide em Disparos.");
      if (data) {
        this.novo.cam = false;
        this.camPrefill = null;
        this.render();
      }
      return;
    }
    if (act === "cam-editar") {
      const c = Store.find("campanhas", id);
      if (!c) return;
      if (c.disparada) {
        UI.toast("Campanha já disparada. Encerre para parar; não edita depois do envio.");
        return;
      }
      const casas = Store.all("estabelecimentos").filter((e) => e.status === "ativo");
      const pars = Store.all("parceiros").filter((p) => p.status === "ativo");
      const bebs = Store.all("bebidas");
      const marcadas = new Set(c.estabelecimentos || []);
      this.modalForm("Editar campanha", `
        <div class="field"><span>Título</span><input name="titulo" value="${this.esc(c.titulo)}"/></div>
        <div class="field"><span>Tipo</span><select name="tipo">${[["comparecer", "Comparecer"], ["aniversario", "Aniversário"], ["tampas", "Tampas reduzidas"], ["chamar", "Chamar de volta"]].map(([v, l]) => `<option value="${v}" ${c.tipo === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field"><span>Público</span><select name="publico">${[["todos", "Quem frequenta"], ["aniversario", "Aniversariantes"], ["inativos", "Inativos"], ["quase", "Quase Saideira"]].map(([v, l]) => `<option value="${v}" ${c.publico === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field"><span>Bebida</span><select name="bebidaId"><option value="">—</option>${bebs.map((b) => `<option value="${b.id}" ${b.id === c.bebidaId ? "selected" : ""}>${this.esc(b.nome)}</option>`).join("")}</select></div>
        <div class="field"><span>Parceiro</span><select name="parceiroId"><option value="">Rede / casa</option>${pars.map((p) => `<option value="${p.id}" ${p.id === c.parceiroId ? "selected" : ""}>${this.esc(p.nome)}</option>`).join("")}</select></div>
        <div class="field"><span>Meta de Tampas</span><input name="metaTampas" type="number" min="1" value="${c.metaTampas || ""}"/></div>
        <div class="field"><span>Início</span><input name="periodoInicio" type="date" value="${this.nascIso(c.periodoInicio)}"/></div>
        <div class="field"><span>Fim</span><input name="periodoFim" type="date" value="${this.nascIso(c.periodoFim)}"/></div>
        <div class="field"><span>Canal</span><select name="canal">${["push", "email", "whatsapp"].map((x) => `<option value="${x}" ${c.canal === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field" style="grid-column:1/-1"><span>Mensagem</span><textarea name="mensagem" rows="3">${this.esc(c.mensagem || "")}</textarea></div>
        <div class="field" style="grid-column:1/-1"><span>Casas</span><div class="check-list" id="ed-cam-ests">${casas.map((e) => `<label><input type="checkbox" value="${e.id}" ${marcadas.has(e.id) ? "checked" : ""}/> ${this.esc(e.nome)}</label>`).join("")}</div></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const ests = [...box.querySelectorAll("#ed-cam-ests input:checked")].map((x) => x.value);
        const data = await this.post("campanhas/salvar", {
          id: c.id,
          titulo: g("titulo"),
          tipo: g("tipo"),
          publico: g("publico"),
          bebidaId: g("bebidaId"),
          parceiroId: g("parceiroId"),
          metaTampas: g("metaTampas") || null,
          alteraMeta: Boolean(g("metaTampas")),
          periodoInicio: g("periodoInicio"),
          periodoFim: g("periodoFim"),
          canal: g("canal"),
          mensagem: g("mensagem"),
          estabelecimentos: ests,
        }, "Campanha atualizada.");
        return Boolean(data);
      });
      return;
    }
    if (act === "aud-usar") {
      this.camPrefill = { estabelecimentos: [...this.aud.ests], bebidaId: this.aud.bebidaId };
      this.novo.cam = true;
      location.hash = "#/campanhas";
      if (this.view === "campanhas") this.render();
      return;
    }
    if (act === "cam-ativar" || act === "cam-disparar") {
      const camId = id || this.root.querySelector("#cam-disp")?.value;
      const cam = Store.find("campanhas", camId);
      if (!cam) {
        UI.toast("Nenhuma campanha para ativar.");
        return;
      }
      if (!confirm(`Disparar “${cam.titulo}”? Os clientes do público recebem a notificação.`)) return;
      const canal = this.dispCanal || this.aud.canal || cam.canal || "push";
      const data = await this.post("campanhas/ativar", { id: cam.id, canal }, null);
      if (data) {
        UI.modal({
          center: true,
          html: `${UI.celebrate("Disparo enviado", `${data.enviados ?? 0} cliente(s) receberam a campanha no app.`)}
            <button class="btn btn-gold btn-block" style="margin-top:14px" data-close-modal>Fechar</button>`,
        });
      }
      return;
    }
    if (act === "cam-rejeitar") {
      if (!confirm("Recusar esta campanha?")) return;
      await this.post("campanhas/rejeitar", { id }, "Campanha recusada.");
      return;
    }
    if (act === "cam-encerrar") {
      if (!confirm("Encerrar esta campanha?")) return;
      await this.post("campanhas/encerrar", { id }, "Campanha encerrada.");
      return;
    }
    if (act === "cam-excluir") {
      if (!confirm("Excluir esta campanha pendente?")) return;
      await this.post("campanhas/excluir", { id }, "Campanha excluída.");
      return;
    }
    if (act === "sai-expirar") {
      if (!confirm("Marcar esta Saideira como expirada?")) return;
      await this.post("saideras/expirar", { id }, "Saideira expirada.");
      return;
    }
    if (act === "sai-prorrogar") {
      const dias = prompt("Prorrogar por quantos dias?", "15");
      if (dias == null) return;
      await this.post("saideras/prorrogar", { id, dias: Number(dias) || 15 }, "Validade prorrogada.");
      return;
    }
    if (act === "sai-restaurar") {
      if (!confirm("Devolver esta Saideira como disponível?")) return;
      await this.post("saideras/restaurar", { id }, "Saideira restaurada.");
      return;
    }
    if (act === "sai-entregar") {
      if (!confirm("Marcar como entregue ao cliente?")) return;
      await this.post("saideras/entregar-admin", { id }, "Saideira marcada como entregue.");
      return;
    }
    if (act === "sai-conceder") {
      const c = Store.find("clientes", id);
      if (!c) return;
      const o = this.optsCasaBebida(c);
      this.modalForm("Conceder Saideira", `
        <div class="field"><span>Cliente</span><input value="${this.esc(c.nome)}" disabled/></div>
        <div class="field"><span>Casa</span><select name="estabelecimentoId">${o.casas}</select></div>
        <div class="field"><span>Bebida</span><select name="bebidaId">${o.bebs || "<option value=''>Cadastre uma bebida</option>"}</select></div>
      `, async (box) => {
        const data = await this.post("saideras/conceder", {
          clienteId: c.id,
          estabelecimentoId: box.querySelector("[name=estabelecimentoId]")?.value,
          bebidaId: box.querySelector("[name=bebidaId]")?.value,
        }, "Saideira creditada. O cliente vê no app.");
        return Boolean(data);
      });
      return;
    }
    if (act === "tam-ajustar" || act === "tam-ajustar-cli") {
      const t = act === "tam-ajustar" ? Store.find("tampas", id) : null;
      const c = Logic.cliente(t?.clienteId || id);
      if (!c) return;
      const o = this.optsCasaBebida(c, t?.estabelecimentoId, t?.bebidaId);
      this.modalForm("Ajustar Tampas", `
        <div class="field"><span>Cliente</span><input value="${this.esc(c.nome)}" disabled/></div>
        <div class="field"><span>Casa</span><select name="estabelecimentoId">${o.casas}</select></div>
        <div class="field"><span>Bebida</span><select name="bebidaId">${o.bebs}</select></div>
        <div class="field"><span>Deixar o progresso em</span><input name="atual" type="number" min="0" value="${t ? t.atual : 0}"/></div>
        <div class="field"><span>Ou somar Tampas agora</span><input name="quantidade" type="number" min="0" placeholder="0 = só ajustar o número"/></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const qtd = Number(g("quantidade")) || 0;
        const data = await this.post("tampas/ajustar", {
          clienteId: c.id,
          estabelecimentoId: g("estabelecimentoId"),
          bebidaId: g("bebidaId"),
          atual: g("atual"),
          quantidade: qtd || undefined,
        }, qtd ? "Tampas adicionadas." : "Progresso ajustado.");
        return Boolean(data);
      });
      return;
    }
    if (act === "cli-aviso") {
      const c = Store.find("clientes", id);
      if (!c) return;
      this.modalForm("Aviso no app", `
        <div class="field"><span>Cliente</span><input value="${this.esc(c.nome)}" disabled/></div>
        <div class="field"><span>Título</span><input name="titulo" placeholder="Ex.: Seu QR foi atualizado"/></div>
        <div class="field"><span>Texto</span><textarea name="texto" rows="3"></textarea></div>
      `, async (box) => {
        const data = await this.post("notificacoes/enviar", {
          clienteId: c.id,
          titulo: box.querySelector("[name=titulo]")?.value,
          texto: box.querySelector("[name=texto]")?.value,
        }, "Aviso enviado ao app do cliente.");
        return Boolean(data);
      });
      return;
    }
    if (act === "cli-qr") {
      const c = Store.find("clientes", id);
      if (!c) return;
      if (!confirm(`Gerar um novo código QR para ${c.nome}? O anterior (${c.codigo}) deixa de valer.`)) return;
      await this.post("clientes/codigo-reset", { id }, "Novo código gerado. Peça para o cliente abrir o app.");
      return;
    }
    if (act === "tkt-cancelar") {
      if (!confirm("Cancelar este cupom? Ele não poderá mais ser lido.")) return;
      await this.post("tickets/cancelar", { id }, "Cupom cancelado.");
      return;
    }
    if (act === "casa-promo") {
      await this.post("estabelecimentos/midia", { id, promocao: this.val("#casa-promo") }, "Promoção atualizada.");
      return;
    }
    if (act === "casa-cartaz") {
      this.root.querySelector("#casa-cartaz-file")?.click();
      return;
    }
    if (act === "casa-cartaz-reset") {
      if (!confirm("Voltar à imagem padrão no app do cliente?")) return;
      await this.post("estabelecimentos/midia", { id, campo: "cartaz", dataUrl: "" }, "Cartaz removido.");
      return;
    }
    if (act === "casa-beb-on") {
      const bebidaId = this.val("#casa-beb-nova");
      if (!bebidaId) {
        UI.toast("Escolha uma bebida.");
        return;
      }
      await this.post("estabelecimentos/bebida", {
        estabelecimentoId: id,
        bebidaId,
        meta: this.val("#casa-beb-meta") || null,
      }, "Bebida incluída no cardápio.");
      return;
    }
    if (act === "casa-beb-off") {
      const beb = el?.getAttribute("data-beb");
      if (!beb || !confirm("Tirar esta bebida do cardápio da casa?")) return;
      await this.post("estabelecimentos/bebida-remover", { estabelecimentoId: id, bebidaId: beb }, "Bebida removida do cardápio.");
      return;
    }
    if (act === "cfg-salvar") {
      await this.post("config", {
        cidade: this.val("#cfg-cidade"),
        metaPadraoRede: this.val("#cfg-meta-rede"),
        validadeSaideraDias: this.val("#cfg-validade"),
        suporteWhatsapp: this.val("#cfg-whats"),
        suporteEmail: this.val("#cfg-email"),
        msgPlanoBloqueado: this.val("#cfg-pln-msg"),
        pixChave: this.val("#cfg-pix-chave"),
        pixNome: this.val("#cfg-pix-nome"),
        pixCidade: this.val("#cfg-pix-cidade"),
        novaSenha: this.val("#cfg-senha"),
      }, "Configurações salvas.");
    }
  },
};

window.AdminApp = AdminApp;
document.addEventListener("DOMContentLoaded", () => AdminApp.boot());
