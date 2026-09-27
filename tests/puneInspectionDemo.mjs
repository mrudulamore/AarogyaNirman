import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 4197, strictPort: true }, logLevel: 'error' });
await server.listen();
const profile = await mkdtemp(join(tmpdir(), 'aarogya-browser-test-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9247', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let targets;
  for (let n = 0; n < 40; n++) {
    try { targets = await (await fetch('http://127.0.0.1:9247/json', { signal: AbortSignal.timeout(1000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
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
  await send('Page.navigate',{url:'http://127.0.0.1:4197/login'});
  await new Promise(r=>setTimeout(r,2000));

  await evaluate(`(async () => {
    const { useStore } = await import('/src/store/useStore.ts');
    const { computeProjectScope } = await import('/src/lib/projectScope.ts');
    const { saveBillFiles, readBillFile } = await import('/src/lib/billAttachments.ts');
    const documents = await saveBillFiles([{file: new File(['%PDF-1.4 test document'], 'inspection.pdf', {type: 'application/pdf'}), category: 'SUPPORTING'}]);
    const state = () => useStore.getState();
    const check = (v, m) => { if (!v) throw new Error(m); };
    const rejects = (fn, m) => { let rejected = false; try { fn(); } catch { rejected = true; } check(rejected, m); };
    const { withPuneDemo } = await import('/src/mock/puneDemo.ts');
    state().login('PROJECT_MANAGER');
    const managerSites = computeProjectScope(state().currentUser, state().projects, state().contractors).projects;
    check(managerSites.length === 2 && managerSites.some(p => p.district === 'Pune') && managerSites.some(p => p.district === 'Satara'), 'PM must have exactly Pune and Satara');
    const demoJuniors = state().users.filter(u => u.id.startsWith('PUNE-DEMO-JE-'));
    check(demoJuniors.length === 4, 'Missing Pune junior engineers');
    for (const role of ['EXECUTIVE_ENGINEER', 'DEPUTY_ENGINEER', 'CONTRACTOR']) {
      state().login(role);
      const sites = computeProjectScope(state().currentUser, state().projects, state().contractors).projects;
      check(sites.length > 0 && sites.every(p => p.division === 'Pune Division'), role + ' sees non-Pune sites');
    }
    for (const user of demoJuniors) {
      const sites = computeProjectScope(user, state().projects, state().contractors).projects;
      check(sites.length === 1 && sites.every(p => p.division === 'Pune Division'), 'JE Pune assignment mismatch');
    }
    check(withPuneDemo(state()) === state(), 'Demo setup is not idempotent');
    await useStore.persist.rehydrate();
    state().login('CONTRACTOR');
    check(computeProjectScope(state().currentUser, state().projects, state().contractors).projects.every(p => p.division === 'Pune Division'), 'Hydration lost Pune scope');
    state().login('DEPUTY_ENGINEER');
    const junior = state().currentUser;
    const project = computeProjectScope(junior, state().projects, state().contractors).projects[0];
    state().login('EXECUTIVE_ENGINEER');
    const ee = { ...state().currentUser, assignedProjectIds: [project.id], circle: project.circle };
    useStore.setState({ currentUser: ee });
    const input = { projectId: project.id, category: 'PLUMBING', scheduledDate: '2026-10-01', scheduledTime: '10:30', location: 'Ward B', scope: 'Pressure test', assignedToId: junior.id, inspector: '', comments: '' };
    const inspection = state().scheduleInspection(input);
    rejects(() => state().startInspection(inspection.id), 'EE conducted inspection');
    useStore.setState({currentUser: junior});
    rejects(() => state().scheduleInspection(input), 'JE allocated inspection');
    state().startInspection(inspection.id);
    const items = [{ id: 'pressure', requirement: 'Pressure test', measurement: '', standard: '3 bar', evidence: '', result: 'FAIL', remarks: 'Leak' }];
    rejects(() => state().submitInspection(inspection.id, items, 'FAIL', 'Leak'), 'Missing document accepted');
    state().setInspectionDocuments(inspection.id, documents);
    state().submitInspection(inspection.id, items, 'FAIL', 'Leak');
    check((await readBillFile(documents[0].id)).size > 0, 'Document was not persisted');
    check(!state().defects.some(d => d.sourceInspectionId === inspection.id), 'Defect created before review');
    rejects(() => state().reviewInspection(inspection.id, 'REVERIFY', 'Repeat'), 'JE reviewed inspection');
    rejects(() => state().startInspection(inspection.id), 'Pending review reopened');
    useStore.setState({currentUser: ee});
    rejects(() => state().reviewInspection(inspection.id, 'REVERIFY', ' '), 'Blank reason accepted');
    state().reviewInspection(inspection.id, 'REVERIFY', 'Repeat measurement');
    let saved = state().inspections.find(i => i.id === inspection.id);
    check(saved.status === 'REVERIFY' && saved.reviewHistory[0].items[0].remarks === 'Leak' && !saved.attachments.length && saved.reviewHistory[0].attachments[0].name === 'inspection.pdf', 'Reverify lost document history or reused attachments');
    useStore.setState({currentUser: {...junior, id: 'unassigned'}});
    rejects(() => state().startInspection(inspection.id), 'Unassigned JE conducted inspection');
    useStore.setState({currentUser: junior});
    state().startInspection(inspection.id);
    state().setInspectionDocuments(inspection.id, documents);
    state().submitInspection(inspection.id, items, 'FAIL', 'Still leaking');
    useStore.setState({currentUser: ee});
    rejects(() => state().reviewInspection(inspection.id, 'APPROVE', ''), 'Failed findings approved');
    state().reviewInspection(inspection.id, 'RAISE_DEFECT', 'Repair leakage');
    check(state().defects.filter(d => d.sourceInspectionId === inspection.id).length === 1, 'Defect not created');
    rejects(() => state().reviewInspection(inspection.id, 'RAISE_DEFECT', 'Duplicate'), 'Duplicate review accepted');
    const passing = state().scheduleInspection(input);
    useStore.setState({currentUser: junior});
    state().startInspection(passing.id);
    state().setInspectionDocuments(passing.id, documents);
    state().submitInspection(passing.id, [{...items[0], result: 'PASS', measurement: ''}], 'PASS', 'Verified');
    useStore.setState({currentUser: ee});
    rejects(() => state().reviewInspection(passing.id, 'APPROVE', ''), 'Approval bypassed quality evidence');
    const proof = { id: 'proof', projectId: project.id, kind: 'QUALITY', status: 'VERIFIED', fields: { inspectionId: passing.id, result: 'PASS' } };
    useStore.setState({controlRecords: [...state().controlRecords, proof]});
    state().reviewInspection(passing.id, 'APPROVE', 'Accepted');
    check(state().inspections.find(i => i.id === passing.id).status === 'COMPLETED', 'Approval did not complete inspection');
  })()`);
  const projectId = await evaluate("(async () => { const {useStore} = await import('/src/store/useStore.ts'); useStore.getState().login('EXECUTIVE_ENGINEER'); return useStore.getState().currentUser.assignedProjectIds[0]; })()");
  await send('Page.navigate', {url: 'http://127.0.0.1:4197/projects/' + projectId + '?tab=inspections'});
  async function until(expression) { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); } throw new Error(expression); }
  await until("Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Add inspection')");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Add inspection').click()");
  await until("!!document.querySelector('[role=dialog] select')");
  assert.equal(await evaluate("document.querySelector('[role=dialog] select').options.length"), 5);
  for (let index = 0; index < 5; index++) {
    const matches = await evaluate(`(async () => {
      const {useStore} = await import('/src/store/useStore.ts');
      const selects = document.querySelectorAll('[role=dialog] select');
      const hospital = selects[0];
      hospital.value = hospital.options[${index}].value;
      hospital.dispatchEvent(new Event('change', {bubbles: true}));
      await new Promise(resolve => setTimeout(resolve, 50));
      const project = useStore.getState().projects.find(p => p.id === hospital.value);
      return selects[2].value === 'DEPUTY_ENGINEER' && selects[3].value === project.siteEngineerId && selects[3].options.length === 2;
    })()`);
    assert.ok(matches, 'Hospital did not automatically select its dedicated JE');
  }
  console.log('Inspection assignment, evidence requirements, permissions, review, reverify, defect and approval checks passed.');
} finally { socket?.close(); browser.kill(); await server.close(); }
