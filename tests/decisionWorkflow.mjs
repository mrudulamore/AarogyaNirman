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
  await send('Page.navigate', {url:'http://127.0.0.1:4193/login'});
  await new Promise(r=>setTimeout(r,2000));
  await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts'); window.testStore=useStore; useStore.getState().login('COMMISSIONER');})()`);
  await send('Page.navigate', {url:'http://127.0.0.1:4193/dashboard'});
  async function until(expression) { for(let i=0;i<80;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+expression); }
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Decide')`);
  const count = () => evaluate(`Array.from(document.querySelectorAll('h3')).find(e=>e.textContent.includes('Decision Tracker')).textContent`);
  console.log('Before',await count());
  async function open() {await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Decide').click()`);await until(`!!document.querySelector('[role="dialog"] textarea')`);}
  async function submit() {await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent==='Record Decision').click()`);await new Promise(r=>setTimeout(r,500));}
  await open(); await submit();
  assert.equal(await evaluate(`!!document.querySelector('[role="dialog"]')`),false);
  assert.match(await count(), /10 pending/);
  console.log('After success',await count());
  await open();
  await evaluate(`window.originalSetItem=Storage.prototype.setItem; Storage.prototype.setItem=function(){throw new DOMException('Storage full','QuotaExceededError')}`);
  await submit();
  console.log('Failure state',await evaluate(`({dialog:!!document.querySelector('[role="dialog"]'), text:document.body.innerText.slice(-500)})`));
  assert.equal(await evaluate(`!!document.querySelector('[role="dialog"]')`),true,'Failed save must keep dialog open');
  assert.match(await count(), /10 pending/);
  await evaluate(`Storage.prototype.setItem=window.originalSetItem`);
  await evaluate(`(()=>{const input=document.querySelector('#decision-attachments'); const transfer=new DataTransfer(); transfer.items.add(new File(['%PDF-1.7 test attachment'], 'decision.pdf', {type:'application/pdf'})); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await submit();
  await until(`!document.querySelector('[role="dialog"]')`);
  assert.match(await count(), /9 pending/);
  const saved = await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts'); const {readBillFile}=await import('/src/lib/billAttachments.ts'); const d=useStore.getState().decisions.find(d=>d.attachments?.some(a=>a.name==='decision.pdf')); return {status:d.status,outcome:d.decisionOutcome,bytes:await (await readBillFile(d.attachments[0].id)).text()};})()`);
  assert.equal(saved.status,'DECIDED'); assert.equal(saved.bytes,'%PDF-1.7 test attachment');
  await send('Page.reload');
  await until(`Array.from(document.querySelectorAll('h3')).some(e=>e.textContent.includes('9 pending'))`);
  console.log('Decision success, count, storage failure, retry, attachment bytes and reload persistence passed.');
} finally {socket?.close();browser.kill();await server.close();}
