const EntrarApp = {
  async boot() {
    try {
      UI.bindGlobal();
      const brand = document.getElementById("landing-brand");
      if (brand && window.Brand) {
        brand.innerHTML = `${Brand.principal()}<span class="badge badge-navy" style="margin-top:10px">Cliente</span>`;
      }
    } catch {
      /* a tela de login/cadastro já está no HTML */
    }
    const casa = window.SAIDERA_CASA_CONVITE || new URLSearchParams(location.search).get("casa") || "";
    if (casa) try { localStorage.setItem("saidera_casa_convite", casa); } catch { /* ok */ }
    this.bindForms();
    window.addEventListener("appinstalled", () => this.telaInstalado());
    if (location.hash === "#cadastro" || location.hash === "#form-cadastro") {
      document.getElementById("form-cadastro")?.scrollIntoView();
    }
    await this.decidir();
  },

  bindForms() {
    document.getElementById("form-login")?.addEventListener("submit", (e) => {
      e.preventDefault();
      UI.pwaAbrirPermissao({ silencioso: !UI.pwaIos() });
      this.entrar(new FormData(e.target));
    });
    document.getElementById("form-cadastro")?.addEventListener("submit", (e) => {
      e.preventDefault();
      UI.pwaAbrirPermissao({ silencioso: !UI.pwaIos() });
      this.cadastrar(new FormData(e.target));
    });
  },

  erro(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg || "";
  },

  status(html) {
    const box = document.getElementById("entrar-status");
    const login = document.getElementById("form-login");
    const cadastro = document.getElementById("cadastro");
    if (!box) return;
    if (html) {
      if (login) login.hidden = true;
      if (cadastro) cadastro.hidden = true;
      box.hidden = false;
      box.innerHTML = html;
    } else {
      box.hidden = true;
      box.innerHTML = "";
      if (login) login.hidden = false;
      if (cadastro) cadastro.hidden = false;
    }
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
    if (window.SaideraPwa?.installed) {
      this.telaInstalado();
      return;
    }
    this.telaInstalar(
      UI.pwaIos()
        ? "Toque em Instalar para autorizar. No iPhone a confirmação é no Safari: Compartilhar → role até Adicionar à Tela de Início."
        : "Confirme a permissão do celular. Se ela não abriu, toque em Instalar."
    );
    if (UI.pwaIos()) UI.pwaFolhaIos();
  },

  telaInstalado() {
    this.status(`<h2>Pronto</h2>
      <p class="muted" style="margin:10px 0 14px">O Saidera foi instalado. Abra pelo ícone na tela inicial.</p>
      <p class="tiny muted">Se esta tela continuar aberta, feche e toque no ícone Saidera.</p>`);
  },

  telaInstalar(msg) {
    this.status(`<h2>Instalar o Saidera</h2>
      <p class="muted" style="margin:10px 0 14px">${msg}</p>
      <button type="button" class="btn btn-gold btn-block" id="btn-instalar-agora" data-pwa-install>Instalar</button>
      ${UI.pwaIos() ? `<p class="notice" style="margin-top:12px">Só no <strong>Safari</strong>. Depois de Compartilhar, <strong>role a lista até o fim</strong> — Adicionar à Tela de Início fica escondido.</p>` : ""}
      <button type="button" class="btn btn-ghost btn-block" style="margin-top:10px" id="voltar-login">Voltar</button>`);
    document.getElementById("voltar-login")?.addEventListener("click", () => this.voltarLogin());
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
  },
};

document.addEventListener("DOMContentLoaded", () => EntrarApp.boot());
