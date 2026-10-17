(function () {
  // Номер заявки на thanks.html
  var n = document.querySelector('[data-fill="request-id"]');
  if (n) {
    var id = '';
    try { id = sessionStorage.getItem('request_id') || ''; } catch (e) {}
    n.textContent = id || 'номер не найден — позвоните нам';
  }
  // Копирование (промокод). Событие promo_copy отправляет analytics.js
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.copy, old = b.textContent;
      function done() { b.textContent = 'Скопировано'; setTimeout(function () { b.textContent = old; }, 2000); }
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else done();
    });
  });
  // Афиша: выбрать мероприятие в форме регистрации
  document.querySelectorAll('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var s = document.getElementById('event_id');
      if (!s) return;
      s.value = b.dataset.pick;
      s.scrollIntoView({ behavior: 'smooth', block: 'center' });
      s.focus({ preventScroll: true });
    });
  });
})();
