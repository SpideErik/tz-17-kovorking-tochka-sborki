/* Панорама 360°: Pannellum подгружается только при выборе зоны, чтобы не тормозить страницу.
   Событие tour_open отправляет analytics.js по атрибутам data-event кнопок. */
(function () {
  var BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/';
  var PANOS = {
    open_space: 'img/pano-open.jpg',
    office: 'img/pano-office.jpg',
    meeting_room: 'img/pano-meeting.jpg'
  };
  var stage = document.getElementById('pano');
  var tabs = document.querySelectorAll('[data-pano]');
  var viewer = null;
  var loading = null;

  function loadLib() {
    if (window.pannellum) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (ok, fail) {
      var css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = BASE + 'pannellum.css';
      document.head.appendChild(css);
      var js = document.createElement('script');
      js.src = BASE + 'pannellum.js';
      js.onload = ok;
      js.onerror = function () { loading = null; fail(); };
      document.head.appendChild(js);
    });
    return loading;
  }

  function message(text) {
    if (viewer) { viewer.destroy(); viewer = null; }
    stage.innerHTML = '';
    var p = document.createElement('div');
    p.className = 'ph';
    p.textContent = text;
    stage.appendChild(p);
  }

  function open(type) {
    tabs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pano === type); });
    message('Загружаем панораму…');
    loadLib().then(function () {
      if (viewer) viewer.destroy();
      stage.innerHTML = '';
      viewer = pannellum.viewer('pano', {
        type: 'equirectangular',
        panorama: PANOS[type],
        autoLoad: true,
        autoRotate: -2,
        hfov: 100,
        strings: { loadingLabel: 'Загрузка…', genericWebGLError: 'Ваш браузер не поддерживает панорамы.' }
      });
    }, function () {
      message('Не удалось загрузить панораму. Проверьте соединение и попробуйте ещё раз.');
    });
  }

  tabs.forEach(function (b) {
    b.addEventListener('click', function () { open(b.dataset.pano); });
  });
})();
