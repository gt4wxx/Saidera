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
        <h1>Saidera</h1>
        <p>${e.message || "Não foi possível abrir o painel."}</p>
        <p><a href="${API.home()}" style="color:#F5B800">Voltar ao login</a></p>
      </main>`;
      return false;
    }
    if (!me) {
      location.href = API.home();
      return false;
    }
    if (papel && me.papel !== papel) {
      location.href = /\/pages\//.test(location.pathname) ? `../${me.pagina}` : me.pagina;
      return false;
    }
    this.session = me;
    try {
      const boot = await API.get("bootstrap");
      this.data = boot;
    } catch (e) {
      document.body.innerHTML = `<main class="landing" style="padding:32px 16px;max-width:480px;margin:0 auto">
        <h1>Saidera</h1>
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
