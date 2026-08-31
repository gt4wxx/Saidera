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
  ticketQtys: null,
  tktLote: 1,
  ticketGeradoId: null,
  ticketLoteIds: [],
  tktFiltro: "",

  async boot() {
    const ok = await Store.init({ papel: "funcionario" });
    if (!ok) return;
    this.funId = Store.session?.funcionarioId;
    this.estId = Store.session?.estabelecimentoId;
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

  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
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
          : this.mode === "qr"
            ? this.qrView()
            : this.mode === "comanda" && this.clienteId
              ? this.comanda()
              : this.home();
    this.root.innerHTML = `<div class="phone-stage"><div class="phone-shell waiter-shell">
      <div class="phone-body waiter-body">${html}</div>
    </div></div>`;
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
      <p class="muted" style="margin-bottom:14px">Abra a comanda pelo QR do cliente, ou baixe a Saideira pelo código SAI-…</p>
      ${Brand.banner("secundario", "brand-banner")}
      <div class="waiter-actions">
        <button class="waiter-action gold" id="start-scan">
          ${Icons.qr()}
          <strong>Ler QR do cliente</strong>
          <span>Abre a comanda e marca Tampas</span>
        </button>
        <button class="waiter-action navy" id="start-sai">
          ${Icons.gift()}
          <strong>Ler código da Saideira</strong>
          <span>Câmera ou digite o SAI-… da bebida grátis</span>
        </button>
        <button class="waiter-action" id="start-qr" style="grid-column:1/-1">
          ${Icons.printer()}
          <strong>Gerar QR das Tampas</strong>
          <span>Imprima o cupom. O cliente lê no app dele</span>
        </button>
      </div>
      <div class="card pad" style="margin-top:14px">
        <p class="tiny muted">Cliente · ID SDR-…</p>
        <div class="row" style="gap:8px;margin-top:8px">
          <div class="search grow">${Icons.search()}<input id="busca-id" placeholder="SDR-…" autocomplete="off"/></div>
          <button class="btn btn-dark btn-sm" id="cli-ok-home">Abrir</button>
        </div>
        <p class="tiny muted" style="margin:16px 0 8px">Saideira · código SAI-…</p>
        <div class="row" style="gap:8px">
          <div class="search grow">${Icons.search()}<input id="sai-id-home" placeholder="SAI-…" autocomplete="off" maxlength="24"/></div>
          <button class="btn btn-ghost btn-sm" id="sai-ler-home" title="Ler com a câmera">${Icons.qr()}</button>
          <button class="btn btn-navy btn-sm" id="sai-ok-home">Baixar</button>
        </div>
        <div id="sai-preview" class="sai-preview"></div>
      </div>
      ${
        recentes.length
          ? `<p class="tiny muted" style="margin:16px 0 8px">Últimas comandas</p>
            <div class="row wrap" style="gap:8px">${recentes
              .map((c) => `<button class="btn btn-dark btn-sm" data-open="${c.id}">${c.primeiroNome}</button>`)
              .join("")}</div>`
          : `<p class="tiny muted" style="margin:16px 0 8px">Leia o QR do cliente (SDR-…) ou o código da Saideira (SAI-…)</p>`
      }
      <div class="grid-2" style="margin-top:22px">
        <div class="kpi"><span>Tampas hoje</span><b>${f.tampasHoje}</b></div>
        <div class="kpi"><span>Saideiras entregues</span><b>${f.saiderasEntregues}</b></div>
      </div>
      <p class="notice" style="margin-top:16px">O QR do cliente é o ID dele (SDR-…) e não expira. A Saideira é o SAI-…. O cupom impresso (TKT-…) o cliente lê no app dele.</p>`;
  },

  scanView(kind) {
    const cliente = kind === "cliente";
    return `${this.top()}
      <div class="scan-stage waiter-scan">
        <div class="scan-frame live scan-lg">
          <video id="scan-video" playsinline muted autoplay></video>
          <i></i><i></i><i></i><i></i>
        </div>
        <p class="muted" style="margin-top:18px;text-align:center">${cliente ? "Aponte para o QR do cliente" : "Aponte para o QR da Saideira ou digite o SAI-…"}</p>
        <p class="tiny muted" style="text-align:center" id="scan-hint">${cliente ? "QR pessoal · SDR-…" : "Código da bebida grátis · SAI-…"}</p>
        <button type="button" class="btn btn-gold btn-block" id="abrir-camera" style="margin-top:12px">Permitir câmera</button>
      </div>
      <div class="row" style="gap:8px;margin-top:14px">
        <button class="btn btn-dark grow" id="torch-btn">${Icons.torch()} Lanterna</button>
        <button class="btn btn-ghost grow" id="cancel-scan">Cancelar</button>
      </div>
      <div class="search" style="margin-top:12px">${Icons.search()}<input id="${cliente ? "busca-id-scan" : "sai-id-scan"}" placeholder="${cliente ? "Ou ID do cliente · SDR-…" : "Ou código da Saideira · SAI-…"}" autocomplete="off" maxlength="24"/></div>
      ${cliente ? "" : `<div id="sai-preview" class="sai-preview"></div><button class="btn btn-gold btn-block" id="sai-ok-scan" style="margin-top:10px">Confirmar entrega</button>`}`;
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

  ticketSlip(t, { mark } = {}) {
    const est = this.est();
    const payload = window.QR?.payloadTicket ? QR.payloadTicket(t.codigo) : t.codigo;
    const svg = window.QR?.svg ? QR.svg(payload, 200) : UI.qrSvg(t.codigo);
    return `<article class="ticket-print"${mark ? ` id="ticket-print"` : ""}>
      ${Brand.horizontal("brand-h")}
      <p class="ticket-house">${this.esc(est.nome)}</p>
      <div class="ticket-qr">${svg}</div>
      <h2>${this.esc(t.codigo)}</h2>
      <ul class="ticket-itens">${(t.itens || []).map((i) => `<li><strong>${i.quantidade}×</strong> ${this.esc(i.nome)}</li>`).join("")}</ul>
      <p class="badge badge-gold">USO ÚNICO</p>
      <p class="tiny" style="margin-top:10px">O cliente lê este QR no app Saideira. Depois de usado, o cupom acaba.</p>
    </article>`;
  },

  ticketLoteHtml(ids) {
    const list = (ids || []).map((id) => Store.find("tickets", id)).filter(Boolean);
    if (!list.length) return "";
    return `<div class="ticket-lote" id="ticket-print">${list.map((t) => this.ticketSlip(t)).join("")}</div>`;
  },

  aplicarModeloTicket(tipo) {
    this.ensureTicketQtys();
    const drinks = this.est()?.bebidas || [];
    Object.keys(this.ticketQtys).forEach((k) => {
      this.ticketQtys[k] = 0;
    });
    if (tipo === "uma" && drinks[0]) this.ticketQtys[drinks[0].id] = 1;
    if (tipo === "rodada" && drinks[0]) this.ticketQtys[drinks[0].id] = 4;
    if (tipo === "cada") {
      drinks.slice(0, 8).forEach((d) => {
        this.ticketQtys[d.id] = 1;
      });
    }
  },

  qrView() {
    this.ensureTicketQtys();
    const est = this.est();
    const drinks = est.bebidas || [];
    const itens = this.ticketItens();
    const total = itens.reduce((a, i) => a + i.quantidade, 0);
    const loteIds = (this.ticketLoteIds || []).filter((id) => Store.find("tickets", id));
    const gerado = this.ticketGeradoId ? Store.find("tickets", this.ticketGeradoId) : null;
    let tickets = Store.all("tickets").filter((t) => t.estabelecimentoId === this.estId);
    if (this.tktFiltro) tickets = tickets.filter((t) => Logic.ticketStatus(t) === this.tktFiltro);
    tickets = tickets.slice(0, 20);
    const primeira = drinks[0]?.nome || "primeira bebida";
    return `${this.top()}
      <div class="row between no-print" style="margin-bottom:12px">
        <div>
          <p class="tiny muted">Cupom impresso</p>
          <h1 style="margin:4px 0 0">Gerar QR</h1>
        </div>
        <button class="btn btn-ghost btn-sm" id="cancel-qr">Voltar</button>
      </div>
      <p class="notice no-print" style="margin-bottom:14px">Monte o cupom, imprima e entregue. Quem lê o QR é o celular do cliente — você não precisa do ID dele.</p>
      <section class="card pad no-print" style="margin-bottom:14px">
        <p class="tiny muted" style="margin-bottom:8px">Modelos prontos</p>
        <div class="chips">
          <button type="button" class="chip" data-tkt-modelo="uma">1× ${this.esc(primeira)}</button>
          <button type="button" class="chip" data-tkt-modelo="rodada">Rodada 4× ${this.esc(primeira)}</button>
          <button type="button" class="chip" data-tkt-modelo="cada">1 de cada</button>
        </div>
        <h3 style="margin:14px 0 10px">Bebidas neste cupom</h3>
        ${
          drinks.length
            ? drinks
                .map((d) => {
                  const q = Number(this.ticketQtys[d.id]) || 0;
                  return `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a">
              <div><strong>${this.esc(d.nome)}</strong><p class="tiny muted">Tampas neste QR</p></div>
              <div class="qty">
                <button type="button" data-tkt-qty="${d.id}" data-dir="-1">−</button>
                <strong style="min-width:24px;text-align:center">${q}</strong>
                <button type="button" data-tkt-qty="${d.id}" data-dir="1">+</button>
              </div>
            </div>`;
                })
                .join("")
            : `<p class="muted">A casa ainda não tem bebidas no cardápio.</p>`
        }
        <p class="small" style="margin:14px 0 10px">${total ? `${total} Tampa${total > 1 ? "s" : ""} · ${itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ")}` : "Escolha pelo menos uma bebida."}</p>
        <p class="tiny muted" style="margin-bottom:8px">Quantos iguais para imprimir</p>
        <div class="chips" style="margin-bottom:12px">
          ${[1, 5, 10, 20].map((n) => `<button type="button" class="chip ${this.tktLote === n ? "on" : ""}" data-tkt-lote="${n}">${n}</button>`).join("")}
        </div>
        <button class="btn btn-gold btn-block" id="gerar-ticket" style="min-height:56px" ${total ? "" : "disabled"}>Gerar ${this.tktLote > 1 ? this.tktLote + " QRs" : "QR"} para imprimir</button>
      </section>
      ${
        loteIds.length || (gerado && !gerado.usado)
          ? `<section class="card pad" style="margin-bottom:14px">
              <div class="row between no-print" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
                <h3>${loteIds.length > 1 ? loteIds.length + " cupons prontos" : "Pronto para imprimir"}</h3>
                <div class="row" style="gap:8px">
                  <button class="btn btn-gold btn-sm" id="print-ticket">${Icons.printer()} Imprimir</button>
                  <button class="btn btn-ghost btn-sm" id="novo-ticket">Novo cupom</button>
                </div>
              </div>
              ${loteIds.length > 1 ? this.ticketLoteHtml(loteIds) : this.ticketSlip(gerado || Store.find("tickets", loteIds[0]), { mark: true })}
            </section>`
          : `<section class="card pad no-print" style="margin-bottom:14px"><p class="muted">O cupom impresso traz as bebidas, a quantidade e um QR de uso único. Use um modelo ou monte na mão.</p></section>`
      }
      <section class="card pad no-print">
        <h3 style="margin-bottom:10px">Cupons desta casa</h3>
        <div class="chips">
          ${[
            ["", "Todos"],
            ["aberto", "Abertos"],
            ["usado", "Usados"],
            ["cancelado", "Cancelados"],
          ]
            .map(([v, lab]) => `<button type="button" class="chip ${this.tktFiltro === v ? "on" : ""}" data-tkt-filtro="${v}">${lab}</button>`)
            .join("")}
        </div>
        ${
          tickets.length
            ? tickets
                .map((t) => {
                  const resumo = (t.itens || []).map((i) => `${i.quantidade}× ${i.nome}`).join(", ");
                  const st = Logic.ticketStatus(t);
                  return `<div class="row between" style="padding:10px 0;border-bottom:1px solid #2a2a2a;gap:8px;align-items:flex-start">
                    <div>
                      <strong>${this.esc(t.codigo)}</strong>
                      <p class="tiny muted">${this.esc(resumo || "—")} · ${this.esc(st)}</p>
                    </div>
                    <div class="table-actions">
                      ${st === "aberto" ? `<button class="btn btn-dark btn-sm" data-ver-ticket="${t.id}">Imprimir</button><button class="btn btn-ghost btn-sm" data-tkt-cancelar="${t.id}">Cancelar</button>` : ""}
                    </div>
                  </div>`;
                })
                .join("")
            : `<p class="muted">Nenhum cupom gerado ainda.</p>`
        }
      </section>`;
  },

  async gerarTicket() {
    const itens = this.ticketItens();
    if (!itens.length) {
      UI.toast("Escolha pelo menos uma bebida.");
      return;
    }
    const n = Math.max(1, Math.min(20, Number(this.tktLote) || 1));
    try {
      const ids = [];
      let ultimo = null;
      for (let i = 0; i < n; i++) {
        const t = await Logic.criarTicket({ estabelecimentoId: this.estId, itens });
        if (!t) break;
        ids.push(t.id);
        ultimo = t;
      }
      if (!ids.length) {
        UI.toast("Não foi possível gerar o QR.");
        return;
      }
      this.ticketLoteIds = ids;
      this.ticketGeradoId = ids[0];
      this.mode = "qr";
      this.render();
      UI.toast(
        ids.length > 1
          ? `${ids.length} cupons gerados. Imprima e entregue na mesa.`
          : `QR ${ultimo.codigo} gerado. Imprima e entregue ao cliente.`
      );
    } catch (e) {
      UI.toast(e.message);
    }
  },

  async cancelarTicket(id) {
    const t = Store.find("tickets", id);
    if (!t || !confirm(`Cancelar o cupom ${t.codigo}? Ele deixa de valer.`)) return;
    try {
      const data = await API.post("tickets/cancelar", { id });
      Store.aplicarResposta(data);
      if (this.ticketGeradoId === id) this.ticketGeradoId = null;
      this.ticketLoteIds = (this.ticketLoteIds || []).filter((x) => x !== id);
      this.render();
      UI.toast("Cupom cancelado.");
    } catch (e) {
      UI.toast(e.message);
    }
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
          <button class="btn btn-dark btn-sm" id="start-qr">${Icons.printer()} Gerar QR</button>
          <button class="btn btn-dark btn-sm" id="scan-again">${Icons.qr()} Ler de novo</button>
        </div>
      </div>
      ${
        todasDisp.length
          ? `<article class="saidera-alert">
              <span class="badge badge-green">SAIDEIRA DISPONÍVEL</span>
              <p style="margin:8px 0 12px">${todasDisp
                .map((s) => `${Logic.bebida(s.bebidaId)?.nome || "Bebida"} · <strong>${s.codigo}</strong> · ${Logic.validadeLabel(s)}`)
                .join("<br/>")}</p>
              ${todasDisp
                .map(
                  (s) =>
                    `<button type="button" class="btn btn-gold btn-block btn-sm" style="margin-bottom:8px" data-entregar="${s.id}">Entregar ${Logic.bebida(s.bebidaId)?.nome || "Saideira"}</button>`
                )
                .join("")}
            </article>`
          : ""
      }
      <div class="card pad" style="margin-bottom:14px">
        <p class="tiny muted">Baixar pelo código da Saideira (SAI-…)</p>
        <div class="row" style="gap:8px;margin-top:8px">
          <div class="search grow">${Icons.search()}<input id="sai-id-comanda" placeholder="SAI-…" autocomplete="off" maxlength="24"/></div>
          <button class="btn btn-ghost btn-sm" id="sai-ler-comanda" title="Ler com a câmera">${Icons.qr()}</button>
          <button class="btn btn-navy btn-sm" id="sai-ok-comanda">Baixar</button>
        </div>
        <div id="sai-preview" class="sai-preview"></div>
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
          <span class="muted small">${dispDrink.length ? "Saideira nesta bebida" : falta === 1 ? "Falta 1" : "Faltam " + falta}</span>
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
          res.ofertaConcluida ? "OFERTA CONCLUÍDA! 🍺" : "SAIDEIRA LIBERADA! 🍺",
          res.ofertaConcluida
            ? `${cliente.primeiroNome} usou a oferta neste bar. Próximo ciclo: regra da casa ${res.metaBar} Tampas · agora ${res.depois}/${res.meta}.`
            : `${cliente.primeiroNome} conquistou ${res.ganhas} Saideira de ${bebida.nome}. Ciclo agora: ${res.depois}/${res.meta}.`
        )}
          <p class="tiny muted">Peça o código SAI-… da Saideira para baixar, ou entregue na comanda.</p>
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
    const texto = String(raw || "").trim();
    if (!texto) {
      UI.toast("Digite o ID SDR-… do cliente.");
      return false;
    }
    const d = window.QR?.decode ? QR.decode(texto) : { tipo: "desconhecido", codigo: texto };
    if (d.tipo === "ticket") {
      UI.toast("Este é o cupom da casa. O cliente lê no app dele.");
      return false;
    }
    const sai = Logic.saideraPorCodigo(texto, this.estId);
    if (sai || d.tipo === "saidera") {
      await this.baixarSaidera(texto);
      return true;
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
    UI.toast("Cliente não encontrado. Confira o QR ou o ID SDR-…");
    return false;
  },

  saiFicha(s) {
    const c = Logic.cliente(s?.clienteId);
    const b = Logic.bebida(s?.bebidaId);
    return `<div class="sai-ficha">
      <img src="${Logic.avatarUrl(c?.avatar)}" alt=""/>
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
    const raw =
      this.root.querySelector("#sai-id-home, #sai-id-scan, #sai-id-comanda")?.value || "";
    if (!String(raw).trim()) {
      box.innerHTML = `<p class="tiny muted">Digite ou leia o SAI-…. Mostramos quem é e qual bebida antes de baixar.</p>`;
      return;
    }
    const d = window.QR?.decode ? QR.decode(raw) : { tipo: "sdr", codigo: raw };
    if (d.tipo === "ticket") {
      box.innerHTML = `<p class="notice">Este é o cupom da casa (TKT-…). A Saideira tem o código SAI-…</p>`;
      return;
    }
    const s = Logic.saideraPorCodigo(raw, this.estId);
    if (s) {
      const aviso =
        s.status === "disponivel"
          ? `<p class="tiny gold" style="margin-top:8px">Encontrada e disponível. Confira e confirme a entrega.</p>`
          : s.status === "utilizada"
            ? `<p class="notice" style="margin-top:8px">Esta Saideira já foi entregue.</p>`
            : `<p class="notice" style="margin-top:8px">Esta Saideira expirou e não pode ser entregue.</p>`;
      box.innerHTML = `${this.saiFicha(s)}${aviso}`;
      return;
    }
    const c = Logic.clientePorCodigo(d.codigo);
    if (c) {
      box.innerHTML = `<p class="notice">Isso é o ID do cliente <strong>${this.esc(c.nome)}</strong> (SDR-…), não da Saideira. Peça o SAI-… em Minhas Saideiras.</p>`;
      return;
    }
    box.innerHTML = `<p class="tiny muted">Nenhuma Saideira com este código nesta casa.</p>`;
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
        <p class="muted" style="margin:8px 0 14px">A bebida vai para a mesa agora? Depois de confirmar, este código acaba e não volta.</p>
        ${this.saiFicha(s)}
        <ul class="sai-check">
          <li>Cliente <strong>${this.esc(c?.nome || "—")}</strong></li>
          <li>Bebida <strong>${this.esc(b?.nome || "—")}</strong></li>
          <li>Código <strong>${this.esc(s.codigo)}</strong></li>
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
      const res = await Logic.entregarSaidera(s.id, this.funId);
      m.close();
      if (!res) {
        UI.toast("Não foi possível entregar. Confira se ainda está disponível.");
        return;
      }
      this.mostrarSaideraEntregue(res);
    });
  },

  mostrarSaideraEntregue(s) {
    this.mode = this.clienteId ? "comanda" : "home";
    this.render();
    const b = Logic.bebida(s.bebidaId);
    const c = Logic.cliente(s.clienteId);
    UI.modal({
      center: true,
      html: `${UI.celebrate("Saideira entregue", `${b?.nome || "Bebida"} · ${s.codigo}${c ? " · " + c.primeiroNome : ""}`)}
        <button class="btn btn-gold btn-block" style="margin-top:14px" data-close-modal>Continuar</button>`,
    });
  },

  async baixarSaidera(raw) {
    const texto = String(raw || "").trim();
    if (!texto) {
      UI.toast("Digite ou leia o código SAI-… da Saideira.");
      this.atualizarSaiPreview();
      return;
    }
    const d = window.QR?.decode ? QR.decode(texto) : { tipo: "sdr", codigo: texto };
    if (d.tipo === "ticket") {
      UI.toast("Este é o cupom da casa. O cliente lê no app dele.");
      this.atualizarSaiPreview();
      return;
    }
    const s = Logic.saideraPorCodigo(texto, this.estId);
    if (s) {
      QR.stopScan();
      this.pedirConfirmacaoSaidera(s);
      return;
    }
    const c = Logic.clientePorCodigo(d.codigo);
    if (c || d.tipo === "cliente") {
      UI.toast(
        c
          ? `Isso é o ID de ${c.primeiroNome}, não da Saideira. Peça o SAI-… em Minhas Saideiras.`
          : "Isso é o QR do cliente. Peça o código SAI-… da Saideira."
      );
      this.atualizarSaiPreview();
      if (this.mode === "scan-sai") this.ligarCamera("saidera");
      return;
    }
    const res = await Logic.entregarSaideraPorCodigo(d.codigo, this.estId, this.funId);
    if (!res.ok) {
      UI.toast(res.erro);
      this.atualizarSaiPreview();
      if (this.mode === "scan-sai") this.ligarCamera("saidera");
      return;
    }
    this.mostrarSaideraEntregue(res.saidera);
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
    const t = e.target.closest("button, [data-open], [data-drink], [data-entregar], [data-tkt-qty], [data-tkt-modelo], [data-tkt-lote], [data-tkt-filtro], [data-ver-ticket], [data-tkt-cancelar]");
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
    if (t.hasAttribute("data-tkt-qty")) {
      this.ensureTicketQtys();
      const kid = t.getAttribute("data-tkt-qty");
      const dir = Number(t.getAttribute("data-dir")) || 0;
      const atual = Number(this.ticketQtys[kid]) || 0;
      this.ticketQtys[kid] = Math.max(0, Math.min(20, atual + dir));
      this.mode = "qr";
      this.render();
      return;
    }
    if (t.hasAttribute("data-tkt-modelo")) {
      this.aplicarModeloTicket(t.getAttribute("data-tkt-modelo"));
      this.mode = "qr";
      this.render();
      return;
    }
    if (t.hasAttribute("data-tkt-lote")) {
      this.tktLote = Math.max(1, Math.min(20, Number(t.getAttribute("data-tkt-lote")) || 1));
      this.mode = "qr";
      this.render();
      return;
    }
    if (t.hasAttribute("data-tkt-filtro")) {
      this.tktFiltro = t.getAttribute("data-tkt-filtro") || "";
      this.mode = "qr";
      this.render();
      return;
    }
    if (t.hasAttribute("data-ver-ticket")) {
      const id = t.getAttribute("data-ver-ticket");
      this.ticketGeradoId = id;
      this.ticketLoteIds = [id];
      this.mode = "qr";
      this.render();
      return;
    }
    if (t.hasAttribute("data-tkt-cancelar")) {
      return void this.cancelarTicket(t.getAttribute("data-tkt-cancelar"));
    }
    if (id === "start-qr" || id === "gerar-qr-comanda") {
      this.ir("qr");
      return;
    }
    if (id === "cancel-qr") {
      this.ir(this.clienteId ? "comanda" : "home");
      return;
    }
    if (id === "gerar-ticket") return void this.gerarTicket();
    if (id === "print-ticket") {
      window.print();
      return;
    }
    if (id === "novo-ticket") {
      this.ticketGeradoId = null;
      this.ticketLoteIds = [];
      this.render();
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
    if (id === "cli-ok-home") return void this.abrirPorLeitura(this.root.querySelector("#busca-id")?.value);
    if (id === "sai-ler-home" || id === "sai-ler-comanda") {
      const ir = () => this.ir("scan-sai");
      if (window.QR?.pedirStream) QR.pedirStream().then(ir).catch((e) => { UI.toast(e.message); ir(); });
      else ir();
      return;
    }
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
        html: `${UI.celebrate("Saideira entregue", `${Logic.bebida(s.bebidaId)?.nome || "Bebida"} · ${s.codigo} baixada para ${Logic.cliente(this.clienteId).primeiroNome}.`)}
          <p class="tiny muted">A comanda continua aberta para marcar novas Tampas.</p>
          <button type="button" class="btn btn-gold btn-block" style="margin-top:14px" data-close-modal>Continuar</button>`,
      });
    } else {
      UI.toast("Esta Saideira não está mais disponível.");
    }
  },

  bind() {
    UI.fixButtons(this.root);
    this.ligarBusca("#busca-id", (v) => this.abrirPorLeitura(v));
    this.ligarBusca("#busca-id-scan", (v) => this.abrirPorLeitura(v));
    this.ligarBusca("#sai-id-home", (v) => this.baixarSaidera(v));
    this.ligarBusca("#sai-id-scan", (v) => this.baixarSaidera(v));
    this.ligarBusca("#sai-id-comanda", (v) => this.baixarSaidera(v));
    ["#sai-id-home", "#sai-id-scan", "#sai-id-comanda"].forEach((sel) => {
      this.root.querySelector(sel)?.addEventListener("input", () => this.atualizarSaiPreview());
    });
    this.atualizarSaiPreview();
    if (this.mode === "scan-cli") this.ligarCamera("cliente");
    if (this.mode === "scan-sai") this.ligarCamera("saidera");
  },
};

document.addEventListener("DOMContentLoaded", () => GarcomApp.boot());
