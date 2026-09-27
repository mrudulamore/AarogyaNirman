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

  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate("(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().login('MINISTER');})()");
  await send('Page.navigate',{url:'http://127.0.0.1:4399/dashboard'});
  await until("!!document.querySelector('nav[aria-label=\"Dashboard views\"]')");
  assert.equal(await evaluate("document.querySelectorAll('nav[aria-label=\"Dashboard views\"] button').length"),2);
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Insight Overview').click()");
  await until("!!document.querySelector('[data-testid=insight-overview]')");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Command Center').click()");
  await until("!document.querySelector('[data-testid=insight-overview]')");
  await send('Page.navigate',{url:'http://127.0.0.1:4399/projects'});
  await until("!!document.querySelector('.hospital-project-card')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.hospital-project-card').parentElement).gridTemplateColumns.split(' ').length"),3);
  await evaluate("(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().login('DEPUTY_ENGINEER');})()");
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://127.0.0.1:4399/dashboard'});
  await until("!!document.querySelector('nav[aria-label=\"Dashboard views\"]')");
  assert.equal(await evaluate("document.querySelectorAll('nav[aria-label=\"Dashboard views\"] button').length"),2);
  console.log('PASS: both dashboard tabs switch, three project cards at 1280px, tabs retained for mobile-web engineers.');
}finally{socket?.close();browser.kill();await server.close()}
