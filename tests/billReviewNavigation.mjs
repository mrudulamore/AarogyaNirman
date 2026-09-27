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


  const bill=await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().login('SUPERADMIN');return useStore.getState().bills[0]})()`);
  for(const source of ['/dashboard?filter=bills','/finance']){
    await send('Page.navigate',{url:'http://127.0.0.1:4399'+source});
    await until("document.readyState==='complete'");
    const query=await evaluate(`(async()=>{const {billReviewQuery}=await import('/src/lib/billReviewNavigation.ts');return billReviewQuery('${bill.id}')})()`);
    await send('Page.navigate',{url:'http://127.0.0.1:4399/projects/'+bill.projectId+'?tab=finance'+query});
    await until("!!document.querySelector('[role=dialog] [aria-label=Close]')");
    await evaluate("document.querySelector('[role=dialog] [aria-label=Close]').click()");
    await until('location.pathname+location.search==='+JSON.stringify(source));
  }
  await send('Page.navigate',{url:'http://127.0.0.1:4399/projects/'+bill.projectId+'?tab=finance&bill='+bill.id});
  await until("!!document.querySelector('[role=dialog] [aria-label=Close]')");
  await evaluate("document.querySelector('[role=dialog] [aria-label=Close]').click()");
  await until("!new URLSearchParams(location.search).has('bill')");
  assert.equal(await evaluate('location.pathname'),'/projects/'+bill.projectId);
  console.log('Bill review close returns to origin, preserves query filters, and keeps direct project reviews in the project.');
}finally{socket?.close();browser.kill();await server.close()}
