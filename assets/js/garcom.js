const GarcomApp = {
  root: null,
  funId: null,
  estId: null,
  clienteId: null,
  drinkId: null,
  qty: 1,
  mode: "home",
  torchOn: false,
  sessao: [],
  recentes: [],

  async boot() {
    const ok = await Store.init({ papel: "funcionario" });
    if (!ok) return;
    this.funId = Store.demo().funcionarioId;
    this.estId = Store.demo().estabelecimentoId;
    UI.bindGlobal();
    this.root = document.getElementById("app");
    this.drinkId = Logic.primeiraBebida(this.est())?.id || null;
    this.root.addEventListener("click", (e) => this.onClick(e));
    const saved = sessionStorage.getItem("saidera_comanda");
    if (saved && Logic.cliente(saved)) {
      this.clienteId = saved;
      this.mode = "comanda";
    }
    try {
      this.recentes = JSON.parse(sessionStorage.getItem("saidera_garcom_recentes") || "[]");
    } catch {
      this.recentes = [];
    }
    Store.on(() => this.render());
    Store.startLive();
    this.render();
  },

  fun() {
    return Logic.funcionario(this.funId);
  },

  est() {
    return Logic.est(this.estId);
  },

  lembrarRecente(clienteId) {
    this.recentes = [clienteId, ...this.recentes.filter((id) => id !== clienteId)].slice(0, 4);
    sessionStorage.setItem("saidera_garcom_recentes", JSON.stringify(this.recentes));
  },

  abrir(clienteId) {
    this.clienteId = clienteId;
    this.qty = 1;
    this.drinkId = Logic.primeiraBebida(this.est())?.id || this.drinkId;
    this.sessao = [];
    this.mode = "comanda";
    this.torchOn = false;
    sessionStorage.setItem("saidera_comanda", clienteId);
    this.lembrarRecente(clienteId);
    this.render();
  },

  fechar() {
    this.clienteId = null;
    this.sessao = [];
    this.mode = "home";
    sessionStorage.removeItem("saidera_comanda");
    this.render();
    UI.toast("Comanda encerrada. Pode atender outra mesa.");
  },

  ir(mode) {
    this.mode = mode;
    this.torchOn = false;
    this.render();
  },

  render() {
    QR.stopScan();
    const html =
      this.mode === "scan-cli"
        ? this.scanView("cliente")
        : this.mode === "scan-sai"
          ? this.scanView("saidera")
          : this.mode === "comanda" && this.clienteId
            ? this.comanda()
            : this.home();
    this.root.innerHTML = `<div class="phone-stage"><div class="phone-shell waiter-shell">
      <div class="phone-body waiter-body">${html}</div>
    </div></div>${UI.demoWidget()}`;
    this.bind();
  },

  top() {
    const f = this.fun();
    const e = this.est();
    return `<div class="topbar">
      <div class="logo-row">
        ${Brand.horizontal("brand-h brand-h-sm")}
        <div>
          <p class="tiny muted">${f.nome} · ${e.nome}</p>
        </div>
      </div>
      <a class="icon-btn" href="../index.php?sair=1" title="Sair">${Icons.logout()}</a>
    </div>`;
  },

  home() {
    const f = this.fun();
    const recentes = this.recentes.map((id) => Logic.cliente(id)).filter(Boolean);
    return `${this.top()}
      <p class="tiny muted">Turno no salão</p>
      <h1 style="margin:8px 0 6px">Pronto no salão</h1>
      <p class="muted" style="margin-bottom:14px">Dois caminhos: ler o QR do cliente ou baixar a Saidera pelo ID.</p>
      ${Brand.banner("secundario", "brand-banner")}
      <div class="waiter-actions">
        <button class="waiter-action gold" id="start-scan">
          ${Icons.qr()}
          <strong>Ler QR do cliente</strong>
          <span>Abre a comanda e marca Tampas</span>
        </button>
        <button class="waiter-action navy" id="start-sai">
          ${Icons.gift()}
          <strong>Baixar Saidera</strong>
          <span>O cliente informa o ID (SDR-…)</span>
        </button>
      </div>
      <div class="card pad" style="margin-top:14px">
        <p class="tiny muted">ID do cliente</p>
        <div class="search" style="margin-top:8px">${Icons.search()}<input id="busca-id" placeholder="ID do cliente · SDR-…"/></div>
        <p class="tiny muted" style="margin:14px 0 8px">ID da Saidera</p>
        <div class="row" style="gap:8px">
          <div class="search grow">${Icons.search()}<input id="sai-id-home" placeholder="SDR-8842"/></div>
          <button class="btn btn-navy btn-sm" id="sai-ok-home">Baixar</button>
        </div>
      </div>
      ${
        recentes.length
          ? `<p class="tiny muted" style="margin:16px 0 8px">Últimas comandas</p>
            <div class="row wrap" style="gap:8px">${recentes
              .map((c) => `<button class="btn btn-dark btn-sm" data-open="${c.id}">${c.primeiroNome}</button>`)
              .join("")}</div>`
          : `<p class="tiny muted" style="margin:16px 0 8px">Leia o QR do cliente ou digite o ID SDR-…</p>`
      }
      <div class="grid-2" style="margin-top:22px">
        <div class="kpi"><span>Tampas hoje</span><b>${f.tampasHoje}</b></div>
        <div class="kpi"><span>Saideras entregues</span><b>${f.saiderasEntregues}</b></div>
      </div>
      <p class="notice" style="margin-top:16px">O QR do cliente é o ID dele e não expira. O cupom impresso da casa o cliente lê no app dele.</p>`;
  },

  scanView(kind) {
    const cliente = kind === "cliente";
    return `${this.top()}
      <div class="scan-stage waiter-scan">
        <div class="scan-frame live scan-lg">
          <video id="scan-video" playsinline muted autoplay></video>
          <i></i><i></i><i></i><i></i>
        </div>
        <p class="muted" style="margin-top:18px;text-align:center">${cliente ? "Aponte para o QR do cliente" : "Aponte para um QR ou use o ID da Saidera"}</p>
        <p class="tiny muted" style="text-align:center" id="scan-hint">${cliente ? "SAIDERA:SDR-… · identificação" : "ID da Saidera · SDR-…"}</p>
        <button type="button" class="btn btn-gold btn-block" id="abrir-camera" style="margin-top:12px">Permitir câmera</button>
      </div>
      <div class="row" style="gap:8px;margin-top:14px">
        <button class="btn btn-dark grow" id="torch-btn">${Icons.torch()} Lanterna</button>
        <button class="btn btn-ghost grow" id="cancel-scan">Cancelar</button>
      </div>
      <div class="search" style="margin-top:12px">${Icons.search()}<input id="${cliente ? "busca-id-scan" : "sai-id-scan"}" placeholder="${cliente ? "Ou ID do cliente · SDR-28491" : "Ou ID da Saidera · SDR-8842"}"/></div>
      ${cliente ? "" : `<button class="btn btn-gold btn-block" id="sai-ok-scan" style="margin-top:10px">Confirmar entrega</button>`}`;
  },

  comanda() {
    const c = Logic.cliente(this.clienteId);
    const est = this.est();
    const p = Logic.garantirProgresso(c.id, this.estId, this.drinkId);
    const dispDrink = Logic.saiderasDisponiveis(c.id, this.estId, this.drinkId);
    const todasDisp = Logic.saiderasDisponiveis(c.id, this.estId);
    const falta = p.meta - p.atual;
    return `${this.top()}
      <div class="comanda-head">
        <div class="person">
          <img src="${Logic.avatarUrl(c.avatar)}" alt="" class="avatar"/>
          <div>
            <p class="tiny gold">COMANDA ABERTA</p>
            <h2>${c.primeiroNome}</h2>
            <p class="small muted">${c.codigo} · QR de identificação</p>
          </div>
        </div>
        <div class="row wrap" style="gap:8px">
          <button class="btn btn-ghost btn-sm" id="fechar-comanda">Outro cliente</button>
          <button class="btn btn-dark btn-sm" id="scan-again">${Icons.qr()} Ler de novo</button>
        </div>
      </div>
      ${
        todasDisp.length
          ? `<article class="saidera-alert">
              <span class="badge badge-green">SAIDERA DISPONÍVEL</span>
              <p style="margin:8px 0 12px">${todasDisp
                .map((s) => `${Logic.bebida(s.bebidaId)?.nome || "Bebida"} · <strong>${s.codigo}</strong> · ${Logic.validadeLabel(s)}`)
                .join("<br/>")}</p>
              ${todasDisp
                .map(
                  (s) =>
                    `<button type="button" class="btn btn-gold btn-block btn-sm" style="margin-bottom:8px" data-entregar="${s.id}">Entregar ${Logic.bebida(s.bebidaId)?.nome || "Saidera"}</button>`
                )
                .join("")}
            </article>`
          : ""
      }
      <div class="card pad" style="margin-bottom:14px">
        <p class="tiny muted">Baixar pelo ID da Saidera</p>
        <div class="row" style="gap:8px;margin-top:8px">
          <div class="search grow">${Icons.search()}<input id="sai-id-comanda" placeholder="SDR-8842"/></div>
          <button class="btn btn-navy btn-sm" id="sai-ok-comanda">Baixar</button>
        </div>
      </div>
      <h3 style="margin:4px 0 10px">Bebida</h3>
      <div class="drink-pick waiter-drinks">
        ${est.bebidas
          .map((d) => {
            const meta = Logic.metaDe(est, d.id, c.id);
            const cam = Logic.ofertaAtivaPara(c.id, this.estId, d.id);
            const prog = Logic.progresso(c.id, this.estId, d.id);
            const n = prog ? `${prog.atual}/${meta}` : `0/${meta}`;
            return `<button class="${this.drinkId === d.id ? "on" : ""}" data-drink="${d.id}">
              <strong>${d.nome}</strong>
              <p class="tiny muted">${n}${cam ? " · oferta" : ""}</p>
            </button>`;
          })
          .join("")}
      </div>
      <div class="card pad" style="margin:16px 0">
        <div class="row between">
          <div>
            <p class="tiny muted">${Logic.bebida(this.drinkId)?.nome || "Bebida"}</p>
            <strong>${dispDrink.length && p.atual === 0 ? p.meta : p.atual} / ${p.meta}</strong>
          </div>
          <span class="muted small">${dispDrink.length ? "Saidera nesta bebida" : falta === 1 ? "Falta 1" : "Faltam " + falta}</span>
        </div>
        <div style="margin:10px 0">${UI.tampas(dispDrink.length && p.atual === 0 ? p.meta : p.atual, p.meta)}</div>
        ${UI.barra(dispDrink.length && p.atual === 0 ? p.meta : p.atual, p.meta)}
      </div>
      <div class="row between" style="margin-bottom:14px">
        <span class="muted">Quantidade</span>
        <div class="qty">
          <button id="qty-minus">−</button>
          <strong id="qty-val" style="min-width:24px;text-align:center">${this.qty}</strong>
          <button id="qty-plus">+</button>
        </div>
      </div>
      <button class="btn btn-gold btn-block" id="do-reg" style="min-height:58px">REGISTRAR ${this.qty} TAMPA${this.qty > 1 ? "S" : ""}</button>
      ${
        this.sessao.length
          ? `<p class="tiny muted" style="margin:14px 0 6px">Nesta comanda</p>
            ${this.sessao
              .map((it) => `<p class="small">+${it.qtd} ${it.nome}</p>`)
              .join("")}`
          : `<p class="tiny muted" style="margin-top:12px;text-align:center">Pode escanear o mesmo QR de novo. A comanda fica neste cliente até você encerrar.</p>`
      }`;
  },

  afterRegister(res, cliente, bebida) {
    if (res.ganhas) {
      UI.modal({
        center: true,
        html: `${UI.celebrate(
          res.ofertaConcluida ? "OFERTA CONCLUÍDA! 🍺" : "SAIDERA LIBERADA! 🍺",
          res.ofertaConcluida
            ? `${cliente.primeiroNome} usou a oferta neste bar. Próximo ciclo: regra da casa ${res.metaBar} Tampas · agora ${res.depois}/${res.meta}.`
            : `${cliente.primeiroNome} conquistou ${res.ganhas} Saidera de ${bebida.nome}. Ciclo agora: ${res.depois}/${res.meta}.`
        )}
          <p class="tiny muted">Peça o ID da Saidera para baixar, ou entregue na comanda.</p>
          <button class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Continuar na comanda</button>`,
      });
    } else {
      UI.modal({
        center: true,
        html: `<h2>${this.qty} Tampa${this.qty > 1 ? "s" : ""} adicionada${this.qty > 1 ? "s" : ""} 🍺</h2>
          <p class="muted" style="margin:10px 0 16px">${cliente.primeiroNome} agora possui ${res.depois}/${res.meta} Tampas de ${bebida.nome}.</p>
          ${UI.tampas(res.depois, res.meta)}
          <p class="tiny muted" style="margin-top:12px">A comanda continua aberta. Pode registrar mais sem escanear de novo.</p>
          <button class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Continuar</button>`,
      });
    }
  },

  async abrirPorLeitura(raw) {
    const d = window.QR?.decode ? QR.decode(raw) : { tipo: "desconhecido", codigo: raw };
    if (d.tipo === "ticket") {
      UI.toast("Este é o cupom da casa. O cliente lê no app dele.");
      return false;
    }
    const codigo = d.codigo;
    let c = Logic.clientePorCodigo(codigo);
    if (!c) {
      try {
        c = await Logic.buscarCliente(codigo);
      } catch {
        c = null;
      }
    }
    if (c) {
      this.abrir(c.id);
      return true;
    }
    UI.toast("Cliente não encontrado. Confira o QR ou o ID.");
    return false;
  },

  async baixarSaidera(raw) {
    const d = window.QR?.decode ? QR.decode(raw) : { tipo: "sdr", codigo: String(raw || "").trim() };
    if (d.tipo === "ticket") {
      UI.toast("Este é o cupom da casa. O cliente lê no app dele.");
      return;
    }
    if (d.tipo === "cliente") {
      const c = Logic.clientePorCodigo(d.codigo);
      if (c) {
        UI.toast(`Este é o QR de ${c.primeiroNome}. Abrindo a comanda.`);
        this.abrir(c.id);
        return;
      }
    }
    const res = await Logic.entregarSaideraPorCodigo(d.codigo, this.estId, this.funId);
    if (!res.ok) {
      const c = Logic.clientePorCodigo(d.codigo);
      if (c) {
        this.abrir(c.id);
        return;
      }
      UI.toast(res.erro);
      return;
    }
    this.mode = this.clienteId ? "comanda" : "home";
    this.render();
    UI.modal({
      center: true,
      html: `${UI.celebrate("Saidera entregue", `${Logic.bebida(res.saidera.bebidaId)?.nome || ""} · ${res.saidera.codigo}`)}
        <button class="btn btn-gold btn-block" style="margin-top:14px" data-close-modal>Continuar</button>`,
    });
  },

  ligarBusca(sel, fn) {
    const busca = this.root.querySelector(sel);
    busca?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      fn(busca.value);
    });
  },

  async ligarLanterna() {
    const video = this.root.querySelector("#scan-video");
    const track = video?.srcObject?.getVideoTracks?.()[0];
    const caps = track?.getCapabilities?.();
    if (!caps?.torch) {
      UI.toast("Lanterna indisponível neste aparelho.");
      return;
    }
    this.torchOn = !this.torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: this.torchOn }] });
    } catch {
      this.torchOn = false;
      UI.toast("Não foi possível ligar a lanterna.");
    }
  },

  ligarCamera(kind) {
    const video = this.root.querySelector("#scan-video");
    if (!video) return;
    QR.startScan({
      video,
      onCode: (_codigo, raw) => {
        if (kind === "saidera") this.baixarSaidera(raw || _codigo);
        else this.abrirPorLeitura(raw || _codigo);
      },
      onError: (msg) => {
        const hint = this.root.querySelector("#scan-hint");
        if (hint) hint.textContent = msg;
        UI.toast(msg);
      },
    });
  },

  onClick(e) {
    const t = e.target.closest("button, [data-open], [data-drink], [data-entregar]");
    if (!t || t.disabled) return;
    if (t.closest("[data-close-modal]")) return;
    const id = t.id;
    if (t.hasAttribute("data-open")) {
      this.abrir(t.getAttribute("data-open"));
      return;
    }
    if (t.hasAttribute("data-drink")) {
      this.drinkId = t.getAttribute("data-drink");
      this.render();
      return;
    }
    if (t.hasAttribute("data-entregar")) {
      this.entregarBtn(t.getAttribute("data-entregar"));
      return;
    }
    if (id === "start-scan") {
      const ir = () => this.ir("scan-cli");
      if (window.QR?.pedirStream) QR.pedirStream().then(ir).catch((e) => { UI.toast(e.message); ir(); });
      else ir();
      return;
    }
    if (id === "start-sai") {
      const ir = () => this.ir("scan-sai");
      if (window.QR?.pedirStream) QR.pedirStream().then(ir).catch((e) => { UI.toast(e.message); ir(); });
      else ir();
      return;
    }
    if (id === "cancel-scan") {
      QR.stopScan();
      this.ir(this.clienteId ? "comanda" : "home");
      return;
    }
    if (id === "scan-again") {
      const ir = () => this.ir("scan-cli");
      if (window.QR?.pedirStream) QR.pedirStream().then(ir).catch((e) => { UI.toast(e.message); ir(); });
      else ir();
      return;
    }
    if (id === "abrir-camera") {
      this.ligarCamera(this.mode === "scan-sai" ? "saidera" : "cliente");
      return;
    }
    if (id === "torch-btn") return void this.ligarLanterna();
    if (id === "sai-ok-home") return void this.baixarSaidera(this.root.querySelector("#sai-id-home")?.value);
    if (id === "sai-ok-scan") return void this.baixarSaidera(this.root.querySelector("#sai-id-scan")?.value);
    if (id === "sai-ok-comanda") return void this.baixarSaidera(this.root.querySelector("#sai-id-comanda")?.value);
    if (id === "fechar-comanda") return void this.fechar();
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
  },

  async doReg() {
    if (!this.drinkId) {
      UI.toast("Cadastre uma bebida no cardápio da casa.");
      return;
    }
    const c = Logic.cliente(this.clienteId);
    const b = Logic.bebida(this.drinkId);
    this.sessao.unshift({ nome: b?.nome || "Bebida", qtd: this.qty });
    try {
      const res = await Logic.registrarConsumo({
        clienteId: this.clienteId,
        estabelecimentoId: this.estId,
        bebidaId: this.drinkId,
        quantidade: this.qty,
        funcionarioId: this.funId,
      });
      this.afterRegister(res, c, b);
    } catch (err) {
      UI.toast(err.message);
    }
  },

  async entregarBtn(sid) {
    const s = await Logic.entregarSaidera(sid, this.funId);
    if (s) {
      UI.modal({
        center: true,
        html: `${UI.celebrate("Saidera entregue", `${Logic.bebida(s.bebidaId)?.nome || "Bebida"} · ${s.codigo} baixada para ${Logic.cliente(this.clienteId).primeiroNome}.`)}
          <p class="tiny muted">A comanda continua aberta para marcar novas Tampas.</p>
          <button type="button" class="btn btn-gold btn-block" style="margin-top:14px" data-close-modal>Continuar</button>`,
      });
    } else {
      UI.toast("Esta Saidera não está mais disponível.");
    }
  },

  bind() {
    UI.fixButtons(this.root);
    this.ligarBusca("#busca-id", (v) => this.abrirPorLeitura(v));
    this.ligarBusca("#busca-id-scan", (v) => this.abrirPorLeitura(v));
    this.ligarBusca("#sai-id-home", (v) => this.baixarSaidera(v));
    this.ligarBusca("#sai-id-scan", (v) => this.baixarSaidera(v));
    this.ligarBusca("#sai-id-comanda", (v) => this.baixarSaidera(v));
    if (this.mode === "scan-cli") this.ligarCamera("cliente");
    if (this.mode === "scan-sai") this.ligarCamera("saidera");
  },
};

document.addEventListener("DOMContentLoaded", () => GarcomApp.boot());
