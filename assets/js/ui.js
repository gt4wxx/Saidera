const Brand = {
  pages() {
    return /\/pages\//.test(location.pathname);
  },
  brandDir() {
    return this.pages() ? "../assets/brand" : "assets/brand";
  },
  kitDir() {
    return this.pages() ? "../Saidera_Kit_Marca" : "Saidera_Kit_Marca";
  },
  src(file) {
    return `${this.brandDir()}/${file}`;
  },
  img(file, cls = "", alt = "Saidera") {
    return `<img class="${cls}" src="${this.src(file)}" alt="${alt}"/>`;
  },
  mark(size = 38) {
    return `<img class="brand-mark" src="${this.src("11_app_icon_preto.png")}" alt="Saidera" width="${size}" height="${size}"/>`;
  },
  markGold(size = 64) {
    return `<img class="brand-mark" src="${this.src("10_app_icon_amarelo.png")}" alt="Saidera" width="${size}" height="${size}"/>`;
  },
  simbolo(size = 56) {
    return `<img class="brand-simbolo" src="${this.src("02_simbolo_logo.png")}" alt="Saidera" width="${size}" height="${size}"/>`;
  },
  horizontal(cls = "brand-h") {
    return this.img("03_logo_horizontal.png", cls);
  },
  principal(cls = "brand-principal") {
    return this.img("03_logo_horizontal.png", cls);
  },
  banner(tipo, cls = "brand-banner") {
    const file =
      tipo === "story"
        ? "09_banner_story.png"
        : tipo === "secundario"
          ? "08_banner_secundario.png"
          : "07_banner_principal.png";
    return `<img class="${cls}" src="${this.kitDir()}/${file}" alt="Saidera"/>`;
  },
  sideHead(role) {
    return `<div class="brand-side pad">
      ${this.horizontal("brand-h brand-h-side")}
      <p class="tiny muted">${role}</p>
    </div>`;
  },
};
window.Brand = Brand;

