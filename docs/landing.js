// Landing de Bóveda: idioma, aparición al hacer scroll y movimiento 3D. Sin dependencias ni rastreo.
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Idioma ──
  var nodes = document.querySelectorAll("[data-en]");
  var button = document.getElementById("lang");
  var video = document.getElementById("promo");
  nodes.forEach(function (n) {
    n.dataset.es = n.textContent;
  });
  function setLang(lang) {
    root.lang = lang;
    nodes.forEach(function (n) {
      n.textContent = n.dataset[lang];
    });
    button.textContent = lang === "es" ? "EN" : "ES";
    var src = "media/promo-" + lang + ".mp4";
    if (video && video.getAttribute("src") !== src && video.paused) video.setAttribute("src", src);
    try {
      localStorage.setItem("bv-landing-lang", lang);
    } catch (e) {}
  }
  var saved = null;
  try {
    saved = localStorage.getItem("bv-landing-lang");
  } catch (e) {}
  var initial = saved || (/^es/i.test(navigator.language || "") ? "es" : "en");
  if (initial !== "es") setLang(initial);
  button.addEventListener("click", function () {
    setLang(root.lang === "es" ? "en" : "es");
  });

  // ── Aparición al hacer scroll ──
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  } else {
    items.forEach(function (el) {
      el.classList.add("in");
    });
  }
  if (calm) return;

  // ── Scroll: --p va de 0 a 1 conforme el elemento cruza la pantalla ──
  var hero = document.getElementById("hero");
  var tracked = document.querySelectorAll("[data-scroll]");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    if (hero) hero.style.setProperty("--p", Math.min(1, Math.max(0, window.scrollY / (vh * 0.75))).toFixed(3));
    tracked.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = (vh - r.top) / (vh + r.height);
      el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
    });
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", onScroll);
  onScroll();

  // ── Puntero: la escena del hero y las tarjetas se inclinan hacia él ──
  if (!window.matchMedia("(hover: hover)").matches) return;
  if (hero) {
    hero.addEventListener("pointermove", function (e) {
      hero.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      hero.style.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    });
    hero.addEventListener("pointerleave", function () {
      hero.style.setProperty("--mx", 0);
      hero.style.setProperty("--my", 0);
    });
  }
  document.querySelectorAll("[data-tilt]").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--tx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      card.style.setProperty("--ty", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      card.style.setProperty("--on", 1);
    });
    card.addEventListener("pointerleave", function () {
      card.style.setProperty("--tx", 0);
      card.style.setProperty("--ty", 0);
      card.style.setProperty("--on", 0);
    });
  });
})();

