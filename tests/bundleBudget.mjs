import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const entry = html.match(/src="\/(assets\/index-[^"]+\.js)"/)?.[1];
assert.ok(entry, 'Production entry was not found');
const entryBytes = statSync(`dist/${entry}`).size;
assert.ok(entryBytes < 350_000, `Entry bundle grew to ${(entryBytes / 1024).toFixed(0)} KiB; route splitting may have regressed`);
const assets = readdirSync('dist/assets');
for (const route of ['Dashboard', 'ProjectDetail', 'PhotosTab', 'FinanceTab', 'FieldHome']) {
  assert.ok(assets.some(asset => asset.startsWith(`${route}-`) && asset.endsWith('.js')), `${route} is no longer loaded separately`);
}
console.log(`Bundle budget passed: entry ${(entryBytes / 1024).toFixed(0)} KiB; key routes split into separate chunks.`);
