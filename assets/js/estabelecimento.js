const EstApp = {
  root: null,
  view: "dashboard",
  params: {},
  estId: null,
  qty: 1,
  drinkId: null,
  clienteSel: null,
  ticketQtys: null,
  ticketGeradoId: null,
  campForm: { tipo: null, publico: "todos", mensagem: "", meta: 6, bebidaId: null, canal: "push" },
  volta: { qtd: 10, ids: [], mensagem: "" },
  cliPage: 1,
  cliPerPage: 10,
  cliQuery: "",
  cliFiltro: "",
  saiFiltro: "",
  saiQ: "",
  tktFiltro: "",
  funNovo: false,
  bebQ: "",
  dashDia: "",
  dashFaixa: 7,

  async boot() {
    const ok = await Store.init({ papel: "estabelecimento" });
    if (!ok) return;
    this.estId = Store.demo().estabelecimentoId;
    UI.bindGlobal();
    this.root = document.getElementById("app");
    this.syncDrink();
    this.root.addEventListener("click", (e) => this.onClick(e));
    Store.on(() => this.render());
    Store.startLive();
    window.addEventListener("hashchange", () => this.route());
    this.route();
  },

  est() {
    return Logic.est(this.estId);
  },

  syncDrink() {
    const id = Logic.primeiraBebida(this.est())?.id || null;
    const drinks = this.est()?.bebidas || [];
    if (!this.drinkId || !drinks.some((d) => d.id === this.drinkId)) this.drinkId = id;
    if (!this.campForm.bebidaId || !drinks.some((d) => d.id === this.campForm.bebidaId)) this.campForm.bebidaId = id;
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
    this.campForm.bebidaId = Logic.primeiraBebida(this.est())?.id || null;
  },

  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  },

  avatar(src) {
    if (!src) return Brand.src("icon-192.png");
    return Logic.midiaUrl(src);
  },

  n(v) {
    return Number(v || 0).toLocaleString("pt-BR");
  },

  saiStatusLab(s) {
    return { disponivel: "Disponível", utilizada: "Entregue", expirada: "Expirada" }[s?.status] || s?.status || "—";
  },

  saiFicha(s) {
    const c = Logic.cliente(s?.clienteId);
    const b = Logic.bebida(s?.bebidaId);
    return `<div class="sai-ficha">
      <img src="${this.avatar(c?.avatar)}" alt=""/>
      <div>
        <strong>${this.esc(c?.nome || "Cliente")}</strong>
        <p class="sai-ficha-id">${this.esc(s?.codigo || "—")}</p>
        <p class="tiny muted">${this.esc(b?.nome || "Bebida")} · ${this.esc(Logic.validadeLabel(s))}</p>
      </div>
    </div>`;
  },

  atualizarSaiPreview() {
    const box = this.root?.querySelector("#sai-preview");
    if (!box) return;
    const raw = this.root.querySelector("#sai-codigo")?.value || "";
    if (!String(raw).trim()) {
      box.innerHTML = `<p class="tiny muted">Digite o ID. Vamos mostrar quem é e qual bebida antes de baixar.</p>`;
      return;
    }
    const d = window.QR?.decode ? QR.decode(raw) : { tipo: "sdr", codigo: raw };
    if (d.tipo === "ticket") {
      box.innerHTML = `<p class="notice">Este é o cupom da casa (TKT-…). O cliente lê no app. A Saideira tem outro ID.</p>`;
      return;
    }
    const s = Logic.saideraPorCodigo(raw, this.estId);
    if (s) {
      const aviso =
        s.status === "disponivel"
          ? `<p class="tiny gold" style="margin-top:8px">Encontrada e disponível. Confira e confirme a entrega.</p>`
          : s.status === "utilizada"
            ? `<p class="notice" style="margin-top:8px">Esta Saideira já foi entregue. Não dá para baixar de novo.</p>`
            : `<p class="notice" style="margin-top:8px">Esta Saideira expirou e não pode ser entregue.</p>`;
      box.innerHTML = `${this.saiFicha(s)}${aviso}`;
      return;
    }
    const c = Logic.clientePorCodigo(d.codigo);
    if (c) {
      box.innerHTML = `<p class="notice">Isso é o ID do cliente <strong>${this.esc(c.nome)}</strong>, não da Saideira. Peça no app dele o código da bebida grátis.</p>`;
      return;
    }
    box.innerHTML = `<p class="tiny muted">Nenhuma Saideira com este ID nesta casa.</p>`;
  },

  pedirConfirmacaoSaidera(s) {
    if (!s) {
      UI.toast("Saideira não encontrada nesta casa.");
      return;
    }
    if (s.status !== "disponivel") {
      UI.modal({
        center: true,
        html: `<h2>Não dá para entregar</h2>
          <p class="muted" style="margin:8px 0 14px">${s.status === "utilizada" ? "Esta Saideira já foi baixada." : "Esta Saideira expirou."}</p>
          ${this.saiFicha(s)}
          <button type="button" class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Ok</button>`,
      });
      return;
    }
    const c = Logic.cliente(s.clienteId);
    const b = Logic.bebida(s.bebidaId);
    const m = UI.modal({
      center: true,
      html: `<h2>Confirmar entrega</h2>
        <p class="muted" style="margin:8px 0 14px">A bebida vai para a mesa agora? Depois de confirmar, este ID acaba e não volta.</p>
        ${this.saiFicha(s)}
        <ul class="sai-check">
          <li>Cliente <strong>${this.esc(c?.nome || "—")}</strong></li>
          <li>Bebida <strong>${this.esc(b?.nome || "—")}</strong></li>
          <li>ID <strong>${this.esc(s.codigo)}</strong></li>
          <li>${this.esc(Logic.validadeLabel(s))}</li>
        </ul>
        <div class="row" style="margin-top:18px;gap:8px">
          <button type="button" class="btn btn-ghost grow" data-close-modal>Ainda não</button>
          <button type="button" class="btn btn-gold grow" id="sai-confirmar-ok">Sim, entregar</button>
        </div>`,
    });
    m.el.querySelector("#sai-confirmar-ok")?.addEventListener("click", async () => {
      const btn = m.el.querySelector("#sai-confirmar-ok");
      if (btn) btn.disabled = true;
      const res = await Logic.entregarSaidera(s.id);
      m.close();
      if (!res) {
        UI.toast("Não foi possível entregar. Confira se ainda está disponível.");
        return;
      }
      this.mostrarSaideraEntregue(res);
    });
  },

  mostrarSaideraEntregue(s) {
    const c = Logic.cliente(s.clienteId);
    const b = Logic.bebida(s.bebidaId);
    UI.modal({
      center: true,
      html: `${UI.celebrate("Saideira entregue", `${this.esc(b?.nome || "Bebida")} · ${this.esc(s.codigo)}`)}
        <p class="sai-ok-txt">Baixada para <strong>${this.esc(c?.nome || "o cliente")}</strong>. Pode servir a bebida. Este ID não vale mais.</p>
        <button type="button" class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Ok</button>`,
    });
  },

  isoOffset(n) {
    const d = Logic.hoje();
    d.setDate(d.getDate() + n);
    return Logic.diaIso(d);
  },

  isoSemana(wd) {
    const d = Logic.hoje();
    const diff = (d.getDay() - Number(wd) + 7) % 7;
    d.setDate(d.getDate() - diff);
    return Logic.diaIso(d);
  },

  telaBloqueada() {
    return !Logic.casaPode(this.est(), this.view);
  },

  envolverBloqueio(html) {
    if (!this.telaBloqueada()) return html;
    return `<div class="plano-lock" data-plano-lock>
      <div class="plano-lock-body">${html}</div>
      <div class="plano-lock-veil">
        <div class="plano-lock-mark">
          ${Brand.simbolo(96)}
          <p class="plano-lock-msg">${this.esc(Logic.msgPlanoBloqueado())}</p>
        </div>
      </div>
    </div>`;
  },

  badgeFreq(f) {
    const lab = Logic.freqLabel(f);
    return `<span class="badge freq-${f || "baixa"}">${this.esc(lab)}</span>`;
  },

  donutFreq(freq) {
    return UI.donut(
      [
        { nome: "Vem sempre", n: freq.alta || 0, cor: "#F5B800", filtro: "alta" },
        { nome: "Regular", n: freq.media || 0, cor: "#1B3A5F", filtro: "media" },
        { nome: "Pouca frequência", n: freq.baixa || 0, cor: "#C4A35A", filtro: "baixa" },
        { nome: "Sumiu (30 dias)", n: freq.fria || 0, cor: "#8B1E3F", filtro: "fria" },
      ],
      "clientes"
    );
  },

  chips(key, pares) {
    const cur = this[key] || "";
    return `<div class="chips">${pares.map(([v, lab]) => `<button type="button" class="chip ${cur === v ? "on" : ""}" data-filtro="${key}" data-val="${this.esc(v)}">${this.esc(lab)}</button>`).join("")}</div>`;
  },

  async post(path, body, msg) {
    try {
      const data = await API.post(path, body);
      Store.aplicarResposta(data);
      if (msg) UI.toast(msg);
      return data;
    } catch (e) {
      UI.toast(e.message);
      return null;
    }
  },

  val(sel) {
    return this.root.querySelector(sel)?.value?.trim() || "";
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
    this.syncDrink();
    const map = {
      dashboard: () => this.dashboard(),
      clientes: () => this.clientes(),
      cliente: () => this.perfilCliente(),
      registrar: () => this.registrar(),
      atender: () => this.atender(),
      bebidas: () => this.bebidas(),
      saideras: () => this.saideras(),
      funcionarios: () => this.funcionarios(),
      inteligencia: () => this.inteligencia(),
      chamar: () => this.chamar(),
      campanhas: () => this.campanhas(),
      config: () => this.config(),
      planos: () => this.planos(),
    };
    const html = this.envolverBloqueio((map[this.view] || map.dashboard)());
    this.root.innerHTML = `<div class="dash-app">
      <div class="sidebar-scrim" data-close-menu></div>
      ${this.sidebar()}
      <main class="dash-main">
        <div class="dash-head">
          <div class="row">
            <button class="icon-btn menu-btn" data-menu>${Icons.menu()}</button>
            <div>
      <p class="tiny muted">Estabelecimento</p>
              <h1 id="view-title"></h1>
            </div>
          </div>
          <div class="row">
            <div class="search wide search">${Icons.search()}<input placeholder="Buscar cliente" data-jump-search value="${this.view === "clientes" ? this.cliQuery.replace(/"/g, "&quot;") : ""}"/></div>
            <a class="btn btn-dark btn-sm" href="#/atender">QR do cliente</a>
            <a class="btn btn-gold btn-sm" href="#/registrar">Gerar QR</a>
          </div>
        </div>
        ${html}
      </main>
    </div>`;
    const titles = {
      dashboard: "Visão geral",
      clientes: "Clientes",
      cliente: this.params.id ? Logic.cliente(this.params.id)?.nome : "Cliente",
      registrar: "Gerar QR das Tampas",
      atender: "QR do cliente",
      bebidas: "Bebidas",
      saideras: "Saideiras",
      funcionarios: "Funcionários",
      inteligencia: "Conheça seus clientes",
      chamar: "Chamar de volta",
      campanhas: "Campanhas",
      config: "Configurações",
      planos: "Planos",
    };
    const t = this.root.querySelector("#view-title");
    if (t) t.textContent = titles[this.view] || "Painel";
    this.bind();
  },

  sidebar() {
    const items = [
      ["dashboard", "Visão Geral", Icons.home()],
      ["clientes", "Clientes", Icons.users()],
      ["registrar", "Gerar QR", Icons.qr()],
      ["atender", "QR do cliente", Icons.user()],
      ["bebidas", "Bebidas", Icons.beer()],
      ["saideras", "Saideiras", Icons.gift()],
      ["funcionarios", "Funcionários", Icons.user()],
      ["inteligencia", "Conheça seus clientes", Icons.spark()],
      ["campanhas", "Campanhas", Icons.megaphone()],
      ["planos", "Planos", Icons.shield()],
      ["config", "Configurações", Icons.settings()],
    ];
    const plano = Logic.planoDaCasa(this.est());
    return `<aside class="sidebar" id="sidebar">
      ${Brand.sideHead(this.est().nome)}
      <nav>${items
        .map(([id, l, ic]) => {
          const on = this.view === id || (id === "inteligencia" && this.view === "chamar");
          const locked = !Logic.casaPode(this.est(), id);
          return `<a class="${on ? "on" : ""}${locked ? " locked" : ""}" href="#/${id}">${ic}<span>${l}</span></a>`;
        })
        .join("")}</nav>
      <div class="side-foot">
        <p class="tiny muted">${this.esc(plano?.nome || "Sem plano")} · ${this.esc(Store.session?.email || this.est()?.nome || "")}</p>
        <a class="btn btn-ghost btn-sm btn-block" href="../index.php?sair=1">${Icons.logout()} Sair</a>
      </div>
    </aside>`;
  },

  dashboard() {
    const hoje = Logic.diaIso();
    if (!this.dashDia) this.dashDia = hoje;
    const ontem = this.isoOffset(-1);
    const r = Logic.resumoEst(this.estId);
    const painel = Logic.painelCasa(this.estId);
    const week = Logic.semanaTampas(this.estId, null, this.dashFaixa);
    const dia = Logic.resumoDiaCasa(this.estId, this.dashDia);
    const selWd = new Date(`${this.dashDia}T12:00:00`).getDay();
    const recent = this.recentes();
    const avisos = Logic.avisosDoEst(this.estId).slice(0, 5);
    const pend = Store.all("campanhas").filter(
      (c) => (c.estabelecimentoId === this.estId || (c.estabelecimentos || []).includes(this.estId)) && c.status === "solicitada"
    );
    const abertos = Store.all("tickets").filter((t) => t.estabelecimentoId === this.estId && Logic.ticketStatus(t) === "aberto");
    const kpis = [
      ["Clientes da casa", r.clientes, "#/clientes"],
      ["Vieram hoje", r.clientesHoje, "#/clientes"],
      ["Tampas hoje", r.tampasHoje, "#/registrar"],
      ["Saideiras disponíveis", r.saiderasDisp, "#/saideras"],
      ["Saideiras usadas", r.saiderasUsadas, "#/saideras"],
      ["Cupons abertos", r.ticketsAbertos, "#/registrar"],
      ["Quase na Saideira", r.quase, "#/inteligencia"],
      ["Sem voltar há 30 dias", r.inativos, "#/chamar"],
    ];
    const atalhos = [
      ["#/registrar", "btn-gold", "Gerar cupom QR"],
      ["#/atender", "btn-navy", "Ler QR do cliente"],
      ["#/saideras", "btn-ghost", "Baixar Saideira"],
      ["#/campanhas", "btn-ghost", "Pedir campanha"],
      ["#/config", "btn-ghost", "QR do app"],
    ];
    const pessoas = (dia.pessoas || [])
      .slice(0, 8)
      .map(
        (c) => `<a class="insight-card" href="#/cliente/${c.id}">
        <img src="${this.avatar(c.avatar)}" alt=""/>
        <div>
          <strong>${this.esc(c.nome)}</strong>
          <p class="tiny muted">${this.esc(c.favorita?.nome || "Sem favorita ainda")} · ${this.n(c.tampasPedidas)} tampas</p>
        </div>
      </a>`
      )
      .join("");
    return `${Brand.banner("secundario", "brand-banner")}
    ${atalhos.length ? `<div class="atalhos">${atalhos.map(([href, cls, lab]) => `<a class="btn ${cls} btn-sm" href="${href}">${lab}</a>`).join("")}</div>` : ""}
    <div class="dash-toolbar">
      <div class="chips">
        <button type="button" class="chip ${this.dashDia === hoje ? "on" : ""}" data-dash-dia="${hoje}">Hoje</button>
        <button type="button" class="chip ${this.dashDia === ontem ? "on" : ""}" data-dash-dia="${ontem}">Ontem</button>
        <button type="button" class="chip ${this.dashFaixa === 7 ? "on" : ""}" data-dash-faixa="7">7 dias</button>
        <button type="button" class="chip ${this.dashFaixa === 14 ? "on" : ""}" data-dash-faixa="14">14 dias</button>
        <button type="button" class="chip ${this.dashFaixa === 30 ? "on" : ""}" data-dash-faixa="30">30 dias</button>
      </div>
      <label class="dash-dia-pick">
        <span>Escolher o dia</span>
        <input type="date" id="dash-dia-inp" value="${this.esc(this.dashDia)}" max="${hoje}"/>
      </label>
    </div>
    ${pend.length ? `<p class="notice" style="margin-bottom:14px">${pend.length} campanha(s) sua(s) aguardando o admin. <a href="#/campanhas" style="color:#F5B800">Ver</a></p>` : ""}
    ${
      avisos.length
        ? `<section class="panel" style="margin-bottom:16px">
      <h3>Ofertas de parceiros</h3>
      ${avisos
        .map(
          (a) =>
            `<div style="padding:12px 0;border-bottom:1px solid #2a2a2a">
              <strong>${this.esc(a.titulo)}</strong>
              <p class="small muted" style="margin-top:4px">${this.esc(a.texto)}</p>
            </div>`
        )
        .join("")}
      <a class="gold small" href="#/campanhas" style="display:inline-block;margin-top:10px">Ver em Campanhas</a>
    </section>`
        : ""
    }<div class="kpis">${kpis.map(([l, v, href]) => `<a class="kpi kpi-go" href="${href}"><span>${l}</span><b>${this.n(v)}</b></a>`).join("")}</div>
    <section class="panel dash-dia-panel" style="margin-bottom:16px">
      <div class="row between" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3>Como foi · ${this.esc(dia.label)}${dia.eHoje ? " (hoje)" : ""}</h3>
        <p class="tiny muted">Clique no gráfico, no dia da semana ou escolha a data.</p>
      </div>
      <div class="kpis kpis-dia">${[
        ["Vieram", dia.clientes],
        ["Tampas", dia.tampas],
        ["Saideiras ganhas", dia.saiderasGanhas],
        ["Saideiras entregues", dia.saiderasEntregues],
      ].map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${this.n(v)}</b></div>`).join("")}</div>
      ${
        dia.tampas || dia.clientes
          ? `${dia.drinks.length ? `<div style="margin-top:14px"><p class="tiny muted" style="margin-bottom:8px">O que saiu neste dia</p>${UI.rankBars(dia.drinks.slice(0, 5))}</div>` : ""}
          ${pessoas ? `<div class="grid-2" style="margin-top:14px">${pessoas}</div>` : ""}`
          : `<p class="muted empty-msg" style="margin-top:12px">Nesse dia não houve movimento registrado.</p>`
      }
    </section>
    <div class="grid-2" style="margin-bottom:16px">
      <section class="panel">
        <h3>Tampas nos últimos ${this.dashFaixa} dias</h3>
        ${
          week.values.some((v) => v)
            ? `${UI.lineChart(week.values, week.labels, week.keys)}
        <div class="dash-dias">${week.keys
          .map(
            (k, i) =>
              `<button type="button" class="dash-dia ${k === this.dashDia ? "on" : ""}" data-dash-dia="${k}"><b>${week.values[i]}</b><span>${this.esc(week.labels[i])}</span></button>`
          )
          .join("")}</div>`
            : `<p class="muted empty-msg">Ainda não há consumos neste período.</p>`
        }
      </section>
      <section class="panel">
        <h3>Quem frequenta</h3>
        <p class="tiny muted" style="margin-bottom:10px">Clique na fatia ou no nome para abrir esses clientes.</p>
        ${this.donutFreq(painel.freq)}
      </section>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <section class="panel">
        <h3>O que mais sai</h3>
        ${painel.ranking.length ? UI.rankBars(painel.ranking.slice(0, 5)) : `<p class="muted empty-msg">Nenhum pedido ainda.</p>`}
      </section>
      <section class="panel">
        <h3>O que menos sai</h3>
        ${painel.menosSai.length ? UI.rankBars(painel.menosSai) : `<p class="muted empty-msg">Ainda não há o que comparar.</p>`}
      </section>
    </div>
    <section class="panel" style="margin-bottom:16px">
      <h3>Movimento por dia da semana</h3>
      <p class="tiny muted" style="margin-bottom:10px">Clique num dia para abrir a última ocorrência daquele dia da semana.</p>
      ${
        painel.weekday.values.some((v) => v)
          ? UI.heatRow(painel.weekday.labels, painel.weekday.values, { clickable: true, selected: selWd })
          : `<p class="muted empty-msg">Sem tampas o bastante para ver o ritmo da semana.</p>`
      }
    </section>
    ${painel.topClientes.length ? `<section class="panel" style="margin-bottom:16px">
      <div class="row between" style="margin-bottom:12px"><h3>Quem mais pede aqui</h3><a class="gold small" href="#/clientes">Ver todos</a></div>
      <div class="grid-2">${painel.topClientes.map((c) => `<a class="insight-card" href="#/cliente/${c.id}">
        <img src="${this.avatar(c.avatar)}" alt=""/>
        <div>
          <strong>${this.esc(c.nome)}</strong>
          <p class="tiny muted">${this.esc(c.favorita?.nome || "Sem favorita ainda")} · ${this.n(c.tampasPedidas)} tampas · ${this.n(c.visitas)} visita${c.visitas === 1 ? "" : "s"}</p>
          ${this.badgeFreq(c.frequencia)}
        </div>
      </a>`).join("")}</div>
    </section>` : ""}
    ${abertos.length ? `<section class="panel" style="margin-bottom:16px"><div class="row between"><h3>Cupons QR abertos</h3><a class="gold small" href="#/registrar">Gerenciar</a></div>${abertos.slice(0, 5).map((t) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid #2a2a2a"><span>${this.esc(t.codigo)} · ${(t.itens || []).map((i) => i.quantidade + "× " + i.nome).join(", ")}</span><button class="btn btn-ghost btn-sm" data-ver-ticket="${t.id}">Imprimir</button></div>`).join("")}</section>` : ""}
    <section class="panel">
      <div class="row between" style="margin-bottom:12px"><h3>Clientes recentes</h3><a class="gold small" href="#/clientes">Ver lista</a></div>
      ${recent}
    </section>`;
  },

  recentes() {
    const list = Logic.clientesDoEst(this.estId)
      .map((c) => Logic.retratoCliente(c.id, this.estId))
      .filter(Boolean)
      .sort((a, b) => String(b.ultimaVisita || "").localeCompare(String(a.ultimaVisita || "")))
      .slice(0, 8);
    if (!list.length) return `<p class="muted">Ainda não há clientes nesta casa.</p>`;
    return list
      .map((c) => {
        const t = Store.all("tampas").find((x) => x.clienteId === c.id && x.estabelecimentoId === this.estId);
        const disp = Logic.saiderasDisponiveis(c.id, this.estId);
        const action = disp.length
          ? `<a class="btn btn-gold btn-sm" href="#/saideras">Baixar com o ID</a>`
          : `<a class="btn btn-dark btn-sm" href="#/cliente/${c.id}">Ver ficha</a>`;
        return `<div class="row between" style="padding:12px 0;border-top:1px solid #2a2a2a">
          <div class="person">
            <img src="${this.avatar(c.avatar)}" alt=""/>
            <div>
              <strong>${this.esc(c.nome)}</strong>
              <p class="small muted">${this.esc(c.favorita?.nome || "Sem favorita ainda")} · ${this.n(c.tampasPedidas)} tampas · ${this.n(c.visitas)} visita${c.visitas === 1 ? "" : "s"}${t ? ` · cartela ${t.atual}/${t.meta}` : ""}</p>
              <p class="tiny muted" style="margin-top:4px">${this.badgeFreq(c.frequencia)}${c.ultimaVisita ? ` · última ${this.esc(c.ultimaVisita)}` : ""}</p>
            </div>
          </div>
          <div class="row">
            ${disp.length ? `<span class="badge badge-green">Saideira disponível</span>` : ""}
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
    let list = Logic.clientesDoEst(this.estId);
    if (this.cliFiltro === "quase") {
      const ids = new Set(Logic.quaseSaideraEst(this.estId).map((t) => t.clienteId));
      list = list.filter((c) => ids.has(c.id));
    } else if (this.cliFiltro === "niver") list = list.filter((c) => Logic.ehAniversarianteMes(c));
    else if (this.cliFiltro === "inativo") list = Logic.inativosDoEst(this.estId);
    else if (this.cliFiltro === "saidera") {
      const ids = new Set(Store.all("saideras").filter((s) => s.estabelecimentoId === this.estId && s.status === "disponivel").map((s) => s.clienteId));
      list = list.filter((c) => ids.has(c.id));
    } else if (["alta", "media", "baixa", "fria"].includes(this.cliFiltro)) {
      list = list.filter((c) => Logic.retratoCliente(c.id, this.estId)?.frequencia === this.cliFiltro);
    }
    if (!q) return list;
    return list.filter((c) => [c.nome, c.codigo, c.email, c.telefone, c.primeiroNome].some((v) => (v || "").toLowerCase().includes(q)));
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
        const r = Logic.retratoCliente(c.id, this.estId) || {};
        const p = Store.all("tampas").find((t) => t.clienteId === c.id && t.estabelecimentoId === this.estId);
        const disp = r.saideras?.disp || 0;
        return `<tr data-href="#/cliente/${c.id}">
          <td><div class="person"><img src="${this.avatar(c.avatar)}" alt=""/><div><strong>${this.esc(c.nome)}</strong><p class="tiny muted">${this.esc(c.codigo)}</p></div></div></td>
          <td>${this.badgeFreq(r.frequencia)}</td>
          <td>${this.esc(r.favorita?.nome || "—")}</td>
          <td>${this.n(r.pedidos || 0)}</td>
          <td>${this.n(r.tampasPedidas || 0)} <p class="tiny muted">${this.n(r.visitas || 0)} visita${r.visitas === 1 ? "" : "s"}</p></td>
          <td>${p ? p.atual + "/" + p.meta : "—"}</td>
          <td>${this.n(r.saideras?.total || 0)}${disp ? `<p class="tiny muted">${disp} pronta${disp === 1 ? "" : "s"}</p>` : ""}</td>
          <td>${this.esc(c.ultimaVisita || "—")}${r.diasSem != null ? `<p class="tiny muted">${r.diasSem} dia${r.diasSem === 1 ? "" : "s"}</p>` : ""}</td>
        </tr>`;
      })
      .join("");
    const busca = this.cliQuery.trim()
      ? `${list.length} encontrado${list.length === 1 ? "" : "s"} para “${this.cliQuery.trim()}”`
      : `${from}–${to} de ${list.length} clientes com movimento nesta casa`;
    return `<section class="panel">
      ${this.chips("cliFiltro", [["", "Todos"], ["alta", "Vem sempre"], ["media", "Regular"], ["baixa", "Pouca frequência"], ["fria", "Sumiu"], ["quase", "Quase Saideira"], ["saidera", "Com Saideira"], ["niver", "Aniversário"], ["inativo", "Inativos"]])}
      <p class="muted small" style="margin:12px 0">${busca}</p>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Frequência</th><th>Favorita</th><th>Pedidos</th><th>Tampas pedidas</th><th>Cartela</th><th>Saideiras</th><th>Última visita</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="8" class="muted">${this.cliQuery.trim() ? "Nenhum cliente encontrado." : "Nenhum cliente nesta casa ainda."}</td></tr>`}</tbody>
      </table></div>
      ${this.pager(page, pages, "Páginas de clientes")}
    </section>`;
  },

  perfilCliente() {
    const c = Logic.cliente(this.params.id);
    if (!c) return `<p>Cliente não encontrado.</p>`;
    const r = Logic.retratoCliente(c.id, this.estId);
    const sais = Store.all("saideras").filter((s) => s.clienteId === c.id && s.estabelecimentoId === this.estId);
    const hist = Store.all("consumos")
      .filter((x) => x.clienteId === c.id && x.estabelecimentoId === this.estId)
      .sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")))
      .slice(0, 16);
    const donutBebidas = (r?.bebidas || []).slice(0, 5).map((p, i) => ({
      nome: p.nome,
      n: p.qtd,
      cor: ["#F5B800", "#1B3A5F", "#C4A35A", "#8B1E3F", "#5c5c5c"][i],
    }));
    return `<div class="grid-2">
      <section class="panel">
        <div class="person" style="margin-bottom:16px">
          <img src="${this.avatar(c.avatar)}" style="width:64px;height:64px;border-radius:18px" alt=""/>
          <div>
            <h2>${this.esc(c.nome)}</h2>
            <p class="muted small">Cliente desde ${this.esc(c.clienteDesde || "—")} · ${this.esc(c.codigo)}</p>
            ${this.badgeFreq(r?.frequencia)}
          </div>
        </div>
        <p>Bebida que mais pede: <strong>${this.esc(r?.favorita?.nome || "Ainda sem pedido nesta casa")}</strong>${r?.favorita ? ` <span class="tiny muted">(${this.n(r.favorita.qtd)} tampas · ${r.bebidas[0]?.pct || 0}%)</span>` : ""}</p>
        <p>Última visita: <strong>${this.esc(c.ultimaVisita || "—")}</strong>${r?.diasSem != null ? ` <span class="tiny muted">(${r.diasSem} dia${r.diasSem === 1 ? "" : "s"} sem voltar)</span>` : ""}</p>
        <p>Nascimento: <strong>${this.esc(c.nascimento || "—")}</strong></p>
        <p>Telefone: <strong>${this.esc(c.telefone || "—")}</strong></p>
        <p>E-mail: <strong>${this.esc(c.email || "—")}</strong></p>
        <div class="kpis" style="margin-top:16px">
          <div class="kpi"><b>${this.n(r?.visitas || 0)}</b><span>Visitas</span></div>
          <div class="kpi"><b>${this.n(r?.pedidos || 0)}</b><span>Pedidos</span></div>
          <div class="kpi"><b>${this.n(r?.tampasPedidas || 0)}</b><span>Tampas pedidas</span></div>
          <div class="kpi"><b>${this.n(r?.mediaPorVisita || 0)}</b><span>Média por visita</span></div>
          <div class="kpi"><b>${this.n(r?.saideras?.total || 0)}</b><span>Saideiras</span></div>
          <div class="kpi"><b>${this.n(r?.saideras?.disp || 0)}</b><span>Prontas para baixar</span></div>
        </div>
        <div class="row wrap" style="gap:8px;margin-top:14px">
          <a class="btn btn-gold grow" href="#/registrar">Gerar cupom</a>
          <a class="btn btn-dark grow" href="#/atender/${c.id}">Registrar Tampas</a>
          ${sais.some((s) => s.status === "disponivel") ? `<a class="btn btn-navy grow" href="#/saideras">Baixar Saideira</a>` : ""}
          <button class="btn btn-ghost grow" data-act="cli-aviso" data-id="${c.id}">Aviso no app</button>
        </div>
      </section>
      <section class="panel">
        <h3>O que ${this.esc(c.primeiroNome || c.nome)} pede aqui</h3>
        ${donutBebidas.length ? UI.donut(donutBebidas, "tampas") : `<p class="muted empty-msg">Ainda sem pedidos nesta casa.</p>`}
        <h3 style="margin-top:18px">Ranking das bebidas dele</h3>
        ${r?.bebidas?.length ? UI.rankBars(r.bebidas.slice(0, 6)) : `<p class="muted empty-msg">Sem ranking ainda.</p>`}
      </section>
    </div>
    <section class="panel" style="margin-top:16px">
      <h3>Histórico nesta casa</h3>
      ${hist.length
        ? hist
            .map(
              (h) =>
                `<div class="row between" style="padding:8px 0;border-top:1px solid #2a2a2a"><span>${Logic.fmtDateShort(h.criadoEm)}</span><strong>+${h.quantidade} ${this.esc(Logic.bebida(h.bebidaId)?.nome || "Bebida")}</strong></div>`
            )
            .join("")
        : `<p class="muted empty-msg">Nenhum consumo registrado ainda.</p>`}
    </section>`;
  },

  ensureTicketQtys() {
    const drinks = this.est()?.bebidas || [];
    if (!this.ticketQtys) {
      this.ticketQtys = {};
      drinks.forEach((d, i) => {
        this.ticketQtys[d.id] = i === 0 ? 1 : 0;
      });
      return;
    }
    drinks.forEach((d) => {
      if (this.ticketQtys[d.id] == null) this.ticketQtys[d.id] = 0;
    });
  },

  ticketItens() {
    this.ensureTicketQtys();
    return (this.est()?.bebidas || [])
      .map((d) => ({
        bebidaId: d.id,
        nome: d.nome,
        quantidade: Number(this.ticketQtys[d.id]) || 0,
      }))
      .filter((i) => i.quantidade > 0);
  },

  ticketSlip(t) {
    const est = this.est();
    const payload = window.QR?.payloadTicket ? QR.payloadTicket(t.codigo) : t.codigo;
    const svg = window.QR?.svg ? QR.svg(payload, 200) : UI.qrSvg(t.codigo);
    return `<article class="ticket-print" id="ticket-print">
      ${Brand.horizontal("brand-h")}
      <p class="ticket-house">${est.nome}</p>
      <p class="tiny">ID do estabelecimento: <strong>${est.id}</strong></p>
      <div class="ticket-qr">${svg}</div>
      <h2>${t.codigo}</h2>
      <ul class="ticket-itens">${t.itens.map((i) => `<li><strong>${i.quantidade}×</strong> ${i.nome}</li>`).join("")}</ul>
      <p class="badge badge-gold">USO ÚNICO</p>
      <p class="tiny" style="margin-top:10px">O cliente lê este QR no app Saideira. Depois de usado, o cupom acaba.</p>
    </article>`;
  },

  registrar() {
    this.ensureTicketQtys();
    const est = this.est();
    const drinks = est.bebidas || [];
    const itens = this.ticketItens();
    const total = itens.reduce((a, i) => a + i.quantidade, 0);
    const gerado = this.ticketGeradoId ? Store.find("tickets", this.ticketGeradoId) : null;
    let tickets = Store.all("tickets").filter((t) => t.estabelecimentoId === this.estId);
    if (this.tktFiltro) tickets = tickets.filter((t) => Logic.ticketStatus(t) === this.tktFiltro);
    tickets = tickets.slice(0, 30);
    return `<div class="grid-2 ticket-layout">
      <section class="panel ticket-composer no-print">
        <p class="notice" style="margin-bottom:14px">Monte o cupom, imprima e entregue ao cliente. A casa não precisa do ID dele — quem lê o QR é o celular do cliente.</p>
        <h3 style="margin-bottom:10px">Bebidas neste cupom</h3>
        ${!drinks.length ? `<p class="muted">Cadastre bebidas em <a href="#/bebidas">Bebidas</a> para montar o cupom.</p>` : ""}
        ${drinks
          .map((d) => {
            const q = Number(this.ticketQtys[d.id]) || 0;
            return `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a">
              <div><strong>${d.nome}</strong><p class="tiny muted">Tampas neste QR</p></div>
              <div class="qty">
                <button type="button" data-tkt-qty="${d.id}" data-dir="-1">−</button>
                <strong style="min-width:24px;text-align:center">${q}</strong>
                <button type="button" data-tkt-qty="${d.id}" data-dir="1">+</button>
              </div>
            </div>`;
          })
          .join("")}
        <p class="small" style="margin:14px 0 10px">${total ? `${total} Tampa${total > 1 ? "s" : ""} · ${itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ")}` : "Escolha pelo menos uma bebida."}</p>
        <button class="btn btn-gold btn-block" id="gerar-ticket" style="min-height:56px" ${total ? "" : "disabled"}>Gerar QR para imprimir</button>
      </section>
      <div>
        ${
          gerado && !gerado.usado
            ? `<section class="panel" style="margin-bottom:14px">
                <div class="row between no-print" style="margin-bottom:12px">
                  <h3>Pronto para imprimir</h3>
                  <div class="row" style="gap:8px">
                    <button class="btn btn-gold btn-sm" id="print-ticket">${Icons.printer()} Imprimir</button>
                    <button class="btn btn-ghost btn-sm" id="novo-ticket">Novo cupom</button>
                  </div>
                </div>
                ${this.ticketSlip(gerado)}
              </section>`
              : `<section class="panel no-print" style="margin-bottom:14px"><p class="muted">O cupom impresso traz o nome das bebidas, a quantidade, o ID desta casa e um QR de uso único.</p></section>`
        }
        <section class="panel ticket-list no-print">
          <h3 style="margin-bottom:10px">Cupons desta casa</h3>
          ${this.chips("tktFiltro", [["", "Todos"], ["aberto", "Abertos"], ["usado", "Usados"], ["cancelado", "Cancelados"]])}
          ${
            tickets.length
              ? `<div class="table-wrap"><table class="data">
                <thead><tr><th>Código</th><th>Bebidas</th><th>Status</th><th></th></tr></thead>
                <tbody>${tickets
                  .map((t) => {
                    const resumo = t.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ");
                    return `<tr>
                      <td>${t.codigo}</td>
                      <td>${resumo}</td>
                      <td><span class="badge ${Logic.ticketStatus(t) === "aberto" ? "badge-green" : "badge-ghost"}">${Logic.ticketStatus(t)}</span></td>
                      <td class="table-actions">${Logic.ticketStatus(t) === "aberto" ? `<button class="btn btn-dark btn-sm" data-ver-ticket="${t.id}">Imprimir</button><button class="btn btn-ghost btn-sm" data-act="tkt-cancelar" data-id="${t.id}">Cancelar</button>` : t.usadoPor ? `<a class="btn btn-ghost btn-sm" href="#/cliente/${t.usadoPor}">Cliente</a>` : ""}</td>
                    </tr>`;
                  })
                  .join("")}</tbody>
              </table></div>`
              : `<p class="muted">Nenhum cupom gerado ainda.</p>`
          }
        </section>
      </div>
    </div>`;
  },

  atender() {
    const preset = this.params.id || this.clienteSel;
    const c = Logic.cliente(preset);
    const est = this.est();
    const drinks = est.bebidas;
    const p = c ? Logic.garantirProgresso(c.id, this.estId, this.drinkId) : null;
    return `<section class="panel" style="max-width:720px">
      <p class="notice" style="margin-bottom:14px">Use quando o cliente mostrar o QR dele. O caminho principal continua sendo o cupom impresso em Gerar QR.</p>
      <div class="search" style="margin-bottom:14px">${Icons.search()}<input id="busca-cli" placeholder="Buscar cliente ou ID · SDR-28491" value="${c ? c.nome : ""}"/></div>
      <div class="row wrap" style="margin-bottom:16px;gap:8px">
        <button class="btn btn-navy btn-sm" id="scan-qr">${Icons.qr()} Escanear QR do cliente</button>
      </div>
      ${
        c
          ? `<div class="person" style="margin-bottom:18px">
              <img src="${this.avatar(c.avatar)}" alt=""/>
              <div><strong>${this.esc(c.nome)}</strong><p class="small muted">${this.esc(c.codigo)} · <a href="#/cliente/${c.id}">ficha</a></p></div>
            </div>
            ${(() => {
              const disp = Store.all("saideras").filter((s) => s.clienteId === c.id && s.estabelecimentoId === this.estId && s.status === "disponivel");
              return disp.length ? `<p class="notice" style="margin-bottom:14px">${disp.length} Saideira(s) pronta(s). <a href="#/saideras" style="color:#F5B800">Baixar com o ID</a></p>` : "";
            })()}
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
                <strong>${Logic.bebida(this.drinkId)?.nome || "Bebida"} · ${p.atual}/${p.meta}</strong>
                <div style="margin-top:8px">${UI.tampas(p.atual, p.meta)}</div>
              </div>
              <div class="qty">
                <button id="qty-minus">−</button>
                <strong id="qty-val" style="min-width:24px;text-align:center">${this.qty}</strong>
                <button id="qty-plus">+</button>
              </div>
            </div>
            <button class="btn btn-gold btn-block" id="do-reg" style="min-height:56px;font-size:1.02rem">REGISTRAR ${this.qty} TAMPA${this.qty > 1 ? "S" : ""}</button>`
          : `<p class="muted">Escaneie o QR pessoal do cliente ou busque pelo ID (SDR-…).</p>`
      }
    </section>`;
  },

  bebidas() {
    const est = this.est();
    const cardapio = est.bebidas || [];
    const noCard = new Set(cardapio.map((b) => b.id));
    const q = this.norm(this.bebQ);
    const rede = Store.all("bebidas")
      .filter((b) => !noCard.has(b.id))
      .filter((b) => !q || this.norm(`${b.nome} ${b.marca || ""} ${b.tipo || ""}`).includes(q));
    return `<div class="kpis">
      <div class="kpi"><span>Saideira padrão da casa</span><b>${est.metaPadrao} Tampas</b></div>
      <div class="kpi"><span>No cardápio</span><b>${cardapio.length}</b></div>
      <div class="kpi"><span>Ainda no catálogo</span><b>${Store.all("bebidas").filter((b) => !noCard.has(b.id)).length}</b></div>
    </div>
    <div class="row wrap" style="margin-bottom:16px;gap:8px">
      <button class="btn btn-gold" id="add-drink">Nova bebida</button>
      <button class="btn btn-navy" id="scan-nota">Incluir várias</button>
      <button class="btn btn-ghost" id="edit-meta">Meta padrão · ${est.metaPadrao}</button>
    </div>
    <section class="panel" style="margin-bottom:16px">
      <h3>Catálogo da rede</h3>
      <p class="tiny muted" style="margin:6px 0 12px">O admin cadastra a rede. Você inclui o que esta casa vende. Deixe a meta vazia para usar a padrão (${est.metaPadrao}).</p>
      <div class="field" style="margin-bottom:12px">
        <span>Buscar no catálogo</span>
        <input id="casa-beb-busca" type="search" placeholder="Nome, marca ou tipo" value="${this.esc(this.bebQ)}" autocomplete="off"/>
      </div>
      ${rede.length
        ? `<div class="beb-cat">${rede
            .map(
              (b) => `<article class="beb-cat-item">
            <div>
              <strong>${this.esc(b.nome)}</strong>
              <p class="tiny muted">${this.esc([b.marca, { cerveja: "Cerveja", "nao-alcoolico": "Não alcoólico", destilado: "Destilado", outros: "Outros" }[b.tipo] || b.tipo].filter(Boolean).join(" · ") || "Bebida da rede")}</p>
            </div>
            <div class="beb-cat-actions">
              <label class="field" style="margin:0;min-width:88px">
                <span>Meta</span>
                <input class="ctrl" data-casa-meta="${b.id}" type="number" min="1" placeholder="${est.metaPadrao}" inputmode="numeric"/>
              </label>
              <button type="button" class="btn btn-gold" data-act="casa-beb-on" data-id="${b.id}">Incluir</button>
            </div>
          </article>`
            )
            .join("")}</div>`
        : `<p class="muted empty-msg">${q ? "Nenhuma bebida com essa busca." : "Tudo do catálogo já está no cardápio."}</p>`}
    </section>
    <section class="panel">
      <h3 style="margin-bottom:12px">Cardápio desta casa</h3>
      ${cardapio.length
        ? `<div class="beb-lista">${cardapio
            .map((b) => {
              const cam = Logic.patrocinioEm(est.id, b.id);
              const meta = Logic.metaDe(est, b.id);
              const regra = cam ? `Patrocínio · ${cam.titulo}` : b.meta ? "Meta própria desta casa" : "Usa a padrão da casa";
              return `<article class="beb-card">
                <div>
                  <strong>${this.esc(b.nome)}</strong>
                  <p class="tiny muted">${this.esc(regra)}</p>
                </div>
                <div class="beb-card-actions">
                  <span class="badge ${cam ? "badge-gold" : "badge-ghost"}">${meta} Tampas</span>
                  <button type="button" class="btn btn-ghost btn-sm" data-act="casa-beb-meta" data-id="${b.id}">Meta</button>
                  <button type="button" class="btn btn-danger btn-sm" data-act="casa-beb-off" data-id="${b.id}">Tirar</button>
                </div>
              </article>`;
            })
            .join("")}</div>`
        : `<p class="muted empty-msg">Nenhuma bebida no cardápio. Inclua do catálogo ou cadastre uma nova.</p>`}
    </section>`;
  },

  saideras() {
    let list = Store.all("saideras").filter((s) => s.estabelecimentoId === this.estId);
    if (this.saiFiltro) list = list.filter((s) => s.status === this.saiFiltro);
    if (this.saiQ) {
      const q = this.saiQ.toLowerCase();
      list = list.filter((s) => {
        const c = Logic.cliente(s.clienteId);
        return [s.codigo, c?.nome, Logic.bebida(s.bebidaId)?.nome].some((v) => String(v || "").toLowerCase().includes(q));
      });
    }
    const tot = Store.all("saideras").filter((s) => s.estabelecimentoId === this.estId);
    return `<div class="kpis">
      <div class="kpi"><span>Total</span><b>${this.n(tot.length)}</b></div>
      <div class="kpi"><span>Disponíveis</span><b>${this.n(tot.filter((s) => s.status === "disponivel").length)}</b></div>
      <div class="kpi"><span>Entregues</span><b>${this.n(tot.filter((s) => s.status === "utilizada").length)}</b></div>
    </div>
    <section class="panel" style="margin-bottom:14px">
      <h3>Baixar Saideira</h3>
      <p class="muted small" style="margin:6px 0 12px">Peça o ID da Saideira no app do cliente (SDR-…). Confira nome e bebida. Só confirme quando a bebida for para a mesa — depois o ID acaba.</p>
      <div class="row wrap" style="gap:8px">
        <div class="search grow">${Icons.search()}<input id="sai-codigo" placeholder="ID da Saideira · SDR-8842" maxlength="24" autocomplete="off"/></div>
        <button class="btn btn-gold" id="entregar-sai">Revisar e entregar</button>
      </div>
      <div id="sai-preview" class="sai-preview"></div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <div class="search">${Icons.search()}<input id="q-sai-casa" placeholder="Filtrar por código ou cliente" value="${this.esc(this.saiQ)}"/></div>
        ${this.chips("saiFiltro", [["", "Todas"], ["disponivel", "Disponíveis"], ["utilizada", "Entregues"], ["expirada", "Expiradas"]])}
      </div>
      ${list.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Código</th><th>Cliente</th><th>Bebida</th><th>Validade</th><th>Status</th><th></th></tr></thead>
      <tbody>${list
        .map((s) => {
          const c = Logic.cliente(s.clienteId);
          return `<tr>
            <td><strong>${this.esc(s.codigo)}</strong></td>
            <td>${c ? `<a href="#/cliente/${c.id}">${this.esc(c.nome)}</a>` : "—"}</td>
            <td>${this.esc(Logic.bebida(s.bebidaId)?.nome || "—")}</td>
            <td>${this.esc(Logic.validadeLabel(s))}</td>
            <td><span class="badge ${s.status === "disponivel" ? "badge-green" : "badge-ghost"}">${this.esc(this.saiStatusLab(s))}</span></td>
            <td>${s.status === "disponivel" ? `<button class="btn btn-gold btn-sm" data-act="sai-entregar" data-id="${s.id}">Revisar</button>` : ""}</td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div>` : `<p class="muted empty-msg">Nenhuma Saideira nesta casa ainda.</p>`}
    </section>`;
  },

  funcionarios() {
    const list = Store.all("funcionarios").filter((f) => f.estabelecimentoId === this.estId);
    const form = `<div class="form-grid">
        <div class="field"><span>Nome</span><input id="nf-nome"/></div>
        <div class="field"><span>E-mail</span><input id="nf-email" type="email"/></div>
        <div class="field"><span>Senha</span><input id="nf-senha" type="password" placeholder="Mínimo 6"/></div>
        <div class="field"><span>Cargo</span><input id="nf-cargo" value="Garçom"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" id="nf-ok">Cadastrar e liberar login</button>`;
    return `<section class="panel form-novo" style="margin-bottom:14px">
      <button type="button" class="form-novo-toggle" data-act="fun-toggle">
        <strong>${this.funNovo ? "Fechar cadastro" : "Cadastrar garçom / funcionário"}</strong>
        <span class="tiny muted">${this.funNovo ? "recolher" : "abrir formulário"}</span>
      </button>
      ${this.funNovo ? `<div class="form-novo-body">${form}</div>` : ""}
    </section>
      <p class="notice" style="margin-bottom:14px">O salão usa o app do garçom com o e-mail e a senha criados aqui. Desative quem saiu da equipe.</p>
      <div class="grid-2">${list.length
      ? list.map(
        (f) => `<article class="panel">
          <div class="person"><img src="${this.avatar(f.avatar)}" alt=""/><div><h3>${this.esc(f.nome)}</h3><p class="muted small">${this.esc(f.cargo || "Garçom")} · ${this.esc(f.email || "sem e-mail")}</p></div>
            <span class="badge ${f.status === "ativo" ? "badge-green" : "badge-ghost"}" style="margin-left:auto">${this.esc(f.status)}</span></div>
          <div class="kpis" style="margin-top:12px">
            <div class="kpi"><b>${this.n(f.tampasHoje)}</b><span>Tampas hoje</span></div>
            <div class="kpi"><b>${this.n(f.saiderasEntregues)}</b><span>Saideiras entregues</span></div>
          </div>
          <div class="table-actions" style="margin-top:12px">
            <button class="btn btn-ghost btn-sm" data-act="fun-editar" data-id="${f.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-act="fun-status" data-id="${f.id}">${f.status === "ativo" ? "Desativar" : "Reativar"}</button>
          </div>
        </article>`
      ).join("")
      : `<section class="panel"><p class="muted empty-msg">Nenhum funcionário ainda. Cadastre o primeiro garçom.</p></section>`}</div>`;
  },

  inteligencia() {
    const painel = Logic.painelCasa(this.estId);
    const r = painel;
    const inativos = Logic.inativosDoEst(this.estId).slice(0, 8);
    const quase = Logic.quaseSaideraEst(this.estId).slice(0, 8);
    const niver = Logic.aniversariantesEst(this.estId).slice(0, 8);
    return `<div class="kpis">
      ${[
        ["Clientes da casa", r.clientes],
        ["Novos neste mês", r.novos],
        ["Vieram hoje", r.clientesHoje],
        ["Vem sempre", r.freq.alta],
        ["Pouca frequência", r.freq.baixa],
        ["Sumiu (30 dias)", r.freq.fria],
        ["Próximos da Saideira", r.quase],
        ["Aniversariantes do mês", r.niver],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${this.n(v)}</b></div>`)
        .join("")}
    </div>
    <div class="grid-2">
      <section class="panel">
        <h3>Quem frequenta</h3>
        ${this.donutFreq(painel.freq)}
      </section>
      <section class="panel">
        <h3>Tampas nos últimos 7 dias</h3>
        ${painel.semana.values.some((v) => v) ? UI.lineChart(painel.semana.values, painel.semana.labels) : `<p class="muted empty-msg">Ainda não há consumos nesta semana.</p>`}
      </section>
    </div>
    <div class="grid-2" style="margin-top:14px">
      <section class="panel">
        <h3>O que mais sai</h3>
        ${painel.ranking.length ? UI.rankBars(painel.ranking.slice(0, 6)) : `<p class="muted empty-msg">Ainda não há consumos para montar o ranking.</p>`}
      </section>
      <section class="panel">
        <h3>O que menos sai</h3>
        ${painel.menosSai.length ? UI.rankBars(painel.menosSai) : `<p class="muted empty-msg">Ainda não há o que comparar.</p>`}
      </section>
    </div>
    <section class="panel" style="margin-top:14px">
      <h3>Movimento por dia da semana</h3>
      ${painel.weekday.values.some((v) => v) ? UI.heatRow(painel.weekday.labels, painel.weekday.values) : `<p class="muted empty-msg">Sem tampas o bastante para ver o ritmo da semana.</p>`}
    </section>
    ${painel.topClientes.length ? `<section class="panel" style="margin-top:14px">
      <div class="row between" style="margin-bottom:12px"><h3>Quem mais pede aqui</h3><a class="gold small" href="#/clientes">Ver lista</a></div>
      <div class="grid-2">${painel.topClientes.map((c) => `<a class="insight-card" href="#/cliente/${c.id}">
        <img src="${this.avatar(c.avatar)}" alt=""/>
        <div>
          <strong>${this.esc(c.nome)}</strong>
          <p class="tiny muted">${this.esc(c.favorita?.nome || "Sem favorita ainda")} · ${this.n(c.tampasPedidas)} tampas · ${this.n(c.visitas)} visita${c.visitas === 1 ? "" : "s"} · média ${c.mediaPorVisita}</p>
          ${this.badgeFreq(c.frequencia)}
        </div>
      </a>`).join("")}</div>
    </section>` : ""}
    <div class="grid-2" style="margin-top:14px">
      <section class="panel">
        <h3>Próximos da Saideira</h3>
        ${quase.length
          ? quase.map((t) => {
            const c = Logic.cliente(t.clienteId);
            const retrato = Logic.retratoCliente(t.clienteId, this.estId);
            return `<div class="row between" style="padding:8px 0"><div><strong>${this.esc(c?.nome || "—")}</strong><p class="tiny muted">${this.esc(retrato?.favorita?.nome || Logic.bebida(t.bebidaId)?.nome || "Bebida")} · cartela ${t.atual}/${t.meta} · ${this.n(retrato?.visitas || 0)} visitas</p></div>
              <div class="table-actions"><a class="btn btn-ghost btn-sm" href="#/cliente/${t.clienteId}">Ficha</a><button type="button" class="btn btn-gold btn-sm" data-solicitar="quase">Acelerar</button></div></div>`;
          }).join("")
          : `<p class="muted empty-msg">Ninguém a 2 Tampas ou menos da Saideira.</p>`}
      </section>
      <section class="panel">
        <h3>Aniversariantes do mês</h3>
        ${niver.length
          ? niver.map((c) => {
            const retrato = Logic.retratoCliente(c.id, this.estId);
            return `<div class="row between" style="padding:8px 0"><div><a href="#/cliente/${c.id}">${this.esc(c.nome)}</a><p class="tiny muted">${this.esc(retrato?.favorita?.nome || "Sem favorita")} · ${this.badgeFreq(retrato?.frequencia)}</p></div><span class="muted small">${this.esc(c.nascimento)}</span></div>`;
          }).join("")
          : `<p class="muted empty-msg">Nenhum aniversariante cadastrado neste mês.</p>`}
        <button class="btn btn-gold btn-sm btn-block" style="margin-top:12px" data-solicitar="aniversario">Pedir campanha de aniversário</button>
      </section>
    </div>
    <section class="panel" style="margin-top:14px">
      <h3>Sem voltar há 30 dias</h3>
      ${inativos.length
        ? `<div class="grid-2">${inativos.map((c) => {
          const retrato = Logic.retratoCliente(c.id, this.estId);
          const t = Store.all("tampas").find((x) => x.clienteId === c.id && x.estabelecimentoId === this.estId);
          return `<a class="insight-card" href="#/cliente/${c.id}">
            <img src="${this.avatar(c.avatar)}" alt=""/>
            <div>
              <strong>${this.esc(c.nome)}</strong>
              <p class="tiny muted">${this.esc(retrato?.favorita?.nome || "—")} · ${t ? `cartela ${t.atual}/${t.meta}` : "sem cartela"} · ${retrato?.diasSem != null ? `há ${retrato.diasSem} dia${retrato.diasSem === 1 ? "" : "s"}` : "sem data"}</p>
              ${this.badgeFreq(retrato?.frequencia)}
            </div>
          </a>`;
        }).join("")}</div>`
        : `<p class="muted empty-msg">Todos os clientes desta casa voltaram recentemente.</p>`}
      <a class="btn btn-gold btn-block" style="margin-top:12px" href="#/chamar">Montar chamar de volta</a>
    </section>`;
  },

  chamar() {
    const list = Logic.inativosDoEst(this.estId);
    if (!list.length) {
      return `<section class="panel" style="max-width:720px">
        <p class="muted empty-msg">Ninguém desta casa está há 30 dias sem voltar. Quando isso acontecer, você monta o disparo aqui e o admin valida.</p>
        <a class="btn btn-ghost" href="#/inteligencia">Voltar à inteligência</a>
      </section>`;
    }
    if (!this.volta.ids.length) this.aplicarQtdVolta(this.volta.qtd);
    const modelo = Logic.modelosCampanhaCasa(this.est()).chamar;
    const msg = this.volta.mensagem || modelo.mensagem;
    const sel = new Set(this.volta.ids);
    const chips = [10, 20, 50, list.length].filter((n, i, a) => n <= list.length && a.indexOf(n) === i);
    return `<section class="panel" style="max-width:720px">
      <p class="muted" style="margin-bottom:14px">Escolha quantos clientes inativos entram no disparo. Ao terminar, peça ao Admin Saideira para ativar o “chamar de volta”.</p>
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
            const dias = Logic.diasSemVisita(c, this.estId);
            return `<label>
              <input type="checkbox" value="${c.id}" ${sel.has(c.id) ? "checked" : ""}/>
              <div>
                <strong>${this.esc(c.nome)}</strong>
                <p class="tiny muted">${this.esc(Logic.retratoCliente(c.id, this.estId)?.favorita?.nome || Logic.bebida(t?.bebidaId)?.nome || "—")} · ${dias != null ? `última visita há ${dias} dia${dias === 1 ? "" : "s"}` : "sem visita registrada"} · ${this.esc(Logic.freqLabel(Logic.retratoCliente(c.id, this.estId)?.frequencia))}</p>
              </div>
            </label>`;
          })
          .join("")}
      </div>
      <div class="field" style="margin-top:14px"><span>Mensagem pronta</span>
        <textarea id="volta-msg" rows="3">${msg}</textarea>
      </div>
      <button class="btn btn-gold btn-block" style="margin-top:16px" id="pedir-volta">Pedir disparo ao Admin Saideira</button>
    </section>`;
  },

  campanhas() {
    const est = this.est();
    const form = this.campForm;
    const modelos = Logic.modelosCampanhaCasa(est);
    const tipos = [
      ["comparecer", "Comparecer", "Chamar quem já frequenta a casa e usa o app para consumo e retirada da Saideira.", Icons.megaphone()],
      ["aniversario", "Aniversário", "Oferta pronta para quem faz aniversário neste mês.", Icons.gift()],
      ["tampas", "Tampas reduzidas", "Saideira mais rápida: menos Tampas nesta casa.", Icons.tampas()],
    ];
    const publicos = [
      ["todos", "Quem frequenta"],
      ["aniversario", "Aniversariantes"],
      ["quase", "Quase Saideira"],
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
      <p class="muted" style="margin:6px 0 14px">Escolha o tipo. A mensagem e o público já vêm prontos — ajuste se quiser e envie ao Admin Saideira para validar e disparar.</p>
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
        <button class="btn btn-gold btn-block" id="enviar-camp-casa">Enviar ao Admin Saideira</button>
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
            <p class="tiny muted">${origem} · ${tipo}${c.publico ? " · " + Logic.publicoCampanhaLabel(c.publico) : ""} · ${c.status}${on ? " · visível no app" : c.status === "solicitada" ? " · aguardando admin" : ""}${c.origem !== "estabelecimento" && c.periodoInicio ? " · " + Logic.periodoTexto(c) : ""}</p>
            ${c.mensagem ? `<p class="small muted" style="margin-top:4px">${c.mensagem}</p>` : ""}
          </div>
          <span class="badge ${on ? "badge-gold" : c.status === "solicitada" ? "badge-navy" : "badge-ghost"}">${c.metaTampas ? c.metaTampas + " Tampas" : "Mensagem"}</span>
        </div>`;
          })
          .join("") || "<p class='muted'>Nenhuma campanha neste estabelecimento.</p>"
      }
    </section>`;
  },

  pixBox(cob) {
    if (!cob?.pix) return "";
    const p = Logic.plano(cob.planoId);
    const qr = window.QR?.svg ? QR.svg(cob.pix, 200) : "";
    return `<section class="panel pix-box" style="margin-bottom:14px">
      <p class="tiny muted">Pix gerado · aguardando confirmação</p>
      <h3>${this.esc(p?.nome || "Novo plano")}</h3>
      <p class="pix-valor">${this.esc(Logic.fmtReais(cob.valor))}</p>
      <p class="small" style="margin:8px 0 12px">Pague este valor. O plano só muda depois que o admin confirmar o Pix no extrato.</p>
      ${qr ? `<div class="qr-convite">${qr}</div>` : ""}
      <textarea id="pix-copia" readonly class="pix-copia">${this.esc(cob.pix)}</textarea>
      <p class="tiny muted" style="margin:8px 0">Identificador: ${this.esc(cob.txid)}</p>
      <div class="row wrap" style="gap:8px">
        <button type="button" class="btn btn-gold" data-act="pix-copiar">Copiar Pix</button>
        <button type="button" class="btn btn-ghost" data-act="cob-cancelar" data-id="${cob.id}">Cancelar pedido</button>
      </div>
    </section>`;
  },

  planos() {
    const atual = Logic.planoDaCasa(this.est());
    const pend = Logic.cobrancaPendente(this.estId);
    const lista = Store.all("planos").filter((p) => p.status === "ativo" && (p.aMostra || p.id === atual?.id));
    const preco = (p) => (p.preco != null ? Logic.fmtReais(p.preco) : "Sem preço — troca na hora");
    const card = (p) => {
      const meu = atual && p.id === atual.id;
      const pedindo = pend && pend.planoId === p.id;
      const menus = (p.menus || []).map((id) => this.esc(Logic.labelMenuCasa(id))).join(", ");
      let acao = `<p class="tiny muted" style="margin-top:12px">Este é o plano da casa agora.</p>`;
      if (!meu && pedindo) acao = `<p class="tiny gold" style="margin-top:12px">Pix deste plano já foi gerado. Pague acima.</p>`;
      else if (!meu) {
        const lab = p.preco > 0 ? `Pedir ${Logic.fmtReais(p.preco)}` : "Usar este plano";
        acao = `<button class="btn btn-gold" style="margin-top:12px" data-act="pln-escolher" data-id="${p.id}">${this.esc(lab)}</button>`;
      }
      return `<article class="panel" style="margin:0">
        <div class="row between" style="gap:8px;align-items:flex-start">
          <div>
            <h3>${this.esc(p.nome)}</h3>
            <p class="tiny muted">${this.esc(preco(p))}</p>
          </div>
          ${meu ? `<span class="badge badge-gold">Atual</span>` : pedindo ? `<span class="badge badge-gold">Aguardando Pix</span>` : `<span class="badge badge-ghost">À mostra</span>`}
        </div>
        <p class="small" style="margin:10px 0">${this.esc(p.descricao || "Sem descrição.")}</p>
        <p class="tiny muted">Menus: ${menus || "—"}</p>
        ${acao}
      </article>`;
    };
    return `${
      atual
        ? `<section class="panel" style="margin-bottom:14px">
      <p class="tiny muted">Plano atual</p>
      <h3>${this.esc(atual.nome)}</h3>
      <p class="small" style="margin-top:6px">${this.esc(atual.descricao || "Sem descrição.")}</p>
    </section>`
        : `<section class="panel" style="margin-bottom:14px"><p class="muted">A casa ainda não tem um plano. Escolha um à mostra.</p></section>`
    }
    ${pend ? this.pixBox(pend) : ""}
    <p class="muted small" style="margin-bottom:12px">Só aparecem os planos que o admin deixou à mostra. Se o plano tem preço, um Pix é gerado com esse valor. O plano muda depois da confirmação.</p>
    ${lista.length ? `<div class="grid-2">${lista.map(card).join("")}</div>` : `<section class="panel"><p class="muted">Nenhum plano à mostra no momento.</p></section>`}`;
  },

  config() {
    const est = this.est();
    const img = Logic.imagemEst(est);
    const custom = Boolean(est.cartaz);
    const convite = Logic.urlEntrarCliente(this.estId);
    return `<div class="cfg-grid">
    <section class="panel" id="cfg-qr-app">
      <h3>QR do app</h3>
      <p class="tiny muted" style="margin:6px 0 14px">Imprima e cole na mesa, no balcão ou no cartaz. O cliente lê, cai no cadastro e baixa o app Saideira. Quem já tem o app entra direto. Pode repetir este QR quantas vezes quiser.</p>
      ${UI.qrApp({ url: convite, casa: est.nome, size: 220 })}
      <p class="tiny" style="margin:14px 0 0;word-break:break-all">${this.esc(convite)}</p>
      <div class="row wrap" style="gap:8px;margin-top:12px">
        <button type="button" class="btn btn-gold btn-sm" data-act="convite-copiar">Copiar link</button>
        <button type="button" class="btn btn-navy btn-sm" data-act="convite-imprimir">Imprimir QR</button>
      </div>
    </section>
    <section class="panel">
      <h3>Casa</h3>
      <div class="field"><span>Nome</span><input id="cfg-nome" value="${this.esc(est.nome || "")}"/></div>
      <div class="field" style="margin-top:10px"><span>Tipo</span>
        <select id="cfg-tipo"><option value="bar" ${est.tipo === "bar" ? "selected" : ""}>Bar</option><option value="restaurante" ${est.tipo === "restaurante" ? "selected" : ""}>Restaurante</option></select>
      </div>
      <div class="field" style="margin-top:10px"><span>Horário</span><input id="cfg-hora" placeholder="18h às 2h" value="${this.esc(est.horario || "")}"/></div>
      <div class="field" style="margin-top:10px"><span>Saideira padrão (Tampas)</span><input id="cfg-meta" type="number" min="1" value="${est.metaPadrao}"/></div>
      <p class="tiny muted" style="margin:12px 0 8px">Endereço com CEP — o cliente abre no Google Maps.</p>
      <div class="form-grid">
        <div class="field"><span>CEP</span><input id="cfg-cep" inputmode="numeric" maxlength="9" placeholder="49000-000" value="${this.esc(est.cep || "")}"/></div>
        <div class="field"><span>Rua / avenida</span><input id="cfg-rua" placeholder="Rua, avenida ou travessa" value="${this.esc(est.logradouro || "")}"/></div>
        <div class="field"><span>Número</span><input id="cfg-num" placeholder="123" value="${this.esc(est.numero || "")}"/></div>
        <div class="field"><span>Complemento</span><input id="cfg-comp" placeholder="Opcional" value="${this.esc(est.complemento || "")}"/></div>
        <div class="field"><span>Bairro</span><input id="cfg-bairro" value="${this.esc(est.bairro || "")}"/></div>
        <div class="field"><span>Cidade</span><input id="cfg-cidade" value="${this.esc(est.cidade || "Aracaju")}"/></div>
        <div class="field"><span>UF</span><input id="cfg-uf" maxlength="2" value="${this.esc(est.uf || "SE")}"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:16px" id="save-cfg">Salvar casa</button>
    </section>
    <section class="panel">
      <h3>Vitrine no app do cliente</h3>
      <div class="field"><span>Promoção curta</span><input id="cfg-promo" placeholder="Ex.: Happy hour até 20h" value="${this.esc(est.promocao || "")}"/></div>
      <button class="btn btn-navy btn-sm" style="margin-top:10px" data-act="casa-promo">Salvar promoção</button>
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
    </section>
    <section class="panel">
      <h3>Plano da casa</h3>
      <p class="small">${this.esc(Logic.planoDaCasa(est)?.nome || "Sem plano definido")}</p>
      <p class="tiny muted" style="margin:6px 0 12px">O plano define quais menus ficam livres. Para trocar, peça um plano à mostra. Se tiver preço, pague o Pix e o admin confirma.</p>
      <a class="btn btn-ghost btn-sm" href="#/planos">Ver planos</a>
    </section>
    <section class="panel">
      <h3>Senha do gestor</h3>
      <div class="field"><span>Nova senha</span><input id="cfg-senha" type="password" placeholder="Vazio = manter"/></div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="cfg-senha">Trocar senha</button>
    </section>
    <section class="panel">
      <h3>App no celular</h3>
      <p class="tiny muted" style="margin:6px 0 10px">A casa abre o painel no computador, no navegador. Instalar o app é opcional.</p>
      ${UI.pwaBox() || `<p class="tiny muted">Já está no app deste aparelho.</p>`}
    </section>
    <section class="panel">
      <h3>Suporte e salão</h3>
      ${(() => {
        const s = Logic.suporte();
        if (!s.whatsapp && !s.email) return `<p class="tiny muted">O admin ainda não cadastrou WhatsApp ou e-mail de suporte.</p>`;
        return `<p class="tiny muted" style="margin-bottom:10px">Fale com a rede se o cardápio, o QR ou o login não baterem.</p>
          <div class="table-actions">${s.whatsapp ? `<a class="btn btn-gold btn-sm" href="https://wa.me/55${s.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${s.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${s.email}">${s.email}</a>` : ""}</div>`;
      })()}
      <p class="tiny muted" style="margin-top:16px">Caminho principal: gere o QR, imprima e entregue. O cliente lê no app. Se precisar, leia o QR dele. Para baixar a Saideira, ele informa o ID (SDR-…).</p>
    </section>
    </div>`;
  },

  afterRegister(res, cliente, bebida) {
    if (res.ganhas) {
      UI.modal({
        center: true,
        html: `${UI.celebrate(
          res.ofertaConcluida ? "OFERTA CONCLUÍDA! 🍺" : "SAIDEIRA LIBERADA! 🍺",
          res.ofertaConcluida
            ? `${cliente.primeiroNome} usou a oferta neste bar. Próximo ciclo pela regra da casa (${res.metaBar} Tampas): ${res.depois}/${res.meta}.`
            : `${cliente.primeiroNome} conquistou ${res.ganhas} Saideira de ${bebida.nome}. Ciclo atual: ${res.depois}/${res.meta}.`
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

  async imprimirQrApp() {
    const url = Logic.urlEntrarCliente(this.estId);
    const w = window.open("", "_blank");
    if (!w) {
      UI.toast("Permita a janela de impressão.");
      return;
    }
    const casa = this.esc(this.est()?.nome || "");
    const [brand, icon] = await Promise.all([
      Brand.dataUrl("03_logo_horizontal.png", true),
      Brand.dataUrl("10_app_icon_amarelo.png"),
    ]);
    const qr = QR.svg(url, 320, { logo: true, logoSrc: icon });
    w.document.write(`<!DOCTYPE html><html><head><title>QR Saideira</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        html, body { height: 100%; }
        body {
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #fff9e8;
          font-family: Manrope, Segoe UI, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .sheet {
          width: 100%;
          max-width: 170mm;
          min-height: 250mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 22mm 16mm;
          background: linear-gradient(180deg, #221c0c 0%, #171717 72%);
          border: 3px solid #F5B800;
          border-radius: 28px;
        }
        .logo { height: 52px; width: auto; margin-bottom: 10px; }
        .kicker {
          letter-spacing: .14em;
          text-transform: uppercase;
          font-weight: 800;
          font-size: 13px;
          color: #F5B800;
          margin: 0 0 20px;
        }
        .frame {
          display: inline-grid;
          place-items: center;
          background: #FFF9E8;
          padding: 18px;
          border-radius: 22px;
          box-shadow: 0 0 0 3px #F5B800;
        }
        .frame svg { width: 92mm; height: 92mm; display: block; }
        h1 { font-size: 26px; margin: 22px 0 6px; color: #fff9e8; }
        .casa { font-weight: 800; font-size: 20px; margin: 0; color: #F5B800; }
        .sub { font-size: 13px; color: #b8b8b8; margin: 12px 0 0; max-width: 42ch; }
      </style></head><body>
      <div class="sheet">
        <img class="logo" src="${brand}" alt="Saideira"/>
        <p class="kicker">Cadastre-se e baixe o app</p>
        <div class="frame">${qr}</div>
        <h1>Leia e entre na Saideira</h1>
        <p class="casa">${casa}</p>
        <p class="sub">Quem não tem o app cai no cadastro. Quem já tem abre a Saideira.</p>
      </div>
      </body></html>`);
    w.document.close();
    const imgs = [...w.document.images];
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise((ok) => {
          img.onload = img.onerror = () => ok();
        });
      })
    );
    await new Promise((r) => setTimeout(r, 120));
    w.focus();
    w.print();
    w.onafterprint = () => w.close();
  },

  async onAct(act, id, el) {
    if (this.telaBloqueada()) return;
    if (act === "fun-toggle") {
      this.funNovo = !this.funNovo;
      this.render();
      return;
    }
    if (act === "tkt-cancelar") {
      if (!confirm("Cancelar este cupom? Ele não poderá mais ser lido.")) return;
      await this.post("tickets/cancelar", { id }, "Cupom cancelado.");
      if (this.ticketGeradoId === id) this.ticketGeradoId = null;
      return;
    }
    if (act === "cli-aviso") {
      const c = Logic.cliente(id);
      if (!c) return;
      const m = UI.modal({
        html: `<h2>Aviso no app</h2>
          <p class="tiny muted" style="margin:6px 0 10px">${this.esc(c.nome)}</p>
          <div class="field"><span>Título</span><input id="av-tit" placeholder="Ex.: Sua mesa te espera"/></div>
          <div class="field" style="margin-top:10px"><span>Texto</span><textarea id="av-txt" rows="3"></textarea></div>
          <div class="row" style="margin-top:14px;gap:8px">
            <button class="btn btn-gold" id="av-ok">Enviar</button>
            <button class="btn btn-ghost" data-close-modal>Cancelar</button>
          </div>`,
      });
      m.el.querySelector("#av-ok")?.addEventListener("click", async () => {
        const data = await this.post("notificacoes/enviar", {
          clienteId: c.id,
          titulo: m.el.querySelector("#av-tit")?.value,
          texto: m.el.querySelector("#av-txt")?.value,
        }, "Aviso enviado ao app do cliente.");
        if (data) m.close();
      });
      return;
    }
    if (act === "casa-beb-on") {
      const bebidaId = id || this.val("#casa-beb-nova");
      if (!bebidaId) {
        UI.toast("Escolha uma bebida.");
        return;
      }
      const metaInp = this.root.querySelector(`[data-casa-meta="${bebidaId}"]`);
      await this.post("estabelecimentos/bebida", {
        estabelecimentoId: this.estId,
        bebidaId,
        meta: metaInp?.value || this.val("#casa-beb-meta") || null,
      }, "Bebida incluída no cardápio.");
      return;
    }
    if (act === "casa-beb-off") {
      if (!confirm("Tirar esta bebida do cardápio desta casa?")) return;
      await this.post("estabelecimentos/bebida-remover", { estabelecimentoId: this.estId, bebidaId: id }, "Bebida removida do cardápio.");
      return;
    }
    if (act === "casa-beb-meta") {
      const b = (this.est()?.bebidas || []).find((x) => x.id === id);
      const atual = b?.meta || this.est()?.metaPadrao || 10;
      const n = prompt("Meta de Tampas desta bebida nesta casa (vazio = padrão da casa)", String(atual));
      if (n == null) return;
      await this.post("estabelecimentos/bebida", {
        estabelecimentoId: this.estId,
        bebidaId: id,
        meta: n === "" ? null : Number(n) || null,
      }, "Meta da bebida atualizada.");
      return;
    }
    if (act === "sai-entregar") {
      this.pedirConfirmacaoSaidera(Store.find("saideras", id));
      return;
    }
    if (act === "fun-editar") {
      const f = Store.find("funcionarios", id);
      if (!f) return;
      const m = UI.modal({
        html: `<h2>Editar funcionário</h2>
          <div class="form-grid">
            <div class="field"><span>Nome</span><input id="fe-nome" value="${this.esc(f.nome)}"/></div>
            <div class="field"><span>E-mail</span><input id="fe-email" type="email" value="${this.esc(f.email || "")}"/></div>
            <div class="field"><span>Cargo</span><input id="fe-cargo" value="${this.esc(f.cargo || "")}"/></div>
            <div class="field"><span>Nova senha</span><input id="fe-senha" type="password" placeholder="Vazio = manter"/></div>
          </div>
          <div class="row" style="margin-top:14px;gap:8px">
            <button class="btn btn-gold" id="fe-ok">Salvar</button>
            <button class="btn btn-ghost" data-close-modal>Cancelar</button>
          </div>`,
      });
      m.el.querySelector("#fe-ok")?.addEventListener("click", async () => {
        const data = await this.post("funcionarios/salvar", {
          id: f.id,
          nome: m.el.querySelector("#fe-nome")?.value,
          email: m.el.querySelector("#fe-email")?.value,
          cargo: m.el.querySelector("#fe-cargo")?.value,
          senha: m.el.querySelector("#fe-senha")?.value,
          status: f.status,
        }, "Funcionário atualizado.");
        if (data) m.close();
      });
      return;
    }
    if (act === "fun-status") {
      const f = Store.find("funcionarios", id);
      if (!f) return;
      const prox = f.status === "ativo" ? "inativo" : "ativo";
      if (prox === "inativo" && !confirm(`Desativar ${f.nome}? O login do app do garçom para.`)) return;
      await this.post("funcionarios/status", { id, status: prox }, prox === "ativo" ? "Reativado." : "Desativado.");
      return;
    }
    if (act === "casa-promo") {
      await this.post("estabelecimentos/midia", { id: this.estId, promocao: this.val("#cfg-promo") }, "Promoção atualizada no app do cliente.");
      return;
    }
    if (act === "pln-escolher") {
      const p = Store.find("planos", id);
      if (!p) return;
      const valor = p.preco != null ? Number(p.preco) : 0;
      const txt =
        valor > 0
          ? `Pedir o plano ${p.nome} por ${Logic.fmtReais(valor)}? O plano só muda depois que o admin confirmar o Pix.`
          : `Passar a casa para o plano ${p.nome}? Sem preço, a troca é na hora.`;
      if (!confirm(txt)) return;
      const data = await this.post(
        "planos/escolher",
        { planoId: id },
        valor > 0 ? "Pix gerado. Pague e aguarde a confirmação do admin." : `Plano ${p.nome} ativado.`
      );
      if (data && data.ativado === false) {
        this.root.querySelector(".pix-box")?.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      return;
    }
    if (act === "pix-copiar") {
      const txt = this.root.querySelector("#pix-copia")?.value || "";
      if (!txt) return;
      const ok = navigator.clipboard?.writeText?.(txt);
      if (ok && typeof ok.then === "function") ok.then(() => UI.toast("Pix copiado.")).catch(() => prompt("Copie o Pix", txt));
      else prompt("Copie o Pix", txt);
      return;
    }
    if (act === "cob-cancelar") {
      if (!confirm("Cancelar este pedido de plano? O Pix deixa de valer.")) return;
      await this.post("planos/cobranca-cancelar", { id }, "Pedido cancelado.");
      return;
    }
    if (act === "convite-copiar") {
      const url = Logic.urlEntrarCliente(this.estId);
      const ok = navigator.clipboard?.writeText?.(url);
      if (ok && typeof ok.then === "function") ok.then(() => UI.toast("Link copiado.")).catch(() => prompt("Copie o link", url));
      else {
        prompt("Copie o link", url);
      }
      return;
    }
    if (act === "convite-imprimir") {
      await this.imprimirQrApp();
      return;
    }
    if (act === "cfg-senha") {
      const senha = this.val("#cfg-senha");
      if (senha.length < 6) {
        UI.toast("A nova senha precisa ter pelo menos 6 caracteres.");
        return;
      }
      await this.post("estabelecimentos/salvar", { id: this.estId, novaSenha: senha }, "Senha do gestor atualizada.");
      return;
    }
  },

  onClick(e) {
    if (this.telaBloqueada() && e.target.closest("[data-plano-lock]")) return;
    const t = e.target.closest("button, [data-page], [data-pick], [data-drink], [data-tkt-qty], [data-ver-ticket], [data-solicitar], [data-volta-qtd], [data-camp-tipo], [data-camp-publico], [data-dash-dia], [data-dash-faixa], [data-dash-wd], [data-dash-filtro]");
    if (!t || t.disabled) return;
    if (t.closest("[data-menu], [data-close-menu], [data-close-modal], [data-href], [data-act]")) return;
    const id = t.id;
    if (t.hasAttribute("data-dash-dia")) {
      this.dashDia = t.getAttribute("data-dash-dia") || Logic.diaIso();
      this.render();
      this.root.querySelector(".dash-dia-panel")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    if (t.hasAttribute("data-dash-faixa")) {
      this.dashFaixa = Math.min(30, Math.max(7, Number(t.getAttribute("data-dash-faixa")) || 7));
      this.render();
      return;
    }
    if (t.hasAttribute("data-dash-wd")) {
      this.dashDia = this.isoSemana(t.getAttribute("data-dash-wd"));
      this.render();
      this.root.querySelector(".dash-dia-panel")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    if (t.hasAttribute("data-dash-filtro")) {
      this.cliFiltro = t.getAttribute("data-dash-filtro") || "";
      this.cliPage = 1;
      location.hash = "#/clientes";
      return;
    }
    if (t.hasAttribute("data-page")) {
      const n = Number(t.getAttribute("data-page"));
      if (!n || n === this.cliPage) return;
      this.cliPage = n;
      this.render();
      this.root.querySelector(".table-wrap")?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    if (t.hasAttribute("data-tkt-qty")) {
      this.ensureTicketQtys();
      const kid = t.getAttribute("data-tkt-qty");
      const dir = Number(t.getAttribute("data-dir")) || 0;
      const atual = Number(this.ticketQtys[kid]) || 0;
      this.ticketQtys[kid] = Math.max(0, Math.min(20, atual + dir));
      this.render();
      return;
    }
    if (t.hasAttribute("data-ver-ticket")) {
      this.ticketGeradoId = t.getAttribute("data-ver-ticket");
      if (this.view !== "registrar") {
        location.hash = "#/registrar";
        return;
      }
      this.render();
      this.root.querySelector("#ticket-print")?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    if (t.hasAttribute("data-pick")) {
      this.clienteSel = t.getAttribute("data-pick");
      location.hash = `#/atender/${this.clienteSel}`;
      return;
    }
    if (t.hasAttribute("data-drink")) {
      this.drinkId = t.getAttribute("data-drink");
      this.render();
      return;
    }
    if (t.hasAttribute("data-solicitar")) {
      const preset = t.getAttribute("data-solicitar") || "comparecer";
      if (preset === "inativos") {
        this.aplicarQtdVolta(this.volta.qtd || 10);
        location.hash = "#/chamar";
        return;
      }
      const map = { aniversario: ["aniversario", "aniversario"], quase: ["tampas", "quase"], comparecer: ["comparecer", "todos"] };
      const [tipo, publico] = map[preset] || ["comparecer", "todos"];
      this.aplicarModeloCamp(tipo, publico);
      location.hash = "#/campanhas";
      return;
    }
    if (t.hasAttribute("data-volta-qtd")) {
      this.volta.mensagem = this.root.querySelector("#volta-msg")?.value || this.volta.mensagem;
      this.aplicarQtdVolta(t.getAttribute("data-volta-qtd"));
      this.render();
      return;
    }
    if (t.hasAttribute("data-camp-tipo")) {
      this.syncCampForm();
      this.aplicarModeloCamp(t.getAttribute("data-camp-tipo"));
      this.render();
      return;
    }
    if (t.hasAttribute("data-camp-publico")) {
      this.syncCampForm();
      this.campForm.publico = t.getAttribute("data-camp-publico");
      this.render();
      return;
    }
    if (id === "gerar-ticket") return void this.gerarTicket();
    if (id === "print-ticket") return void window.print();
    if (id === "novo-ticket") {
      this.ticketGeradoId = null;
      this.render();
      return;
    }
    if (id === "entregar-sai") return void this.entregarSai();
    if (id === "qty-minus") {
      this.qty = Math.max(1, this.qty - 1);
      this.render();
      return;
    }
    if (id === "qty-plus") {
      this.qty = Math.min(12, this.qty + 1);
      this.render();
      return;
    }
    if (id === "do-reg") return void this.doReg();
    if (id === "scan-qr") return void this.abrirScanQr();
    if (id === "scan-nota") return void this.abrirScanNota();
    if (id === "add-drink") return void this.abrirAddDrink();
    if (id === "edit-meta") return void this.abrirEditMeta();
    if (id === "nf-ok") return void this.cadastrarFun();
    if (id === "save-cfg") return void this.salvarCfg();
    if (id === "pick-cartaz") return void this.root.querySelector("#cfg-cartaz")?.click();
    if (id === "reset-cartaz") {
      if (!confirm("Voltar à imagem padrão no app do cliente?")) return;
      return void this.post("estabelecimentos/midia", { id: this.estId, campo: "cartaz", dataUrl: "" }, "Cartaz removido.");
    }
    if (id === "pedir-volta") return void this.pedirVolta();
    if (id === "enviar-camp-casa") return void this.enviarCamp();
  },

  async gerarTicket() {
    const itens = this.ticketItens();
    if (!itens.length) {
      UI.toast("Escolha pelo menos uma bebida.");
      return;
    }
    try {
      const t = await Logic.criarTicket({ estabelecimentoId: this.estId, itens });
      if (!t) {
        UI.toast("Não foi possível gerar o QR.");
        return;
      }
      this.ticketGeradoId = t.id;
      this.render();
      UI.toast(`QR ${t.codigo} gerado. Imprima e entregue ao cliente.`);
    } catch (e) {
      UI.toast(e.message);
    }
  },

  async entregarSai() {
    const raw = this.root.querySelector("#sai-codigo")?.value || "";
    if (!String(raw).trim()) {
      UI.toast("Digite o ID da Saideira que o cliente mostra no app.");
      this.atualizarSaiPreview();
      return;
    }
    const d = window.QR?.decode ? QR.decode(raw) : { tipo: "sdr", codigo: raw };
    if (d.tipo === "ticket") {
      UI.toast("Este é o cupom da casa. O cliente lê no app dele.");
      this.atualizarSaiPreview();
      return;
    }
    const s = Logic.saideraPorCodigo(raw, this.estId);
    if (!s) {
      const c = Logic.clientePorCodigo(d.codigo);
      UI.toast(
        c
          ? `Isso é o ID de ${c.primeiroNome}, não da Saideira. Peça o código da bebida grátis.`
          : "Saideira não encontrada nesta casa. Confira o ID."
      );
      this.atualizarSaiPreview();
      return;
    }
    this.pedirConfirmacaoSaidera(s);
  },

  async doReg() {
    const cid = this.params.id || this.clienteSel;
    const c = Logic.cliente(cid);
    const b = Logic.bebida(this.drinkId);
    if (!c) {
      UI.toast("Escolha um cliente.");
      return;
    }
    if (!this.drinkId) {
      UI.toast("Cadastre uma bebida no cardápio.");
      return;
    }
    try {
      const res = await Logic.registrarConsumo({
        clienteId: cid,
        estabelecimentoId: this.estId,
        bebidaId: this.drinkId,
        quantidade: this.qty,
      });
      this.afterRegister(res, c, b);
    } catch (e) {
      UI.toast(e.message);
    }
  },

  async abrirScanQr() {
    try {
      if (window.QR?.pedirStream) await QR.pedirStream();
    } catch (e) {
      UI.toast(e.message || "Permita a câmera para ler o QR.");
    }
    const m = UI.modal({
      center: true,
      onClose: () => QR.stopScan(),
      html: `<h2>QR do cliente</h2>
        <div class="scan-stage" style="margin:16px 0">
          <div class="scan-frame live" style="margin:0 auto">
            <video id="scan-video-est" playsinline muted autoplay></video>
            <i></i><i></i><i></i><i></i>
          </div>
        </div>
        <p class="tiny muted" id="scan-hint-est" style="text-align:center;margin-bottom:12px">Aponte para o QR pessoal do cliente</p>
        <div class="search">${Icons.search()}<input id="busca-qr-modal" placeholder="Ou ID · SDR-28491"/></div>
        <div class="row wrap" style="margin-top:12px;gap:8px">
          <button type="button" class="btn btn-ghost btn-sm" data-close-modal>Cancelar</button>
        </div>`,
    });
    const abrir = (id) => {
      QR.stopScan();
      m.close();
      this.clienteSel = id;
      location.hash = `#/atender/${id}`;
    };
    m.el.querySelector("#busca-qr-modal")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const d = QR.decode(e.target.value);
      if (d.tipo === "ticket") {
        UI.toast("Este é um cupom da casa. O cliente lê no app dele.");
        return;
      }
      const c = Logic.clientePorCodigo(d.codigo);
      if (c) abrir(c.id);
      else UI.toast("Cliente não encontrado.");
    });
    const video = m.el.querySelector("#scan-video-est");
    QR.startScan({
      video,
      onCode: (_codigo, raw) => {
        const d = QR.decode(raw || _codigo);
        if (d.tipo === "ticket") {
          UI.toast("Este é o cupom da casa. O cliente lê no app dele.");
          return;
        }
        const c = Logic.clientePorCodigo(d.codigo);
        if (c) abrir(c.id);
        else UI.toast("QR do cliente não reconhecido.");
      },
      onError: (msg) => {
        const h = m.el.querySelector("#scan-hint-est");
        if (h) h.textContent = msg;
      },
    });
  },

  abrirScanNota() {
    const noCard = new Set((this.est()?.bebidas || []).map((b) => b.id));
    const rede = Store.all("bebidas").filter((b) => !noCard.has(b.id));
    if (!rede.length) {
      UI.toast("Todas as bebidas da rede já estão no cardápio.");
      return;
    }
    const m = UI.modal({
      html: `<h2>Catálogo da rede</h2>
        <p class="muted" style="margin:8px 0 12px">Marque o que esta casa vende. A meta vazia usa a padrão.</p>
        <div class="check-list">${rede.map((b) => `<label><input type="checkbox" class="nf-beb" value="${b.id}"/> ${this.esc(b.nome)}${b.marca ? " · " + this.esc(b.marca) : ""}</label>`).join("")}</div>
        <button type="button" class="btn btn-gold btn-block" id="nf-add-ok" style="margin-top:12px">Incluir selecionadas</button>`,
    });
    m.el.querySelector("#nf-add-ok")?.addEventListener("click", async () => {
      const sel = [...m.el.querySelectorAll(".nf-beb:checked")].map((i) => i.value);
      if (!sel.length) {
        UI.toast("Selecione pelo menos uma bebida.");
        return;
      }
      for (const bebidaId of sel) {
        const data = await this.post("estabelecimentos/bebida", { estabelecimentoId: this.estId, bebidaId });
        if (!data) return;
      }
      m.close();
      UI.toast("Bebidas incluídas no cardápio.");
    });
  },

  abrirAddDrink() {
    UI.modal({
      center: true,
      html: `<h2>Nova bebida</h2><div class="field" style="margin:12px 0"><span>Nome</span><input id="nd-nome" placeholder="Ex.: Chopp IPA"/></div>
        <div class="field"><span>Meta (vazio = padrão)</span><input id="nd-meta" type="number" placeholder="10"/></div>
        <button type="button" class="btn btn-gold btn-block" style="margin-top:12px" id="nd-ok">Adicionar</button>`,
    });
    document.getElementById("nd-ok")?.addEventListener("click", async () => {
      const nome = document.getElementById("nd-nome").value || "Nova bebida";
      const meta = Number(document.getElementById("nd-meta").value) || null;
      try {
        const data = await API.post("bebidas", { estabelecimentoId: this.estId, nome, meta });
        if (data.store) Store.replace(data.store);
        document.querySelector(".modal-bg")?.remove();
        UI.toast("Bebida adicionada.");
      } catch (err) {
        UI.toast(err.message);
      }
    });
  },

  abrirEditMeta() {
    const est = this.est();
    UI.modal({
      center: true,
      html: `<h2>Saideira padrão</h2><div class="field" style="margin:12px 0"><span>Tampas</span><input id="meta-pad" type="number" value="${est.metaPadrao}"/></div>
        <button type="button" class="btn btn-gold btn-block" id="meta-ok">Salvar</button>`,
    });
    document.getElementById("meta-ok")?.addEventListener("click", async () => {
      try {
        const data = await API.post("estabelecimentos/salvar", {
          id: this.estId,
          metaPadrao: document.getElementById("meta-pad").value,
        });
        if (data.store) Store.replace(data.store);
        document.querySelector(".modal-bg")?.remove();
        UI.toast("Meta padrão salva.");
      } catch (err) {
        UI.toast(err.message);
      }
    });
  },

  async cadastrarFun() {
    try {
      const data = await API.post("funcionarios", {
        estabelecimentoId: this.estId,
        nome: this.root.querySelector("#nf-nome")?.value,
        email: this.root.querySelector("#nf-email")?.value,
        senha: this.root.querySelector("#nf-senha")?.value,
        cargo: this.root.querySelector("#nf-cargo")?.value || "Garçom",
      });
      if (data.store) Store.replace(data.store);
      this.funNovo = false;
      UI.toast("Garçom cadastrado. Ele entra pelo app do garçom.");
    } catch (err) {
      UI.toast(err.message);
    }
  },

  async salvarCfg() {
    try {
      const data = await API.post("estabelecimentos/salvar", {
        id: this.estId,
        nome: this.root.querySelector("#cfg-nome")?.value,
        tipo: this.root.querySelector("#cfg-tipo")?.value,
        horario: this.root.querySelector("#cfg-hora")?.value,
        promocao: this.root.querySelector("#cfg-promo")?.value,
        cep: this.root.querySelector("#cfg-cep")?.value,
        logradouro: this.root.querySelector("#cfg-rua")?.value,
        numero: this.root.querySelector("#cfg-num")?.value,
        complemento: this.root.querySelector("#cfg-comp")?.value,
        bairro: this.root.querySelector("#cfg-bairro")?.value,
        cidade: this.root.querySelector("#cfg-cidade")?.value,
        uf: this.root.querySelector("#cfg-uf")?.value,
        metaPadrao: this.root.querySelector("#cfg-meta")?.value,
      });
      if (data.store) Store.replace(data.store);
      UI.toast("Configurações salvas.");
    } catch (err) {
      UI.toast(err.message);
    }
  },

  async pedirVolta() {
    this.volta.mensagem = this.root.querySelector("#volta-msg")?.value || this.volta.mensagem;
    this.volta.ids = [...this.root.querySelectorAll(".volta-list input:checked")].map((i) => i.value);
    if (!this.volta.ids.length) {
      UI.toast("Selecione pelo menos um cliente.");
      return;
    }
    const modelo = Logic.modelosCampanhaCasa(this.est()).chamar;
    const cam = await Logic.solicitarCampanhaCasa({
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
        <p class="notice">O Admin Saideira valida e ativa o disparo. Nada entra no app até lá.</p>
        <button type="button" class="btn btn-gold btn-block" style="margin-top:12px" data-close-modal>Ok</button>`,
    });
  },

  async enviarCamp() {
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
    const cam = await Logic.solicitarCampanhaCasa(payload);
    UI.modal({
      center: true,
      html: `<h2>Pedido enviado ao Admin Saideira</h2>
        <p class="muted" style="margin:10px 0 6px">${cam.titulo}</p>
        <p class="small muted">${Logic.publicoCampanhaLabel(cam.publico)} · ${cam.publicoPotencial.toLocaleString("pt-BR")} destinatários · canal ${cam.canal}.</p>
        <p class="notice" style="margin:12px 0">Nada entra no app até o Admin validar e ativar o disparo.</p>
        <button type="button" class="btn btn-gold btn-block" data-close-modal>Ok</button>`,
    });
  },

  bind() {
    UI.fixButtons(this.root);
    const lock = this.root.querySelector("[data-plano-lock]");
    if (lock) {
      let t;
      const on = () => {
        clearTimeout(t);
        lock.classList.add("is-on");
      };
      const off = (ms) => {
        clearTimeout(t);
        if (ms) t = setTimeout(() => lock.classList.remove("is-on"), ms);
        else lock.classList.remove("is-on");
      };
      lock.addEventListener("pointerenter", on);
      lock.addEventListener("pointerleave", () => off(0));
      lock.addEventListener("pointerdown", on);
      lock.addEventListener("pointerup", () => off(1600));
      lock.addEventListener("pointercancel", () => off(0));
    }
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
      else UI.toast("Cliente não encontrado nesta casa.");
    });
    this.root.querySelectorAll("[data-filtro]").forEach((b) =>
      b.addEventListener("click", () => {
        this[b.getAttribute("data-filtro")] = b.getAttribute("data-val") || "";
        this.cliPage = 1;
        this.render();
      })
    );
    this.root.querySelector("#dash-dia-inp")?.addEventListener("change", (e) => {
      const v = e.target.value;
      if (!v) return;
      this.dashDia = v;
      this.render();
      this.root.querySelector(".dash-dia-panel")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    this.root.querySelector("#casa-beb-busca")?.addEventListener("input", (e) => {
      this.bebQ = e.target.value;
      this.render();
      const el = this.root.querySelector("#casa-beb-busca");
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
    this.root.querySelector("#q-sai-casa")?.addEventListener("input", (e) => {
      this.saiQ = e.target.value;
      this.render();
      const el = this.root.querySelector("#q-sai-casa");
      if (el) {
        el.focus();
        const n = el.value.length;
        el.setSelectionRange(n, n);
      }
    });
    this.root.querySelector("#sai-codigo")?.addEventListener("input", () => this.atualizarSaiPreview());
    this.root.querySelector("#sai-codigo")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.entregarSai();
    });
    this.atualizarSaiPreview();
    this.root.querySelector("#busca-cli")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const d = QR.decode(e.target.value);
      if (d.tipo === "ticket") {
        UI.toast("Este é um cupom da casa. O cliente lê no app dele.");
        return;
      }
      const c = Logic.clientePorCodigo(d.codigo);
      if (c) {
        this.clienteSel = c.id;
        location.hash = `#/atender/${c.id}`;
        this.route();
      } else UI.toast("Cliente não encontrado.");
    });
    const cepEl = this.root.querySelector("#cfg-cep");
    cepEl?.addEventListener("input", () => {
      cepEl.value = Logic.maskCep(cepEl.value);
    });
    cepEl?.addEventListener("blur", async () => {
      const d = await Logic.viaCep(cepEl.value);
      if (!d) return;
      const set = (id, v) => {
        const el = this.root.querySelector(id);
        if (el && v) el.value = v;
      };
      set("#cfg-rua", d.logradouro);
      set("#cfg-bairro", d.bairro);
      set("#cfg-cidade", d.cidade);
      set("#cfg-uf", d.uf);
    });
    this.root.querySelector("#cfg-cartaz")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await Logic.lerCartazArquivo(file);
        await this.post("estabelecimentos/midia", { id: this.estId, campo: "cartaz", dataUrl }, "Cartaz enviado. O cliente já vê no app.");
      } catch (err) {
        UI.toast(err.message || "Não foi possível usar esta imagem.");
      }
    });
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
  },
};

window.EstApp = EstApp;
document.addEventListener("DOMContentLoaded", () => EstApp.boot());
