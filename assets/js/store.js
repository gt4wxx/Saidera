const STORE_KEY = "saidera_v1";

const Store = {
  data: null,
  listeners: [],

  init() {
    if (!window.SAIDERA_SEED) {
      document.body.innerHTML = "<p style='padding:40px;font-family:sans-serif'>Abra o Saidera com <code>node serve.js</code> e acesse http://localhost:5173</p>";
      throw new Error("SAIDERA_SEED ausente");
    }
    const cached = localStorage.getItem(STORE_KEY);
    if (cached) {
      try {
        this.data = JSON.parse(cached);
        if (!this.data?.clientes?.length || !this.data?.meta) throw new Error("bad cache");
      } catch {
        this.data = structuredClone(window.SAIDERA_SEED);
        this.save(false);
      }
    } else {
      this.data = structuredClone(window.SAIDERA_SEED);
      this.save(false);
    }
    window.addEventListener("storage", (e) => {
      if (e.key === STORE_KEY && e.newValue) {
        try {
          this.data = JSON.parse(e.newValue);
          this.emit();
        } catch {}
      }
    });
    return this;
  },

  save(emit = true) {
    localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    if (emit) this.emit();
  },

  reset() {
    localStorage.removeItem(STORE_KEY);
    this.data = structuredClone(window.SAIDERA_SEED);
    this.save();
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
    return this.data[key] || [];
  },

  find(key, id) {
    return (this.data[key] || []).find((x) => x.id === id);
  },

  demo() {
    return this.data.meta.demo;
  },
};

window.Store = Store;
