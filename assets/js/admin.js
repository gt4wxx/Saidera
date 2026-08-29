const AdminApp = {
  root: null,
  view: "dashboard",
  params: {},
  q: { est: "", cli: "", fun: "", sai: "", tam: "", cam: "" },
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
      ["saideras", "Saideras", Icons.gift()],
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
    if (!src) return "../assets/brand/icon-192.png";
    if (/^(https?:|data:|\/|\.\.\/)/.test(src)) return src;
    return `../${src}`;
  },

  badge(status) {
    const on = status === "ativo" || status === "disponivel" || status === "ativa" || status === "disparada";
    const gold = status === "solicitada";
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
      relatorios: () => this.relatorios(),
      auditoria: () => this.auditoria(),
      config: () => this.config(),
    };
    const titulo = items.find((i) => i[0] === this.view)?.[1] || "Painel";
    const html = (map[this.view] || map.dashboard)();
    this.root.innerHTML = `<div class="dash-app">
      <div class="sidebar-scrim" data-close-menu></div>
      <aside class="sidebar" id="sidebar">
        ${Brand.sideHead("Admin")}
        <nav>${items.map(([id, l, ic]) => `<a class="${this.view === id ? "on" : ""}" href="#/${id}">${ic}${l}</a>`).join("")}</nav>
        <div class="side-foot">
          <p class="tiny muted">${this.esc(Store.session?.email || "")}</p>
          <a class="btn btn-ghost btn-sm btn-block" href="../index.php?sair=1">Sair</a>
        </div>
      </aside>
      <main class="dash-main">
        <div class="dash-head">
          <div class="row"><button class="icon-btn menu-btn" data-menu>${Icons.menu()}</button>
          <div><p class="tiny muted">Painel real da rede</p><h1>${titulo}</h1></div></div>
        </div>
        ${html}
      </main>
    </div>`;
    this.bind();
  },

  dashboard() {
    const c = this.contagens();
    const r = Logic.resumoRede();
    const semana = Store.data?.meta?.semana || r.semana;
    const bairros = Store.data?.meta?.bairros || r.bairros;
    const pendentes = Store.all("campanhas").filter((x) => x.status === "solicitada" || (x.status === "ativa" && !x.disparada));
    const logs = Logic.logsAuditoria().slice(0, 6);
    const kpis = [
      ["Casas ativas", c.estabelecimentosAtivos ?? r.estabelecimentos],
      ["Clientes", c.clientes ?? r.usuarios],
      ["Contas ativas", c.usuarios ?? r.usuarios],
      ["Tampas somadas", c.tampas ?? r.tampas],
      ["Saideras", c.saideras ?? r.saideras],
      ["Disponíveis", c.saiderasDisponiveis ?? r.disponiveis],
      ["Usadas", c.saiderasUsadas ?? r.usadas],
      ["Campanhas", c.campanhas ?? r.campanhas],
    ];
    return `${Brand.banner("principal", "brand-banner-hero")}
      <p class="tiny muted" style="margin-bottom:12px">Números do banco. Sem estimativa e sem demonstração.</p>
      <div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${this.n(v)}</b></div>`).join("")}</div>
      ${pendentes.length ? `<p class="notice" style="margin-bottom:14px">${pendentes.length} campanha(s) aguardando validação. <a href="#/disparos" style="color:#F5B800">Ir para disparos</a></p>` : ""}
      <div class="grid-2">
        <section class="panel"><h3>Tampas nos últimos 7 dias</h3>${semana.values?.some((v) => v) ? UI.lineChart(semana.values, semana.labels) : this.empty("Ainda não há consumos registrados.")}</section>
        <section class="panel"><h3>Saideras por bairro</h3>${bairros.length ? UI.bars(bairros) : this.empty("Nenhuma Saidera conquistada ainda.")}</section>
      </div>
      <section class="panel" style="margin-top:14px">
        <h3>Últimos eventos</h3>
        ${logs.length ? logs.map((l) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a"><div><strong>${this.esc(l.acao)}</strong><p class="tiny muted">${this.esc(l.detalhe)}</p></div><span class="muted small">${Logic.fmtDate(l.em)}</span></div>`).join("") : this.empty("Nenhum evento ainda.")}
      </section>`;
  },

  estabelecimentos() {
    const q = this.q.est;
    const list = this.filtrar(Store.all("estabelecimentos"), q, ["nome", "bairro", "endereco", "gestorEmail"]);
    return `<section class="panel" style="margin-bottom:14px">
      <h3>Nova casa</h3>
      <p class="tiny muted" style="margin:6px 0 10px">Endereço completo com CEP. Ele aparece no Google Maps do app do cliente.</p>
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
      <button class="btn btn-gold" style="margin-top:12px" data-act="est-criar">Cadastrar casa</button>
    </section>
    <section class="panel">
      <div class="search" style="margin-bottom:12px;max-width:360px">${Icons.search()}<input id="q-est" placeholder="Filtrar por nome, bairro ou e-mail" value="${this.esc(q)}"/></div>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Casa</th><th>Tipo</th><th>Gestor</th><th>Clientes</th><th>Tampas</th><th>Saideras</th><th>Equipe</th><th>Meta</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((e) => `<tr>
          <td><strong>${this.esc(e.nome)}</strong><p class="tiny muted">${this.esc(Logic.enderecoLinha(e))}</p></td>
          <td>${this.esc(Logic.tipoEst(e))}</td>
          <td>${this.esc(e.gestorEmail || "—")}</td>
          <td>${this.n(e.qtdClientes)}</td>
          <td>${this.n(e.qtdTampas)}</td>
          <td>${this.n(e.qtdSaideras)}</td>
          <td>${this.n(e.qtdFuncionarios)}</td>
          <td>${e.metaPadrao}</td>
          <td>${this.badge(e.status)}</td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" data-act="est-editar" data-id="${e.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-act="est-status" data-id="${e.id}">${e.status === "ativo" ? "Desativar" : "Ativar"}</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma casa cadastrada.")}
    </section>`;
  },

  clientes() {
    const list = this.filtrar(Store.all("clientes"), this.q.cli, ["nome", "codigo", "email", "bairro", "telefone"]);
    return `<section class="panel" style="margin-bottom:14px">
      <h3>Novo cliente</h3>
      <div class="form-grid">
        <div class="field"><span>Nome</span><input id="nc-nome"/></div>
        <div class="field"><span>E-mail</span><input id="nc-email" type="email"/></div>
        <div class="field"><span>Senha</span><input id="nc-senha" type="password"/></div>
        <div class="field"><span>Telefone</span><input id="nc-tel"/></div>
        <div class="field"><span>Bairro</span><input id="nc-bairro"/></div>
        <div class="field"><span>Nascimento</span><input id="nc-nasc" type="date"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="cli-criar">Cadastrar cliente</button>
    </section>
    <section class="panel">
      <div class="search" style="margin-bottom:12px;max-width:360px">${Icons.search()}<input id="q-cli" placeholder="Filtrar por nome, código ou e-mail" value="${this.esc(this.q.cli)}"/></div>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Código</th><th>Contato</th><th>Bairro</th><th>Tampas</th><th>Saideras</th><th>Última visita</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((c) => `<tr>
          <td><div class="person"><img src="${this.avatar(c.avatar)}" alt=""/><strong>${this.esc(c.nome)}</strong></div></td>
          <td>${this.esc(c.codigo)}</td>
          <td>${this.esc(c.email || "—")}<p class="tiny muted">${this.esc(c.telefone || "")}</p></td>
          <td>${this.esc(c.bairro || "—")}</td>
          <td>${c.tampasTotal != null ? this.n(c.tampasTotal) : "—"}</td>
          <td>${c.saiderasTotal != null ? this.n(c.saiderasTotal) : "—"}</td>
          <td>${this.esc(c.ultimaVisita || "—")}</td>
          <td>${this.badge(c.status)}</td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" data-act="cli-editar" data-id="${c.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-act="cli-status" data-id="${c.id}">${c.status === "ativo" ? "Desativar" : "Ativar"}</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhum cliente cadastrado.")}
    </section>`;
  },

  equipe() {
    const casas = Store.all("estabelecimentos");
    const list = this.filtrar(Store.all("funcionarios"), this.q.fun, ["nome", "cargo", "email"]).map((f) => ({
      ...f,
      casa: Logic.est(f.estabelecimentoId)?.nome || "—",
    }));
    return `<section class="panel" style="margin-bottom:14px">
      <h3>Novo garçom / funcionário</h3>
      <div class="form-grid">
        <div class="field"><span>Nome</span><input id="nf-nome"/></div>
        <div class="field"><span>E-mail</span><input id="nf-email" type="email"/></div>
        <div class="field"><span>Senha</span><input id="nf-senha" type="password"/></div>
        <div class="field"><span>Cargo</span><input id="nf-cargo" value="Garçom"/></div>
        <div class="field"><span>Casa</span>
          <select id="nf-est">${casas.map((e) => `<option value="${e.id}">${this.esc(e.nome)}</option>`).join("") || `<option value="">Cadastre uma casa primeiro</option>`}</select>
        </div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="fun-criar" ${casas.length ? "" : "disabled"}>Cadastrar</button>
    </section>
    <section class="panel">
      <div class="search" style="margin-bottom:12px;max-width:360px">${Icons.search()}<input id="q-fun" placeholder="Filtrar por nome ou e-mail" value="${this.esc(this.q.fun)}"/></div>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Nome</th><th>Casa</th><th>Cargo</th><th>E-mail</th><th>Tampas hoje</th><th>Saideras entregues</th><th>Status</th><th></th></tr></thead>
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
            <button class="btn btn-ghost btn-sm" data-act="fun-status" data-id="${f.id}">${f.status === "ativo" ? "Desativar" : "Ativar"}</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhum funcionário cadastrado.")}
    </section>`;
  },

  parceiros() {
    const list = Store.all("parceiros");
    return `<section class="panel" style="margin-bottom:14px">
      <h3>Novo parceiro</h3>
      <div class="form-grid">
        <div class="field"><span>Nome</span><input id="np-nome"/></div>
        <div class="field"><span>E-mail</span><input id="np-email" type="email"/></div>
        <div class="field"><span>Senha</span><input id="np-senha" type="password"/></div>
        <div class="field"><span>Categoria</span><input id="np-cat" placeholder="Cerveja, destilado…"/></div>
        <div class="field"><span>Selo</span><input id="np-selo" placeholder="Marca no app"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="par-criar">Cadastrar parceiro</button>
    </section>
    <div class="grid-2">${list.length ? list.map((p) => `<article class="panel">
      <div class="row between"><h3>${this.esc(p.nome)}</h3>${this.badge(p.status)}</div>
      <p class="muted small">${this.esc(p.categoria || "Sem categoria")}${p.selo ? " · " + this.esc(p.selo) : ""}</p>
      <p class="tiny muted">${this.esc(p.email || "Sem login")}</p>
      <div class="kpis" style="margin-top:10px">
        <div class="kpi"><b>${this.n(p.campanhasAtivas)}</b><span>Ativas</span></div>
        <div class="kpi"><b>${this.n(p.campanhas)}</b><span>Campanhas</span></div>
        <div class="kpi"><b>${this.n(p.estabelecimentos)}</b><span>Casas</span></div>
      </div>
      <div class="table-actions" style="margin-top:12px">
        <button class="btn btn-ghost btn-sm" data-act="par-editar" data-id="${p.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-act="par-status" data-id="${p.id}">${p.status === "ativo" ? "Desativar" : "Ativar"}</button>
      </div>
    </article>`).join("") : `<section class="panel">${this.empty("Nenhum parceiro cadastrado.")}</section>`}</div>`;
  },

  bebidas() {
    const list = Store.all("bebidas");
    return `<section class="panel" style="margin-bottom:14px">
      <h3>Nova bebida da rede</h3>
      <div class="form-grid">
        <div class="field"><span>Nome</span><input id="nb-nome"/></div>
        <div class="field"><span>Tipo</span>
          <select id="nb-tipo"><option value="cerveja">Cerveja</option><option value="nao-alcoolico">Não alcoólico</option><option value="destilado">Destilado</option><option value="outros">Outros</option></select>
        </div>
        <div class="field"><span>Marca</span><input id="nb-marca"/></div>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="beb-criar">Cadastrar bebida</button>
    </section>
    <section class="panel">
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Marca</th><th></th></tr></thead>
        <tbody>${list.map((b) => `<tr>
          <td><strong>${this.esc(b.nome)}</strong></td>
          <td>${this.esc(b.tipo)}</td>
          <td>${this.esc(b.marca || "—")}</td>
          <td class="table-actions">
            <button class="btn btn-ghost btn-sm" data-act="beb-editar" data-id="${b.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-act="beb-excluir" data-id="${b.id}">Excluir</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma bebida no catálogo.")}
    </section>`;
  },

  campanhas() {
    const q = this.q.cam;
    const list = this.filtrar(Store.all("campanhas"), q, ["titulo", "status", "tipo", "mensagem"]);
    const casas = Store.all("estabelecimentos").filter((e) => e.status === "ativo");
    const pars = Store.all("parceiros").filter((p) => p.status === "ativo");
    return `<section class="panel" style="margin-bottom:14px">
      <h3>Nova campanha</h3>
      <div class="form-grid">
        <div class="field"><span>Título</span><input id="cam-titulo"/></div>
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
            <option value="quase">Próximos da Saidera</option>
          </select>
        </div>
        <div class="field"><span>Parceiro (opcional)</span>
          <select id="cam-par"><option value="">Rede / casa</option>${pars.map((p) => `<option value="${p.id}">${this.esc(p.nome)}</option>`).join("")}</select>
        </div>
        <div class="field"><span>Meta de Tampas</span><input id="cam-meta" type="number" min="1" placeholder="Vazio = não altera"/></div>
        <div class="field"><span>Canal</span>
          <select id="cam-canal"><option value="push">Push</option><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option></select>
        </div>
      </div>
      <div class="field" style="margin-top:10px"><span>Mensagem</span><textarea id="cam-msg" rows="3"></textarea></div>
      <p class="tiny muted" style="margin:10px 0 6px">Casas participantes</p>
      <div class="check-list" id="cam-ests">${casas.map((e) => `<label><input type="checkbox" value="${e.id}" checked/> ${this.esc(e.nome)}</label>`).join("") || this.empty("Cadastre uma casa primeiro.")}</div>
      <button class="btn btn-gold" style="margin-top:12px" data-act="cam-criar">Criar campanha</button>
    </section>
    <section class="panel">
      <div class="search" style="margin-bottom:12px;max-width:360px">${Icons.search()}<input id="q-cam" placeholder="Filtrar campanhas" value="${this.esc(q)}"/></div>
      ${list.length ? list.map((c) => {
        const p = Store.find("parceiros", c.parceiroId);
        const casa = Logic.est(c.estabelecimentoId || c.estabelecimentos?.[0]);
        const on = c.status === "ativa" && c.disparada;
        const origem = c.origem === "estabelecimento" ? casa?.nome || "Casa / rede" : p?.nome || "Parceiro";
        return `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a;align-items:flex-start;gap:12px">
          <div>
            <strong>${this.esc(c.titulo)}</strong>
            <p class="tiny muted">${this.esc(origem)} · ${this.esc(Logic.tipoCampanhaLabel(c.tipo))} · ${this.esc(Logic.publicoCampanhaLabel(c.publico))} · ${(c.estabelecimentos || []).length} casa(s) · ${this.n(c.publicoPotencial || 0)} destinatários</p>
            ${c.mensagem ? `<p class="small muted" style="margin-top:4px">${this.esc(c.mensagem)}</p>` : ""}
          </div>
          <div class="table-actions" style="flex-shrink:0">
            ${this.badge(on ? "disparada" : c.status)}
            ${c.status === "solicitada" || (c.status === "ativa" && !c.disparada) ? `<button class="btn btn-gold btn-sm" data-act="cam-ativar" data-id="${c.id}">Validar e disparar</button><button class="btn btn-ghost btn-sm" data-act="cam-rejeitar" data-id="${c.id}">Recusar</button><button class="btn btn-danger btn-sm" data-act="cam-excluir" data-id="${c.id}">Excluir</button>` : ""}
            ${on ? `<button class="btn btn-ghost btn-sm" data-act="cam-encerrar" data-id="${c.id}">Encerrar</button>` : ""}
          </div>
        </div>`;
      }).join("") : this.empty("Nenhuma campanha ainda.")}
    </section>`;
  },

  disparos() {
    const pendentes = Store.all("campanhas").filter((c) => c.status === "solicitada" || (c.status === "ativa" && !c.disparada));
    const estimado = Logic.audienciasEstimar(this.aud);
    return `<section class="panel" style="max-width:720px">
      <h3>Validar e disparar</h3>
      <p class="tiny muted" style="margin:6px 0 12px">O disparo cria notificação real no app dos clientes que entram no público da campanha.</p>
      <div class="field"><span>Campanha pendente</span>
        <select id="cam-disp">${pendentes.length
          ? pendentes.map((c) => {
              const origem = c.origem === "estabelecimento" ? Logic.est(c.estabelecimentoId)?.nome : Store.find("parceiros", c.parceiroId)?.nome;
              return `<option value="${c.id}">${this.esc(c.titulo)} · ${this.esc(origem || "rede")}</option>`;
            }).join("")
          : `<option value="">Nenhuma solicitação pendente</option>`}
        </select>
      </div>
      <div class="field" style="margin-top:10px"><span>Canal</span>
        <div class="pill-tabs" style="margin-top:8px">
          ${["push", "email", "whatsapp"].map((c) => `<button type="button" class="${this.aud.canal === c ? "on" : ""}" data-canal="${c}">${c}</button>`).join("")}
        </div>
      </div>
      <p class="notice" style="margin:14px 0">Audiência atual da segmentação em Audiências: ${this.n(estimado)} cliente(s) com movimento registrado.</p>
      <button class="btn btn-gold btn-block" data-act="cam-disparar" ${pendentes.length ? "" : "disabled"}>Validar e disparar</button>
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
          <a class="btn btn-gold" style="margin-top:16px" href="#/campanhas">Criar campanha</a>
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
    return `<div class="kpis">
      <div class="kpi"><span>Cartoões de progresso</span><b>${this.n(c.progressos ?? list.length)}</b></div>
      <div class="kpi"><span>Tampas somadas nos consumos</span><b>${this.n(c.tampas)}</b></div>
      <div class="kpi"><span>Consumos recentes</span><b>${this.n(Store.all("consumos").length)}</b></div>
    </div>
    <section class="panel">
      <div class="search" style="margin-bottom:12px;max-width:360px">${Icons.search()}<input id="q-tam" placeholder="Filtrar por cliente, casa ou bebida" value="${this.esc(q)}"/></div>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Casa</th><th>Bebida</th><th>Progresso</th><th>Atualizado</th></tr></thead>
        <tbody>${list.map((t) => `<tr>
          <td>${this.esc(Logic.cliente(t.clienteId)?.nome || "—")}</td>
          <td>${this.esc(Logic.est(t.estabelecimentoId)?.nome || "—")}</td>
          <td>${this.esc(Logic.bebida(t.bebidaId)?.nome || "—")}</td>
          <td>${t.atual}/${t.meta} ${UI.barra(t.atual, t.meta)}</td>
          <td>${Logic.fmtDate(t.atualizadoEm)}</td>
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
    return `<div class="kpis">
      <div class="kpi"><span>Total</span><b>${this.n(c.saideras)}</b></div>
      <div class="kpi"><span>Disponíveis</span><b>${this.n(c.saiderasDisponiveis)}</b></div>
      <div class="kpi"><span>Utilizadas</span><b>${this.n(c.saiderasUsadas)}</b></div>
      <div class="kpi"><span>Expiradas</span><b>${this.n(c.saiderasExpiradas)}</b></div>
    </div>
    <section class="panel">
      <div class="search" style="margin-bottom:12px;max-width:360px">${Icons.search()}<input id="q-sai" placeholder="Filtrar por código, cliente ou casa" value="${this.esc(q)}"/></div>
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Código</th><th>Cliente</th><th>Casa</th><th>Bebida</th><th>Validade</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((s) => `<tr>
          <td>${this.esc(s.codigo)}</td>
          <td>${this.esc(Logic.cliente(s.clienteId)?.nome || "—")}</td>
          <td>${this.esc(Logic.est(s.estabelecimentoId)?.nome || "—")}</td>
          <td>${this.esc(Logic.bebida(s.bebidaId)?.nome || "—")}</td>
          <td>${this.esc(Logic.validadeLabel(s))}</td>
          <td>${this.badge(s.status)}</td>
          <td>${s.status === "disponivel" ? `<button class="btn btn-ghost btn-sm" data-act="sai-expirar" data-id="${s.id}">Expirar</button>` : ""}</td>
        </tr>`).join("")}</tbody>
      </table></div>` : this.empty("Nenhuma Saidera conquistada ainda.")}
    </section>`;
  },

  relatorios() {
    const c = this.contagens();
    const r = Logic.resumoRede();
    const ofertas = Store.all("campanhas").filter((x) => x.disparada).length;
    const totalCam = c.campanhas || Store.all("campanhas").length;
    const porCasa = Store.all("estabelecimentos")
      .map((e) => ({ nome: e.nome, n: e.qtdSaideras || 0 }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
    const maxCasa = Math.max(1, ...porCasa.map((x) => x.n));
    return `<div class="kpis">
      <div class="kpi"><span>Conversão (usadas / total)</span><b>${r.conversao}%</b></div>
      <div class="kpi"><span>Disponíveis</span><b>${this.n(c.saiderasDisponiveis)}</b></div>
      <div class="kpi"><span>Campanhas disparadas</span><b>${this.n(ofertas)}</b></div>
      <div class="kpi"><span>Equipe</span><b>${this.n(c.funcionarios)}</b></div>
    </div>
    <section class="panel" style="margin-bottom:14px">
      <h3>Rede</h3>
      ${UI.bars([
        { nome: "Conversão de Saidera", pct: r.conversao },
        { nome: "Saideras ainda disponíveis", pct: c.saideras ? Math.round(((c.saiderasDisponiveis || 0) / c.saideras) * 100) : 0 },
        { nome: "Campanhas já disparadas", pct: totalCam ? Math.round((ofertas / totalCam) * 100) : 0 },
      ])}
    </section>
    <section class="panel">
      <h3>Saideras por casa</h3>
      ${porCasa.length && porCasa.some((x) => x.n) ? UI.bars(porCasa.map((x) => ({ nome: x.nome, pct: Math.round((x.n / maxCasa) * 100) }))) : this.empty("Ainda não há Saideras por casa.")}
    </section>`;
  },

  auditoria() {
    const logs = Logic.logsAuditoria();
    return `<section class="panel">
      ${logs.length ? logs.map((l) => `<div class="row between" style="padding:12px 0;border-bottom:1px solid #2a2a2a"><div><strong>${this.esc(l.acao)}</strong><p class="tiny muted">${this.esc(l.detalhe || "")}</p></div><span class="muted small">${Logic.fmtDate(l.em)}</span></div>`).join("") : this.empty("Nenhum evento ainda.")}
    </section>`;
  },

  config() {
    const cidade = Store.data?.meta?.cidade || "";
    const meta = Store.data?.meta?.metaPadraoRede ?? 10;
    const validade = Store.data?.meta?.validadeSaideraDias ?? 15;
    return `<section class="panel" style="max-width:520px">
      <div class="field"><span>Cidade da operação</span><input id="cfg-cidade" value="${this.esc(cidade)}"/></div>
      <div class="field" style="margin-top:10px"><span>Meta padrão da rede</span><input id="cfg-meta-rede" type="number" min="1" value="${meta}"/></div>
      <div class="field" style="margin-top:10px"><span>Validade da Saidera (dias)</span><input id="cfg-validade" type="number" min="1" value="${validade}"/></div>
      <div class="field" style="margin-top:10px"><span>Nova senha do admin</span><input id="cfg-senha" type="password" placeholder="Deixe vazio para não trocar"/></div>
      <button class="btn btn-gold" style="margin-top:14px" data-act="cfg-salvar">Salvar</button>
    </section>`;
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
    m.el.querySelector("#modal-ok")?.addEventListener("click", async () => {
      const ok = await onOk(m.el);
      if (ok !== false) m.close();
    });
  },

  bind() {
    UI.fixButtons(this.root);
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
    keep("#q-sai", "sai");
    keep("#q-tam", "tam");
    keep("#q-cam", "cam");

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
        this.aud.canal = b.getAttribute("data-canal");
        this.render();
      })
    );
    this.ligarCep(this.root, "#ne-cep", { rua: "#ne-rua", bairro: "#ne-bairro", cidade: "#ne-cidade", uf: "#ne-uf" });
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

  async onAct(act, id) {
    if (act === "est-criar") {
      await this.post("estabelecimentos", {
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
      await this.post("clientes", {
        nome: this.val("#nc-nome"),
        email: this.val("#nc-email"),
        senha: this.val("#nc-senha"),
        telefone: this.val("#nc-tel"),
        bairro: this.val("#nc-bairro"),
        nascimento: this.val("#nc-nasc"),
        cidade: Store.data?.meta?.cidade,
      }, "Cliente cadastrado.");
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
        <div class="field"><span>Nascimento</span><input name="nascimento" type="date" value="${this.nascIso(c.nascimento)}"/></div>
        <div class="field"><span>Bebida favorita</span><select name="bebidaFavoritaId"><option value="">—</option>${bebs}</select></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("clientes/salvar", {
          id: c.id, nome: g("nome"), email: g("email"), senha: g("senha"), telefone: g("telefone"),
          bairro: g("bairro"), nascimento: g("nascimento"), bebidaFavoritaId: g("bebidaFavoritaId"),
          cidade: c.cidade,
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
      await this.post("funcionarios", {
        nome: this.val("#nf-nome"),
        email: this.val("#nf-email"),
        senha: this.val("#nf-senha"),
        cargo: this.val("#nf-cargo") || "Garçom",
        estabelecimentoId: this.val("#nf-est"),
      }, "Funcionário cadastrado.");
      return;
    }
    if (act === "fun-editar") {
      const f = Store.find("funcionarios", id);
      if (!f) return;
      this.modalForm("Editar funcionário", `
        <div class="field"><span>Nome</span><input name="nome" value="${this.esc(f.nome)}"/></div>
        <div class="field"><span>Cargo</span><input name="cargo" value="${this.esc(f.cargo || "")}"/></div>
        <div class="field"><span>Status</span><select name="status"><option value="ativo" ${f.status === "ativo" ? "selected" : ""}>Ativo</option><option value="inativo" ${f.status === "inativo" ? "selected" : ""}>Inativo</option></select></div>
        <div class="field"><span>Nova senha</span><input name="senha" type="password" placeholder="Vazio = manter"/></div>
      `, async (box) => {
        const g = (n) => box.querySelector(`[name="${n}"]`)?.value;
        const data = await this.post("funcionarios/salvar", { id: f.id, nome: g("nome"), cargo: g("cargo"), status: g("status"), senha: g("senha") }, "Funcionário atualizado.");
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
      await this.post("parceiros", {
        nome: this.val("#np-nome"),
        email: this.val("#np-email"),
        senha: this.val("#np-senha"),
        categoria: this.val("#np-cat"),
        selo: this.val("#np-selo"),
      }, "Parceiro cadastrado.");
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
      await this.post("bebidas/rede", { nome: this.val("#nb-nome"), tipo: this.val("#nb-tipo"), marca: this.val("#nb-marca") }, "Bebida cadastrada.");
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
      await this.post("campanhas", {
        titulo: this.val("#cam-titulo"),
        tipo: this.val("#cam-tipo"),
        publico: this.val("#cam-pub"),
        parceiroId: this.val("#cam-par"),
        metaTampas: this.val("#cam-meta") || null,
        alteraMeta: Boolean(this.val("#cam-meta")),
        canal: this.val("#cam-canal"),
        mensagem: this.val("#cam-msg"),
        estabelecimentoId: ests[0] || "",
        estabelecimentos: ests,
      }, "Campanha criada. Valide em Disparos.");
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
      const data = await this.post("campanhas/ativar", { id: cam.id, canal: this.aud.canal }, null);
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
      if (!confirm("Marcar esta Saidera como expirada?")) return;
      await this.post("saideras/expirar", { id }, "Saidera expirada.");
      return;
    }
    if (act === "cfg-salvar") {
      await this.post("config", {
        cidade: this.val("#cfg-cidade"),
        metaPadraoRede: this.val("#cfg-meta-rede"),
        validadeSaideraDias: this.val("#cfg-validade"),
        novaSenha: this.val("#cfg-senha"),
      }, "Configurações salvas.");
    }
  },
};

window.AdminApp = AdminApp;
document.addEventListener("DOMContentLoaded", () => AdminApp.boot());
