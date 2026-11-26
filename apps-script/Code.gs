/**
 * KitBaaz order sheet (Google Apps Script, attached to the "KitBaaz Orders" sheet).
 *
 * - doPost: receives orders from the website (/api/order) and adds a row.
 * - onEdit: when Status or Advance paid changes, refreshes the customer message draft.
 * - KitBaaz menu: set up the sheet, send a test order, show the website secret.
 *
 * Source of truth is the KitBaaz repo (apps-script/Code.gs). Paste changes from there.
 */

const TZ = 'Asia/Dhaka';

const STATUSES = [
  'Pre-order',
  'Advance received',
  'Ordered from supplier',
  'In transit',
  'Customs',
  'Out for delivery',
  'Delivered',
  'Review asked',
  'Cancelled',
];

// [key, header, width]. Headers are matched by name, so columns can be moved,
// but headers must not be renamed.
const COLUMNS = [
  ['id', 'Order ID', 130],
  ['date', 'Date', 130],
  ['customer', 'Customer', 150],
  ['phone', 'Phone', 115],
  ['address', 'Address', 260],
  ['kit', 'Kit', 170],
  ['quantity', 'Quantity', 75],
  ['price', 'Price', 90],
  ['advancePaid', 'Advance paid', 105],
  ['balance', 'Balance', 90],
  ['status', 'Status', 160],
  ['deliveryDate', 'Delivery date', 110],
  ['notes', 'Notes', 200],
  ['advanceDue', 'Advance due', 100],
  ['payment', 'Payment method', 120],
  ['message', 'Customer message (draft)', 340],
  ['whatsapp', 'Send on WhatsApp', 140],
  ['source', 'Source', 80],
  // Filled in by the customer on the thank-you page. Shakil checks them in the
  // bKash / Nagad app before setting Status to "Advance received".
  ['trxId', 'TrxID', 120],
  ['paidFrom', 'Paid from', 115],
  ['claimedAt', 'Payment claimed at', 140],
];

const PAYMENT_LABELS = { bkash: 'বিকাশ', nagad: 'নগদ', bank: 'ব্যাংক ট্রান্সফার' };
const PAYMENT_SETTING = { 'বিকাশ': 'bKash number', 'নগদ': 'Nagad number', 'ব্যাংক ট্রান্সফার': 'Bank details' };

const SETTINGS = [
  ['Business name', 'KitBaaz', 'Shown at the end of customer messages'],
  ['Alert email', '', 'Where new-order emails go. Separate several with commas.'],
  ['Advance percent', 50, 'Shown in messages. The website calculates the amount.'],
  ['Delivery days min', 10, ''],
  ['Delivery days max', 14, ''],
  ['bKash number', '', 'For advance payment messages, e.g. 01XXXXXXXXX'],
  ['Nagad number', '', ''],
  ['Bank details', '', 'Bank, account name, account number, branch'],
  ['Facebook page', '', 'Link used in review request messages'],
];

const SHEETS = { orders: 'Orders', summary: 'Summary', settings: 'Settings' };
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Website webhook                                                    */
/* ------------------------------------------------------------------ */

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_json' });
  }

  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret || body.secret !== secret) return json_({ ok: false, error: 'forbidden' });

  if (body.action === 'payment') return handlePaymentClaim_(body.payment);

  const problem = checkOrder_(body.order);
  if (problem) return json_({ ok: false, error: problem });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'busy' });
  let saved;
  try {
    saved = saveOrder_(body.order);
  } catch (err) {
    console.error('saveOrder_ failed', err);
    return json_({ ok: false, error: 'save_failed' });
  } finally {
    lock.releaseLock();
  }

  if (!saved.duplicate) notifyNewOrder_(saved.row);
  return json_({ ok: true, orderId: saved.row.id, duplicate: saved.duplicate });
}

function doGet() {
  return json_({ ok: true, service: 'KitBaaz orders' });
}

/* ------------------------------------------------------------------ */
/* Payment claims (customer says "I paid, here is the TrxID")         */
/* The status is never changed here: Shakil confirms in his app.      */
/* ------------------------------------------------------------------ */

