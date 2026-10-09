// Landing de Bóveda: idioma y aparición al hacer scroll. Sin dependencias ni rastreo.
(function () {
  document.documentElement.classList.add("js");
  var nodes = document.querySelectorAll("[data-en]");
  var button = document.getElementById("lang");
  var video = document.getElementById("promo");

  nodes.forEach(function (n) {
    n.dataset.es = n.textContent;
  });

  function setLang(lang) {
    document.documentElement.lang = lang;
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
    setLang(document.documentElement.lang === "es" ? "en" : "es");
  });

  var items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) {
      el.classList.add("in");
    });
    return;
  }
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
})();
