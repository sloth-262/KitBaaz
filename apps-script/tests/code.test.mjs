// Runs apps-script/Code.gs against a small in-memory imitation of Google Sheets.
// Run with: npm run test:apps-script
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv } from './fake-google.mjs';

const order = (over = {}) => ({
  createdAt: new Date().toISOString(),
  source: 'website',
  name: 'রহিম উদ্দিন',
  phone: '01712345678',
  district: 'ঢাকা',
  address: 'বাসা ১২, রোড ৫, ধানমন্ডি',
  kit: 'QE001',
  kitName: 'ACEBOTT Smart Home Kit',
  kitNameBn: 'স্মার্ট হোম কিট',
  quantity: 2,
  unitPrice: 4500,
  total: 9000,
  advance: 4500,
  balance: 4500,
  payment: 'bkash',
  note: '',
  ...over,
});

function post(env, body) {
  const res = env.ctx.doPost({ postData: { contents: JSON.stringify(body) } });
  return JSON.parse(res.content);
}

function setUp() {
  const env = makeEnv();
  env.ctx.setupSheet();
  const secret = env.props.get('WEBHOOK_SECRET');
  const orders = env.ss.getSheetByName('Orders');
  const cols = env.ctx.cols_(orders);
  const cell = (row, key) => orders.get(row, cols[key]);
  return { ...env, secret, orders, cols, cell };
}

