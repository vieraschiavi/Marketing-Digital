// © 2026 Martín Viera. Todos los derechos reservados.
// /en/ y /pt/ existen para que los buscadores y las redes vean el <head>
// traducido (título, descripción, OG, hreflang). La persona va a la landing
// única con ?lang=, que es la que tiene todo el contenido. Externo porque la
// CSP prohíbe <script> inline; el <meta refresh> queda de respaldo.
(function () {
  var lang = document.documentElement.getAttribute("data-lang") || "es";
  location.replace("/?lang=" + lang + location.hash);
})();
