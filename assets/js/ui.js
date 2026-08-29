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
    const w = 560, h = 160, p = 18;
    const max = Math.max(...values) * 1.08;
    const min = Math.min(...values) * 0.82;
    const pts = values.map((v, i) => {
      const x = p + (i / (values.length - 1)) * (w - p * 2);
      const y = h - p - ((v - min) / (max - min || 1)) * (h - p * 2);
      return [x, y];
    });
    const d = pts.map((pt, i) => (i ? "L" : "M") + pt.join(",")).join(" ");
    const area = `${d} L${pts.at(-1)[0]},${h - p} L${pts[0][0]},${h - p} Z`;
    const dots = pts.map((pt) => `<circle cx="${pt[0]}" cy="${pt[1]}" r="4" fill="#F5B800"/>`).join("");
    const labs = labels
      .map((l, i) => `<text x="${pts[i][0]}" y="${h - 2}" text-anchor="middle" fill="#8A8A8A" font-size="11" font-family="Manrope">${l}</text>`)
      .join("");
    return `<svg class="chart-line" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${area}" fill="rgba(245,184,0,0.12)"/>
      <path d="${d}" fill="none" stroke="#F5B800" stroke-width="3" stroke-linejoin="round"/>
      ${dots}${labs}
    </svg>`;
  },

  bars(items) {
    return items
      .map(
        (it) => `<div class="bar-row"><div class="label">${it.nome}</div><div class="track"><i style="width:${it.pct}%"></i></div><div class="pct">${it.pct}%</div></div>`
      )
      .join("");
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

  bindGlobal() {
    document.addEventListener("click", (e) => {
      const reset = e.target.closest('[data-action="reset-demo"]');
      if (reset) {
        Store.reset();
        sessionStorage.removeItem("saidera_comanda");
        this.toast("Demonstração restaurada.");
        setTimeout(() => location.reload(), 400);
      }
      const close = e.target.closest("[data-close-modal]");
      if (close) {
        QR?.stopScan();
        close.closest(".modal-bg")?.remove();
      }
      if (e.target.closest("[data-close-menu]")) {
        document.querySelector("#sidebar")?.classList.remove("open");
      }
      const install = e.target.closest("[data-pwa-install]");
      if (install) this.pwaInstall();
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
      <p class="tiny muted" style="margin-top:8px">Chrome ou Edge. Abra pelo servidor (http://localhost:5173), não pelo arquivo HTML.</p>
    </div>`;
  },

  pwaInit() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${location.origin}/sw.js`, { scope: "/" }).catch(() => {});
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

  async pwaInstall() {
    if (this._pwaPrompt) {
      this._pwaPrompt.prompt();
      await this._pwaPrompt.userChoice.catch(() => {});
      this._pwaPrompt = null;
      return;
    }
    this.toast("No Chrome ou Edge: menu ⋮ → Instalar Saidera.");
  },
};

window.UI = UI;
