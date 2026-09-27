import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ cacheDir: '.tmp/vite-mobile', server: { host: '127.0.0.1', port: 4201, strictPort: true }, logLevel: 'error' });
await server.listen();
const profile = await mkdtemp(join(tmpdir(), 'aarogya-browser-test-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9251', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let targets;
  for (let n = 0; n < 40; n++) {
    try { targets = await (await fetch('http://127.0.0.1:9251/json', { signal: AbortSignal.timeout(1000) })).json(); if (targets.some(t => t.type === 'page')) break; } catch {}
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
  await send('Page.navigate',{url:'http://127.0.0.1:4201/login'});
  await new Promise(r=>setTimeout(r,2000));
  async function until(expr){for(let i=0;i<120;i++){if(await evaluate(expr))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out '+expr);}
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const role of ['CONTRACTOR','DEPUTY_ENGINEER','PROJECT_MANAGER']) {
    await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().login('${role}');})()`);
    await send('Page.navigate',{url:'http://127.0.0.1:4201/dashboard'});
    await until(`!!document.querySelector('.mobile-task-home')`);
    assert.equal(await evaluate(`!!document.querySelector('button[aria-label="Menu"]')`),false);
    assert.equal(await evaluate(`!!document.querySelector('.recharts-wrapper')`),false);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=390`));
    await evaluate(`document.querySelector('a[href="/field?action=attendance"]').click()`);
    await until(`!!document.querySelector('[role="dialog"]')`);
    assert.ok(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Attendance')`));
    await send('Page.navigate',{url:'http://127.0.0.1:4201/dashboard'});
    await until(`!!document.querySelector('.mobile-task-home')`);
    console.log(role,'mobile home, no charts/menu, attendance shortcut passed');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await until(`!!document.querySelector('.dashboard-insights')`);
  assert.equal(await evaluate(`!!document.querySelector('.mobile-task-home')`),false);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await until(`!!document.querySelector('.mobile-task-home')`);
  const {writeFileSync,mkdirSync}=await import('node:fs'); mkdirSync('.tmp',{recursive:true});
  writeFileSync('.tmp/mobile-field-home.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().login('COMMISSIONER');})()`);
  await until(`!!document.querySelector('.dashboard-insights')`);
  console.log('Desktop resize and oversight dashboard preservation passed.');
} finally {socket?.close();browser.kill();await server.close();}
