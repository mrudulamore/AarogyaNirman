import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 4189, strictPort: true }, logLevel: 'error' });
await server.listen();
const profile = await mkdtemp(join(tmpdir(), 'aarogya-browser-test-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9239', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let targets;
  for (let n = 0; n < 40; n++) {
    try { targets = await (await fetch('http://127.0.0.1:9239/json', { signal: AbortSignal.timeout(1000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  assert.ok(targets?.length, 'Headless browser did not start');
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  socket.onmessage = event => { const msg = JSON.parse(event.data); if (pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? JSON.stringify(result.exceptionDetails)); return result.result.value; }
  await send('Page.navigate', { url: 'http://127.0.0.1:4189' });
  for (let n = 0; n < 80; n++) { if (await evaluate('document.querySelectorAll("button").length > 0')) break; await new Promise(r => setTimeout(r, 250)); }
  const result = await evaluate(`(async () => {
    const { useStore } = await import('/src/store/useStore.ts');
    const { saveSiteDraft, siteDrafts, removeSiteDraft } = await import('/src/lib/siteDrafts.ts');
    const { saveBillFiles } = await import('/src/lib/billAttachments.ts');
    const { buildUnicodePdf } = await import('/src/lib/unicodePdf.ts');
    useStore.getState().login('CONTRACTOR');
    const user = useStore.getState().currentUser;
    const project = useStore.getState().projects.find(p => p.contractorId === user.contractorId);
    const file = new File(['%PDF-1.7 sample'], 'site.pdf', { type: 'application/pdf' });
    const draft = { id: 'browser-draft', ownerId: user.id, projectId: project.id, savedAt: new Date().toISOString(), files: [file], report: { clientSubmissionId: 'browser-submission', projectId: project.id, date: '2026-09-18', stage: 'Structure', progressPct: 45, workersPresent: 3, weather: 'Clear', materialsReceived: 'Steel', materialsUsed: 'Concrete', issues: '', photoIds: [], videoCount: 0, submittedBy: user.name, location: project.name, timestamp: new Date().toISOString(), workCompleted: 'Slab cast', measurementsNotes: '6 m3', delayReason: '' } };
    await saveSiteDraft(draft);
    const restored = (await siteDrafts(user.id, project.id))[0];
    if (await restored.files[0].text() !== await file.text()) throw new Error('Draft lost attachment bytes');
    if ((await siteDrafts('another-user', project.id)).length) throw new Error('Cross-account draft leak');
    const attachments = await saveBillFiles(restored.files.map(file => ({ file, category: 'SUPPORTING' })));
    const before = useStore.getState().progressReports.length;
    await useStore.getState().addProgressReport({ ...restored.report, attachments });
    await useStore.getState().addProgressReport({ ...restored.report, attachments });
    if (useStore.getState().progressReports.length !== before + 1) throw new Error('Retry duplicated a report');
    await removeSiteDraft(draft.id);
    if ((await siteDrafts(user.id, project.id)).length) throw new Error('Submitted draft remains');
    const pdf = await buildUnicodePdf({ kind: 'report', options: { title: '\u0926\u0948\u0928\u093f\u0915 \u092a\u094d\u0930\u0917\u0924\u0940', subtitle: project.name, scopeLine: project.id, generatedBy: user.name, filename: 'test', sections: [{ heading: '\u0915\u093e\u092e\u093e\u091a\u093e \u0905\u0939\u0935\u093e\u0932', columns: ['\u0926\u093f\u0928\u093e\u0902\u0915', '\u092a\u094d\u0930\u0917\u0924\u0940'], rows: Array.from({length: 100}, () => ['2026-09-18', '\u0930\u0941\u0917\u094d\u0923\u093e\u0932\u092f\u093e\u091a\u0947 \u092c\u093e\u0902\u0927\u0915\u093e\u092e']) }] } });
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Unicode PDF invalid');
    localStorage.setItem('browser-test-project', project.id);
    return { pdfBytes: pdf.size, projectId: project.id };
  })()`);
  console.log('Browser IndexedDB: draft bytes, owner isolation, report retry idempotency passed. Unicode PDF bytes:', result.pdfBytes);
  await send('Page.navigate', { url: `http://127.0.0.1:4189/projects/${result.projectId}?tab=progress` });
  for (let n = 0; n < 80; n++) { if (await evaluate('document.body.innerText.includes("Server upload is not configured")')) break; await new Promise(r => setTimeout(r, 250)); }
  assert.ok(await evaluate('document.body.innerText.includes("Server upload is not configured")'), 'Diary page failed to mount');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate('document.documentElement.scrollWidth <= 395'), 'Mobile page overflow');
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Daily Progress')).click()`);
  await new Promise(r => setTimeout(r, 150));
  assert.ok(await evaluate('document.body.innerText.includes("Save draft") && document.body.innerText.includes("Measurement notes")'), 'Diary form did not open');
  console.log('Browser: diary page, mobile width and draft form checks passed.');
  await send('Page.navigate', { url: 'http://127.0.0.1:4189/dashboard' });
  for (let n = 0; n < 80; n++) { if (await evaluate('!!document.querySelector(".field-action")')) break; await new Promise(r => setTimeout(r, 250)); }
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const rect = await evaluate('(() => { const r = document.querySelector(".field-action").getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...rect });
  await new Promise(r => setTimeout(r, 250));
  const color = await evaluate('getComputedStyle(document.querySelector(".field-action")).backgroundColor');
  assert.equal(color, 'rgb(241, 247, 255)');
  console.log('Contractor card hover verified: soft theme blue ' + color);
  await evaluate('document.querySelector(".pending-work-summary").click()');
  for (let n = 0; n < 40; n++) { if (await evaluate('location.pathname === "/dashboard/pending-work" && document.body.innerText.includes("Review priorities")')) break; await new Promise(r => setTimeout(r, 100)); }
  assert.ok(await evaluate('location.pathname === "/dashboard/pending-work" && document.querySelectorAll("button[aria-pressed]").length === 7'));
  assert.equal(await evaluate('!!document.querySelector(".pending-work-summary")'), false);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate('document.documentElement.scrollWidth <= 395'), 'Pending page overflows mobile');
  console.log('Pending-work summary navigation, dedicated filters and mobile width passed.');


} finally { socket?.close(); browser.kill(); await server.close(); }
