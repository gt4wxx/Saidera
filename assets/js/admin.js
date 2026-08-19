const AdminApp = {
  root: null,
  view: "dashboard",
  params: {},
  aud: { bairros: ["Atalaia", "Coroa do Meio", "13 de Julho"], ests: ["est-001", "est-002", "est-004", "est-005", "est-009", "est-011", "est-015", "est-024"], bebidaId: "beb-001", dias: 90, canal: "push" },

  boot() {
    Store.init();
    UI.bindGlobal();
    this.root = document.getElementById("app");
    Store.on(() => this.render());
    window.addEventListener("hashchange", () => this.route());
    this.route();
  },

  route() {
    const parts = (location.hash || "#/dashboard").slice(1).split("/").filter(Boolean);
    this.view = parts[0] || "dashboard";
    this.params.id = parts[1];
    this.render();
  },

  render() {
    const items = [
      ["dashboard", "Dashboard", Icons.home()],
      ["estabelecimentos", "Estabelecimentos", Icons.building()],
      ["clientes", "Clientes", Icons.users()],
      ["parceiros", "Parceiros", Icons.spark()],
      ["campanhas", "Campanhas", Icons.megaphone()],
      ["disparos", "Disparos", Icons.send()],
      ["audiencias", "Audiências", Icons.users()],
      ["tampas", "Tampas", Icons.tampas()],
      ["saideras", "Saideras", Icons.gift()],
      ["relatorios", "Relatórios", Icons.chart()],
      ["auditoria", "Auditoria", Icons.clipboard()],
      ["config", "Configurações", Icons.settings()],
    ];
    const map = {
      dashboard: () => this.dashboard(),
      estabelecimentos: () => this.estabelecimentos(),
      clientes: () => this.clientes(),
      parceiros: () => this.parceiros(),
      campanhas: () => this.campanhas(),
      disparos: () => this.disparos(),
      audiencias: () => this.audiencias(),
      tampas: () => this.tampas(),
      saideras: () => this.saideras(),
      relatorios: () => this.relatorios(),
      auditoria: () => this.auditoria(),
      config: () => this.config(),
    };
    const html = (map[this.view] || map.dashboard)();
    this.root.innerHTML = `<div class="dash-app">
      <aside class="sidebar" id="sidebar">
        <div class="logo-row pad"><div class="logo-mark">S</div><div><strong>SAIDERA</strong><p class="tiny muted">Admin Master</p></div></div>
        <nav>${items.map(([id, l, ic]) => `<a class="${this.view === id ? "on" : ""}" href="#/${id}">${ic}${l}</a>`).join("")}</nav>
        <div class="side-foot"><p class="tiny muted">Nenhuma marca aqui é parceria oficial.</p>
          <a class="btn btn-ghost btn-sm btn-block" href="../index.html">Trocar perfil</a></div>
      </aside>
      <main class="dash-main">
        <div class="dash-head">
          <div class="row"><button class="icon-btn menu-btn" data-menu>${Icons.menu()}</button>
          <div><p class="tiny muted">Aracaju/SE · Dados demonstrativos</p><h1>${items.find((i) => i[0] === this.view)?.[1] || "Painel"}</h1></div></div>
        </div>
        ${html}
      </main>
    </div>${UI.demoWidget()}`;
    this.bind();
  },

  dashboard() {
    return `<div class="kpis">
      ${[
        ["Estabelecimentos", "138"],
        ["Usuários", "28.450"],
        ["Tampas registradas", "184.320"],
        ["Saideras conquistadas", "14.221"],
        ["Saideras utilizadas", "11.804"],
        ["Parceiros", "12"],
        ["Campanhas", "27"],
      ]
        .map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`)
        .join("")}
    </div>
    <div class="grid-2">
      <section class="panel"><h3>Tampas na rede — 7 dias</h3>${UI.lineChart([18420, 20110, 26340, 24800, 19120, 17640, 21480], ["Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Qua"])}</section>
      <section class="panel"><h3>Saideras por bairro</h3>${UI.bars([
        { nome: "Atalaia", pct: 28 },
        { nome: "Coroa do Meio", pct: 16 },
        { nome: "Jardins", pct: 14 },
        { nome: "13 de Julho", pct: 12 },
        { nome: "Farolândia", pct: 10 },
      ])}</section>
    </div>`;
  },

  estabelecimentos() {
    const q = this.params.id || "";
    const list = Store.all("estabelecimentos");
    return `<section class="panel">
      <div class="search" style="margin-bottom:12px;max-width:360px">${Icons.search()}<input id="q-est" placeholder="Filtrar por nome ou bairro" value="${q}"/></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Nome</th><th>Bairro</th><th>Clientes</th><th>Tampas</th><th>Saideras</th><th>Padrão</th><th>Status</th></tr></thead>
        <tbody>${list
          .map(
            (e) => `<tr>
              <td><strong>${e.nome}</strong><p class="tiny muted">${e.endereco}</p></td>
              <td>${e.bairro}</td><td>${e.clientes}</td><td>${e.tampas.toLocaleString("pt-BR")}</td>
              <td>${e.saideras}</td><td>${e.metaPadrao}</td>
              <td><span class="badge ${e.status === "ativo" ? "badge-green" : "badge-ghost"}">${e.status}</span></td>
            </tr>`
          )
          .join("")}</tbody>
      </table></div>
    </section>`;
  },

  clientes() {
    const list = Store.all("clientes").slice(0, 80);
    return `<section class="panel"><div class="table-wrap"><table class="data">
      <thead><tr><th>Cliente</th><th>Código</th><th>Bairro</th><th>Favorita</th><th>Última visita</th></tr></thead>
      <tbody>${list
        .map(
          (c) => `<tr>
            <td><div class="person"><img src="${c.avatar}"/><strong>${c.nome}</strong></div></td>
            <td>${c.codigo}</td><td>${c.bairro}</td>
            <td>${Logic.bebida(c.bebidaFavoritaId)?.nome}</td><td>${c.ultimaVisita}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table></div></section>`;
  },

  parceiros() {
    return `<div class="grid-2">${Store.all("parceiros")
      .map(
        (p) => `<article class="panel">
          <div class="row between"><h3>${p.nome}</h3><span class="badge badge-navy">${p.selo}</span></div>
          <p class="muted small">${p.categoria}</p>
          <div class="kpis" style="margin-top:10px">
            <div class="kpi"><b>${p.campanhasAtivas}</b><span>Campanhas</span></div>
            <div class="kpi"><b>${p.estabelecimentos}</b><span>Bares</span></div>
            <div class="kpi"><b>${p.saideras.toLocaleString("pt-BR")}</b><span>Saideras</span></div>
          </div>
        </article>`
      )
      .join("")}</div>`;
  },

  campanhas() {
    return `<section class="panel">${Store.all("campanhas")
      .map((c) => {
        const p = Store.find("parceiros", c.parceiroId);
        return `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a">
          <div><strong>${c.titulo}</strong><p class="tiny muted">${p?.nome} · ${c.estabelecimentos.length} casas · ${c.status}</p></div>
          <div class="row">
            <span class="badge ${c.status === "solicitada" ? "badge-gold" : c.status === "ativa" ? "badge-green" : "badge-ghost"}">${c.status}</span>
            ${c.status === "solicitada" ? `<a class="btn btn-gold btn-sm" href="#/audiencias">Criar audiência</a>` : ""}
          </div>
        </div>`;
      })
      .join("")}</section>`;
  },

  audiencias() {
    const a = this.aud;
    const estSel = Store.all("estabelecimentos").filter((e) => a.ests.includes(e.id));
    const estimado = Logic.audienciasEstimar({ bairros: a.bairros, bebidaId: a.bebidaId, periodoDias: a.dias, estabelecimentos: a.ests });
    const bairros = ["Atalaia", "Coroa do Meio", "13 de Julho", "Jardins", "Farolândia", "Centro"];
    return `<div class="grid-2">
      <section class="panel">
        <h3>Segmentação</h3>
        <div class="field" style="margin:10px 0"><span>Campanha</span><input value="Heineken" disabled/></div>
        <div class="field"><span>Cidade</span><input value="Aracaju" disabled/></div>
        <p class="tiny muted" style="margin:12px 0 6px">Bairros</p>
        <div class="chips">${bairros
          .map(
            (b) =>
              `<button class="chip" data-bairro="${b}" style="${a.bairros.includes(b) ? "background:#F5B800;color:#171717" : ""}">${b}</button>`
          )
          .join("")}</div>
        <div class="field" style="margin-top:12px"><span>Consumidores de</span>
          <select id="aud-bebida">
            ${Store.all("bebidas")
              .slice(0, 8)
              .map((b) => `<option value="${b.id}" ${b.id === a.bebidaId ? "selected" : ""}>${b.nome}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field"><span>Período</span><input id="aud-dias" type="number" value="${a.dias}"/> dias</div>
        <p class="tiny muted" style="margin-top:12px">${estSel.length} estabelecimentos selecionados</p>
      </section>
      <section class="panel" style="display:grid;place-items:center;text-align:center;min-height:280px">
        <div>
          <p class="tiny muted">Audiência estimada</p>
          <h1 style="font-size:3rem;color:var(--gold)">${estimado.toLocaleString("pt-BR")}</h1>
          <p>usuários · sem dados pessoais para o parceiro</p>
          <a class="btn btn-gold" style="margin-top:16px" href="#/disparos">Ir para disparo</a>
        </div>
      </section>
    </div>`;
  },

  disparos() {
    const estimado = Logic.audienciasEstimar(this.aud);
    const solicitadas = Store.all("campanhas").filter((c) => c.status === "solicitada");
    return `<section class="panel" style="max-width:640px">
      <h3>Novo disparo</h3>
      <div class="field" style="margin:10px 0"><span>Parceiro</span>
        <select>${Store.all("parceiros").map((p) => `<option>${p.nome} — ${p.selo}</option>`).join("")}</select>
      </div>
      <div class="field"><span>Audiência</span><input value="Heineken · Orla · 90 dias"/></div>
      <div class="field"><span>Canal</span>
        <div class="pill-tabs" style="margin-top:8px">
          ${["push", "email", "whatsapp"]
            .map((c) => `<button class="${this.aud.canal === c ? "on" : ""}" data-canal="${c}">${c}</button>`)
            .join("")}
        </div>
      </div>
      <p class="notice" style="margin:14px 0">Destinatários: ${estimado.toLocaleString("pt-BR")} · simulação sem envio real</p>
      ${solicitadas.length ? `<p class="small muted">${solicitadas.length} solicitação(ões) pendente(s) de parceiros.</p>` : ""}
      <button class="btn btn-gold btn-block" id="simular">Simular disparo</button>
    </section>`;
  },

  tampas() {
    return `<div class="kpis">
      <div class="kpi"><span>Tampas na base demo</span><b>${Store.all("tampas").length}</b></div>
      <div class="kpi"><span>Consumos</span><b>${Store.all("consumos").length}</b></div>
    </div>
    <section class="panel">${UI.lineChart([18420, 20110, 26340, 24800, 19120, 17640, 21480], ["Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Qua"])}</section>`;
  },

  saideras() {
    const list = Store.all("saideras").slice(0, 50);
    const disp = Store.all("saideras").filter((s) => s.status === "disponivel").length;
    return `<div class="kpis">
      <div class="kpi"><span>Total demo</span><b>${Store.all("saideras").length}</b></div>
      <div class="kpi"><span>Disponíveis</span><b>${disp}</b></div>
    </div>
    <section class="panel"><div class="table-wrap"><table class="data">
      <thead><tr><th>Código</th><th>Cliente</th><th>Bar</th><th>Bebida</th><th>Status</th></tr></thead>
      <tbody>${list
        .map(
          (s) =>
            `<tr><td>${s.codigo}</td><td>${Logic.cliente(s.clienteId)?.nome}</td><td>${Logic.est(s.estabelecimentoId)?.nome}</td><td>${Logic.bebida(s.bebidaId)?.nome}</td><td>${s.status}</td></tr>`
        )
        .join("")}</tbody>
    </table></div></section>`;
  },

  relatorios() {
    return `<section class="panel">
      <h3>Rede Aracaju — visão executiva</h3>
      <p class="muted" style="margin:8px 0 16px">Números ilustrativos para a apresentação comercial.</p>
      ${UI.bars([
        { nome: "Conversão Saidera", pct: 83 },
        { nome: "Retenção 30 dias", pct: 61 },
        { nome: "Uso de ofertas", pct: 44 },
        { nome: "QR lido no salão", pct: 72 },
      ])}
    </section>`;
  },

  auditoria() {
    const logs = [
      ["19/08 14:02", "Registro de consumo", "Bar do Farol · Ellisson · Heineken"],
      ["19/08 13:40", "Solicitação de campanha", "Heineken Brasil (demo)"],
      ["19/08 11:12", "Entrega de Saidera", "Chopp Jardins · Stella"],
      ["18/08 22:10", "Novo estabelecimento", "Atalaia Deck"],
      ["18/08 19:02", "Meta alterada", "Bar do Farol · Heineken 8 Tampas"],
    ];
    return `<section class="panel">${logs
      .map(
        (l) =>
          `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a"><div><strong>${l[1]}</strong><p class="tiny muted">${l[2]}</p></div><span class="muted small">${l[0]}</span></div>`
      )
      .join("")}</section>`;
  },

  config() {
    return `<section class="panel" style="max-width:520px">
      <div class="field"><span>Cidade da operação</span><input value="Aracaju/SE"/></div>
      <div class="field" style="margin-top:10px"><span>Meta padrão da rede</span><input value="10"/></div>
      <button class="btn btn-gold" style="margin-top:14px" id="cfg">Salvar</button>
    </section>`;
  },

  bind() {
    this.root.querySelector("[data-menu]")?.addEventListener("click", () => this.root.querySelector("#sidebar")?.classList.toggle("open"));
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
    this.root.querySelectorAll("[data-canal]").forEach((b) =>
      b.addEventListener("click", () => {
        this.aud.canal = b.getAttribute("data-canal");
        this.render();
      })
    );
    this.root.querySelector("#simular")?.addEventListener("click", () => {
      const cam =
        Store.all("campanhas").find((c) => c.status === "solicitada") || Store.find("campanhas", "cam-001");
      Logic.ofertarCampanhaCliente(cam);
      UI.modal({
        center: true,
        html: `${UI.celebrate("Campanha enviada com sucesso", "A oferta aparece agora no app do cliente. Nenhum disparo real foi feito.")}
          <button class="btn btn-gold btn-block" style="margin-top:14px" data-close-modal>Fechar</button>`,
      });
    });
    this.root.querySelector("#cfg")?.addEventListener("click", () => UI.toast("Configurações salvas na demonstração."));
  },
};

document.addEventListener("DOMContentLoaded", () => AdminApp.boot());
