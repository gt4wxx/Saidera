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
    const t = String(text || "").trim();
    if (this.parseTicket(t)) return null;
    const tagged = t.match(/SAIDERA:\s*([A-Z0-9\-]+)/i);
    if (tagged) return tagged[1].replace(/^(SDR)(\d)/i, "SDR-$2").toUpperCase();
    const sdr = t.match(/\bSDR-?\d+\b/i);
    if (sdr) return sdr[0].replace(/^(SDR)(\d)/i, "SDR-$2").toUpperCase();
    return null;
  },

  decode(text) {
    const t = String(text || "").trim();
    const ticket = this.parseTicket(t);
    if (ticket) return { tipo: "ticket", codigo: ticket };
    const tagged = t.match(/SAIDERA:\s*([A-Z0-9\-]+)/i);
    if (tagged) {
      return { tipo: "cliente", codigo: tagged[1].replace(/^(SDR)(\d)/i, "SDR-$2").toUpperCase() };
    }
    const sdr = t.match(/\bSDR-?\d+\b/i);
    if (sdr) return { tipo: "sdr", codigo: sdr[0].replace(/^(SDR)(\d)/i, "SDR-$2").toUpperCase() };
    return { tipo: "desconhecido", codigo: t };
  },

  parse(text) {
    return this.decode(text).codigo || String(text || "").trim();
  },

  svg(text, size = 188) {
    if (typeof qrcode !== "function") return "";
    const qr = qrcode(0, "M");
    qr.addData(String(text), "Byte");
    qr.make();
    const raw = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    return raw
      .replace(/fill="black"/g, 'fill="#171717"')
      .replace(/fill="white"/g, 'fill="#FFF9E8"')
      .replace("<svg", `<svg width="${size}" height="${size}" class="qr-real"`);
  },

  stopScan() {
    if (this._stop) {
      this._stop();
      this._stop = null;
    }
  },

  async startScan({ video, onCode, onError }) {
    this.stopScan();
    if (!navigator.mediaDevices?.getUserMedia) {
      onError && onError("Câmera indisponível neste navegador.");
      return () => {};
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch {
      onError && onError("Permita o acesso à câmera para ler o QR.");
      return () => {};
    }
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.muted = true;
    await video.play().catch(() => {});

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
          stream.getTracks().forEach((t) => t.stop());
          this._stop = null;
          onCode && onCode(this.parse(raw), raw);
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    this._stop = () => {
      live = false;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
    return this._stop;
  },
};

window.QR = QR;
