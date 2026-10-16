/* Все вызовы gtag('event', …) находятся только в этом файле.
   Элементы описываются атрибутами: data-event="cta_click" data-button-name="hero_trial" */
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  function snake(s) { return s.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); }); }

  // Имя, телефон и e-mail посетителя в GA4 не передаются
  window.trackEvent = function (name, params) {
    var clean = {};
    Object.keys(params || {}).forEach(function (k) {
      clean[snake(k).slice(0, 40)] = String(params[k]).slice(0, 100);
    });
    gtag('event', name, clean);
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;
    var params = {};
    Object.keys(el.dataset).forEach(function (k) {
      if (k !== 'event') params[k] = el.dataset[k];
    });
    trackEvent(el.dataset.event, params);
  });
})();