const UI = {
  toast(msg) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  modal({ html, center = false, onClose }) {
    const bg = document.createElement("div");
    bg.className = "modal-bg" + (center ? " center" : "");
    bg.innerHTML = `<div class="modal">${html}</div>`;
    bg.addEventListener("click", (e) => {
      if (e.target === bg) {
        bg.remove();
        onClose && onClose();
      }
    });
    document.body.appendChild(bg);
    return {
      el: bg,
      close() {
        bg.remove();
        onClose && onClose();
      },
    };
  },

  tampas(atual, meta, maxDots = 12) {
    const m = Math.min(meta, maxDots);
    const filled = Math.min(atual, m);
    const dots = Array.from({ length: m }, (_, i) => `<i class="tampa ${i < filled ? "fill" : ""}"></i>`).join("");
    return `<div class="tampas" aria-label="${atual} de ${meta} Tampas">${dots}</div>`;
  },

  barra(atual, meta, light = false) {
    const pct = Math.min(100, Math.round((atual / meta) * 100));
    return `<div class="progress ${light ? "light" : ""}"><i style="width:${pct}%"></i></div>`;
  },

  photo(src, alt = "") {
    const fb = window.Logic?.imagemPadraoEst?.() || src;
    return `<div class="photo"><img src="${src}" alt="${alt}" onerror="this.onerror=null;this.src='${fb}'"/></div>`;
  },

  lineChart(values, labels = []) {
    const w = 560, h = 176, p = 22;
    if (!values.length) return `<p class="muted empty-msg">Sem dados para o gráfico.</p>`;
    const max = Math.max(1, ...values) * 1.12;
    const min = 0;
    const last = values.length - 1;
    const pts = values.map((v, i) => {
      const x = p + (i / Math.max(1, last)) * (w - p * 2);
      const y = h - p - ((v - min) / (max - min || 1)) * (h - p * 2 - 14);
      return [x, y, v];
    });
    const d = pts.map((pt, i) => (i ? "L" : "M") + pt[0] + "," + pt[1]).join(" ");
    const area = `${d} L${pts.at(-1)[0]},${h - p} L${pts[0][0]},${h - p} Z`;
    const uid = `cg${Math.random().toString(36).slice(2, 8)}`;
    const dots = pts
      .map((pt) => `<circle cx="${pt[0]}" cy="${pt[1]}" r="4.5" fill="#171717" stroke="#F5B800" stroke-width="2.5"><title>${pt[2]}</title></circle>`)
      .join("");
    const labs = labels
      .map((l, i) => `<text x="${pts[i][0]}" y="${h - 4}" text-anchor="middle" fill="#8A8A8A" font-size="11" font-weight="600">${l}</text>`)
      .join("");
    return `<svg class="chart-line" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F5B800" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#F5B800" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${uid})"/>
      <path d="${d}" fill="none" stroke="#F5B800" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${labs}
    </svg>`;
  },

  bars(items) {
    return this.rankBars(items);
  },

  rankBars(items) {
    if (!items?.length) return `<p class="muted empty-msg">Sem dados para o gráfico.</p>`;
    return items
      .map((it, i) => {
        const pct = Number(it.pct) || 0;
        const extra = it.qtd != null ? `${it.qtd}` : it.q != null ? `${it.q}` : "";
        return `<div class="rank-row">
          <span class="rank-n">${i + 1}</span>
          <div class="rank-body">
            <div class="row between"><strong>${it.nome}</strong><span class="tiny muted">${extra ? extra + " · " : ""}${pct}%</span></div>
            <div class="track tall"><i style="width:${Math.max(2, pct)}%;animation-delay:${i * 70}ms"></i></div>
            ${it.clientes != null ? `<p class="tiny muted">${it.clientes} cliente${it.clientes === 1 ? "" : "s"}</p>` : ""}
          </div>
        </div>`;
      })
      .join("");
  },

  donut(items, centro = "total") {
    const list = (items || []).filter((x) => x.n > 0);
    const total = list.reduce((a, x) => a + x.n, 0);
    if (!total) return `<p class="muted empty-msg">Sem dados para o gráfico.</p>`;
    const colors = ["#F5B800", "#1B3A5F", "#C4A35A", "#5c5c5c", "#8B1E3F"];
    const r = 52;
    const circ = 2 * Math.PI * r;
    let acc = 0;
    const rings = list
      .map((it, i) => {
        const frac = it.n / total;
        const dash = frac * circ;
        const rot = acc * 360 - 90;
        acc += frac;
        return `<circle class="donut-seg" cx="80" cy="80" r="${r}" fill="none" stroke="${it.cor || colors[i % colors.length]}" stroke-width="18" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" transform="rotate(${rot} 80 80)"/>`;
      })
      .join("");
    return `<div class="donut-wrap">
      <div class="donut-svg">
        <svg viewBox="0 0 160 160">${rings}<circle cx="80" cy="80" r="36" fill="#171717"/></svg>
        <div class="donut-center"><b>${total}</b><span>${centro}</span></div>
      </div>
      <ul class="donut-leg">${list
        .map((it, i) => `<li><i style="background:${it.cor || colors[i % colors.length]}"></i><span>${it.nome}</span><strong>${it.n}</strong></li>`)
        .join("")}</ul>
    </div>`;
  },

  heatRow(labels, values) {
    const max = Math.max(1, ...(values || [0]));
    return `<div class="heat-row">${(values || [])
      .map((v, i) => {
        const t = v / max;
        const a = 0.22 + 0.78 * t;
        const color = t > 0.4 ? "#171717" : "#F4E7C3";
        return `<div class="heat-cell" style="background:rgba(245,184,0,${a.toFixed(2)});color:${color}"><b>${v}</b><span>${labels[i] || ""}</span></div>`;
      })
      .join("")}</div>`;
  },

  qrSvg(codigo) {
    const payload = window.QR ? QR.payload(codigo || "SDR-28491") : String(codigo || "SDR-28491");
    if (window.QR?.svg) {
      const svg = QR.svg(payload, 188);
      if (svg) return svg;
    }
    const cells = [];
    const seed = 28491;
    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        let on = false;
        if (finder) {
          const dx = x < 7 ? x : x > 13 ? x - 14 : x;
          const dy = y < 7 ? y : y > 13 ? y - 14 : y;
          on = dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx > 1 && dx < 5 && dy > 1 && dy < 5);
        } else {
          on = ((x * 13 + y * 7 + seed) * 17) % 5 > 1;
        }
        if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.12"/>`);
      }
    }
    return `<svg viewBox="0 0 21 21" width="188" height="188" fill="#171717">${cells.join("")}</svg>`;
  },

  demoWidget() {
    return "";
  },

  celebrate(title, sub) {
    const bits = Array.from({ length: 12 }, (_, i) => `<i style="margin-left:${(i - 6) * 10}px;animation-delay:${i * 40}ms;background:${i % 2 ? "#F5B800" : "#fff"}"></i>`).join("");
    return `<div class="celebrate">
      <div class="burst">${bits}</div>
      <div class="celebrate-mark">${Brand.markGold(72)}</div>
      <h2>${title}</h2>
      <p class="muted" style="margin-top:8px">${sub}</p>
    </div>`;
  },

  fixButtons(root) {
    (root || document).querySelectorAll("button:not([type])").forEach((b) => {
      if (!b.closest("form")) b.setAttribute("type", "button");
    });
  },

  bindGlobal() {
    if (this._bound) return;
    this._bound = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("button, a, [data-act], [data-go], [data-href], [data-menu], [data-back], [data-pin], [data-map-bairro], [data-close-modal], [data-close-menu], [data-pwa-install], [data-action]");
      if (!el) return;
      if (el.closest('[data-action="reset-demo"]')) {
        location.href = API?.home?.() || "../index.php";
        return;
      }
      if (el.closest("[data-close-modal]")) {
        e.preventDefault();
        QR?.stopScan();
        el.closest(".modal-bg")?.remove();
        return;
      }
      if (el.closest("[data-close-menu]")) {
        document.querySelector("#sidebar")?.classList.remove("open");
        return;
      }
      if (el.closest("[data-menu]")) {
        e.preventDefault();
        document.querySelector("#sidebar")?.classList.toggle("open");
        return;
      }
      if (el.closest("[data-pwa-install]")) {
        e.preventDefault();
        this.pwaInstall();
        return;
      }
      const act = el.closest("[data-act]");
      if (act && !act.disabled) {
        if (window.EstApp?.onAct) {
          e.preventDefault();
          window.EstApp.onAct(act.getAttribute("data-act"), act.getAttribute("data-id"), act);
          return;
        }
        if (window.AdminApp?.onAct) {
          e.preventDefault();
          window.AdminApp.onAct(act.getAttribute("data-act"), act.getAttribute("data-id"), act);
          return;
        }
      }
      const href = el.closest("[data-href]");
      if (href) {
        e.preventDefault();
        location.hash = href.getAttribute("data-href");
        return;
      }
      const go = el.closest("[data-go]");
      if (go && window.ClienteApp?.go) {
        e.preventDefault();
        window.ClienteApp.go(go.getAttribute("data-go"));
        return;
      }
      if (el.closest("[data-back]") && window.ClienteApp) {
        e.preventDefault();
        history.back();
        return;
      }
      const pin = el.closest("[data-pin]");
      if (pin && window.ClienteApp) {
        e.preventDefault();
        window.ClienteApp.mapSel = pin.getAttribute("data-pin");
        const est = window.Logic?.est?.(window.ClienteApp.mapSel);
        if (est?.bairro) window.ClienteApp.mapBairro = est.bairro;
        window.ClienteApp.render();
        return;
      }
      const mb = el.closest("[data-map-bairro]");
      if (mb && window.ClienteApp) {
        e.preventDefault();
        window.ClienteApp.mapBairro = mb.getAttribute("data-map-bairro") || null;
        window.ClienteApp.mapSel = null;
        window.ClienteApp.mapPage = 1;
        window.ClienteApp.render();
      }
    });
    this.pwaInit();
  },

  pwaStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);
  },

  pwaIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  },

  pwaBox() {
    if (this.pwaStandalone()) return "";
    if (this.pwaIos()) {
      return `<div class="pwa-box" data-pwa-box>
        <p class="notice">No iPhone: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
      </div>`;
    }
    return `<div class="pwa-box" data-pwa-box>
      <button class="btn btn-gold btn-block" type="button" data-pwa-install>Instalar o Saidera</button>
      <p class="tiny muted" style="margin-top:8px">Opcional. Chrome ou Edge no celular ou no PC.</p>
    </div>`;
  },

  pwaCliente() {
    return /entrar\.php|cliente\.php/.test(location.pathname);
  },

  pwaSwUrl() {
    return this.pages() ? "../sw.js" : "sw.js";
  },

  pwaInit() {
    if (this._pwaReady) return;
    this._pwaReady = true;
    if ("serviceWorker" in navigator) {
      if (this.pwaCliente()) {
        navigator.serviceWorker.register(this.pwaSwUrl()).catch(() => {});
      } else {
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      }
    }
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this._pwaPrompt = e;
    });
    window.addEventListener("appinstalled", () => {
      this._pwaPrompt = null;
      this.toast("Saidera instalado neste aparelho.");
      document.querySelectorAll("[data-pwa-box]").forEach((el) => el.classList.add("hidden"));
    });
  },

  async pwaPrepararInstalacao() {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.register(this.pwaSwUrl()).catch(() => {});
  },

  pwaDispararAgora() {
    if (this.pwaStandalone()) return Promise.resolve("standalone");
    if (!this._pwaPrompt) return Promise.resolve(null);
    try {
      this._pwaPrompt.prompt();
    } catch {
      return Promise.resolve(null);
    }
    const ev = this._pwaPrompt;
    this._pwaPrompt = null;
    return ev.userChoice
      .then((c) => (c.outcome === "accepted" ? "accepted" : "dismissed"))
      .catch(() => "dismissed");
  },

  pwaEsperarPrompt(ms = 2500) {
    if (this._pwaPrompt) return Promise.resolve(this._pwaPrompt);
    return new Promise((resolve) => {
      const t0 = Date.now();
      const tick = () => {
        if (this._pwaPrompt) return resolve(this._pwaPrompt);
        if (Date.now() - t0 >= ms) return resolve(null);
        setTimeout(tick, 120);
      };
      tick();
    });
  },

  async pwaPedirInstalacao() {
    if (this.pwaStandalone()) return "standalone";
    await this.pwaPrepararInstalacao();
    await this.pwaEsperarPrompt(2000);
    const agora = await this.pwaDispararAgora();
    if (agora) return agora;
    if (this.pwaIos()) return "ios";
    return "unavailable";
  },

  async pwaInstall() {
    const r = await this.pwaPedirInstalacao();
    if (r === "ios") this.toast("No iPhone: Compartilhar → Adicionar à Tela de Início.");
    else if (r === "unavailable") this.toast("No Chrome ou Edge: menu ⋮ → Instalar Saidera.");
    else if (r === "accepted") this.toast("Saidera instalado. Abra pelo ícone se quiser.");
    return r;
  },
};

window.UI = UI;
