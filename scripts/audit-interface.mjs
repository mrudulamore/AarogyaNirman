import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const normalize = s => s.trim().replace(/\s+/g, ' ').toLowerCase();
const catalog = JSON.parse(fs.readFileSync('src/i18n/locales/interface.json', 'utf8'));
const existing = JSON.parse(fs.readFileSync('src/i18n/locales/en.json', 'utf8'));
const known = new Set(Object.keys(catalog).map(normalize));
function addExisting(o) {
  for (const v of Object.values(o)) {
    if (typeof v === 'string') known.add(normalize(v));
    else addExisting(v);
  }
}
addExisting(existing);
for (const section of ['roles', 'status']) for (const key of Object.keys(existing[section])) known.add(normalize(key));
// Identifiers and example addresses are never interface translations.
const retained = new Set(['quantityDelta', 'scheduleDays', 'liabilityMonths', 'billNumber', 'grossAmount', 'invoiceDate', 'measurementBookId', 'periodFrom', 'periodTo', 'workOrderReference', 'hcms-maharashtra-store-v5', 'you@maharashtra.gov.in']);
const missing = new Map();
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)]); }
for (const file of walk('src').filter(f => /\.(ts|tsx)$/.test(f) && !/seed|i18n/.test(f))) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(n) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const s = n.text;
      const p = n.parent;
      const geographicName = ts.isArrayLiteralExpression(p) && ts.isPropertyAssignment(p.parent) && p.parent.name.getText(sf) === 'talukas';
      let ancestor = p;
      while (ancestor && !ts.isCallExpression(ancestor) && !ts.isSourceFile(ancestor)) ancestor = ancestor.parent;
      const inUiText = ancestor && ts.isCallExpression(ancestor) && /^(uiText|uiMessage)$/.test(ancestor.expression.getText(sf));
      const visible = inUiText || ts.isPropertyAssignment(p) && /^(label|title|subtitle|description|hint|name)$/.test(p.name.getText(sf))
        || ts.isCallExpression(p) && /^(uiText|toast\.(success|error|info|warning))$/.test(p.expression.getText(sf))
        || ts.isNewExpression(p) && p.expression.getText(sf) === 'Error'
        || ts.isJsxAttribute(p) && /^(name|label|title|placeholder)$/.test(p.name.getText(sf))
        || file.endsWith('.tsx') && ts.isArrayLiteralExpression(p) && /[A-Z][a-z]/.test(s)
        || /checklists\.ts$/.test(file) && ts.isArrayLiteralExpression(p)
        || /constants\.ts$/.test(file) && ts.isArrayLiteralExpression(p) && !/[a-z]-/.test(s);
      if (visible && !geographicName && !retained.has(s) && /[A-Za-z]{2}/.test(s) && !known.has(normalize(s)) && !known.has(normalize(s.replaceAll('_', ' '))) && !/^([./#]|https:)/.test(s)) {
        if (!missing.has(s)) missing.set(s, []);
        missing.get(s).push(file + ':' + (sf.getLineAndCharacterOfPosition(n.getStart()).line + 1));
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);
}
const entries = [...missing].sort(([a], [b]) => a.localeCompare(b));
if (process.argv.includes('--json')) console.log(JSON.stringify(Object.fromEntries(entries), null, 2));
else console.log(entries.map(([s]) => s).join('\n'));
console.log(`${entries.length} messages need review`);
if (process.argv.includes('--check') && entries.length) process.exitCode = 1;
