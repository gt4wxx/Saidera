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
  const sw = /\/pages\//.test(location.pathname) ? "../sw.js" : "sw.js";
  navigator.serviceWorker.register(sw).catch(() => {});
}