function handlePaymentClaim_(p) {
  if (!p || !/^KB-[A-Z0-9-]{4,20}$/.test(String(p.orderId || ''))) return json_({ ok: false, error: 'bad_order_id' });
  if (!/^[A-Z0-9]{6,20}$/.test(String(p.trxId || ''))) return json_({ ok: false, error: 'bad_trx_id' });
  if (!/^01[3-9]\d{8}$/.test(String(p.paidFrom || ''))) return json_({ ok: false, error: 'bad_phone' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'busy' });
  let result;
  try {
    result = savePaymentClaim_(p);
  } catch (err) {
    console.error('savePaymentClaim_ failed', err);
    return json_({ ok: false, error: 'save_failed' });
  } finally {
    lock.releaseLock();
  }
  if (result.error) return json_({ ok: false, error: result.error });
  if (!result.repeat) notifyPaymentClaim_(result.row);
  return json_({ ok: true, repeat: result.repeat });
}

function savePaymentClaim_(p) {
  const sheet = ordersSheet_();
  const cols = cols_(sheet);
  const last = sheet.getLastRow();
  if (last < 2) return { error: 'not_found' };
  const ids = sheet.getRange(2, cols.id, last - 1, 1).getValues();
  const index = ids.findIndex(([id]) => id === p.orderId);
  if (index < 0) return { error: 'not_found' };
  const rowNum = index + 2;

  const values = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  const get = (key) => values[cols[key] - 1];
  if (get('status') === 'Cancelled') return { error: 'cancelled' };

  const previous = String(get('trxId') || '');
  const repeat = previous === p.trxId && String(get('paidFrom')) === p.paidFrom;
  if (!repeat) {
    sheet.getRange(rowNum, cols.paidFrom).setNumberFormat('@');
    sheet.getRange(rowNum, cols.trxId).setValue(p.trxId);
    sheet.getRange(rowNum, cols.paidFrom).setValue(p.paidFrom);
    sheet.getRange(rowNum, cols.claimedAt).setValue(new Date());
    if (previous) {
      const notes = String(get('notes') || '');
      sheet.getRange(rowNum, cols.notes).setValue(`${notes ? notes + ' | ' : ''}আগের TrxID: ${previous}`);
    }
  }
  return {
    repeat: repeat,
    row: {
      rowNum: rowNum,
      id: p.orderId,
      customer: get('customer'),
      phone: String(get('phone')),
      advanceDue: get('advanceDue'),
      payment: get('payment'),
      status: get('status'),
      trxId: p.trxId,
      paidFrom: p.paidFrom,
      previousTrxId: previous && previous !== p.trxId ? previous : '',
    },
  };
}

function notifyPaymentClaim_(row) {
  const url = rowUrl_(row.rowNum);
  const otherNumber = row.paidFrom !== row.phone ? ` (অর্ডারের নম্বর ${row.phone} থেকে আলাদা)` : '';
  const text =
    `অর্ডার নম্বর: ${row.id}\n` +
    `নাম: ${row.customer}\n` +
    `মাধ্যম: ${row.payment}\n` +
    `TrxID: ${row.trxId}\n` +
    `যে নম্বর থেকে: ${row.paidFrom}${otherNumber}\n` +
    `অগ্রিম হওয়ার কথা: ${tk_(row.advanceDue)}` +
    (row.previousTrxId ? `\nআগের TrxID: ${row.previousTrxId}` : '') +
    `\n\n${row.payment} অ্যাপে TrxID মিলিয়ে দেখুন। ঠিক থাকলে Status দিন "Advance received"।`;

  sendAlertEmail_(`পেমেন্ট দাবি ${row.id}: TrxID ${row.trxId}`, `গ্রাহক জানিয়েছেন তিনি অগ্রিম পাঠিয়েছেন।\n\n${text}\n\nশিটে দেখুন: ${url}`);
  sendTelegram_(`💰 পেমেন্ট দাবি (যাচাই করুন)\n\n${text}\n\nশিট: ${url}`);
  sendAgentEvent_({
    event: 'payment.claimed',
    payment: {
      orderId: row.id,
      trxId: row.trxId,
      paidFrom: row.paidFrom,
      orderPhone: row.phone,
      method: row.payment,
      advanceDue: row.advanceDue,
      status: row.status,
      previousTrxId: row.previousTrxId,
    },
    note: 'Not verified. A person must check the TrxID in the payment app before changing the status.',
    sheetUrl: url,
  });
}

