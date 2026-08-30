/* legado — a Saideira agora usa PHP + MySQL na Hostinger */
(function () {
  var alvo = /\/pages\//.test(location.pathname) ? "../index.php" : "index.php";
  if (!window.API) location.replace(alvo);
})();
