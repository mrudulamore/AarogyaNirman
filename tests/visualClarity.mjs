import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { ProgressComparison } = await server.ssrLoadModule('/src/components/common/ProgressComparison.tsx');
  const render = rows => renderToStaticMarkup(React.createElement(ProgressComparison, { rows }));
  const empty = render([]);
  assert.match(empty, /No progress reports available/);
  assert.doesNotMatch(empty, /recharts|NaN/);
  const point = { month: '2026-08', planned: 28, verified: 20, financial: 18 };
  const snapshot = render([point]);
  assert.match(snapshot, /Single-month snapshot/);
  assert.match(snapshot, /8.0 percentage points below/);
  assert.match(snapshot, /28%/); assert.match(snapshot, /20%/); assert.match(snapshot, /18%/);
  assert.doesNotMatch(snapshot, /recharts-wrapper/);
  assert.match(snapshot, /Reported work is not certification/);
  const invalid = render([{ ...point, planned: NaN }]);
  assert.match(invalid, /Schedule comparison unavailable/);
  assert.doesNotMatch(invalid, /NaN%/);
  assert.match(render([{ ...point, verified: 30 }]), /2.0 percentage points above/);
  assert.match(render([{ ...point, verified: 28 }]), /matches the schedule estimate/);
  assert.match(render([{ ...point, financial: 120 }]), /120%/);
  assert.match(render([{ ...point, month: '2026-07' }, point]), /Latest reported month/);
  assert.deepEqual(point, { month: '2026-08', planned: 28, verified: 20, financial: 18 });
  console.log('Progress clarity: empty, single month, real gaps, missing schedule, equal/ahead cases, overspend and input preservation passed.');
} finally { await server.close(); }