function checkOrder_(o) {
  if (!o || typeof o !== 'object') return 'missing_order';
  if (!str_(o.name)) return 'missing_name';
  if (!/^01[3-9]\d{8}$/.test(String(o.phone || ''))) return 'bad_phone';
  if (!str_(o.address)) return 'missing_address';
  if (!str_(o.kit)) return 'missing_kit';
  if (!isPositiveInt_(o.quantity)) return 'bad_quantity';
  if (!isPositiveInt_(o.total) || !isPositiveInt_(o.advance)) return 'bad_amount';
  if (!PAYMENT_LABELS[o.payment]) return 'bad_payment';
  return null;
}

/* ------------------------------------------------------------------ */
/* Saving orders                                                      */
/* ------------------------------------------------------------------ */

function saveOrder_(o) {
  const sheet = ordersSheet_();
  const cols = cols_(sheet);
  const now = new Date();
  const kit = o.kitNameBn ? `${o.kitNameBn} (${o.kit})` : String(o.kit);

  const dup = findDuplicate_(sheet, cols, o.phone, kit, Number(o.quantity), now);
  if (dup) return { duplicate: true, row: dup };

  const district = str_(o.district);
  const row = {
    id: nextOrderId_(now),
    date: now,
    customer: str_(o.name),
    phone: String(o.phone),
    address: district ? `${str_(o.address)}, ${district}` : str_(o.address),
    kit: kit,
    quantity: Number(o.quantity),
    price: Number(o.total),
    advancePaid: '',
    status: 'Pre-order',
    deliveryDate: '',
    notes: str_(o.note) ? `গ্রাহক: ${str_(o.note)}` : '',
    advanceDue: Number(o.advance),
    payment: PAYMENT_LABELS[o.payment],
    source: str_(o.source) || 'website',
  };
  row.balance = row.price;

  const rowNum = sheet.getLastRow() + 1;
  if (rowNum > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 500); // keeps formats and dropdowns
  writeRow_(sheet, cols, rowNum, row);
  row.rowNum = rowNum;
  refreshMessage_(sheet, cols, rowNum, readSettings_());
  row.message = sheet.getRange(rowNum, cols.message).getValue();
  return { duplicate: false, row: row };
}

function writeRow_(sheet, cols, rowNum, row) {
  const width = sheet.getLastColumn();
  const values = new Array(width).fill('');
  COLUMNS.forEach(([key]) => {
    if (key in row && key !== 'balance') values[cols[key] - 1] = row[key];
  });
  sheet.getRange(rowNum, cols.phone).setNumberFormat('@');
  sheet.getRange(rowNum, 1, 1, width).setValues([values]);
  // Balance = Price - Advance paid, as a formula so manual edits stay correct.
  sheet
    .getRange(rowNum, cols.balance)
    .setFormulaR1C1(`=IF(RC[${cols.price - cols.balance}]="","",RC[${cols.price - cols.balance}]-N(RC[${cols.advancePaid - cols.balance}]))`);
}

function findDuplicate_(sheet, cols, phone, kit, quantity, now) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const first = Math.max(2, last - 29);
  const rows = sheet.getRange(first, 1, last - first + 1, sheet.getLastColumn()).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    const date = r[cols.date - 1];
    if (!(date instanceof Date) || now - date > DUPLICATE_WINDOW_MS) continue;
    if (String(r[cols.phone - 1]) === phone && r[cols.kit - 1] === kit && Number(r[cols.quantity - 1]) === quantity) {
      return { id: r[cols.id - 1], rowNum: first + i };
    }
  }
  return null;
}

