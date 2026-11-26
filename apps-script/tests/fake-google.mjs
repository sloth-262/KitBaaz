// In-memory imitation of the Google services Code.gs uses (Sheets, properties,
// locks, mail, URL fetch). Good enough to run the script's logic in Node.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';

const CODE = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');

/* ---------------- fake Google services ---------------- */

const chain = () => {
  const p = new Proxy(() => {}, {
    get: (_, k) => (k === 'build' ? () => ({}) : () => p),
  });
  return p;
};

function a1(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  const col = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const r1 = Number(m[2]);
  const c1 = col(m[1]);
  const r2 = m[3] ? Number(m[4]) : r1;
  const c2 = m[3] ? col(m[3]) : c1;
  return [r1, c1, r2 - r1 + 1, c2 - c1 + 1];
}

class FakeRange {
  constructor(sheet, row, col, rows = 1, cols = 1) {
    if (row + rows - 1 > sheet.maxRows) throw new Error(`Range out of bounds (row ${row + rows - 1} > ${sheet.maxRows})`);
    Object.assign(this, { sheet, row, col, rows, cols });
  }
  cells(fn) {
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) fn(this.row + r, this.col + c, r, c);
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      out.push([]);
      for (let c = 0; c < this.cols; c++) out[r].push(this.sheet.get(this.row + r, this.col + c));
    }
    return out;
  }
  getValue() { return this.sheet.get(this.row, this.col); }
  setValues(v) { this.cells((r, c, i, j) => this.sheet.set(r, c, v[i][j])); return this; }
  setValue(v) { this.sheet.set(this.row, this.col, v); return this; }
  setFormula(f) { this.sheet.formulas.set(`${this.row},${this.col}`, f); this.sheet.set(this.row, this.col, `<formula>`); return this; }
  setFormulas(f) { this.cells((r, c, i, j) => { this.sheet.formulas.set(`${r},${c}`, f[i][j]); this.sheet.set(r, c, '<formula>'); }); return this; }
  setFormulaR1C1(f) { return this.setFormula(f); }
  setRichTextValue(v) { this.sheet.links.set(`${this.row},${this.col}`, v); this.sheet.set(this.row, this.col, v.text); return this; }
  clearContent() { this.cells((r, c) => this.sheet.set(r, c, '')); return this; }
  setNumberFormat(f) { this.cells((r, c) => this.sheet.formats.set(`${r},${c}`, f)); return this; }
  getSheet() { return this.sheet; }
  getRow() { return this.row; }
  getColumn() { return this.col; }
  getNumRows() { return this.rows; }
  getNumColumns() { return this.cols; }
}
for (const m of ['setFontWeight', 'setBackground', 'setWrap', 'setFontSize', 'setVerticalAlignment', 'setDataValidation']) {
  FakeRange.prototype[m] = function () { return this; };
}

class FakeSheet {
  constructor(name, id) {
    Object.assign(this, { name, id, data: [], maxRows: 1000, formulas: new Map(), links: new Map(), formats: new Map() });
  }
  get(r, c) { return this.data[r - 1]?.[c - 1] ?? ''; }
  set(r, c, v) {
    while (this.data.length < r) this.data.push([]);
    this.data[r - 1][c - 1] = v;
  }
  getName() { return this.name; }
  getSheetId() { return this.id; }
  getMaxRows() { return this.maxRows; }
  insertRowsAfter(_, n) { this.maxRows += n; }
  getLastRow() {
    for (let r = this.data.length; r > 0; r--) if (this.data[r - 1].some((v) => v !== '' && v != null)) return r;
    return 0;
  }
  getLastColumn() { return Math.max(0, ...this.data.map((row) => row.length)); }
  getRange(r, c, nr, nc) { return typeof r === 'string' ? new FakeRange(this, ...a1(r)) : new FakeRange(this, r, c, nr, nc); }
  clear() { this.data = []; this.formulas.clear(); }
}
for (const m of ['setFrozenRows', 'setColumnWidth', 'setConditionalFormatRules']) {
  FakeSheet.prototype[m] = function () { return this; };
}

export function makeEnv() {
  const sheets = [new FakeSheet('Sheet1', 0)];
  const ss = {
    getSheetByName: (n) => sheets.find((s) => s.name === n) ?? null,
    insertSheet: (n, i) => { const s = new FakeSheet(n, sheets.length + 1); sheets.splice(i ?? sheets.length, 0, s); return s; },
    getSheets: () => sheets,
    deleteSheet: (s) => sheets.splice(sheets.indexOf(s), 1),
    setSpreadsheetTimeZone() {},
    getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST/edit',
    setActiveSheet() {},
  };
  const props = new Map();
  const mails = [];
  const fetches = [];
  const logs = [];
  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(`ERROR ${a.join(' ')}`) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      getUi: () => { throw new Error('no UI in tests'); },
      newRichTextValue: () => {
        const v = {};
        const b = { setText: (t) => ((v.text = t), b), setLinkUrl: (u) => ((v.url = u), b), build: () => v };
        return b;
      },
      newDataValidation: chain,
      newConditionalFormatRule: chain,
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => props.get(k) ?? null,
        setProperty: (k, v) => props.set(k, String(v)),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: randomUUID,
      formatDate: (d, tz, fmt) => {
        assert.equal(fmt, 'yyMMdd');
        const p = Object.fromEntries(
          new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: '2-digit', month: '2-digit', day: '2-digit' })
            .formatToParts(d).map((x) => [x.type, x.value]),
        );
        return `${p.year}${p.month}${p.day}`;
      },
    },
    ContentService: { createTextOutput: (s) => ({ content: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    MailApp: { sendEmail: (m) => mails.push(m) },
    UrlFetchApp: { fetch: (url, opts) => { fetches.push({ url, opts }); return {}; } },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: 'Code.gs' });
  const run = (expr) => vm.runInContext(expr, ctx);
  return { ctx, run, ss, sheets, props, mails, fetches, logs };
}

