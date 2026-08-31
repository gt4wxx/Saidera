const SaideraShell = {
  mode: "boot",
  attached: false,
  _timer: null,
  _net: false,

  logo() {
    if (this._logo) return this._logo;
    const img = document.querySelector(".saidera-boot-logo");
    this._logo = img ? img.getAttribute("src") : "../Saidera_Kit_Marca/03_logo_horizontal.png";
    return this._logo;
  },

  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  bootEl() {
    return document.getElementById("saidera-boot");
  },

  netEl() {
    return document.getElementById("saidera-net");
  },

  attach() {
    if (this.attached || !this.bootEl()) return;
    this.attached = true;
    this.logo();
    document.body.classList.add("saidera-booting");
    this._timer = setTimeout(() => {
      if (this.mode !== "boot") return;
      const msg = document.getElementById("saidera-boot-msg");
      if (msg) msg.textContent = "Ainda ligando… confira a internet.";
    }, 4000);
    if (!navigator.onLine) this.offline();
    window.addEventListener("online", () => this.onOnline());
    window.addEventListener("offline", () => this.onOffline());
  },

  stopTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  },

  wifiSvg() {
    return `<svg class="saidera-boot-wifi" viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 26c12.4-12 31.6-12 44 0"/>
        <path d="M18 34c8-8 20-8 28 0"/>
        <path d="M25.5 42c3.8-3.8 9.2-3.8 13 0"/>
        <circle cx="32" cy="50.5" r="2.6" fill="currentColor" stroke="none"/>
        <path d="M16 14 L48 54"/>
      </g>
    </svg>`;
  },

  paint(kind, title, text, extra = "") {
    this.stopTimer();
    this.mode = kind;
    const el = this.bootEl();
    if (!el) return;
    el.hidden = false;
    el.className = `saidera-boot saidera-boot--${kind}`;
    document.body.classList.add("saidera-booting");
    el.innerHTML = `<div class="saidera-boot-inner">
      <img class="saidera-boot-logo" src="${this.esc(this.logo())}" alt="Saideira" width="220" height="48"/>
      ${kind === "offline" ? this.wifiSvg() : ""}
      <p class="saidera-boot-title">${this.esc(title)}</p>
      <p class="saidera-boot-text">${this.esc(text)}</p>
      <button type="button" class="btn btn-gold btn-block saidera-boot-btn" data-saidera-retry>Tentar de novo</button>
      ${extra}
    </div>`;
    el.querySelector("[data-saidera-retry]")?.addEventListener("click", () => location.reload());
  },

  offline() {
    this.paint(
      "offline",
      "Você está offline",
      "A Saideira precisa de internet para marcar Tampas e baixar Saideira.",
      `<p class="saidera-boot-foot">Códigos e QR já abertos neste aparelho podem continuar visíveis se você já entrou.</p>`
    );
  },

  fail(msg) {
    if (!navigator.onLine) {
      this.offline();
      return;
    }
    this.paint(
      "fail",
      "Não foi possível abrir",
      msg || "Confira a internet e tente de novo."
    );
  },

  ready() {
    this.stopTimer();
    this.mode = "ready";
    const el = this.bootEl();
    if (el) {
      el.classList.add("is-out");
      setTimeout(() => {
        el.hidden = true;
        el.classList.remove("is-out");
      }, 280);
    }
    document.body.classList.remove("saidera-booting");
    this._net = true;
    this.syncNet();
  },

  syncNet() {
    const bar = this.netEl();
    if (!bar || !this._net) return;
    const off = !navigator.onLine;
    bar.hidden = !off;
    document.body.classList.toggle("saidera-net-on", off);
  },

  onOffline() {
    if (this.mode === "ready") this.syncNet();
    else if (this.mode === "boot") this.offline();
  },

  onOnline() {
    if (this.mode === "offline" || this.mode === "fail") {
      location.reload();
      return;
    }
    this.syncNet();
  },
};

window.SaideraShell = SaideraShell;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => SaideraShell.attach());
} else {
  SaideraShell.attach();
}
