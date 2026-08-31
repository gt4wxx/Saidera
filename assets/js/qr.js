const QR = {
  _stop: null,

  payload(codigo) {
    return `SAIDERA:${String(codigo || "").replace(/\s/g, "").toUpperCase()}`;
  },

  payloadTicket(codigo) {
    return `SAIDERA-T:${String(codigo || "").replace(/\s/g, "").toUpperCase()}`;
  },

  parseTicket(text) {
    const t = String(text || "").trim();
    const tagged = t.match(/SAIDERA-T:\s*([A-Z0-9\-]+)/i);
    if (tagged) return tagged[1].toUpperCase();
    const tkt = t.match(/\bTKT-[A-Z0-9]+\b/i);
    return tkt ? tkt[0].toUpperCase() : null;
  },

  parseCliente(text) {
    const d = this.decode(text);
    return d.tipo === "cliente" || d.tipo === "sdr" ? d.codigo : null;
  },

  decode(text) {
    const t = String(text || "").trim();
    const ticket = this.parseTicket(t);
    if (ticket) return { tipo: "ticket", codigo: ticket };
    const tagged = t.match(/SAIDERA:\s*([A-Z0-9\-]+)/i);
    if (tagged) {
      const codigo = this.normCodigo(tagged[1]);
      if (/^SAI-/.test(codigo)) return { tipo: "saidera", codigo };
      return { tipo: "cliente", codigo };
    }
    const sai = t.match(/\bSAI-?[A-Z0-9]+\b/i);
    if (sai) return { tipo: "saidera", codigo: this.normCodigo(sai[0]) };
    const sdr = t.match(/\bSDR-?[A-Z0-9]+\b/i);
    if (sdr) return { tipo: "sdr", codigo: this.normCodigo(sdr[0]) };
    return { tipo: "desconhecido", codigo: t };
  },

  normCodigo(raw) {
    let c = String(raw || "").replace(/\s/g, "").toUpperCase();
    c = c.replace(/^(SDR)(?!-)/, "SDR-").replace(/^(SAI)(?!-)/, "SAI-");
    return c;
  },

  parse(text) {
    return this.decode(text).codigo || String(text || "").trim();
  },

  svg(text, size = 188, opts = {}) {
    if (typeof qrcode !== "function") return "";
    const level = opts.level || (opts.logo || opts.logoSrc ? "H" : "M");
    const qr = qrcode(0, level);
    qr.addData(String(text), "Byte");
    qr.make();
    const raw = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    let out = raw
      .replace(/fill="black"/g, 'fill="#171717"')
      .replace(/fill="white"/g, 'fill="#FFF9E8"')
      .replace("<svg", `<svg width="${size}" height="${size}" class="qr-real" xmlns:xlink="http://www.w3.org/1999/xlink"`);
    if (opts.logoSrc) {
      const m = out.match(/viewBox="([^"]+)"/);
      const p = m ? m[1].split(/\s+/).map(Number) : [0, 0, size, size];
      const w = p[2] || size;
      const h = p[3] || size;
      const s = Math.min(w, h) * 0.22;
      const x = (w - s) / 2;
      const y = (h - s) / 2;
      const pad = s * 0.14;
      const href = String(opts.logoSrc).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      out = out.replace(
        "</svg>",
        `<rect x="${x - pad}" y="${y - pad}" width="${s + pad * 2}" height="${s + pad * 2}" rx="${s * 0.2}" fill="#FFF9E8"/>` +
          `<image href="${href}" xlink:href="${href}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/>` +
          `</svg>`
      );
    }
    return out;
  },

  erroCamera(err) {
    const nome = String(err?.name || "");
    const msg = String(err?.message || "");
    if (!window.isSecureContext) return "A câmera só funciona em HTTPS ou no app instalado.";
    if (!navigator.mediaDevices?.getUserMedia) {
      return window.UI?.pwaAndroid?.()
        ? "Este aparelho não libera a câmera neste navegador. Use o Chrome e permita a câmera."
        : "Este aparelho não libera a câmera neste navegador. Use o Safari no iPhone.";
    }
    if (nome === "NotAllowedError" || nome === "PermissionDeniedError" || /permission|notallowed|denied/i.test(msg)) {
      const como = window.UI?.ajudaPermissao?.("camera") || "Permita a câmera nas configurações do celular.";
      return "A câmera está bloqueada. " + como + " Depois toque de novo em Permitir câmera.";
    }
    if (nome === "NotFoundError" || nome === "DevicesNotFoundError") return "Nenhuma câmera foi encontrada neste aparelho.";
    if (nome === "NotReadableError" || nome === "TrackStartError") return "A câmera está em uso em outro app. Feche o outro app e tente de novo.";
    if (nome === "OverconstrainedError") return "Esta câmera não aceitou o modo pedido. Toque de novo em Permitir câmera.";
    return "Permita o acesso à câmera para ler o QR.";
  },

  temStream() {
    return Boolean(this._stream && this._stream.active);
  },

  async pedirStream() {
    if (this.temStream()) return this._stream;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error(this.erroCamera());
    }
    const tentativas = [
      { audio: false, video: { facingMode: { exact: "environment" } } },
      { audio: false, video: { facingMode: { ideal: "environment" } } },
      { audio: false, video: { facingMode: "user" } },
      { audio: false, video: true },
    ];
    let ultimo = null;
    for (const opts of tentativas) {
      try {
        this._stream = await navigator.mediaDevices.getUserMedia(opts);
        return this._stream;
      } catch (e) {
        ultimo = e;
      }
    }
    throw new Error(this.erroCamera(ultimo));
  },

  stopScan() {
    if (this._stop) {
      this._stop(false);
      this._stop = null;
    }
  },

  async startScan({ video, onCode, onError }) {
    if (this._stop) {
      this._stop(true);
      this._stop = null;
    }
    let stream;
    try {
      stream = await this.pedirStream();
    } catch (e) {
      onError && onError(e.message || this.erroCamera(e));
      return () => {};
    }
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.muted = true;
    video.autoplay = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* o iOS às vezes toca sozinho depois do srcObject */
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let detector = null;
    if ("BarcodeDetector" in window) {
      try {
        detector = new BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        detector = null;
      }
    }

    let live = true;
    const tick = async () => {
      if (!live) return;
      if (video.readyState >= 2 && video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        let raw = "";
        try {
          if (detector) {
            const codes = await detector.detect(canvas);
            raw = codes[0]?.rawValue || "";
          } else if (typeof jsQR === "function") {
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            raw = jsQR(img.data, img.width, img.height)?.data || "";
          }
        } catch {
          raw = "";
        }
        if (raw) {
          live = false;
          this.stopScan();
          onCode && onCode(this.parse(raw), raw);
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    this._stop = (manter) => {
      live = false;
      if (manter) return;
      stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
      video.srcObject = null;
    };
    return this._stop;
  },
};

window.QR = QR;
