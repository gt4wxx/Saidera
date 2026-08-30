const Store = {
  data: null,
  session: null,
  listeners: [],

  async init({ papel } = {}) {
    let me;
    try {
      me = await API.me();
    } catch (e) {
      document.body.innerHTML = `<main class="landing" style="padding:32px 16px;max-width:480px;margin:0 auto">
        <h1>Saideira</h1>
        <p>${e.message || "Não foi possível abrir o painel."}</p>
        <p><a href="${API.home()}" style="color:#F5B800">Voltar ao login</a></p>
      </main>`;
      return false;
    }
    if (!me) {
      const cliente = papel === "cliente" || /cliente\.php/.test(location.pathname);
      location.href = cliente ? (/\/pages\//.test(location.pathname) ? "../entrar.php" : "entrar.php") : API.home();
      return false;
    }
    if (papel && me.papel !== papel) {
      location.href = /\/pages\//.test(location.pathname) ? `../${me.pagina}` : me.pagina;
      return false;
    }
    this.session = me;
    if (window.UI?.pintarImpersonar) UI.pintarImpersonar();
    try {
      const boot = await API.get("bootstrap");
      this.data = boot;
    } catch (e) {
      document.body.innerHTML = `<main class="landing" style="padding:32px 16px;max-width:480px;margin:0 auto">
        <h1>Saideira</h1>
        <p>${e.message || "Não foi possível carregar seus dados."}</p>
        <p><a href="${API.home()}" style="color:#F5B800">Voltar ao login</a></p>
      </main>`;
      return false;
    }
    if (window.Logic?.hidratar) Logic.hidratar();
    return true;
  },

  replace(data, emit = true) {
    if (data) this.data = data;
    if (emit) this.emit();
  },

  applySync(sync, emit = true) {
    if (!sync || !this.data) return false;
    const same = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);
    let mudou = false;
    const setList = (key, list) => {
      if (same(this.data[key], list)) return;
      this.data[key] = list;
      mudou = true;
    };
    ["tickets", "saideras", "tampas"].forEach((key) => {
      if (Array.isArray(sync[key])) setList(key, sync[key]);
    });
    if (Array.isArray(sync.consumos)) {
      const byId = new Map((this.data.consumos || []).map((x) => [x.id, x]));
      sync.consumos.forEach((x) => byId.set(x.id, x));
      const next = [...byId.values()].sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
      setList("consumos", next);
    }
    if (Array.isArray(sync.notificacoes) && !same(this.data.notificacoes, sync.notificacoes)) {
      this.data.notificacoes = sync.notificacoes;
    }
    if (mudou && emit) this.emit();
    return mudou;
  },

  aplicarResposta(data) {
    if (!data) return;
    if (data.sync) this.applySync(data.sync);
    else if (data.store) this.replace(data.store);
  },

  startLive(ms = 3000) {
    if (this._live) return;
    this._live = true;
    const puxar = async () => {
      if (document.hidden || this._liveBusy || !this.data) return;
      this._liveBusy = true;
      try {
        const sync = await API.get("sync");
        this.applySync(sync);
      } catch {
        /* próxima rodada */
      } finally {
        this._liveBusy = false;
      }
    };
    this._liveTimer = setInterval(puxar, ms);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) puxar();
    });
    setTimeout(puxar, 1200);
  },

  save(emit = true) {
    if (emit) this.emit();
  },

  async reload() {
    const boot = await API.get("bootstrap");
    this.replace(boot);
    if (window.Logic?.hidratar) Logic.hidratar();
    return this.data;
  },

  on(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== fn);
    };
  },

  emit() {
    this.listeners.forEach((fn) => fn(this.data));
  },

  all(key) {
    return (this.data && this.data[key]) || [];
  },

  find(key, id) {
    return this.all(key).find((x) => x.id === id);
  },

  demo() {
    return this.session || this.data?.meta?.demo || {};
  },
};

window.Store = Store;
