const EstApp = {
  root: null,
  view: "dashboard",
  params: {},
  estId: "est-001",
  qty: 1,
  drinkId: "beb-001",
  clienteSel: "cli-001",

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
            <div class="search wide search">${Icons.search()}<input placeholder="Buscar cliente" data-jump-search/></div>
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
            `<a class="${this.view === id ? "on" : ""}" href="#/${id}">${ic}<span>${l}</span></a>`
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

  clientes() {
    const list = Logic.clientesDoEst(this.estId).slice(0, 50);
    const rows = list
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
    return `<section class="panel">
      <p class="muted small" style="margin-bottom:12px">${list.length} clientes com movimento neste estabelecimento.</p>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Favorita</th><th>Tampas</th><th>Saideras</th><th>Última visita</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
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
    const niver = Logic.clientesDoEst(this.estId).filter((c) => c.nascimento?.includes("/08/") || c.nascimento?.includes("/11/")).slice(0, 6);
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
            return `<div class="row between" style="padding:8px 0"><div><strong>${c?.primeiroNome}</strong><p class="tiny muted">${Logic.bebida(t.bebidaId).nome} ${t.atual}/${t.meta}</p></div><span class="gold small">Falta ${t.meta - t.atual}</span></div>`;
          })
          .join("")}
      </section>
    </div>
    <div class="grid-2" style="margin-top:14px">
      <section class="panel">
        <h3>Aniversariantes</h3>
        ${niver.map((c) => `<div class="row between" style="padding:8px 0"><span>${c.nome}</span><span class="muted small">${c.nascimento}</span></div>`).join("")}
      </section>
      <section class="panel">
        <h3>Clientes inativos</h3>
        ${inativos
          .map((c) => {
            const t = Store.all("tampas").find((x) => x.clienteId === c.id && x.estabelecimentoId === this.estId);
            return `<div class="row between" style="padding:8px 0">
              <div><strong>${c.nome}</strong><p class="tiny muted">${Logic.bebida(t?.bebidaId || "beb-001").nome} · ${t ? t.atual + "/" + t.meta : "—"} · última visita há 37 dias</p></div>
              <button class="btn btn-navy btn-sm" data-solicitar>Solicitar campanha</button>
            </div>`;
          })
          .join("")}
      </section>
    </div>`;
  },

  campanhas() {
    const list = Store.all("campanhas").filter((c) => (c.estabelecimentos || []).includes(this.estId));
    return `<section class="panel">${list
      .map((c) => {
        const p = Store.find("parceiros", c.parceiroId);
        const on = c.status === "ativa" && c.disparada;
        return `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a">
          <div><strong>${c.titulo}</strong><p class="tiny muted">${p?.nome} · ${Logic.bebida(c.bebidaId)?.nome} · ${c.status}${on ? " · visível no app" : ""}</p></div>
          <span class="badge ${on ? "badge-gold" : "badge-navy"}">${c.metaTampas} Tampas</span>
        </div>`;
      })
      .join("") || "<p class='muted'>Nenhuma campanha neste estabelecimento.</p>"}</section>`;
  },

  config() {
    const est = this.est();
    return `<section class="panel" style="max-width:560px">
      <div class="field"><span>Nome</span><input value="${est.nome}"/></div>
      <div class="field" style="margin-top:10px"><span>Bairro</span><input value="${est.bairro}"/></div>
      <div class="field" style="margin-top:10px"><span>Saidera padrão</span><input type="number" value="${est.metaPadrao}"/></div>
      <button class="btn btn-gold" style="margin-top:16px" id="save-cfg">Salvar (demo)</button>
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
    this.root.querySelector("#save-cfg")?.addEventListener("click", () => UI.toast("Configurações salvas nesta demonstração."));
    this.root.querySelectorAll("[data-solicitar]").forEach((b) =>
      b.addEventListener("click", () => {
        UI.toast("Solicitação de campanha enviada ao Saidera.");
        location.hash = "#/campanhas";
      })
    );
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
