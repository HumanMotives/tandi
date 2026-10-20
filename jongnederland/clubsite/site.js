/* Jong Nederland clubsite – kernscript. Beheerd door het Landelijk Bureau. */
(function () {
  "use strict";
  var VOORBEELD = document.documentElement.hasAttribute("data-voorbeeld");
  /* Zonder server (statische map) kan een formulier niet mailen: dan tonen we een demomelding */
  var GEEN_SERVER = VOORBEELD || document.documentElement.hasAttribute("data-statisch");

  /* Jaartal in de footer: altijd actueel, ook zonder nieuwe build */
  document.querySelectorAll("[data-jaar]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Mobiel menu */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  function zetMenu(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { zetMenu(!nav.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") zetMenu(false); });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) zetMenu(false);
    });
  }

  /* Voorbeeldmodus: alle pagina's in één bestand, navigatie via #/pagina */
  if (VOORBEELD) {
    var paginas = document.querySelectorAll("[data-pagina]");
    function toon() {
      var naam = (location.hash.replace(/^#\/?/, "").split("?")[0]) || "home";
      var gevonden = false;
      paginas.forEach(function (p) {
        var match = p.getAttribute("data-pagina") === naam;
        p.hidden = !match;
        if (match) { gevonden = true; document.title = p.getAttribute("data-titel"); }
      });
      if (!gevonden) { location.hash = "#/home"; return; }
      document.querySelectorAll(".nav-list a").forEach(function (a) {
        if (a.getAttribute("data-naar") === naam) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      zetMenu(false);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", toon);
    toon();
  }

  /* Formulieren: versturen naar /api/formulier (Cloudflare Pages Function) */
  document.querySelectorAll("form[data-formulier]").forEach(function (form) {
    var melding = form.querySelector(".form-melding");
    var knop = form.querySelector("button[type=submit]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      melding.className = "form-melding";
      if (!form.checkValidity()) { form.reportValidity(); return; }

      if (GEEN_SERVER) {
        melding.textContent = "Voorbeeld: in de echte site wordt dit bericht nu gemaild naar de club.";
        melding.className = "form-melding ok";
        form.reset();
        return;
      }

      var oud = knop.textContent;
      knop.disabled = true; knop.textContent = "Versturen…";
      fetch("/api/formulier", { method: "POST", body: new FormData(form) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d && res.d.fout || "Versturen mislukt.");
          melding.textContent = form.getAttribute("data-bedankt") || "Bedankt, je bericht is verstuurd.";
          melding.className = "form-melding ok";
          form.reset();
          if (window.turnstile) window.turnstile.reset();
        })
        .catch(function (err) {
          melding.textContent = err.message + " Probeer het opnieuw of mail ons direct.";
          melding.className = "form-melding fout";
        })
        .finally(function () { knop.disabled = false; knop.textContent = oud; });
    });
  });

  /* Fotoboek: lightbox met vorige/volgende */
  var lb = document.getElementById("lightbox");
  if (lb && typeof lb.showModal === "function") {
    var lbImg = lb.querySelector("img");
    var lbCap = lb.querySelector("figcaption");
    var reeks = [], index = 0;
    function laat(i) {
      index = (i + reeks.length) % reeks.length;
      var b = reeks[index];
      lbImg.src = b.getAttribute("data-groot") || b.querySelector("img").src;
      lbImg.alt = b.querySelector("img").alt;
      lbCap.textContent = lbImg.alt + " (" + (index + 1) + " / " + reeks.length + ")";
    }
    document.querySelectorAll(".galerij").forEach(function (g) {
      var knoppen = Array.prototype.slice.call(g.querySelectorAll("button"));
      knoppen.forEach(function (b, i) {
        b.addEventListener("click", function () { reeks = knoppen; laat(i); lb.showModal(); });
      });
    });
    lb.querySelector(".lb-vorige").addEventListener("click", function () { laat(index - 1); });
    lb.querySelector(".lb-volgende").addEventListener("click", function () { laat(index + 1); });
    lb.querySelector(".lb-sluit").addEventListener("click", function () { lb.close(); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") laat(index - 1);
      if (e.key === "ArrowRight") laat(index + 1);
    });
  }
})();
