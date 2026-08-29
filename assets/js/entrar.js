const EntrarApp = {
  async boot() {
    UI.bindGlobal();
    document.getElementById("landing-brand").innerHTML =
      `${Brand.principal()}<span class="badge badge-navy" style="margin-top:10px">Cliente</span>`;
    const casa = window.SAIDERA_CASA_CONVITE || new URLSearchParams(location.search).get("casa") || "";
    if (casa) localStorage.setItem("saidera_casa_convite", casa);
    this.bindTabs();
    this.bindForms();
    if (location.hash === "#cadastro") this.tab("cadastro");
    await this.decidir();
  },

  tab(id) {
    document.querySelectorAll("[data-entrar-tab]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-entrar-tab") === id));
    const login = document.getElementById("form-login");
    const cad = document.getElementById("form-cadastro");
    if (login) login.hidden = id !== "login";
    if (cad) cad.hidden = id !== "cadastro";
  },

  bindTabs() {
    document.querySelectorAll("[data-entrar-tab]").forEach((b) => {
      b.addEventListener("click", () => this.tab(b.getAttribute("data-entrar-tab")));
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
    const tabs = document.querySelector(".entrar-tabs");
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
      this.tab("login");
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
    if (!UI.pwaStandalone() && (me?.papel === "cliente" || window.SAIDERA_CLIENTE_LOGADO)) {
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
      this.tab("cadastro");
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
        <button type="button" class="btn btn-ghost btn-block" style="margin-top:14px" id="voltar-login">Voltar ao login</button>`);
      document.getElementById("voltar-login")?.addEventListener("click", () => this.voltarLogin());
      return;
    }
    if (motivo === "unavailable") {
      this.status(`<h2>Abra o app</h2>
        <p class="muted" style="margin:10px 0 14px">O cliente não entra pelo navegador. Se o Saidera já está no celular, toque no ícone. Senão, no Chrome: menu ⋮ → Instalar Saidera.</p>
        <button type="button" class="btn btn-ghost btn-block" id="voltar-login">Voltar ao login</button>`);
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
