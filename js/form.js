/* Формы заявки (data-form="lead") и регистрации на мероприятие (data-form="event").
   Отправка в Apps Script (fetch). События уходят через trackEvent из analytics.js. */
(function () {
  var cfg = window.TS_CONFIG || {};
  var DEF = { utm_source: 'direct', utm_medium: 'none', utm_campaign: 'not_set', utm_content: 'not_set' };
  var TARIFFS = ['free_day', 'day_pass', 'flex', 'fixed', 'office', 'meeting_room'];

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function utm() {
    var o = {};
    Object.keys(DEF).forEach(function (k) {
      var v = ''; try { v = sessionStorage.getItem(k) || ''; } catch (e) {}
      o[k] = v || DEF[k];
    });
    return o;
  }
  function phone(v) {
    var d = v.replace(/\D/g, '');
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    return d.length === 10 ? '+7' + d : null;
  }

  // Проверки полей: возвращают [error_type, текст] или null
  var CHECK = {
    name: function (v) { v = v.trim(); if (!v) return ['required', 'Введите имя.']; if (v.length < 2 || v.length > 60) return ['format', 'Имя — от 2 до 60 символов.']; },
    phone: function (v) { if (!v.trim()) return ['required', 'Введите телефон.']; if (!phone(v)) return ['format', 'Телефон: +7 и 10 цифр, например +7 900 000-00-00.']; },
    email: function (v, req) { v = v.trim(); if (!v) return req ? ['required', 'Введите e-mail.'] : null; if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 200) return ['format', 'Проверьте e-mail, например name@mail.ru.']; },
    tariff: function (v) { if (!v) return ['required', 'Выберите тариф.']; },
    team_size: function (v) { if (!v) return ['required', 'Выберите размер команды.']; },
    event_id: function (v) { if (!v) return ['required', 'Выберите мероприятие.']; },
    visit_date: function (v) {
      if (!v) return null;
      var d = new Date(v + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
      if (isNaN(d) || d < t) return ['format', 'Выберите дату не раньше сегодняшней.'];
      if (d.getDay() === 0 || d.getDay() === 6) return ['format', 'Тест-день проходит в будни — выберите другой день.'];
    },
    consent: function (v, req, el) { if (!el.checked) return ['consent', 'Нужно согласие на обработку персональных данных.']; }
  };

  function setErr(form, name, msg) {
    var el = form.elements[name], box = form.querySelector('[data-err="' + name + '"]');
    if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (box) box.textContent = msg || '';
  }
  function status(form, text, cls) {
    var s = form.querySelector('.form-status');
    s.textContent = text || ''; s.className = 'form-status ' + (cls || '');
  }

  function init(form) {
    var kind = form.dataset.form;
    var fields = kind === 'lead'
      ? ['name', 'phone', 'email', 'tariff', 'team_size', 'visit_date', 'consent']
      : ['name', 'email', 'event_id', 'consent'];
    var reqEmail = kind === 'event';
    var btn = form.querySelector('button[type=submit]');

    var vd = form.elements.visit_date;
    if (vd) vd.min = new Date().toISOString().slice(0, 10);
    var qt = new URLSearchParams(location.search).get('tariff');
    if (qt && TARIFFS.indexOf(qt) > -1 && form.elements.tariff) form.elements.tariff.value = qt;

    fields.forEach(function (f) {
      var el = form.elements[f];
      el.addEventListener('input', function () { setErr(form, f, ''); });
      el.addEventListener('change', function () { setErr(form, f, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status(form, '');
      var bad = [];
      fields.forEach(function (f) {
        var el = form.elements[f], r = CHECK[f](el.value || '', f === 'email' && reqEmail, el);
        setErr(form, f, r ? r[1] : '');
        if (r) { bad.push(f); trackEvent('form_error', { field_name: f, error_type: r[0] }); }
      });
      if (bad.length) { form.elements[bad[0]].focus(); return; }

      var data = utm();
      data.form_type = kind;
      data.request_id = 'REQ-' + uuid();
      data.name = form.elements.name.value.trim();
      data.email = form.elements.email.value.trim();
      if (kind === 'lead') {
        data.phone = phone(form.elements.phone.value);
        data.tariff = form.elements.tariff.value;
        data.team_size = form.elements.team_size.value;
        data.visit_date = form.elements.visit_date.value;
      } else {
        data.event_id = form.elements.event_id.value;
      }

      btn.disabled = true;
      status(form, 'Отправляем…');
      var url = cfg.ENDPOINT;
      var req = (!url || url.indexOf('PASTE') === 0)
        ? Promise.reject(new Error('no endpoint'))
        : fetch(url, { method: 'POST', body: new URLSearchParams(data) }).then(function (r) { return r.json(); });

      req.then(function (res) {
        if (!res || res.ok !== true) throw new Error((res && res.error) || 'server');
        if (kind === 'lead') {
          try { sessionStorage.setItem('request_id', data.request_id); } catch (e) {}
          trackEvent('generate_lead', { lead_tariff: data.tariff, team_size: data.team_size, lead_source: data.utm_source });
          setTimeout(function () { location.href = 'thanks.html'; }, 400);
        } else {
          trackEvent('event_register', { event_id: data.event_id });
          status(form, 'Вы зарегистрированы. Ждём вас в четверг в 19:00.', 'ok');
          form.reset(); btn.disabled = false;
        }
      }).catch(function () {
        trackEvent('form_error', { field_name: 'form', error_type: 'server' });
        status(form, 'Не удалось отправить. Попробуйте ещё раз или позвоните нам.', 'bad');
        btn.disabled = false;
      });
    });
  }
  document.querySelectorAll('form[data-form]').forEach(init);
})();
