(function () {
  // UTM-метки: читаем из адреса и сохраняем в sessionStorage до отправки формы
  var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  try {
    var q = new URLSearchParams(location.search);
    keys.forEach(function (k) {
      var v = (q.get(k) || '').toLowerCase().slice(0, 100);
      if (v) sessionStorage.setItem(k, v);
    });
  } catch (err) {}

  // Мобильное меню
  var btn = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
  }
})();
