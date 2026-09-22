import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 4193, strictPort: true }, logLevel: 'error' });
await server.listen();
const profile = await mkdtemp(join(tmpdir(), 'aarogya-browser-test-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9243', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let targets;
  for (let n = 0; n < 40; n++) {
    try { targets = await (await fetch('http://127.0.0.1:9243/json', { signal: AbortSignal.timeout(1000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
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
  await send('Page.navigate',{url:'http://127.0.0.1:4193/login'});
  await new Promise(r=>setTimeout(r,2000));
  const inspection=await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().login('COMMISSIONER');return useStore.getState().inspections.find(i=>i.status==='COMPLETED'&&i.comments);})()`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://127.0.0.1:4193/projects/'+inspection.projectId+'?tab=inspections'});
  async function until(expr){for(let i=0;i<100;i++){if(await evaluate(expr))return;await new Promise(r=>setTimeout(r,100));}throw new Error(expr);}
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='View details')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='View details').click()`);
  await until(`!!document.querySelector('[role="dialog"]')`);
  assert.ok(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Inspector Comments')`));
  assert.equal(await evaluate(`document.querySelectorAll('[role="dialog"] textarea').length`),0);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent==='Close').click()`);
  await until(`!document.querySelector('[role="dialog"]')`);
  await send('Page.navigate',{url:'http://127.0.0.1:4193/quality'});
  await until(`!!document.querySelector('tbody tr')`);
  await evaluate(`document.querySelector('tbody tr').click()`);
  await until(`!!document.querySelector('[role="dialog"]')`);
  console.log('Inspection details open on mobile from project and quality lists, read-only comments and close passed.');
} finally {socket?.close();browser.kill();await server.close();}
