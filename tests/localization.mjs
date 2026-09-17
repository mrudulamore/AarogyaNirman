import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const catalog = JSON.parse(fs.readFileSync('src/i18n/locales/interface.json', 'utf8'));
for (const [key, values] of Object.entries(catalog)) {
  assert.equal(values.length, 2, key);
  for (const value of values) {
    assert.ok(value.trim(), key);
    assert.deepEqual([...value.matchAll(/\{\{\d+\}\}/g)].map(m => m[0]).sort(), [...key.matchAll(/\{\{\d+\}\}/g)].map(m => m[0]).sort(), `Interpolation mismatch: ${key}`);
  }
}
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { localStorage: globalThis.localStorage };
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { default: i18n } = await server.ssrLoadModule('/src/i18n/index.ts');
  const { uiText, uiMessage } = await server.ssrLoadModule('/src/i18n/ui.ts');
  const { formatCurrency, formatDate } = await server.ssrLoadModule('/src/lib/utils.ts');
  const { StatusBadge, FormField } = await server.ssrLoadModule('/src/components/ui/primitives.tsx');
  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  const snapshot = JSON.stringify(useStore.getState().projects);
  const marker = React.createElement('b', null, 'Original record');
  for (const [language, index] of [['hi', 0], ['mr', 1]]) {
    await i18n.changeLanguage(language);
    for (const key of Object.keys(catalog)) assert.equal(uiText(key), catalog[key][index], key);
    assert.equal(uiText('  Submit RA Bill '), `  ${catalog['Submit RA Bill'][index]} `);
    assert.equal(uiText('WO/2026/001'), 'WO/2026/001');
    assert.equal(uiText('Aarogya Hospital — Dr More'), 'Aarogya Hospital — Dr More');
    assert.equal(uiText(marker), marker);
    assert.equal(uiText(150), 150);
    assert.equal(uiText(undefined), undefined);
    assert.ok(!uiMessage('{{0}} sections available for your role', [13]).includes('{{'));
    assert.ok(uiMessage('Project "{{0}}" created.', ['Hospital A']).includes('Hospital A'));
    assert.ok(!uiText('ON_TRACK').includes('ON_TRACK'));
    assert.ok(!uiText('FIRE_SAFETY').includes('FIRE'));
    const html = renderToStaticMarkup(React.createElement(FormField, { label: 'Supporting proof' }, React.createElement(StatusBadge, { status: 'OPEN', label: 'In Rectification' })));
    assert.ok(html.includes(catalog['Supporting proof'][index]));
    assert.ok(html.includes(catalog['In Rectification'][index]));
    assert.ok(!formatDate('2026-09-17').includes('Sept'));
    assert.ok(formatCurrency(10000000).includes(language === 'mr' ? 'कोटी' : 'करोड़'));
  }
  await i18n.changeLanguage('en');
  assert.equal(uiText('Submit RA Bill'), 'Submit RA Bill');
  assert.equal(formatCurrency(10000000), '₹1.00 Cr');
  assert.equal(JSON.stringify(useStore.getState().projects), snapshot, 'Language switching changed saved project records');
  console.log(`Localization checks passed: ${Object.keys(catalog).length} bilingual messages, interpolation, rendered labels, enums, locale formats and unchanged records.`);
} finally { await server.close(); }
