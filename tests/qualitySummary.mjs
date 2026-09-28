import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 4399, strictPort: true }, logLevel: 'error' });
await server.listen();
const profile = await mkdtemp(join(tmpdir(), 'aarogya-browser-test-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9399', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let targets;
  for (let n = 0; n < 40; n++) {
    try { targets = await (await fetch('http://127.0.0.1:9399/json', { signal: AbortSignal.timeout(1000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  assert.ok(targets?.length, 'Headless browser did not start');
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  socket.onmessage = event => { const msg = JSON.parse(event.data); if (pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('CDP timeout: ' + method)), 20000); const finish = resolve; resolve = value => { clearTimeout(timer); finish(value); }; const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? JSON.stringify(result.exceptionDetails)); return result.result.value; }
  await send('Page.navigate',{url:'http://127.0.0.1:4399/login'});
  await new Promise(r=>setTimeout(r,2000));

  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression)}
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  console.log('Mobile viewport ready');


  await evaluate(`(async()=>{
    const {default:React}=await import('/node_modules/.vite/deps/react.js');
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=ReactDOM;
    const {QualitySummary}=await import('/src/components/common/QualitySummary.tsx');
    const div=document.createElement('div');div.id='quality-test';document.body.replaceChildren(div);
    window.openedInspection=null;window.openedFailure=null;
    const inspections=[{id:'I1',category:'CIVIL',status:'COMPLETED',overallResult:'PASS',score:90,inspector:'Officer One',scheduledDate:'2026-09-28'},{id:'I2',category:'ELECTRICAL',status:'COMPLETED',overallResult:'FAIL',score:40,inspector:'Officer Two',scheduledDate:'2026-09-28'}];
    const failures=[{id:'F1',severity:'CRITICAL',reinspectionStatus:'PENDING',description:'Repair wiring',location:'Ward A'}];
    const reports=[{id:'R1',reportNo:'QR-1',reportType:'Inspection Report',status:'PENDING',inspector:'Officer One',agency:'PWD',testType:'Site check',date:'2026-09-28',observations:'Review wiring before approval'}];
    createRoot(div).render(React.createElement(QualitySummary,{inspections,failures,reports,score:65,onInspection:id=>window.openedInspection=id,onFailure:id=>window.openedFailure=id}));
  })()`);
  await until("document.querySelectorAll('#quality-test [aria-label=\"Quality summary\"] > button').length===8");
  for(const width of [360,768,1440]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),'No horizontal overflow at '+width);
  }
  await evaluate("document.querySelector('[aria-label=\"Passed: 1\"]').click()");
  await until("!!document.querySelector('[role=dialog]')");
  assert.ok(await evaluate("document.querySelector('[role=dialog]').textContent.includes('Officer One') && !document.querySelector('[role=dialog]').textContent.includes('Officer Two')"));
  await evaluate("Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('Officer One')).click()");
  await until("window.openedInspection==='I1'");
  await evaluate("document.querySelector('[aria-label=\"Conditional Pass: 0\"]').click()");
  await until("document.body.textContent.includes('No matching records')");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await until("!document.querySelector('[role=dialog]')");
  await evaluate("document.querySelector('[aria-label=\"Reports Pending: 1\"]').click()");
  await until("!!document.querySelector('[role=dialog]')");
  await evaluate("Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('QR-1')).click()");
  await until("document.body.textContent.includes('Review wiring before approval')");
  console.log('Eight quality cards: responsive widths, result filter, empty state, inspection action and report details passed.');
} finally {socket?.close();browser.kill();await server.close();}

