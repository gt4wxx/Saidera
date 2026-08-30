window.SaideraPwa = window.SaideraPwa || { ev: null, installed: false };
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.SaideraPwa.ev = e;
});
window.addEventListener("appinstalled", () => {
  window.SaideraPwa.ev = null;
  window.SaideraPwa.installed = true;
});
if ("serviceWorker" in navigator) {
  const nasPages = /\/pages\//.test(location.pathname);
  const sw = nasPages ? "../sw.js" : "sw.js";
  const scope = nasPages ? "../" : "./";
  navigator.serviceWorker.register(sw, { scope: scope }).catch(() => {});
}