const today = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: '2-digit', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}`;
};

// Dates made inside the sandbox are not `instanceof Date` out here.
const isDate = (v) => Object.prototype.toString.call(v) === '[object Date]';

/* ---------------- tests ---------------- */

test('setup creates the tabs, headers and a website secret', () => {
  const { ss, secret, orders, run } = setUp();
  assert.deepEqual(ss.getSheets().map((s) => s.name).sort(), ['Orders', 'Settings', 'Summary']);
  assert.equal(JSON.stringify(orders.data[0]), JSON.stringify(run('COLUMNS').map((c) => c[1])));
  assert.match(secret, /^[0-9a-f]{64}$/);
  assert.equal(ss.getSheetByName('Settings').get(3, 2), 'owner@example.com'); // Alert email defaults to the owner
});

test('setup can run twice without wiping orders', () => {
  const env = setUp();
  post(env, { secret: env.secret, order: order() });
  env.ctx.setupSheet();
  assert.equal(env.orders.getLastRow(), 2);
  assert.equal(env.props.get('WEBHOOK_SECRET'), env.secret);
});

test('rejects a wrong secret or a broken order', () => {
  const env = setUp();
  assert.deepEqual(post(env, { secret: 'nope', order: order() }), { ok: false, error: 'forbidden' });
  assert.equal(post(env, { secret: env.secret, order: order({ phone: '12345' }) }).error, 'bad_phone');
  assert.equal(post(env, { secret: env.secret, order: order({ quantity: 0 }) }).error, 'bad_quantity');
  assert.equal(post(env, { secret: env.secret, order: order({ payment: 'paypal' }) }).error, 'bad_payment');
  assert.equal(JSON.parse(env.ctx.doPost({}).content).error, 'bad_json');
  assert.equal(env.orders.getLastRow(), 1);
  assert.equal(env.mails.length, 0);
});

test('saves a website order with all columns, a draft and a WhatsApp link', () => {
  const env = setUp();
  const res = post(env, { secret: env.secret, order: order({ note: 'বিকেলে ফোন করবেন' }) });
  assert.equal(res.ok, true);
  assert.equal(res.orderId, `KB-${today()}-001`);

  const { cell, orders, cols } = env;
  assert.equal(cell(2, 'id'), res.orderId);
  assert.ok(isDate(cell(2, 'date')));
  assert.equal(cell(2, 'customer'), 'রহিম উদ্দিন');
  assert.equal(cell(2, 'phone'), '01712345678');
  assert.equal(orders.formats.get(`2,${cols.phone}`), '@'); // keeps the leading 0
  assert.equal(cell(2, 'address'), 'বাসা ১২, রোড ৫, ধানমন্ডি, ঢাকা');
  assert.equal(cell(2, 'kit'), 'স্মার্ট হোম কিট (QE001)');
  assert.equal(cell(2, 'quantity'), 2);
  assert.equal(cell(2, 'price'), 9000);
  assert.equal(cell(2, 'advancePaid'), '');
  assert.equal(cell(2, 'status'), 'Pre-order');
  assert.equal(cell(2, 'advanceDue'), 4500);
  assert.equal(cell(2, 'payment'), 'বিকাশ');
  assert.equal(cell(2, 'notes'), 'গ্রাহক: বিকেলে ফোন করবেন');
  assert.equal(cell(2, 'source'), 'website');
  // Balance formula points at Price and Advance paid on the same row
  assert.equal(orders.formulas.get(`2,${cols.balance}`), '=IF(RC[-2]="","",RC[-2]-N(RC[-1]))');

  const msg = cell(2, 'message');
  assert.match(msg, /আসসালামু আলাইকুম রহিম উদ্দিন/);
  assert.match(msg, new RegExp(res.orderId));
  assert.match(msg, /মোট দাম: ৳ ৯,০০০/);
  assert.match(msg, /অগ্রিম \(৫০%\): ৳ ৪,৫০০/);
  assert.match(msg, /বিকাশ নম্বর \[নম্বর লিখুন\]-এ/); // no bKash number in Settings yet: placeholder
  assert.match(msg, /১০–১৪ দিনের মধ্যে/);

  const link = orders.links.get(`2,${cols.whatsapp}`);
  assert.equal(link.text, 'WhatsApp-এ পাঠান');
  assert.ok(link.url.startsWith('https://wa.me/8801712345678?text='));
  assert.equal(decodeURIComponent(link.url.split('text=')[1]), msg);
});

test('sends one alert email with the draft, and no Telegram or agent call unless set up', () => {
  const env = setUp();
  const res = post(env, { secret: env.secret, order: order() });
  assert.equal(env.mails.length, 1);
  assert.equal(env.mails[0].to, 'owner@example.com');
  assert.match(env.mails[0].subject, new RegExp(res.orderId));
  assert.match(env.mails[0].body, /গ্রাহককে পাঠানোর মেসেজ/);
  assert.match(env.mails[0].body, /range=A2/);
  assert.equal(env.fetches.length, 0);
});

test('uses Settings for payment numbers', () => {
  const env = setUp();
  const settings = env.ss.getSheetByName('Settings');
  const row = settings.data.findIndex((r) => r[0] === 'bKash number') + 1;
  settings.set(row, 2, '01811111111');
  post(env, { secret: env.secret, order: order() });
  assert.match(env.cell(2, 'message'), /বিকাশ নম্বর 01811111111-এ ৳ ৪,৫০০ Send Money করুন/);
});

test('a double submit returns the same order ID and adds nothing', () => {
  const env = setUp();
  const a = post(env, { secret: env.secret, order: order() });
  const b = post(env, { secret: env.secret, order: order() });
  assert.equal(b.ok, true);
  assert.equal(b.duplicate, true);
  assert.equal(b.orderId, a.orderId);
  assert.equal(env.orders.getLastRow(), 2);
  assert.equal(env.mails.length, 1);
});

test('order IDs count up within the day', () => {
  const env = setUp();
  const ids = ['01711111111', '01722222222', '01733333333'].map(
    (phone) => post(env, { secret: env.secret, order: order({ phone }) }).orderId,
  );
  assert.deepEqual(ids, [1, 2, 3].map((n) => `KB-${today()}-00${n}`));
});

test('grows the sheet past its row limit', () => {
  const env = setUp();
  env.orders.maxRows = 2;
  post(env, { secret: env.secret, order: order({ phone: '01711111111' }) });
  post(env, { secret: env.secret, order: order({ phone: '01722222222' }) });
  assert.equal(env.orders.getLastRow(), 3);
});

test('status change refreshes the draft and fills Advance paid / Delivery date', () => {
  const env = setUp();
  const { orders, cols, cell } = env;
  const { orderId } = post(env, { secret: env.secret, order: order() });
  const edit = (key, value) => {
    orders.set(2, cols[key], value);
    env.ctx.onEdit({ range: orders.getRange(2, cols[key]) });
  };

  edit('status', 'Advance received');
  assert.equal(cell(2, 'advancePaid'), 4500);
  assert.match(cell(2, 'message'), /আপনার অগ্রিম ৳ ৪,৫০০ পেয়েছি। অর্ডার .* নিশ্চিত হয়েছে/);

  edit('advancePaid', 4000);
  assert.match(cell(2, 'message'), /৳ ৪,০০০ পেয়েছি/);

  edit('status', 'Out for delivery');
  assert.match(cell(2, 'message'), /বাকি টাকা: ৳ ৫,০০০/);

  edit('status', 'Delivered');
  assert.ok(isDate(cell(2, 'deliveryDate')));
  assert.match(cell(2, 'message'), new RegExp(`${orderId}: আপনার কিটটি পৌঁছে গেছে`));

  const url = orders.links.get(`2,${cols.whatsapp}`).url;
  assert.equal(decodeURIComponent(url.split('text=')[1]), cell(2, 'message'));
});

test('edits on other tabs or columns are ignored', () => {
  const env = setUp();
  post(env, { secret: env.secret, order: order() });
  const before = env.cell(2, 'message');
  env.orders.set(2, env.cols.notes, 'called once');
  env.ctx.onEdit({ range: env.orders.getRange(2, env.cols.notes) });
  env.ctx.onEdit({ range: env.ss.getSheetByName('Settings').getRange(2, 2) });
  assert.equal(env.cell(2, 'message'), before);
});

test('every status has a Bangla message that names the order', () => {
  const { run, ctx } = makeEnv();
  for (const status of run('STATUSES')) {
    const msg = ctx.buildMessage_(
      { id: 'KB-261126-001', customer: 'রহিম', status, kit: 'স্মার্ট হোম কিট (QE001)', quantity: 1, price: 4500, advanceDue: 2250, advancePaid: 2250, payment: 'নগদ' },
      {},
    );
    assert.ok(msg.length > 20, status);
    assert.ok(status === 'Review asked' || msg.includes('KB-261126-001'), status);
  }
});

test('money is shown in Bangla digits with Bangladeshi grouping', () => {
  const { ctx } = makeEnv();
  assert.equal(ctx.tk_(4500), '৳ ৪,৫০০');
  assert.equal(ctx.tk_(450), '৳ ৪৫০');
  assert.equal(ctx.tk_(123456), '৳ ১,২৩,৪৫৬');
  assert.equal(ctx.tk_(1234567), '৳ ১২,৩৪,৫৬৭');
});

test('summary formulas point at the right Orders columns', () => {
  const { ss } = setUp();
  const f = [...ss.getSheetByName('Summary').formulas.values()].join('\n');
  assert.match(f, /COUNTIF\(Orders!K2:K,A4\)/); // Status is column K
  assert.match(f, /SUMIF\(Orders!K2:K,A4,Orders!G2:G\)/); // Quantity is column G
  assert.match(f, /SUMIFS\(Orders!I2:I,/); // Advance paid is column I
  assert.match(f, /QUERY\(\{Orders!F2:F,Orders!G2:G,Orders!K2:K\}/);
});

test('Telegram and agent webhook fire when configured', () => {
  const env = setUp();
  env.props.set('TELEGRAM_BOT_TOKEN', 'TOKEN');
  env.props.set('TELEGRAM_CHAT_ID', '123');
  env.props.set('AGENT_WEBHOOK_URL', 'https://agent.example/hook');
  env.props.set('AGENT_WEBHOOK_SECRET', 'agent-secret');
  const { orderId } = post(env, { secret: env.secret, order: order() });
  assert.equal(env.fetches.length, 2);
  const [tg, agent] = env.fetches;
  assert.equal(tg.url, 'https://api.telegram.org/botTOKEN/sendMessage');
  assert.equal(tg.opts.payload.chat_id, '123');
  assert.match(tg.opts.payload.text, new RegExp(orderId));
  assert.equal(agent.url, 'https://agent.example/hook');
  assert.equal(agent.opts.headers['X-KitBaaz-Secret'], 'agent-secret');
  const payload = JSON.parse(agent.opts.payload);
  assert.equal(payload.event, 'order.created');
  assert.equal(payload.order.id, orderId);
  assert.equal(payload.order.status, 'Pre-order');
  assert.match(payload.customerMessageDraft, /প্রি-অর্ডারের জন্য ধন্যবাদ/);
});

test('a failing alert does not lose the order', () => {
  const env = setUp();
  env.ctx.MailApp.sendEmail = () => { throw new Error('quota'); };
  const res = post(env, { secret: env.secret, order: order() });
  assert.equal(res.ok, true);
  assert.equal(env.orders.getLastRow(), 2);
  assert.ok(env.logs.some((l) => l.startsWith('ERROR Alert email failed')));
});

test('menu test order works', () => {
  const env = setUp();
  env.ctx.sendTestOrder();
  assert.equal(env.cell(2, 'source'), 'test');
  assert.match(env.cell(2, 'customer'), /^TEST/);
  assert.ok(env.logs.some((l) => l.includes('Test order KB-')));
});
