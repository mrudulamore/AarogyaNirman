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

  await evaluate(`(async () => { const {useStore} = await import('/src/store/useStore.ts'); useStore.getState().login('MINISTER'); })()`);
  await send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: 'http://127.0.0.1:4197/dashboard'});
  await new Promise(resolve => setTimeout(resolve, 2500));

  const pause = () => new Promise(r => setTimeout(r, 200));
  const rect = selector => evaluate(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()`);
  async function move(selector, dx, dy) {
    const r = await rect(selector);
    const x = r.x + 25, y = r.y + 25;
    await send('Input.dispatchMouseEvent', {type:'mousePressed',x,y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:x+dx,y:y+dy,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:x+dx,y:y+dy,button:'left',clickCount:1});
    await pause();
  }
  const before = await rect('.nirman-launcher');
  await move('.nirman-launcher', -250, -150);
  const after = await rect('.nirman-launcher');
  assert.ok(after.x < before.x - 200 && after.y < before.y - 100, 'Launcher moves');
  assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"), false, 'Dragging must not open chat');
  await evaluate("document.querySelector('.nirman-launcher').click()");
  await pause();
  const panelBefore = await rect('.nirman-panel');
  await move('.nirman-header', -200, -80);
  const panelAfter = await rect('.nirman-panel');
  assert.ok(panelAfter.x < panelBefore.x - 150, 'Panel moves from header');
  await evaluate("document.querySelector('[aria-label=\"Maximize chatbot\"]').click()");
  await pause();
  assert.ok((await rect('.nirman-panel')).width > 700, 'Maximize works');
  await evaluate("document.querySelector('[aria-label=\"Restore chatbot size\"]').click()");
  await pause();
  assert.ok(Math.abs((await rect('.nirman-panel')).x - panelAfter.x) < 2, 'Restore keeps position');
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await pause();
  for (const selector of ['.nirman-launcher', '.nirman-panel']) {
    const r = await rect(selector);
    assert.ok(r.x >= 0 && r.y >= 0 && r.x+r.width <=390 && r.y+r.height <=844, selector + ' remains in viewport');
  }
  console.log('PASS: drag launcher and panel, click suppression, maximize/restore, mobile resize bounds');
} finally { socket?.close(); browser.kill(); await server.close(); }
