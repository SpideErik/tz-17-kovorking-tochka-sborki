const SPREADSHEET_ID = '1bHbqj_HgYABVbJQPpmXOO1ePUEIB8BmEE_ral0QoLDg';

const LEAD_HEADERS = ['request_id', 'created_at', 'name', 'phone', 'email', 'tariff', 'team_size', 'visit_date', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'status'];
const EVENT_HEADERS = ['request_id', 'created_at', 'name', 'email', 'event_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

const TARIFFS = ['free_day', 'day_pass', 'flex', 'fixed', 'office', 'meeting_room'];
const TEAM_SIZES = ['1', '2_4', '5_8', '9_plus'];
const UTM_DEFAULTS = { utm_source: 'direct', utm_medium: 'none', utm_campaign: 'not_set', utm_content: 'not_set' };
const ID_RE = /^REQ-[A-F0-9]{8}-[A-F0-9]{4}-4[A-F0-9]{3}-[89AB][A-F0-9]{3}-[A-F0-9]{12}$/i;

function doPost(e) {
  const p = parseBody(e);
  if (!p) return jsonResponse({ok: false, error: 'invalid_request'});

  const clean = key => String(p[key] == null ? '' : p[key]).trim();
  const isEvent = clean('form_type') === 'event';

  // UTM по умолчанию
  Object.keys(UTM_DEFAULTS).forEach(k => { if (!clean(k)) p[k] = UTM_DEFAULTS[k]; });

  const id = clean('request_id');
  if (!id) return jsonResponse({ok: false, error: 'missing_required', fields: ['request_id']});
  if (!ID_RE.test(id)) return jsonResponse({ok: false, error: 'invalid_request_id'});

  const allKeys = isEvent ? EVENT_HEADERS : LEAD_HEADERS;
  if (allKeys.some(k => clean(k).length > 200)) return jsonResponse({ok: false, error: 'value_too_long'});

  const name = clean('name');
  if (name.length < 2 || name.length > 60) return jsonResponse({ok: false, error: 'invalid_name'});

  const email = clean('email');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  let row, headers, sheetName;
  if (isEvent) {
    if (!emailOk) return jsonResponse({ok: false, error: 'invalid_email'});
    if (!clean('event_id')) return jsonResponse({ok: false, error: 'missing_required', fields: ['event_id']});
    sheetName = 'events';
    headers = EVENT_HEADERS;
    row = [id, new Date(), textCell(name), textCell(email), textCell(clean('event_id')),
      textCell(clean('utm_source')), textCell(clean('utm_medium')),
      textCell(clean('utm_campaign')), textCell(clean('utm_content'))];
  } else {
    const phone = clean('phone').replace(/[\s()\-]/g, '');
    if (!/^\+7\d{10}$/.test(phone)) return jsonResponse({ok: false, error: 'invalid_phone'});
    if (email && !emailOk) return jsonResponse({ok: false, error: 'invalid_email'});
    if (TARIFFS.indexOf(clean('tariff')) === -1) return jsonResponse({ok: false, error: 'invalid_tariff'});
    if (TEAM_SIZES.indexOf(clean('team_size')) === -1) return jsonResponse({ok: false, error: 'invalid_team_size'});
    const visit = clean('visit_date');
    if (visit) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(visit)) return jsonResponse({ok: false, error: 'invalid_visit_date'});
      const d = new Date(visit + 'T00:00:00Z');
      if (isNaN(d.getTime()) || d.getUTCDay() === 0 || d.getUTCDay() === 6) {
        return jsonResponse({ok: false, error: 'invalid_visit_date'});
      }
    }
    sheetName = 'leads';
    headers = LEAD_HEADERS;
    // status из браузера игнорируется — всегда new
    row = [id, new Date(), textCell(name), textCell(phone), textCell(email),
      textCell(clean('tariff')), textCell(clean('team_size')), textCell(visit),
      textCell(clean('utm_source')), textCell(clean('utm_medium')),
      textCell(clean('utm_campaign')), textCell(clean('utm_content')), 'new'];
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return jsonResponse({ok: false, error: 'busy_retry'});
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet || sheet.getRange(1, 1, 1, headers.length).getValues()[0].join('|') !== headers.join('|')) {
      return jsonResponse({ok: false, error: 'invalid_sheet_schema'});
    }
    const duplicate = sheet.getRange('A:A').createTextFinder(id)
      .matchEntireCell(true).matchCase(false).useRegularExpression(false).findNext();
    if (duplicate) return jsonResponse({ok: true, request_id: id, duplicate: true});

    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return jsonResponse({ok: true, request_id: id});
  } catch (error) {
    return jsonResponse({ok: false, error: 'storage_error'});
  } finally {
    lock.releaseLock();
  }
}

function parseBody(e) {
  let p = Object.assign({}, (e && e.parameter) || {});
  const body = e && e.postData && e.postData.contents;
  if (body && body.trim().charAt(0) === '{') {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        p = Object.assign(p, parsed);
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }
  return p;
}

function textCell(value) {
  return /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
