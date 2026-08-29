const EntrarApp = {
  async boot() {
    UI.bindGlobal();
    document.getElementById("landing-brand").innerHTML =
      `${Brand.principal()}<span class="badge badge-navy" style="margin-top:10px">Cliente</span>`;
    const casa = window.SAIDERA_CASA_CONVITE || new URLSearchParams(location.search).get("casa") || "";
    if (casa) localStorage.setItem("saidera_casa_convite", casa);
    this.bindTabs();
    this.bindForms();
    this.tab(location.hash === "#cadastro" ? "cadastro" : "login");
    window.addEventListener("hashchange", () => {
      this.tab(location.hash === "#cadastro" ? "cadastro" : "login");
    });
    await this.decidir();
  },

  tab(id) {
    const qual = id === "cadastro" ? "cadastro" : "login";
    document.querySelectorAll("[data-entrar-tab]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-entrar-tab") === qual));
    const login = document.getElementById("form-login");
    const cad = document.getElementById("form-cadastro");
    const tabs = document.getElementById("entrar-tabs");
    const status = document.getElementById("entrar-status");
    if (tabs) tabs.hidden = false;
    if (status) {
      status.hidden = true;
      status.innerHTML = "";
    }
    if (login) {
      login.classList.toggle("on", qual === "login");
      login.hidden = qual !== "login";
    }
    if (cad) {
      cad.classList.toggle("on", qual === "cadastro");
      cad.hidden = qual !== "cadastro";
    }
    if (location.hash !== `#${qual}`) {
      history.replaceState(null, "", `#${qual}`);
    }
  },

  bindTabs() {
    document.querySelectorAll("[data-entrar-tab]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const id = b.getAttribute("data-entrar-tab") || "login";
        location.hash = id;
        this.tab(id);
      });
    });
  },

  bindForms() {
    document.getElementById("form-login")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.entrar(new FormData(e.target));
    });
    document.getElementById("form-cadastro")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.cadastrar(new FormData(e.target));
    });
  },

  erro(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg || "";
  },

  status(html) {
    const card = document.getElementById("entrar-card");
    const box = document.getElementById("entrar-status");
    const login = document.getElementById("form-login");
    const cad = document.getElementById("form-cadastro");
    const tabs = document.getElementById("entrar-tabs");
    if (html) {
      if (login) login.hidden = true;
      if (cad) cad.hidden = true;
      if (tabs) tabs.hidden = true;
      box.hidden = false;
      box.innerHTML = html;
    } else {
      box.hidden = true;
      box.innerHTML = "";
      if (tabs) tabs.hidden = false;
      this.tab(location.hash === "#cadastro" ? "cadastro" : "login");
    }
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  async decidir() {
    let me = null;
    try {
      me = await API.me();
    } catch {
      me = null;
    }
    if (me && me.papel !== "cliente") {
      location.href = me.pagina;
      return;
    }
    if (UI.pwaStandalone() && me?.papel === "cliente") {
      location.replace("pages/cliente.php");
      return;
    }
    const instalar = new URLSearchParams(location.search).get("instalar") === "1";
    if (instalar && !UI.pwaStandalone() && (me?.papel === "cliente" || window.SAIDERA_CLIENTE_LOGADO)) {
      await this.depoisDeAuth();
    }
  },

  async entrar(fd) {
    this.erro("login-erro", "");
    try {
      const data = await API.post("auth/login", {
        email: fd.get("email"),
        senha: fd.get("senha"),
      });
      if (data.papel !== "cliente") {
        location.href = data.pagina;
        return;
      }
      await this.depoisDeAuth();
    } catch (e) {
      this.erro("login-erro", e.message || "E-mail ou senha inválidos.");
    }
  },

  async cadastrar(fd) {
    this.erro("cad-erro", "");
    try {
      await API.post("auth/registrar-cliente", {
        nome: fd.get("nome"),
        email: fd.get("email"),
        senha: fd.get("senha"),
        telefone: fd.get("telefone") || null,
        nascimento: fd.get("nascimento") || null,
        bairro: fd.get("bairro") || null,
        cidade: "Aracaju",
      });
      await this.depoisDeAuth();
    } catch (e) {
      this.erro("cad-erro", e.message || "Não foi possível cadastrar.");
    }
  },

  async depoisDeAuth() {
    if (UI.pwaStandalone()) {
      location.replace("pages/cliente.php");
      return;
    }
    this.status(`<h2>Instalar o Saidera</h2>
      <p class="muted" style="margin:10px 0 14px">O painel do cliente só abre no app. Confirme a instalação no celular.</p>
      <p class="tiny muted" id="entrar-inst-msg">Abrindo o convite de instalar…</p>`);
    const outcome = await UI.pwaPedirInstalacao();
    if (outcome === "standalone") {
      location.replace("pages/cliente.php");
      return;
    }
    if (outcome === "accepted") {
      this.status(`<h2>Pronto</h2>
        <p class="muted" style="margin:10px 0 14px">O Saidera foi instalado. Abra pelo ícone na tela inicial — o app abre sozinho neste aparelho.</p>
        <p class="tiny muted">Se a tela do navegador continuar aberta, feche e toque no ícone Saidera.</p>`);
      return;
    }
    await this.cancelarInstalacao(outcome);
  },

  async cancelarInstalacao(motivo) {
    if (motivo === "ios") {
      this.status(`<h2>Instalar no iPhone</h2>
        <p class="notice">Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>. Depois abra pelo ícone Saidera. O painel não abre no Safari.</p>
        <button type="button" class="btn btn-ghost btn-block" style="margin-top:14px" id="voltar-login">Voltar</button>`);
      document.getElementById("voltar-login")?.addEventListener("click", () => this.voltarLogin());
      return;
    }
    if (motivo === "unavailable") {
      this.status(`<h2>Abra o app</h2>
        <p class="muted" style="margin:10px 0 14px">O cliente não entra pelo navegador. Se o Saidera já está no celular, toque no ícone. Senão, no Chrome: menu ⋮ → Instalar Saidera.</p>
        <button type="button" class="btn btn-ghost btn-block" id="voltar-login">Voltar</button>`);
      document.getElementById("voltar-login")?.addEventListener("click", () => this.voltarLogin(true));
      return;
    }
    await this.voltarLogin(true);
    this.erro("login-erro", "A instalação foi cancelada. Entre de novo e confirme para abrir o app.");
  },

  async voltarLogin(sair) {
    if (sair) {
      try {
        await API.post("auth/logout", {});
      } catch {
        /* fica no login */
      }
      window.SAIDERA_CLIENTE_LOGADO = false;
    }
    this.status("");
    this.tab("login");
  },
};

document.addEventListener("DOMContentLoaded", () => EntrarApp.boot());
