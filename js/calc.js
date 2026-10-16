/* Калькулятор тарифов: «Дневной», «Гибкий», «Фикс». Цены — из сведений о компании. */
(function () {
  var P = { day: 700, flex: 5500, flexDays: 10, flexExtra: 600, fixed: 11000, fixedHours: 5, hour: 900 };
  var form = document.getElementById('calc-form');
  if (!form) return;
  var daysEl = document.getElementById('calc-days');
  var hoursEl = document.getElementById('calc-hours');
  var list = document.getElementById('calc-result');

  function rub(n) { return n.toLocaleString('ru-RU') + '\u00a0₽'; }

  function read(el, min, max, errEl, msg) {
    var v = el.value.trim();
    var ok = /^\d+$/.test(v) && +v >= min && +v <= max;
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    errEl.textContent = ok ? '' : msg;
    return ok ? +v : null;
  }

  function compute(d, h) {
    var hoursCost = h * P.hour;
    var flexExtraDays = Math.max(0, d - P.flexDays);
    var fixedExtraHours = Math.max(0, h - P.fixedHours);
    var rows = [
      { id: 'day_pass', name: 'Дневной', total: d * P.day + hoursCost,
        det: d + ' дн. × ' + rub(P.day) + (h ? ' + переговорная ' + h + ' ч × ' + rub(P.hour) : '') },
      { id: 'flex', name: '«Гибкий»', total: P.flex + flexExtraDays * P.flexExtra + hoursCost,
        det: rub(P.flex) + ' за 10 дней' + (flexExtraDays ? ' + ' + flexExtraDays + ' дн. × ' + rub(P.flexExtra) : '') + (h ? ' + переговорная ' + h + ' ч × ' + rub(P.hour) : '') },
      { id: 'fixed', name: '«Фикс»', total: P.fixed + fixedExtraHours * P.hour,
        det: rub(P.fixed) + ', 5 ч переговорной включены' + (fixedExtraHours ? ' + ' + fixedExtraHours + ' ч × ' + rub(P.hour) : '') }
    ];
    var best = rows[0];
    rows.forEach(function (r) { if (r.total < best.total) best = r; });
    return { rows: rows, best: best };
  }

  function render(d, h) {
    var res = compute(d, h);
    list.innerHTML = '';
    res.rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'calc-row' + (r === res.best ? ' is-best' : '');
      var title = document.createElement('h3');
      title.textContent = r.name;
      if (r === res.best) {
        var b = document.createElement('span');
        b.className = 'badge';
        b.textContent = 'Самый выгодный';
        title.appendChild(b);
      }
      var sum = document.createElement('div');
      sum.className = 'sum';
      sum.textContent = rub(r.total) + ' в месяц';
      var det = document.createElement('p');
      det.className = 'det';
      det.textContent = r.det;
      li.appendChild(title); li.appendChild(sum); li.appendChild(det);
      list.appendChild(li);
    });
    return res;
  }

  function update() {
    var d = read(daysEl, 1, 31, document.getElementById('err-days'), 'Введите число дней от 1 до 31.');
    var h = read(hoursEl, 0, 200, document.getElementById('err-hours'), 'Введите часы переговорной от 0 до 200.');
    if (d === null || h === null) return null;
    return render(d, h);
  }

  daysEl.addEventListener('input', update);
  hoursEl.addEventListener('input', update);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var res = update();
    if (!res) return;
    trackEvent('tariff_calc', {
      days_per_month: daysEl.value.trim(),
      meeting_hours: hoursEl.value.trim(),
      best_tariff: res.best.id,
      total_price: res.best.total
    });
  });

  update();
})();
