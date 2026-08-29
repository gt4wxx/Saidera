const API = {
  base() {
    return /\/pages\//.test(location.pathname) ? "../api" : "api";
  },
  home() {
    return /\/pages\//.test(location.pathname) ? "../index.html" : "index.html";
  },
  url(path, params) {
    let u = `${this.base()}/index.php?r=${encodeURIComponent(String(path).replace(/^\//, ""))}`;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) u += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
      });
    }
    return u;
  },
  async req(path, opts = {}) {
    const res = await fetch(this.url(path, opts.params), {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      method: opts.method || "GET",
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    let json = {};
    try {
      json = await res.json();
    } catch {
      json = { ok: false, erro: "Resposta inválida do servidor." };
    }
    if (json.instalar) {
      location.href = this.home().replace("index.html", "instalar.php");
      throw new Error("Instalação pendente");
    }
    if (!json.ok) throw new Error(json.erro || "Não foi possível concluir.");
    return json.data;
  },
  get(path, params) {
    return this.req(path, { method: "GET", params });
  },
  post(path, body) {
    return this.req(path, { method: "POST", body });
  },
  async me() {
    try {
      return await this.get("me");
    } catch {
      return null;
    }
  },
};

window.API = API;