function nextOrderId_(now) {
  const props = PropertiesService.getScriptProperties();
  const day = Utilities.formatDate(now, TZ, 'yyMMdd');
  const key = `seq_${day}`;
  const n = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(n));
  return `KB-${day}-${String(n).padStart(3, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Status changes                                                     */
/* ------------------------------------------------------------------ */

function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEETS.orders) return;
  const cols = cols_(sheet);
  const firstCol = e.range.getColumn();
  const lastCol = firstCol + e.range.getNumColumns() - 1;
  const touches = (c) => c >= firstCol && c <= lastCol;
  if (!touches(cols.status) && !touches(cols.advancePaid)) return;

  const settings = readSettings_();
  const start = Math.max(2, e.range.getRow());
  const end = e.range.getRow() + e.range.getNumRows() - 1;
  for (let r = start; r <= end; r++) {
    const status = sheet.getRange(r, cols.status).getValue();
    if (touches(cols.status)) {
      if (status === 'Advance received' && sheet.getRange(r, cols.advancePaid).getValue() === '') {
        sheet.getRange(r, cols.advancePaid).setValue(sheet.getRange(r, cols.advanceDue).getValue());
      }
      if (status === 'Delivered' && sheet.getRange(r, cols.deliveryDate).getValue() === '') {
        sheet.getRange(r, cols.deliveryDate).setValue(new Date());
      }
    }
    refreshMessage_(sheet, cols, r, settings);
  }
}

// Rewrites the message draft and WhatsApp link for the row's current status.
function refreshMessage_(sheet, cols, rowNum, settings) {
  const values = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  const o = {};
  COLUMNS.forEach(([key]) => (o[key] = values[cols[key] - 1]));
  if (!o.id) return;
  const text = buildMessage_(o, settings);
  sheet.getRange(rowNum, cols.message).setValue(text);
  const link = text ? waLink_(o.phone, text) : null;
  const cell = sheet.getRange(rowNum, cols.whatsapp);
  if (link) {
    cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText('WhatsApp-এ পাঠান').setLinkUrl(link).build());
  } else {
    cell.clearContent();
  }
}

/* ------------------------------------------------------------------ */
/* Customer messages (Bangla). Edit wording here.                     */
/* ------------------------------------------------------------------ */

function buildMessage_(o, s) {
  const name = o.customer || '';
  const brand = s['Business name'] || 'KitBaaz';
  const sign = `\n\n— ${brand}`;
  const hi = `আসসালামু আলাইকুম ${name},\n`;
  const days = `${bn_(s['Delivery days min'] || 10)}–${bn_(s['Delivery days max'] || 14)}`;
  const id = o.id;
  const paid = Number(o.advancePaid) || 0;
  const balance = Math.max(0, (Number(o.price) || 0) - paid);

  switch (o.status) {
    case 'Pre-order':
      return (
        hi +
        `${brand}-এ প্রি-অর্ডারের জন্য ধন্যবাদ!\n\n` +
        `অর্ডার নম্বর: ${id}\n` +
        `কিট: ${o.kit} × ${bn_(o.quantity)}টি\n` +
        `মোট দাম: ${tk_(o.price)}\n` +
        `অগ্রিম (${bn_(s['Advance percent'] || 50)}%): ${tk_(o.advanceDue)}\n\n` +
        paymentLine_(o, s) +
        `\nঅগ্রিম পাওয়ার পর ${days} দিনের মধ্যে কিট আপনার ঠিকানায় পৌঁছাবে।` +
        sign
      );
    case 'Advance received':
      return (
        hi +
        `আপনার অগ্রিম ${tk_(paid || o.advanceDue)} পেয়েছি। অর্ডার ${id} নিশ্চিত হয়েছে।\n` +
        `${days} দিনের মধ্যে কিট পৌঁছে যাবে। প্রতিটি ধাপে আপনাকে জানাব।` +
        sign
      );
    case 'Ordered from supplier':
      return hi + `অর্ডার ${id}: আপনার কিটটি সরবরাহকারীর কাছে অর্ডার করা হয়েছে। পরের আপডেট শীঘ্রই জানাব।` + sign;
    case 'In transit':
      return hi + `অর্ডার ${id}: আপনার কিটটি বাংলাদেশের পথে রওনা হয়েছে।` + sign;
    case 'Customs':
      return hi + `অর্ডার ${id}: আপনার কিটটি এখন কাস্টমসে আছে। ছাড় পেলেই ডেলিভারির ব্যবস্থা করা হবে।` + sign;
    case 'Out for delivery':
      return (
        hi +
        `অর্ডার ${id}: আপনার কিটটি ডেলিভারির জন্য বের হয়েছে।` +
        (balance > 0 ? `\nবাকি টাকা: ${tk_(balance)}` : '') +
        sign
      );
    case 'Delivered':
      return hi + `অর্ডার ${id}: আপনার কিটটি পৌঁছে গেছে। ${brand}-এর সাথে থাকার জন্য ধন্যবাদ! কোনো প্রশ্ন থাকলে জানাবেন।` + sign;
    case 'Review asked':
      return (
        hi +
        `কিটটি কেমন লাগছে? আপনার একটি ছোট্ট রিভিউ আমাদের অনেক সাহায্য করবে।` +
        (s['Facebook page'] ? `\nরিভিউ দিতে পারেন এখানে: ${s['Facebook page']}` : '') +
        sign
      );
    case 'Cancelled':
      return hi + `অর্ডার ${id} বাতিল করা হয়েছে। কোনো প্রশ্ন থাকলে আমাদের জানাবেন।` + sign;
    default:
      return '';
  }
}

function paymentLine_(o, s) {
  const label = o.payment;
  const details = s[PAYMENT_SETTING[label]] || (label === 'ব্যাংক ট্রান্সফার' ? '[ব্যাংকের তথ্য লিখুন]' : '[নম্বর লিখুন]');
  const amount = tk_(o.advanceDue);
  if (label === 'ব্যাংক ট্রান্সফার') {
    return `এই ব্যাংক অ্যাকাউন্টে ${amount} পাঠান:\n${details}\nরেফারেন্সে অর্ডার নম্বর ${o.id} লিখুন।\n`;
  }
  return `${label} নম্বর ${details}-এ ${amount} Send Money করুন এবং রেফারেন্সে অর্ডার নম্বর ${o.id} লিখুন।\n`;
}

/* ------------------------------------------------------------------ */
/* Alerts                                                             */
/* ------------------------------------------------------------------ */

function notifyNewOrder_(row) {
  const url = rowUrl_(row.rowNum);
  const wa = row.message ? waLink_(row.phone, row.message) : '';
  const summary =
    `অর্ডার নম্বর: ${row.id}\n` +
    `নাম: ${row.customer}\n` +
    `ফোন: ${row.phone}\n` +
    `ঠিকানা: ${row.address}\n` +
    `কিট: ${row.kit} × ${bn_(row.quantity)}টি\n` +
    `মোট দাম: ${tk_(row.price)}\n` +
    `অগ্রিম: ${tk_(row.advanceDue)} (${row.payment})` +
    (row.notes ? `\nনোট: ${row.notes}` : '');

  sendAlertEmail_(
    `নতুন প্রি-অর্ডার ${row.id}: ${row.customer}, ${row.kit} × ${bn_(row.quantity)}টি`,
    `নতুন প্রি-অর্ডার এসেছে।\n\n${summary}\n\n` +
      `গ্রাহককে পাঠানোর মেসেজ (খসড়া, পাঠানোর আগে দেখে নিন):\n` +
      `----------\n${row.message}\n----------\n\n` +
      `WhatsApp-এ পাঠাতে: ${wa}\n\nশিটে দেখুন: ${url}`,
  );

  let text = `🆕 নতুন প্রি-অর্ডার\n\n${summary}\n\nশিট: ${url}`;
  if (wa && text.length + wa.length < 3900) text += `\n\nWhatsApp-এ পাঠান: ${wa}`;
  sendTelegram_(text);

  sendAgentEvent_({
    event: 'order.created',
    order: {
      id: row.id,
      date: row.date.toISOString(),
      customer: row.customer,
      phone: row.phone,
      address: row.address,
      kit: row.kit,
      quantity: row.quantity,
      price: row.price,
      advanceDue: row.advanceDue,
      paymentMethod: row.payment,
      status: row.status,
      notes: row.notes,
    },
    customerMessageDraft: row.message,
    whatsappLink: wa,
    sheetUrl: url,
  });
}

function sendAlertEmail_(subject, body) {
  const settings = readSettings_();
  const to = String(settings['Alert email'] || Session.getEffectiveUser().getEmail() || '').trim();
  if (!to) return;
  try {
    MailApp.sendEmail({ to: to, subject: subject, body: body });
  } catch (err) {
    console.error('Alert email failed', err);
  }
}

function sendTelegram_(text) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'post',
      payload: { chat_id: chatId, text: text, disable_web_page_preview: 'true' },
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error('Telegram alert failed', err);
  }
}

function sendAgentEvent_(payload) {
  const props = PropertiesService.getScriptProperties();
  const agentUrl = props.getProperty('AGENT_WEBHOOK_URL');
  if (!agentUrl) return;
  try {
    UrlFetchApp.fetch(agentUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-KitBaaz-Secret': props.getProperty('AGENT_WEBHOOK_SECRET') || '' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error('Agent webhook failed', err);
  }
}

function rowUrl_(rowNum) {
  return `${SpreadsheetApp.getActiveSpreadsheet().getUrl()}#gid=${ordersSheet_().getSheetId()}&range=A${rowNum}`;
}