// ── Demo interactiva: una Bóveda de mentira con datos ficticios. Nada se guarda ni se envía,
//    y "copiar" solo muestra el aviso: no toca el portapapeles. ──
(function () {
  var app = document.getElementById("demo-app");
  if (!app) return;
  var listEl = document.getElementById("demo-list");
  var clientsEl = document.getElementById("demo-clients");
  var input = document.getElementById("demo-q");
  var toast = document.getElementById("demo-toast");
  var SVG = "http://www.w3.org/2000/svg";
  var COLORS = ["#3ee58c", "#7cc7ff", "#ffb86b", "#c6a4ff", "#ff9bb3", "#f4e58a"];
  var TEXT = {
    es: { copied: "copiada", user: "Usuario copiado", pass: "Contraseña copiada", none: "Sin resultados. Prueba con «gmail» o «hosting».", placeholder: "Busca: supa, gmail, hosting…" },
    en: { copied: "copied", user: "Username copied", pass: "Password copied", none: "No results. Try “gmail” or “hosting”.", placeholder: "Search: supa, gmail, hosting…" },
  };
  var CLIENTS = [
    { id: "cn", name: "Café Nómada", creds: [
      { title: "Cuenta principal del negocio", service: "Gmail / Google Workspace", user: "hola@cafenomada.example" },
      { title: "Hosting y dominio", service: "Hostinger", user: "hola@cafenomada.example" },
      { title: "Administrador del sitio", service: "WordPress", user: "admin-nomada" },
      { title: "@cafenomada", service: "Instagram", user: "cafenomada" },
    ] },
    { id: "ca", name: "Clínica Aurora", creds: [
      { title: "Correo de recepción", service: "Gmail / Google Workspace", user: "citas@clinicaaurora.example" },
      { title: "Panel de citas", service: "Calendly", user: "citas@clinicaaurora.example" },
      { title: "Sitio y DNS", service: "Cloudflare", user: "ti@clinicaaurora.example" },
    ] },
    { id: "el", name: "Estudio Lumen", creds: [
      { title: "Proyecto de producción", service: "Supabase", user: "dev@estudiolumen.example" },
      { title: "Postgres directo", service: "Supabase", user: "postgres" },
      { title: "Organización del estudio", service: "GitHub", user: "dev@estudiolumen.example" },
      { title: "Despliegues", service: "Vercel", user: "dev@estudiolumen.example" },
    ] },
    { id: "te", name: "Tacos El Güero", creds: [
      { title: "Página del negocio", service: "Meta Business", user: "elguero.tacos" },
      { title: "Cobros en línea", service: "Stripe", user: "pagos@tacoselguero.example" },
      { title: "Hosting del menú", service: "Hostinger", user: "pagos@tacoselguero.example" },
    ] },
  ];
  var current = "cn";
  var touched = false;
  var timers = [];

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "es";
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(id) {
    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(SVG, "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }
  function initials(name) {
    return name.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
  }
  function colorOf(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  }
  function fakeSecret(seed) {
    var chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%&*";
    var h = 7, out = "";
    for (var i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
    for (var k = 0; k < 16; k++) { h = (h * 1103515245 + 12345) >>> 0; out += chars[h % chars.length]; }
    return out;
  }
  function say(message) {
    toast.lastElementChild.textContent = message;
    toast.classList.add("is-on");
    clearTimeout(say.t);
    say.t = setTimeout(function () { toast.classList.remove("is-on"); }, 1600);
  }

  function card(cred, clientName, i) {
    var c = el("article", "demo-card");
    c.style.setProperty("--i", i);
    var head = el("div", "demo-head");
    var logo = el("span", "demo-logo", cred.service[0]);
    logo.style.background = colorOf(cred.service);
    var names = el("div");
    names.appendChild(el("div", "demo-title", cred.title));
    names.appendChild(el("div", "demo-sub", clientName ? cred.service + " · " + clientName : cred.service));
    head.appendChild(logo);
    head.appendChild(names);
    var foot = el("div", "demo-foot");
    var user = el("span", "demo-user", cred.user);
    var eye = el("button", "demo-btn");
    eye.type = "button";
    eye.setAttribute("aria-label", "Ver contraseña");
    eye.appendChild(icon("i-lock"));
    eye.addEventListener("click", function () {
      user.textContent = fakeSecret(cred.title + cred.user);
      user.classList.add("is-secret");
      clearTimeout(eye.t);
      eye.t = setTimeout(function () { user.textContent = cred.user; user.classList.remove("is-secret"); }, 3000);
    });
    var copyUser = el("button", "demo-btn");
    copyUser.type = "button";
    copyUser.setAttribute("aria-label", "Copiar usuario");
    copyUser.appendChild(icon("i-users"));
    copyUser.addEventListener("click", function () { say(TEXT[lang()].user); });
    var copyPass = el("button", "demo-btn demo-key");
    copyPass.type = "button";
    copyPass.setAttribute("aria-label", "Copiar contraseña");
    copyPass.appendChild(icon("i-key"));
    copyPass.addEventListener("click", function () { copyPass.classList.remove("is-pulse"); say(TEXT[lang()].pass); });
    foot.appendChild(user);
    foot.appendChild(eye);
    foot.appendChild(copyUser);
    foot.appendChild(copyPass);
    c.appendChild(head);
    c.appendChild(foot);
    return c;
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    listEl.textContent = "";
    var rows = [];
    CLIENTS.forEach(function (cl) {
      cl.creds.forEach(function (cr) {
        if (q) {
          if ((cr.title + " " + cr.service + " " + cr.user + " " + cl.name).toLowerCase().indexOf(q) !== -1) rows.push([cr, cl.name]);
        } else if (cl.id === current) rows.push([cr, null]);
      });
    });
    if (!rows.length) listEl.appendChild(el("p", "demo-empty", TEXT[lang()].none));
    rows.forEach(function (r, i) { listEl.appendChild(card(r[0], r[1], i)); });
    clientsEl.querySelectorAll(".demo-client").forEach(function (b) {
      b.setAttribute("aria-selected", !q && b.dataset.id === current ? "true" : "false");
    });
  }

  CLIENTS.forEach(function (cl) {
    var b = el("button", "demo-client");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.id = cl.id;
    b.appendChild(el("span", "demo-avatar", initials(cl.name)));
    b.appendChild(el("span", null, cl.name));
    b.appendChild(el("span", "demo-count", String(cl.creds.length)));
    b.addEventListener("click", function () { stop(); current = cl.id; input.value = ""; render(); });
    clientsEl.appendChild(b);
  });
  input.addEventListener("input", function () { render(); });
  ["pointerdown", "keydown", "focusin"].forEach(function (ev) { app.addEventListener(ev, function (e) { if (e.isTrusted) stop(); }); });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      stop();
      app.scrollIntoView({ block: "center", behavior: "smooth" });
      input.focus();
      input.select();
    }
  });
  new MutationObserver(function () {
    input.placeholder = TEXT[lang()].placeholder;
    render();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  input.placeholder = TEXT[lang()].placeholder;
  render();

  // Recorrido automático la primera vez que la demo entra en pantalla; cualquier interacción lo detiene.
  function stop() {
    touched = true;
    timers.forEach(clearTimeout);
    timers = [];
    var p = listEl.querySelector(".is-pulse");
    if (p) p.classList.remove("is-pulse");
  }
  function later(ms, fn) {
    timers.push(setTimeout(function () { if (!touched) fn(); }, ms));
  }
  function tour() {
    var word = "supa";
    later(900, function () { current = "el"; render(); });
    word.split("").forEach(function (ch, i) {
      later(2300 + i * 190, function () { input.value += ch; render(); });
    });
    later(3500, function () {
      var first = listEl.querySelector(".demo-card");
      if (!first) return;
      first.classList.add("is-hit");
      first.querySelector(".demo-key").classList.add("is-pulse");
    });
    later(4700, function () {
      var k = listEl.querySelector(".demo-key");
      if (k) k.classList.remove("is-pulse");
      say(TEXT[lang()].pass);
    });
    later(6800, function () { input.value = ""; current = "cn"; render(); });
  }
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var once = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { once.disconnect(); tour(); }
    }, { threshold: 0.5 });
    once.observe(app);
  }
})();
