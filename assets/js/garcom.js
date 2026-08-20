const GarcomApp = {
  root: null,
  funId: "fun-001",
  estId: "est-001",
  clienteId: null,
  drinkId: "beb-001",
  qty: 1,
  scanning: false,

  boot() {
    Store.init();
    UI.bindGlobal();
    this.root = document.getElementById("app");
    const saved = sessionStorage.getItem("saidera_comanda");
    if (saved) this.clienteId = saved;
    Store.on(() => this.render());
    this.render();
  },

  fun() {
    return Logic.funcionario(this.funId);
  },

  est() {
    return Logic.est(this.estId);
  },

  abrir(clienteId) {
    this.clienteId = clienteId;
    this.qty = 1;
    this.drinkId = "beb-001";
    sessionStorage.setItem("saidera_comanda", clienteId);
    this.scanning = false;
    this.render();
  },

  fechar() {
    this.clienteId = null;
    sessionStorage.removeItem("saidera_comanda");
    this.scanning = false;
    this.render();
    UI.toast("Comanda encerrada. Pode atender outra mesa.");
  },

  render() {
    const html = this.scanning ? this.scanView() : this.clienteId ? this.comanda() : this.home();
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
      <a class="icon-btn" href="../index.html" title="Sair">${Icons.logout()}</a>
    </div>`;
  },

  home() {
    const f = this.fun();
    return `${this.top()}
      <p class="tiny muted">Turno no salão · Dados demonstrativos</p>
      <h1 style="margin:8px 0 6px">Pronto para marcar Tampas</h1>
      <p class="muted" style="margin-bottom:14px">Escaneie o QR do cliente. A comanda fica aberta até você atender outra mesa.</p>
      ${Brand.banner("secundario", "brand-banner")}
      <button class="btn btn-gold btn-block scan-cta" id="start-scan" style="margin-top:14px">${Icons.qr()} Escanear QR Code</button>
      <div class="search" style="margin-top:12px">${Icons.search()}<input id="busca-id" placeholder="Ou digite o ID · SDR-28491"/></div>
      <p class="tiny muted" style="margin:16px 0 8px">Atalhos da demonstração</p>
      <div class="row wrap">
        <button class="btn btn-dark btn-sm" data-open="cli-001">Ellisson</button>
        <button class="btn btn-dark btn-sm" data-open="cli-002">Carlos</button>
        <button class="btn btn-dark btn-sm" data-open="cli-003">Maria</button>
      </div>
      <div class="grid-2" style="margin-top:22px">
        <div class="kpi"><span>Tampas hoje</span><b>${f.tampasHoje}</b></div>
        <div class="kpi"><span>Saideras entregues</span><b>${f.saiderasEntregues}</b></div>
      </div>
      <p class="notice" style="margin-top:16px">O QR do cliente é o ID dele. Pode escanear quantas vezes precisar — não expira.</p>`;
  },

  scanView() {
    return `${this.top()}
      <div class="scan-stage">
        <div class="scan-frame"><i></i><i></i><i></i><i></i></div>
        <p class="muted" style="margin-top:18px;text-align:center">Aponte para o QR Code do cliente</p>
        <p class="tiny muted" style="text-align:center">Leitura simulada nesta demonstração</p>
      </div>
      <button class="btn btn-ghost btn-block" id="cancel-scan" style="margin-top:18px">Cancelar</button>`;
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
          <img src="${c.avatar}" alt="" class="avatar"/>
          <div>
            <p class="tiny gold">COMANDA ABERTA</p>
            <h2>${c.primeiroNome}</h2>
            <p class="small muted">${c.codigo} · QR de identificação</p>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="fechar-comanda">Atender outro cliente</button>
      </div>
      ${
        todasDisp.length
          ? `<article class="saidera-alert">
              <span class="badge badge-green">SAIDERA DISPONÍVEL</span>
              <p style="margin:8px 0 12px">${todasDisp
                .map((s) => `${Logic.bebida(s.bebidaId).nome} · ${s.codigo}`)
                .join("<br/>")}</p>
              ${todasDisp
                .map(
                  (s) =>
                    `<button class="btn btn-gold btn-block btn-sm" style="margin-bottom:8px" data-entregar="${s.id}">Entregar ${Logic.bebida(s.bebidaId).nome}</button>`
                )
                .join("")}
            </article>`
          : ""
      }
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
            <p class="tiny muted">${Logic.bebida(this.drinkId).nome}</p>
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
      <button class="btn btn-navy btn-block" id="scan-again" style="margin-top:10px">${Icons.qr()} Escanear de novo</button>
      <p class="tiny muted" style="margin-top:12px;text-align:center">Pode escanear o mesmo QR de novo. A comanda continua neste cliente até você encerrar.</p>`;
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
          <button class="btn btn-gold btn-block" style="margin-top:16px" data-close-modal>Entregar agora na comanda</button>`,
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

  bind() {
    this.root.querySelector("#start-scan")?.addEventListener("click", () => {
      this.scanning = true;
      this.render();
      setTimeout(() => this.abrir("cli-001"), 1400);
    });
    this.root.querySelector("#cancel-scan")?.addEventListener("click", () => {
      this.scanning = false;
      this.render();
    });
    this.root.querySelector("#scan-again")?.addEventListener("click", () => {
      this.scanning = true;
      this.render();
      setTimeout(() => this.abrir(this.clienteId || "cli-001"), 1100);
    });
    this.root.querySelectorAll("[data-open]").forEach((b) =>
      b.addEventListener("click", () => this.abrir(b.getAttribute("data-open")))
    );
    const busca = this.root.querySelector("#busca-id");
    busca?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const c = Logic.clientePorCodigo(busca.value);
      if (c) this.abrir(c.id);
      else UI.toast("Cliente não encontrado. Na demo, use SDR-28491.");
    });
    this.root.querySelector("#fechar-comanda")?.addEventListener("click", () => this.fechar());
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
      const c = Logic.cliente(this.clienteId);
      const b = Logic.bebida(this.drinkId);
      const res = Logic.registrarConsumo({
        clienteId: this.clienteId,
        estabelecimentoId: this.estId,
        bebidaId: this.drinkId,
        quantidade: this.qty,
        funcionarioId: this.funId,
      });
      this.afterRegister(res, c, b);
    });
    this.root.querySelectorAll("[data-entregar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const s = Logic.entregarSaidera(btn.getAttribute("data-entregar"), this.funId);
        if (s) {
          UI.modal({
            center: true,
            html: `${UI.celebrate("Saidera entregue", `${Logic.bebida(s.bebidaId).nome} · ${s.codigo} baixada para ${Logic.cliente(this.clienteId).primeiroNome}.`)}
              <p class="tiny muted">A comanda continua aberta para marcar novas Tampas.</p>
              <button class="btn btn-gold btn-block" style="margin-top:14px" data-close-modal>Continuar</button>`,
          });
        }
      })
    );
  },
};

document.addEventListener("DOMContentLoaded", () => GarcomApp.boot());