/* ------------------------------------------------------------------ */
/* Menu and setup                                                     */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('KitBaaz')
    .addItem('Set up sheet', 'setupSheet')
    .addItem('Send a test order', 'sendTestOrder')
    .addItem('Refresh message for selected rows', 'refreshSelectedMessages')
    .addSeparator()
    .addItem('Show website secret', 'showWebhookSecret')
    .addToUi();
}

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);

  // Orders
  const orders = ss.getSheetByName(SHEETS.orders) || ss.insertSheet(SHEETS.orders, 0);
  if (orders.getLastRow() === 0) {
    orders.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map((c) => c[1])]);
  } else {
    // Sheet made by an older version of this script: add any new columns at the end.
    const headers = orders.getRange(1, 1, 1, orders.getLastColumn()).getValues()[0];
    COLUMNS.filter(([, h]) => headers.indexOf(h) < 0).forEach(([, h]) => {
      orders.getRange(1, orders.getLastColumn() + 1).setValue(h);
    });
  }
  const cols = cols_(orders);
  orders.setFrozenRows(1);
  orders.getRange(1, 1, 1, orders.getLastColumn()).setFontWeight('bold').setBackground('#e6f4f3').setWrap(true);
  COLUMNS.forEach(([key, , width]) => orders.setColumnWidth(cols[key], width));
  const rows = orders.getMaxRows() - 1;
  const col = (key) => orders.getRange(2, cols[key], rows, 1);
  col('date').setNumberFormat('dd/mm/yyyy hh:mm');
  col('deliveryDate').setNumberFormat('dd/mm/yyyy');
  col('phone').setNumberFormat('@');
  col('paidFrom').setNumberFormat('@');
  col('trxId').setNumberFormat('@');
  col('claimedAt').setNumberFormat('dd/mm/yyyy hh:mm');
  ['price', 'advancePaid', 'balance', 'advanceDue'].forEach((k) => col(k).setNumberFormat('#,##0'));
  // One line per order: long text is cut off in the cell (click it to read all of it).
  orders.getRange(2, 1, rows, orders.getLastColumn())
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
    .setVerticalAlignment('middle');
  if (orders.getLastRow() > 1) orders.setRowHeightsForced(2, orders.getLastRow() - 1, 24);
  col('status').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build(),
  );
  col('deliveryDate').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());

  const colors = {
    'Pre-order': '#fff3e0',
    'Advance received': '#e3f2fd',
    'Ordered from supplier': '#ede7f6',
    'In transit': '#e0f7fa',
    'Customs': '#fff8e1',
    'Out for delivery': '#e8f5e9',
    'Delivered': '#c8e6c9',
    'Review asked': '#f1f8e9',
    'Cancelled': '#eeeeee',
  };
  // Bright yellow: the customer says they paid, but the status is still Pre-order.
  const L = (key) => colLetter_(cols[key]);
  const claimToCheck = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${L('trxId')}2<>"",$${L('status')}2="Pre-order")`)
    .setBackground('#ffeb3b')
    .setBold(true)
    .setRanges([col('trxId'), col('paidFrom'), col('claimedAt')])
    .build();
  orders.setConditionalFormatRules(
    [claimToCheck].concat(
      STATUSES.map((s) =>
        SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(colors[s]).setRanges([col('status')]).build(),
      ),
    ),
  );

  // Settings
  const settings = ss.getSheetByName(SHEETS.settings) || ss.insertSheet(SHEETS.settings);
  if (settings.getLastRow() === 0) {
    settings.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'Help']]).setFontWeight('bold').setBackground('#e6f4f3');
    const owner = Session.getEffectiveUser().getEmail();
    settings
      .getRange(2, 1, SETTINGS.length, 3)
      .setValues(SETTINGS.map(([k, v, h]) => [k, k === 'Alert email' ? owner : v, h]));
    settings.getRange(2, 2, SETTINGS.length, 1).setNumberFormat('@');
    settings.setColumnWidth(1, 170).setColumnWidth(2, 260).setColumnWidth(3, 360);
    settings.setFrozenRows(1);
  }

  // Summary
  const summary = ss.getSheetByName(SHEETS.summary) || ss.insertSheet(SHEETS.summary, 1);
  buildSummary_(summary, cols);

  // Remove the empty default sheet.
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  const secret = ensureWebhookSecret_();
  ss.setActiveSheet(orders);
  alert_(
    'KitBaaz sheet is ready.\n\n' +
      'Next: Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone), ' +
      'then put the web app URL and this secret into Cloudflare:\n\n' +
      `ORDER_WEBHOOK_SECRET = ${secret}`,
  );
}

function buildSummary_(summary, cols) {
  summary.clear();
  const L = (key) => colLetter_(cols[key]);
  const ref = (key) => `Orders!${L(key)}2:${L(key)}`;
  const status = ref('status');

  summary.getRange('A1').setValue('KitBaaz summary').setFontSize(14).setFontWeight('bold');
  summary.getRange('A3:C3').setValues([['Status', 'Orders', 'Kits']]);
  STATUSES.forEach((s, i) => {
    const r = 4 + i;
    summary.getRange(r, 1, 1, 3).setFormulas([[`="${s}"`, `=COUNTIF(${status},A${r})`, `=SUMIF(${status},A${r},${ref('quantity')})`]]);
  });
  const totalRow = 4 + STATUSES.length;
  summary.getRange(totalRow, 1, 1, 3).setFormulas([['="All orders"', `=COUNTA(${ref('id')})`, `=SUM(${ref('quantity')})`]]);

  const m = totalRow + 2;
  summary.getRange(m, 1, 1, 2).setValues([['Money', 'Tk']]);
  const active = `${status},"<>Cancelled",${status},"<>"`;
  const money = [
    ['Order value (not cancelled)', `=SUMIFS(${ref('price')},${active})`],
    ['Advance collected', `=SUMIFS(${ref('advancePaid')},${active})`],
    ['Advance still to come (Pre-order)', `=SUMIFS(${ref('advanceDue')},${status},"Pre-order")`],
    ['Payments to check (TrxID given, still Pre-order)', `=COUNTIFS(${ref('trxId')},"<>",${status},"Pre-order")`],
    [
      'Balance to collect (not delivered)',
      `=SUMIFS(${ref('balance')},${active},${status},"<>Pre-order",${status},"<>Delivered",${status},"<>Review asked")`,
    ],
  ];
  summary.getRange(m + 1, 1, money.length, 2).setFormulas(money.map(([label, f]) => [`="${label}"`, f]));
  summary.getRange(m + 1, 2, money.length, 1).setNumberFormat('#,##0');

  const k = m + money.length + 2;
  summary.getRange(k, 1).setValue('Kits to order from supplier (status: Advance received)');
  summary
    .getRange(k + 1, 1)
    .setFormula(
      `=IFERROR(QUERY({${ref('kit')},${ref('quantity')},${status}},"select Col1, sum(Col2) where Col3 = 'Advance received' group by Col1 label Col1 'Kit', sum(Col2) 'Kits to order'",0),"None right now")`,
    );

  [3, m, k].forEach((r) => summary.getRange(r, 1, 1, 3).setFontWeight('bold').setBackground('#e6f4f3'));
  summary.setColumnWidth(1, 300).setColumnWidth(2, 110).setColumnWidth(3, 110);
}

function sendTestOrder() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let saved;
  try {
    saved = saveOrder_({
      name: 'TEST রহিম উদ্দিন',
      phone: '01712345678',
      district: 'ঢাকা',
      address: 'বাসা ১২, রোড ৫, ধানমন্ডি',
      kit: 'QE001',
      kitNameBn: 'স্মার্ট হোম কিট',
      quantity: 1,
      total: 4500,
      advance: 2250,
      payment: 'bkash',
      note: 'This is a test order. Delete this row.',
      source: 'test',
    });
  } finally {
    lock.releaseLock();
  }
  if (!saved.duplicate) notifyNewOrder_(saved.row);
  alert_(`Test order ${saved.row.id} added${saved.duplicate ? ' (duplicate, not added again)' : ''}. Delete the row when done.`);
}

function refreshSelectedMessages() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEETS.orders) return alert_('Open the Orders tab and select some rows first.');
  const range = sheet.getActiveRange();
  const cols = cols_(sheet);
  const settings = readSettings_();
  for (let r = Math.max(2, range.getRow()); r < range.getRow() + range.getNumRows(); r++) {
    refreshMessage_(sheet, cols, r, settings);
  }
}

function showWebhookSecret() {
  alert_(`ORDER_WEBHOOK_SECRET = ${ensureWebhookSecret_()}`);
}

function ensureWebhookSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('WEBHOOK_SECRET');
  if (!secret) {
    secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('WEBHOOK_SECRET', secret);
  }
  return secret;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function ordersSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.orders);
  if (!sheet) throw new Error('Orders tab not found. Run KitBaaz > Set up sheet first.');
  return sheet;
}

function cols_(sheet) {
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  const map = {};
  COLUMNS.forEach(([key, header]) => {
    const i = headers.indexOf(header);
    if (i < 0) throw new Error(`Orders tab is missing the "${header}" column.`);
    map[key] = i + 1;
  });
  return map;
}

function readSettings_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.settings);
  const out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;
  sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 2)
    .getValues()
    .forEach(([k, v]) => {
      if (k) out[String(k).trim()] = typeof v === 'string' ? v.trim() : v;
    });
  return out;
}

function waLink_(phone, text) {
  const digits = String(phone).replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `88${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

const BN_DIGITS_ = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function bn_(v) {
  return String(v).replace(/[0-9]/g, (d) => BN_DIGITS_[Number(d)]);
}

// 123456 -> "৳ ১,২৩,৪৫৬" (Bangladeshi grouping)
function tk_(amount) {
  const n = Math.round(Number(amount) || 0);
  const s = String(Math.abs(n));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `৳ ${n < 0 ? '-' : ''}${bn_(rest ? `${rest},${last3}` : last3)}`;
}

function colLetter_(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function str_(v) {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
}

function isPositiveInt_(v) {
  return Number.isInteger(Number(v)) && Number(v) > 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function alert_(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (err) {
    console.log(msg); // run from the script editor: shown in the execution log
  }
}
