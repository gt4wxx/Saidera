const API = {
  base() {
    return /\/pages\//.test(location.pathname) ? "../api.php" : "api.php";
  },
  home() {
    return /\/pages\//.test(location.pathname) ? "../index.php" : "index.php";
  },
  url(path, params) {
    let u = `${this.base()}?r=${encodeURIComponent(String(path).replace(/^\//, ""))}`;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) u += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
      });
    }
    return u;
  },
  async req(path, opts = {}) {
    let res;
    try {
      res = await fetch(this.url(path, opts.params), {
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
        method: opts.method || "GET",
        body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      const err = new Error("Não foi possível conectar ao servidor. Confirme se os arquivos PHP foram enviados à Hostinger.");
      err.status = 0;
      throw err;
    }
    let json = {};
    try {
      json = await res.json();
    } catch {
      const err = new Error("O servidor não respondeu como esperado. Envie a pasta api/ e o arquivo api.php para a Hostinger.");
      err.status = res.status;
      throw err;
    }
    if (json.instalar) {
      location.href = this.home().replace("index.php", "instalar.php");
      const err = new Error("Instalação pendente");
      err.instalar = true;
      throw err;
    }
    if (!json.ok) {
      const err = new Error(json.erro || "Não foi possível concluir.");
      err.status = res.status;
      throw err;
    }
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
    } catch (e) {
      if (e.status === 401) return null;
      throw e;
    }
  },
  async sair() {
    try {
      await this.post("auth/logout", {});
    } catch {
      /* ainda redireciona */
    }
    const cliente = /cliente\.php/.test(location.pathname);
    location.href = cliente ? "../entrar.php?sair=1" : `${this.home()}?sair=1`;
  },
};

window.API = API;
