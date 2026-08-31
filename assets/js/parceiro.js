const ParceiroApp = {
  root: null,
  view: "dashboard",
  parId: null,
  camId: "",
  sol: null,
  camPage: 1,
  estPage: 1,
  perPage: 10,

  async boot() {
    const ok = await Store.init({ papel: "parceiro" });
    if (!ok) return;
    this.parId = Store.session?.parceiroId;
    UI.bindGlobal();
    this.root = document.getElementById("app");
    this.root.addEventListener("click", (e) => this.onClick(e));
    Store.on(() => this.render());
    window.addEventListener("hashchange", () => this.route());
    this.route();
    if (window.SaideraShell) SaideraShell.ready();
  },

  par() {
    return Store.find("parceiros", this.parId);
  },

  ensureSol() {
    const drinks = Logic.bebidasDoParceiro(this.par());
    const per = Logic.periodoCampanha();
    if (!this.sol) {
      this.sol = {
        bebidaId: drinks[0]?.id || Logic.primeiraBebida()?.id || null,
        meta: 6,
        obj: "Acelerar Saideira",
        msg: "Essa semana sua Saideira chega mais rápido.",
        inicio: per.inicio,
        fim: per.fim,
        umDia: false,
        busca: "",
        selected: [],
      };
    }
    if (!drinks.some((b) => b.id === this.sol.bebidaId)) this.sol.bebidaId = drinks[0]?.id || Logic.primeiraBebida()?.id || null;
    return this.sol;
  },

  syncSol() {
    if (!this.sol) return;
    const g = (id) => this.root.querySelector(id);
    if (g("#obj")) this.sol.obj = g("#obj").value;
    if (g("#bebida")) this.sol.bebidaId = g("#bebida").value;
    if (g("#meta")) this.sol.meta = Number(g("#meta").value) || 6;
    if (g("#msg")) this.sol.msg = g("#msg").value;
    if (g("#sol-inicio")) this.sol.inicio = Logic.isoParaBR(g("#sol-inicio").value);
    if (g("#sol-fim")) this.sol.fim = Logic.isoParaBR(g("#sol-fim").value);
    if (g("#sol-busca")) this.sol.busca = g("#sol-busca").value;
    this.sol.umDia = Boolean(g("#sol-umdia")?.checked);
    if (this.sol.umDia) this.sol.fim = this.sol.inicio;
    this.sol.selected = [...this.root.querySelectorAll("#est-list input:checked")].map((i) => i.value);
  },

  route() {
    const parts = (location.hash || "#/dashboard").replace(/^#\/?/, "").split("/").filter(Boolean);
    this.view = parts[0] || "dashboard";
    this.camId = parts[1] || "";
    this.render();
  },

  render() {
    if (!this.par()) {
      this.root.innerHTML = `<main class="landing" style="padding:32px 16px;max-width:480px;margin:0 auto;text-align:center">
        <p class="muted">Esta conta de parceiro está incompleta.</p>
        <a class="btn btn-gold" style="margin-top:16px" href="../index.php">Voltar</a>
      </main>`;
      return;
    }
    const map = {
      dashboard: () => this.dashboard(),
      campanhas: () => this.campanhas(),
      detalhe: () => this.detalhe(),
      solicitar: () => this.solicitar(),
      estabelecimentos: () => this.estabelecimentos(),
    };
    const html = (map[this.view] || map.dashboard)();
    const items = [
      ["dashboard", "Dashboard", Icons.home()],
      ["campanhas", "Campanhas", Icons.megaphone()],
      ["solicitar", "Solicitar campanha", Icons.send()],
      ["estabelecimentos", "Estabelecimentos", Icons.building()],
    ];
    this.root.innerHTML = `<div class="dash-app">
      <div class="sidebar-scrim" data-close-menu></div>
      <aside class="sidebar" id="sidebar">
        ${Brand.sideHead("Parceiro")}
        <div class="notice" style="margin:0 10px 10px">${this.par().nome}<br/>${this.par().selo}</div>
        <nav>${items.map(([id, l, ic]) => `<a class="${this.view === id ? "on" : ""}" href="#/${id}">${ic}${l}</a>`).join("")}</nav>
        <div class="side-foot"><a class="btn btn-ghost btn-sm btn-block" href="../index.php?sair=1">Sair</a></div>
      </aside>
      <main class="dash-main">
        <div class="dash-head">
          <div class="row"><button class="icon-btn menu-btn" data-menu>${Icons.menu()}</button>
          <div><p class="tiny muted">Painel do parceiro</p><h1>${this.par().nome}</h1></div></div>
          <a class="btn btn-gold btn-sm" href="#/solicitar">Nova solicitação</a>
        </div>
        ${html}
      </main>
    </div>`;
    this.bind();
  },

  dashboard() {
    const r = Logic.resumoParceiro(this.parId);
    const drinks = Logic.bebidasDoParceiro(this.par()).map((b) => b.id);
    const week = Logic.semanaTampas(null, null, 14, drinks);
    const n = (v) => Number(v || 0).toLocaleString("pt-BR");
    return `${Brand.banner("secundario", "brand-banner")}<div class="kpis">
      ${[
        ["Campanhas ativas", n(r.campanhasAtivas)],
        ["Estabelecimentos", n(r.estabelecimentos)],
        ["Clientes alcançados", n(r.clientesAlcancados)],
        ["Participações", n(r.participacoes)],
        ["Tampas registradas", n(r.tampas)],
        ["Saideiras", n(r.saideras)],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`)
        .join("")}
    </div>
    <section class="panel">
      <h3>Tampas da marca nos últimos 14 dias</h3>
      ${week.values.some((v) => v) ? UI.lineChart(week.values, week.labels, week.keys) : `<p class="muted empty-msg">Ainda não há consumos desta marca.</p>`}
    </section>`;
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

  fatia(list, pageKey) {
    const per = this.perPage;
    const pages = Math.max(1, Math.ceil(list.length / per));
    if (this[pageKey] > pages) this[pageKey] = pages;
    if (this[pageKey] < 1) this[pageKey] = 1;
    const page = this[pageKey];
    const start = (page - 1) * per;
    const slice = list.slice(start, start + per);
    const from = list.length ? start + 1 : 0;
    const to = start + slice.length;
    return { page, pages, slice, from, to, total: list.length };
  },

  campanhas() {
    const list = Store.all("campanhas").filter((c) => c.parceiroId === this.parId);
    const { page, pages, slice, from, to, total } = this.fatia(list, "camPage");
    return `<section class="panel">
      <p class="muted small" style="margin-bottom:12px">${total ? `${from}–${to} de ${total} campanhas` : "Nenhuma campanha desta marca."}</p>
      ${slice
        .map(
          (c) => `<a class="row between" href="#/detalhe/${c.id}" style="padding:14px 0;border-bottom:1px solid #2a2a2a;display:flex">
          <div>
            <strong>${c.titulo}</strong>
            <p class="tiny muted">${c.status} · ${(c.estabelecimentos || []).length} estabelecimentos · ${(c.participantes || 0).toLocaleString("pt-BR")} participantes</p>
          </div>
          <span class="badge ${c.status === "ativa" && c.disparada ? "badge-green" : c.status === "solicitada" ? "badge-gold" : "badge-ghost"}">${c.status === "ativa" && c.disparada ? "patrocínio ativo" : c.status}</span>
        </a>`
        )
        .join("")}
      ${this.pager(page, pages, "Páginas de campanhas")}
    </section>`;
  },

  detalhe() {
    const c = Store.find("campanhas", this.camId);
    if (!c || c.parceiroId !== this.parId) {
      return `<section class="panel"><p class="muted">Campanha não encontrada.</p><a class="btn btn-ghost" href="#/campanhas">Voltar</a></section>`;
    }
    const n = (v) => Number(v || 0).toLocaleString("pt-BR");
    const week = Logic.semanaTampas(null, null, 14, c.bebidaId || null);
    const rank = (c.estabelecimentos || [])
      .map((id) => {
        const e = Logic.est(id);
        const qtd = Store.all("saideras").filter(
          (s) => s.estabelecimentoId === id && (s.campanhaId === c.id || (c.bebidaId && s.bebidaId === c.bebidaId))
        ).length;
        return { nome: e?.nome || id, qtd };
      })
      .sort((a, b) => b.qtd - a.qtd);
    const status = c.status === "ativa" && c.disparada ? "Ativa" : c.status || "—";
    return `<p class="tiny muted" style="margin-bottom:12px"><a href="#/campanhas" style="color:#F5B800">Campanhas</a> · ${c.titulo}</p>
    <div class="kpis">
      ${[
        ["Status", status],
        ["Estabelecimentos", n((c.estabelecimentos || []).length)],
        ["Público potencial", n(c.publicoPotencial)],
        ["Participantes", n(c.participantes)],
        ["Saideiras", n(c.saideras)],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`)
        .join("")}
    </div>
    <div class="grid-2">
      <section class="panel"><h3>Tampas nos últimos 14 dias</h3>${week.values.some((v) => v) ? UI.lineChart(week.values, week.labels, week.keys) : `<p class="muted empty-msg">Ainda não há consumos desta campanha.</p>`}</section>
      <section class="panel"><h3>Casas desta campanha</h3>
        ${rank.length ? rank.map((r, i) => `<div class="row between" style="padding:8px 0"><span>${i + 1}. ${r.nome}</span><strong>${n(r.qtd)}</strong></div>`).join("") : `<p class="muted empty-msg">Nenhuma casa vinculada.</p>`}
      </section>
    </div>
    <p class="notice" style="margin-top:14px">Parceiros não visualizam dados pessoais dos consumidores. Apenas totais agregados.</p>`;
  },

  solicitar() {
    const s = this.ensureSol();
    const drinks = Logic.bebidasDoParceiro(this.par());
    const ests = Logic.estsQueVendem(s.bebidaId);
    const q = (s.busca || "").trim().toLowerCase();
    const visiveis = ests.filter((e) => {
      if (!q) return true;
      return [e.nome, e.bairro, Logic.tipoEst(e)].some((v) => (v || "").toLowerCase().includes(q));
    });
    const beb = Logic.bebida(s.bebidaId);
    const selected = s.selected.filter((id) => ests.some((e) => e.id === id));
    s.selected = selected;
    return `<section class="panel" style="max-width:760px">
      <p class="muted" style="margin-bottom:12px">Só aparecem bares e restaurantes que já vendem a bebida desta marca. O Admin Saideira ainda precisa ativar o disparo.</p>
      <div class="form-grid">
        <div class="field"><span>Objetivo</span>
          <select id="obj">
            ${["Acelerar Saideira", "Lançamento de produto", "Reativar inativos", "Aumentar penetração"]
              .map((o) => `<option ${s.obj === o ? "selected" : ""}>${o}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field"><span>Bebida da marca</span>
          <select id="bebida">${drinks.map((b) => `<option value="${b.id}" ${b.id === s.bebidaId ? "selected" : ""}>${b.nome}</option>`).join("")}</select>
        </div>
        <div class="field"><span>Meta de Tampas</span><input type="number" value="${s.meta}" id="meta" min="3" max="12"/></div>
        <div class="field"><span>Vigência</span>
          <label class="row" style="margin-top:8px"><input type="checkbox" id="sol-umdia" ${s.umDia ? "checked" : ""}/> Só um dia</label>
        </div>
        <div class="field"><span>${s.umDia ? "Dia da oferta" : "De"}</span><input id="sol-inicio" type="date" value="${Logic.brParaIso(s.inicio)}"/></div>
        ${s.umDia ? "" : `<div class="field"><span>Até</span><input id="sol-fim" type="date" value="${Logic.brParaIso(s.fim)}"/></div>`}
      </div>
      <div class="field" style="margin-top:12px"><span>Mensagem no app do cliente</span>
        <textarea id="msg" rows="3">${s.msg}</textarea>
      </div>
      <h3 style="margin:16px 0 8px">Casas que vendem ${beb?.nome || "esta bebida"}</h3>
      <p class="tiny muted">${ests.length} bar${ests.length === 1 ? "" : "es"} e restaurante${ests.length === 1 ? "" : "s"} na Saideira. Escolha com quem fazer a parceria.</p>
      <div class="search" style="margin:10px 0">${Icons.search()}<input id="sol-busca" placeholder="Filtrar por nome ou bairro" value="${(s.busca || "").replace(/"/g, "&quot;")}"/></div>
      <div class="row wrap" style="margin-bottom:8px;gap:8px">
        <button type="button" class="btn btn-dark btn-sm" id="sel-visiveis">Selecionar visíveis</button>
        <button type="button" class="btn btn-ghost btn-sm" id="limpar-sel">Limpar</button>
        <span class="tiny muted">${selected.length} selecionada${selected.length === 1 ? "" : "s"}</span>
      </div>
      <div class="check-list" id="est-list" style="max-height:320px">
        ${
          visiveis
            .map(
              (e) =>
                `<label><input type="checkbox" value="${e.id}" ${selected.includes(e.id) ? "checked" : ""}/> ${e.nome} · ${Logic.tipoEst(e)} · ${e.bairro}</label>`
            )
            .join("") || "<p class='muted' style='padding:12px'>Nenhuma casa vende esta bebida nesta marca.</p>"
        }
      </div>
      <button class="btn btn-gold btn-block" style="margin-top:16px" id="enviar-sol">Enviar solicitação à Saideira</button>
    </section>`;
  },

  estabelecimentos() {
    const drinks = Logic.bebidasDoParceiro(this.par());
    const ids = drinks.map((b) => b.id);
    const list = Logic.estsQueVendem(ids);
    const nomes = drinks.map((b) => b.nome).join(" · ");
    const { page, pages, slice, from, to, total } = this.fatia(list, "estPage");
    return `<section class="panel">
      <p class="muted" style="margin-bottom:12px">Somente casas que vendem ${nomes || "as bebidas desta marca"}.</p>
      <p class="tiny muted" style="margin-bottom:12px">${total ? `${from}–${to} de ${total}` : "Nenhum estabelecimento com as bebidas desta marca."}</p>
      ${slice
        .map(
          (e) =>
            `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a"><div><strong>${e.nome}</strong><p class="tiny muted">${Logic.tipoEst(e)} · ${e.bairro || ""}</p></div><span class="muted">${e.status === "ativo" ? "Ativa" : e.status || ""}</span></div>`
        )
        .join("")}
      ${this.pager(page, pages, "Páginas de estabelecimentos")}
    </section>`;
  },

  onClick(e) {
    const t = e.target.closest("button, [data-page]");
    if (!t || t.disabled) return;
    if (t.closest("[data-menu], [data-close-menu], [data-close-modal]")) return;
    if (t.hasAttribute("data-page")) {
      const n = Number(t.getAttribute("data-page"));
      const key = this.view === "campanhas" ? "camPage" : this.view === "estabelecimentos" ? "estPage" : null;
      if (!key || !n || n === this[key]) return;
      this[key] = n;
      this.render();
      this.root.querySelector(".dash-main .panel")?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    if (t.id === "sel-visiveis") {
      this.syncSol();
      const visiveis = [...this.root.querySelectorAll("#est-list input")].map((i) => i.value);
      this.sol.selected = [...new Set([...this.sol.selected, ...visiveis])];
      this.render();
      return;
    }
    if (t.id === "limpar-sel") {
      this.syncSol();
      this.sol.selected = [];
      this.render();
      return;
    }
    if (t.id === "enviar-sol") return void this.enviarSol();
  },

  async enviarSol() {
    this.syncSol();
    const s = this.sol;
    const selected = (s.selected || []).filter((id) => Logic.vendeBebida(id, s.bebidaId));
    if (selected.length < 1) {
      UI.toast("Escolha pelo menos uma casa que vende esta bebida.");
      return;
    }
    const inicio = s.inicio || Logic.periodoCampanha().inicio;
    const fim = s.umDia ? inicio : s.fim || inicio;
    try {
      const data = await API.post("campanhas", {
        titulo: `${s.obj} · ${Logic.bebida(s.bebidaId)?.nome || "Marca"}`,
        parceiroId: this.parId,
        mensagem: s.msg,
        metaTampas: s.meta,
        alteraMeta: true,
        bebidaId: s.bebidaId,
        estabelecimentos: selected,
        periodoInicio: inicio,
        periodoFim: fim,
      });
      if (data.store) Store.replace(data.store);
      this.sol.selected = [];
      UI.modal({
        center: true,
        html: `<h2>Solicitação enviada para análise.</h2>
          <p class="muted" style="margin:10px 0">As ${selected.length} casas foram avisadas. O Admin Saideira ainda precisa ativar o disparo.</p>
          <button type="button" class="btn btn-gold btn-block" data-close-modal>Ok</button>`,
      });
    } catch (err) {
      UI.toast(err.message);
    }
  },

  bind() {
    UI.fixButtons(this.root);
    this.root.querySelector("#bebida")?.addEventListener("change", () => {
      this.syncSol();
      this.sol.selected = this.sol.selected.filter((id) => Logic.vendeBebida(id, this.sol.bebidaId));
      this.render();
    });
    this.root.querySelector("#sol-umdia")?.addEventListener("change", () => {
      this.syncSol();
      this.render();
    });
    this.root.querySelector("#sol-busca")?.addEventListener("input", (e) => {
      this.syncSol();
      this.sol.busca = e.target.value;
      this.render();
      const again = this.root.querySelector("#sol-busca");
      if (again) {
        again.focus();
        const len = again.value.length;
        again.setSelectionRange(len, len);
      }
    });
  },
};

document.addEventListener("DOMContentLoaded", () => ParceiroApp.boot());
