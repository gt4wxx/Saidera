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
  v() {
    return String(window.SAIDERA_V || "45");
  },
  cache(url) {
    if (!url || /[?&]v=/.test(url)) return url;
    return `${url}${url.includes("?") ? "&" : "?"}v=${this.v()}`;
  },
  src(file) {
    return this.cache(`${this.brandDir()}/${file}`);
  },
  kitSrc(file) {
    return this.cache(`${this.kitDir()}/${file}`);
  },
  abs(file, fromKit = false) {
    return new URL(fromKit ? this.kitSrc(file) : this.src(file), location.href).href;
  },
  async dataUrl(file, fromKit = false) {
    const abs = this.abs(file, fromKit);
    try {
      const res = await fetch(abs, { credentials: "same-origin" });
      if (!res.ok) return abs;
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return abs;
    }
  },
  img(file, cls = "", alt = "Saideira") {
    return `<img class="${cls}" src="${this.src(file)}" alt="${alt}"/>`;
  },
  mark(size = 38) {
    return `<img class="brand-mark" src="${this.src("11_app_icon_preto.png")}" alt="Saideira" width="${size}" height="${size}"/>`;
  },
  markGold(size = 64) {
    return `<img class="brand-mark" src="${this.src("10_app_icon_amarelo.png")}" alt="Saideira" width="${size}" height="${size}"/>`;
  },
  simbolo(size = 56) {
    return `<img class="brand-simbolo" src="${this.src("02_simbolo_logo.png")}" alt="Saideira" width="${size}" height="${size}"/>`;
  },
  horizontal(cls = "brand-h") {
    return `<img class="${cls}" src="${this.kitSrc("03_logo_horizontal.png")}" alt="Saideira"/>`;
  },
  principal(cls = "brand-principal") {
    return `<img class="${cls}" src="${this.kitSrc("03_logo_horizontal.png")}" alt="Saideira"/>`;
  },
  empilhada(cls = "brand-principal") {
    return `<img class="${cls}" src="${this.kitSrc("01_logo_principal.png")}" alt="Saideira"/>`;
  },
  banner(tipo, cls = "brand-banner") {
    const file =
      tipo === "story"
        ? "09_banner_story.png"
        : tipo === "secundario"
          ? "08_banner_secundario.png"
          : "07_banner_principal.png";
    return `<img class="${cls}" src="${this.cache(`${this.kitDir()}/${file}`)}" alt="Saideira"/>`;
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

  lineChart(values, labels = [], keys = [], selected = "") {
    const w = 560, h = 176, p = 22;
    if (!values.length) return `<p class="muted empty-msg">Sem dados para o gráfico.</p>`;
    const max = Math.max(1, ...values) * 1.12;
    const min = 0;
    const last = values.length - 1;
    const step = values.length > 12 ? Math.ceil(values.length / 7) : 1;
    const pts = values.map((v, i) => {
      const x = p + (i / Math.max(1, last)) * (w - p * 2);
      const y = h - p - ((v - min) / (max - min || 1)) * (h - p * 2 - 14);
      return [x, y, v];
    });
    const d = pts.map((pt, i) => (i ? "L" : "M") + pt[0] + "," + pt[1]).join(" ");
    const area = `${d} L${pts.at(-1)[0]},${h - p} L${pts[0][0]},${h - p} Z`;
    const uid = `cg${Math.random().toString(36).slice(2, 8)}`;
    const dots = pts
      .map((pt, i) => {
        const key = String(keys[i] || "").replace(/"/g, "");
        const title = `${labels[i] || ""} · ${pt[2]} tampas`;
        const dot = `<circle cx="${pt[0]}" cy="${pt[1]}" r="4.5" fill="#171717" stroke="#F5B800" stroke-width="2.5"><title>${title}</title></circle>`;
        if (!key) return dot;
        const on = selected && key === selected ? " on" : "";
        return `<g data-dash-dia="${key}" class="chart-hit${on}" style="cursor:pointer"><circle cx="${pt[0]}" cy="${pt[1]}" r="16" fill="transparent"/><title>${title} — clique para ver o dia</title>${dot}</g>`;
      })
      .join("");
    const labs = labels
      .map((l, i) => {
        if (step > 1 && i % step && i !== last) return "";
        return `<text x="${pts[i][0]}" y="${h - 4}" text-anchor="middle" fill="#8A8A8A" font-size="11" font-weight="600">${l}</text>`;
      })
      .join("");
    return `<svg class="chart-line" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F5B800" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#F5B800" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${uid})" pointer-events="none"/>
      <path d="${d}" fill="none" stroke="#F5B800" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>
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
        const chave = String(it.chave || it.nome || "").replace(/"/g, "");
        const on = it.on ? " on" : "";
        const hit = it.clicavel !== false && chave
          ? ` role="button" tabindex="0" data-dash-bairro="${chave}"`
          : "";
        return `<div class="rank-row rank-hit${on}"${hit}>
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
        const filtro = it.filtro ? ` data-dash-filtro="${it.filtro}" style="cursor:pointer"` : "";
        return `<circle class="donut-seg" cx="80" cy="80" r="${r}" fill="none" stroke="${it.cor || colors[i % colors.length]}" stroke-width="18" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" transform="rotate(${rot} 80 80)"${filtro}/>`;
      })
      .join("");
    return `<div class="donut-wrap">
      <div class="donut-svg">
        <svg viewBox="0 0 160 160">${rings}<circle cx="80" cy="80" r="36" fill="#171717"/></svg>
        <div class="donut-center"><b>${total}</b><span>${centro}</span></div>
      </div>
      <ul class="donut-leg">${list
        .map((it, i) => {
          const cor = it.cor || colors[i % colors.length];
          const inner = `<i style="background:${cor}"></i><span>${it.nome}</span><strong>${it.n}</strong>`;
          if (it.filtro) {
            return `<li><button type="button" class="donut-leg-btn" data-dash-filtro="${it.filtro}">${inner}</button></li>`;
          }
          return `<li>${inner}</li>`;
        })
        .join("")}</ul>
    </div>`;
  },

  heatRow(labels, values, opts = {}) {
    const max = Math.max(1, ...(values || [0]));
    return `<div class="heat-row">${(values || [])
      .map((v, i) => {
        const t = v / max;
        const a = 0.22 + 0.78 * t;
        const color = t > 0.4 ? "#171717" : "#F4E7C3";
        const on = opts.selected === i ? " on" : "";
        const inner = `<b>${v}</b><span>${labels[i] || ""}</span>`;
        const style = `background:rgba(245,184,0,${a.toFixed(2)});color:${color}`;
        if (opts.clickable) {
          return `<button type="button" class="heat-cell${on}" data-dash-wd="${i}" style="${style}">${inner}</button>`;
        }
        return `<div class="heat-cell" style="${style}">${inner}</div>`;
      })
      .join("")}</div>`;
  },

  qrApp({ url, casa = "", size = 220, logoSrc } = {}) {
    const icon = logoSrc || (window.Brand ? Brand.abs("10_app_icon_amarelo.png") : "");
    const qr = window.QR?.svg ? QR.svg(url, size, { logo: true, logoSrc: icon }) : this.qrSvg(url);
    const casaTxt = String(casa || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
    return `<div class="qr-app">
      <div class="qr-app-brand">${Brand.horizontal("brand-h brand-h-qr")}</div>
      <p class="qr-app-kicker">Cadastre-se e baixe o app</p>
      <div class="qr-app-frame">${qr}</div>
      <h3 class="qr-app-title">Leia e entre na Saideira</h3>
      ${casaTxt ? `<p class="qr-app-casa">${casaTxt}</p>` : ""}
      <p class="qr-app-sub">Quem não tem o app cai no cadastro. Quem já tem abre a Saideira.</p>
    </div>`;
  },

  qrSvg(codigo) {
    const raw = String(codigo || "").trim();
    if (!raw) return `<p class="muted">Sem código para o QR.</p>`;
    const payload = window.QR ? QR.payload(raw) : raw;
    if (window.QR?.svg) {
      const svg = QR.svg(payload, 188);
      if (svg) return svg;
    }
    return `<p class="muted">Não foi possível desenhar o QR. Recarregue a página.</p>`;
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
      const el = e.target.closest("button, a, [data-act], [data-go], [data-href], [data-menu], [data-back], [data-pin], [data-map-bairro], [data-close-modal], [data-close-menu], [data-pwa-install], [data-camera-go], [data-action]");
      if (!el) return;
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
      if (el.closest("[data-pwa-ios-close]")) {
        e.preventDefault();
        document.getElementById("pwa-ios-folha")?.remove();
        return;
      }
      if (el.closest("[data-pwa-ios-seguir]")) {
        e.preventDefault();
        this.pwaFolhaIosPassoShare();
        return;
      }
      if (el.closest("[data-pwa-ios-safari]")) {
        e.preventDefault();
        this.pwaAbrirSafari();
        return;
      }
      if (el.closest("[data-pwa-ios-copy]")) {
        e.preventDefault();
        this.pwaCopiarLink();
        return;
      }
      const camGo = el.closest("[data-camera-go]");
      if (camGo) {
        e.preventDefault();
        const dest = camGo.getAttribute("data-camera-go");
        const ir = () => {
          if (window.ClienteApp?.go) window.ClienteApp.go(dest);
          else location.hash = dest;
        };
        if (window.QR?.pedirStream) {
          QR.pedirStream().then(ir).catch((err) => {
            this.toast(err.message || "Permita a câmera e tente de novo.");
            ir();
          });
        } else ir();
        return;
      }
      if (el.closest("[data-pwa-install]")) {
        e.preventDefault();
        this.pwaAbrirPermissao();
        return;
      }
      const act = el.closest("[data-act]");
      if (act && act.getAttribute("data-act") === "admin-voltar") {
        e.preventDefault();
        this.voltarAdmin();
        return;
      }
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
    this.pintarImpersonar();
  },

  pintarImpersonar() {
    document.getElementById("impersonar-bar")?.remove();
    document.body.classList.remove("has-impersonar");
    if (!window.Store?.session?.impersonando) return;
    const nome = Store.session.nome || Store.session.email || "esta conta";
    const papel = Store.session.papel === "funcionario"
      ? "garçom"
      : Store.session.papel === "estabelecimento"
        ? "casa"
        : Store.session.papel || "conta";
    const bar = document.createElement("div");
    bar.id = "impersonar-bar";
    bar.className = "impersonar-bar";
    bar.innerHTML = `<span>Você está vendo como ${this.escHtml(nome)} (${papel}).</span>
      <button type="button" class="btn btn-navy btn-sm" data-act="admin-voltar">Voltar ao admin</button>`;
    document.body.prepend(bar);
    document.body.classList.add("has-impersonar");
  },

  escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  async voltarAdmin() {
    try {
      const data = await API.post("admin/voltar", {});
      const pag = data?.session?.pagina || "pages/admin.php";
      location.href = /\/pages\//.test(location.pathname) ? `../${pag}` : pag;
    } catch (e) {
      this.toast(e.message || "Não deu para voltar ao admin.");
    }
  },

  pedirLocalizacao() {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext) {
        reject(new Error("A localização só funciona em HTTPS ou no app instalado."));
        return;
      }
      if (!navigator.geolocation) {
        reject(new Error("Este aparelho não informa a localização."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err?.code === 1) {
            reject(new Error("A localização está bloqueada. " + this.ajudaPermissao("localizacao")));
            return;
          }
          if (err?.code === 2) {
            reject(new Error("Não achamos sua posição. Ligue o GPS e tente de novo."));
            return;
          }
          if (err?.code === 3) {
            reject(new Error("A localização demorou. Tente de novo em um lugar mais aberto."));
            return;
          }
          reject(new Error("Não deu para ver onde você está. Busque pelo nome ou bairro."));
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    });
  },

  pwaStandalone() {
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
      if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    } catch {
      /* matchMedia indisponível */
    }
    if (window.navigator.standalone) return true;
    if (String(document.referrer || "").startsWith("android-app://")) return true;
    return false;
  },

  pwaCelular() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  },

  pwaAndroid() {
    return /Android/i.test(navigator.userAgent || "");
  },

  ajudaPermissao(tipo) {
    const oque = tipo === "camera" ? "Câmera" : "Localização";
    if (this.pwaIos()) {
      return `No iPhone: Ajustes → Saideira (ou Safari) → ${oque} → Permitir.`;
    }
    if (this.pwaStandalone()) {
      return `No Android: mantenha o ícone Saideira → Informações do app → Permissões → ${oque} → Permitir.`;
    }
    return `No Android: toque no cadeado do Chrome → Permissões → ${oque} → Permitir. Ou menu ⋮ → Configurações do site.`;
  },

  pwaIos() {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  },

  pwaIosSafari() {
    if (!this.pwaIos()) return false;
    const ua = navigator.userAgent || "";
    if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Instagram|FBAN|FBAV|FB_IAB|Line\/|WhatsApp|Twitter|TikTok/i.test(ua)) return false;
    return /Safari/i.test(ua);
  },

  pwaIconeShare() {
    return `<svg class="pwa-ios-share" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="M8 8l4-4 4 4"/><path d="M5 14v6h14v-6"/></svg>`;
  },

  pwaAbrirSafari() {
    const href = location.href;
    const safari = href.startsWith("https://")
      ? href.replace(/^https:\/\//, "x-safari-https://")
      : href.replace(/^http:\/\//, "x-safari-http://");
    location.href = safari;
  },

  async pwaCopiarLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      this.toast("Link copiado. Cole na barra do Safari.");
    } catch {
      this.toast("Copie o endereço da página e abra no Safari.");
    }
  },

  pwaFolhaIos() {
    document.getElementById("pwa-ios-folha")?.remove();
    const safari = this.pwaIosSafari();
    const icon = this.src("apple-touch.png");
    const bg = document.createElement("div");
    bg.id = "pwa-ios-folha";
    bg.className = "pwa-ios-bg";
    bg.innerHTML = safari
      ? `<div class="pwa-ios-card" role="dialog" aria-labelledby="pwa-ios-tit">
          <div class="pwa-ios-app">
            <img src="${icon}" alt=""/>
            <div>
              <p class="tiny muted">Permissão do iPhone</p>
              <h2 id="pwa-ios-tit">Adicionar a Saideira à tela inicial?</h2>
            </div>
          </div>
          <p class="muted" style="margin:12px 0 14px">O iPhone não abre o aviso sozinho. Autorize aqui e confirme nos 2 toques do Safari — o item fica <strong>no fim</strong> da lista de compartilhar.</p>
          <ol class="pwa-ios-passos">
            <li>Toque em <strong>Permitir</strong> abaixo.</li>
            <li>Toque em ${this.pwaIconeShare()} <strong>Compartilhar</strong> na barra de baixo do Safari.</li>
            <li><strong>Role a lista até o fim</strong> e toque em <strong>Adicionar à Tela de Início</strong>.</li>
            <li>Toque em <strong>Adicionar</strong>.</li>
          </ol>
          <button type="button" class="btn btn-gold btn-block" data-pwa-ios-seguir>Permitir</button>
          <button type="button" class="btn btn-ghost btn-block" style="margin-top:8px" data-pwa-ios-close>Agora não</button>
        </div>`
      : `<div class="pwa-ios-card" role="dialog" aria-labelledby="pwa-ios-tit">
          <div class="pwa-ios-app">
            <img src="${icon}" alt=""/>
            <div>
              <p class="tiny muted">Permissão do iPhone</p>
              <h2 id="pwa-ios-tit">Adicionar a Saideira à tela inicial?</h2>
            </div>
          </div>
          <p class="muted" style="margin:12px 0 14px">Este navegador <strong>não mostra</strong> “Adicionar à Tela de Início”. A permissão só existe no <strong>Safari</strong>.</p>
          <button type="button" class="btn btn-gold btn-block" data-pwa-ios-safari>Permitir e abrir no Safari</button>
          <button type="button" class="btn btn-navy btn-block" style="margin-top:8px" data-pwa-ios-copy>Copiar link para o Safari</button>
          <button type="button" class="btn btn-ghost btn-block" style="margin-top:8px" data-pwa-ios-close>Agora não</button>
        </div>`;
    bg.addEventListener("click", (e) => {
      if (e.target === bg) bg.remove();
    });
    document.body.appendChild(bg);
  },

  pwaFolhaIosPassoShare() {
    const card = document.querySelector("#pwa-ios-folha .pwa-ios-card");
    if (!card) {
      this.pwaFolhaIos();
      return;
    }
    card.innerHTML = `<div class="pwa-ios-apontar">
        ${this.pwaIconeShare()}
        <h2>Permissão autorizada</h2>
        <p class="muted">Toque em <strong>Compartilhar</strong> na barra de baixo do Safari. Role até o fim da lista e toque em <strong>Adicionar à Tela de Início</strong>.</p>
        <button type="button" class="btn btn-ghost btn-block" style="margin-top:14px" data-pwa-ios-close>Fechar</button>
      </div>`;
  },

  pwaBox() {
    if (this.pwaStandalone()) return "";
    return `<div class="pwa-box" data-pwa-box>
      <button class="btn btn-gold btn-block" type="button" data-pwa-install>Instalar a Saideira</button>
      <p class="tiny muted" style="margin-top:8px">${this.pwaIos() ? "No iPhone a permissão abre aqui. Depois confirme no Safari." : "Opcional. Chrome ou Edge no celular ou no PC."}</p>
    </div>`;
  },

  pwaCliente() {
    return /entrar\.php|cliente\.php/.test(location.pathname);
  },

  pages() {
    return Brand.pages();
  },

  pwaInit() {
    if (this._pwaReady) return;
    this._pwaReady = true;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this._pwaPrompt = e;
      if (window.SaideraPwa) window.SaideraPwa.ev = e;
    });
    window.addEventListener("appinstalled", () => {
      this._pwaPrompt = null;
      if (window.SaideraPwa) {
        window.SaideraPwa.ev = null;
        window.SaideraPwa.installed = true;
      }
      this.toast("Saideira instalada neste aparelho.");
      document.querySelectorAll("[data-pwa-box]").forEach((el) => el.classList.add("hidden"));
    });
  },

  pwaEvento() {
    return this._pwaPrompt || window.SaideraPwa?.ev || null;
  },

  pwaAbrirPermissao(opcoes) {
    if (this.pwaStandalone() || window.SaideraPwa?.installed) return "standalone";
    const ev = this.pwaEvento();
    if (ev && typeof ev.prompt === "function") {
      this._pwaPrompt = null;
      if (window.SaideraPwa) window.SaideraPwa.ev = null;
      try {
        ev.prompt();
      } catch {
        return null;
      }
      ev.userChoice
        .then((c) => {
          if (c.outcome === "accepted") {
            if (window.SaideraPwa) window.SaideraPwa.installed = true;
            this.toast("Saideira instalada. Abra pelo ícone.");
          }
        })
        .catch(() => {});
      return "asked";
    }
    if (this.pwaIos()) {
      if (!opcoes?.silencioso) this.pwaFolhaIos();
      return "ios";
    }
    if (!opcoes?.silencioso) {
      this.toast("A permissão ainda não chegou. Toque de novo em Instalar. Use Chrome ou Edge.");
    }
    return null;
  },
};

window.UI = UI;
