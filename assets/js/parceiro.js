const ParceiroApp = {
  root: null,
  view: "dashboard",
  parId: "par-001",

  boot() {
    Store.init();
    UI.bindGlobal();
    this.root = document.getElementById("app");
    Store.on(() => this.render());
    window.addEventListener("hashchange", () => this.route());
    this.route();
  },

  par() {
    return Store.find("parceiros", this.parId);
  },

  route() {
    this.view = (location.hash || "#/dashboard").slice(2).split("/")[0] || "dashboard";
    this.render();
  },

  render() {
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
        <div class="logo-row pad"><div class="logo-mark">S</div><div><strong>SAIDERA</strong><p class="tiny muted">Parceiro</p></div></div>
        <div class="notice" style="margin:0 10px 10px">${this.par().nome}<br/>${this.par().selo}</div>
        <nav>${items.map(([id, l, ic]) => `<a class="${this.view === id ? "on" : ""}" href="#/${id}">${ic}${l}</a>`).join("")}</nav>
        <div class="side-foot"><a class="btn btn-ghost btn-sm btn-block" href="../index.html">Trocar perfil</a></div>
      </aside>
      <main class="dash-main">
        <div class="dash-head">
          <div class="row"><button class="icon-btn menu-btn" data-menu>${Icons.menu()}</button>
          <div><p class="tiny muted">Painel do parceiro · Dados demonstrativos</p><h1>${this.par().nome}</h1></div></div>
          <a class="btn btn-gold btn-sm" href="#/solicitar">Nova solicitação</a>
        </div>
        ${html}
      </main>
    </div>${UI.demoWidget()}`;
    this.bind();
  },

  dashboard() {
    const p = this.par();
    const week = { labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"], values: [420, 610, 880, 1742] };
    return `<div class="kpis">
      ${[
        ["Campanhas ativas", p.campanhasAtivas],
        ["Estabelecimentos", p.estabelecimentos],
        ["Clientes alcançados", p.clientesAlcancados.toLocaleString("pt-BR")],
        ["Participações", p.participacoes.toLocaleString("pt-BR")],
        ["Tampas registradas", p.tampas.toLocaleString("pt-BR")],
        ["Saideras", p.saideras.toLocaleString("pt-BR")],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`)
        .join("")}
    </div>
    <section class="panel">
      <h3>Evolução de Saideras — Agosto (demo)</h3>
      ${UI.lineChart(week.values, week.labels)}
    </section>`;
  },

  campanhas() {
    const list = Store.all("campanhas").filter((c) => c.parceiroId === this.parId);
    return `<section class="panel">${list
      .map(
        (c) => `<a class="row between" href="#/detalhe" style="padding:14px 0;border-bottom:1px solid #2a2a2a;display:flex">
          <div>
            <strong>${c.titulo}</strong>
            <p class="tiny muted">${c.status} · ${c.estabelecimentos.length} estabelecimentos · ${c.participantes.toLocaleString("pt-BR")} participantes</p>
          </div>
          <span class="badge ${c.status === "ativa" ? "badge-green" : "badge-ghost"}">${c.status}</span>
        </a>`
      )
      .join("")}</section>`;
  },

  detalhe() {
    const c = Store.find("campanhas", "cam-001");
    const rank = [
      ["Bar do Farol", 412],
      ["Point Orla", 301],
      ["Orla Lounge", 274],
      ["Aracaju Beer House", 198],
      ["Bar da Passarela", 176],
    ];
    return `<div class="kpis">
      ${[
        ["Status", "Ativa"],
        ["Estabelecimentos", c.estabelecimentos.length],
        ["Público potencial", c.publicoPotencial.toLocaleString("pt-BR")],
        ["Participantes", c.participantes.toLocaleString("pt-BR")],
        ["Saideras", c.saideras.toLocaleString("pt-BR")],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`)
        .join("")}
    </div>
    <div class="grid-2">
      <section class="panel"><h3>Evolução</h3>${UI.lineChart([180, 420, 890, 1320, 1742], ["S1", "S2", "S3", "S4", "S5"])}</section>
      <section class="panel"><h3>Ranking de estabelecimentos</h3>
        ${rank.map((r, i) => `<div class="row between" style="padding:8px 0"><span>${i + 1}. ${r[0]}</span><strong>${r[1]}</strong></div>`).join("")}
      </section>
    </div>
    <p class="notice" style="margin-top:14px">Parceiros não visualizam dados pessoais dos consumidores. Apenas totais agregados.</p>`;
  },

  solicitar() {
    const ests = Store.all("estabelecimentos").slice(0, 18);
    return `<section class="panel" style="max-width:760px">
      <p class="muted" style="margin-bottom:12px">Monte a solicitação. O disparo só é feito pelo Admin Saidera.</p>
      <div class="form-grid">
        <div class="field"><span>Objetivo</span>
          <select id="obj"><option>Acelerar Saidera</option><option>Lançamento de produto</option><option>Reativar inativos</option><option>Aumentar penetração</option></select>
        </div>
        <div class="field"><span>Marca / produto</span>
          <select><option>Heineken (demonstrativa)</option><option>Heineken 0.0</option></select>
        </div>
        <div class="field"><span>Período</span><input value="19/08/2026 a 31/08/2026"/></div>
        <div class="field"><span>Meta de Tampas</span><input type="number" value="6" id="meta"/></div>
      </div>
      <div class="field" style="margin-top:12px"><span>Mensagem</span>
        <textarea id="msg" rows="3">Essa semana sua Saidera chega mais rápido.</textarea>
      </div>
      <h3 style="margin:16px 0 8px">Estabelecimentos</h3>
      <p class="tiny muted">Selecione pelo menos 5 para a demonstração.</p>
      <div class="check-list" id="est-list">
        ${ests
          .map(
            (e, i) =>
              `<label><input type="checkbox" value="${e.id}" ${i < 5 ? "checked" : ""}/> ${e.nome} · ${e.bairro}</label>`
          )
          .join("")}
      </div>
      <button class="btn btn-gold btn-block" style="margin-top:16px" id="enviar-sol">Enviar solicitação ao Saidera</button>
    </section>`;
  },

  estabelecimentos() {
    const ids = Store.find("campanhas", "cam-001").estabelecimentos;
    const extra = Store.all("estabelecimentos").slice(0, 18);
    const list = [...new Set([...ids, ...extra.map((e) => e.id)])].map((id) => Logic.est(id));
    return `<section class="panel">${list
      .map((e) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a"><div><strong>${e.nome}</strong><p class="tiny muted">${e.bairro}</p></div><span class="muted">${e.clientes} clientes</span></div>`)
      .join("")}</section>`;
  },

  bind() {
    this.root.querySelector("[data-menu]")?.addEventListener("click", () => this.root.querySelector("#sidebar")?.classList.toggle("open"));
    this.root.querySelector("#enviar-sol")?.addEventListener("click", () => {
      const selected = [...this.root.querySelectorAll('#est-list input:checked')].map((i) => i.value);
      const cam = {
        id: `cam-live-${Date.now()}`,
        titulo: "Solicitação Heineken — Demo",
        parceiroId: this.parId,
        status: "solicitada",
        mensagem: this.root.querySelector("#msg").value,
        metaTampas: Number(this.root.querySelector("#meta").value) || 6,
        bebidaId: "beb-001",
        estabelecimentos: selected,
        periodoInicio: "19/08/2026",
        periodoFim: "31/08/2026",
        publicoPotencial: 0,
        participantes: 0,
        saideras: 0,
        canal: "push",
        solicitadaEm: new Date().toISOString(),
      };
      Store.data.campanhas.unshift(cam);
      Store.save();
      UI.modal({
        center: true,
        html: `<h2>Solicitação enviada para análise.</h2><p class="muted" style="margin:10px 0">O Admin Saidera vai criar a audiência e simular o disparo.</p>
          <button class="btn btn-gold btn-block" data-close-modal>Ok</button>`,
      });
    });
  },
};

document.addEventListener("DOMContentLoaded", () => ParceiroApp.boot());
