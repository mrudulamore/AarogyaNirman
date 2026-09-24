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

  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression)}
  async function login(role){await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().login('${role}');})()`);await send('Page.navigate',{url:'http://127.0.0.1:4197/project-proposals'});await until(`document.body.textContent.includes('Project creation & approval')`)}
  async function click(text){await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='${text}').click()`)}
  async function fill(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`)}
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await login('MINISTER');await click('Use demo template: Satara');await until(`!!document.querySelector('[role=dialog] input[type=file]')`);
  await evaluate(`(()=>{const input=document.querySelector('[role=dialog] input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File(['%PDF-1.4 proposal evidence'],'proposal.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(`document.querySelector('[role=dialog]').textContent.includes('proposal.pdf') && !Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Submit for scrutiny').disabled`);
  await click('Submit for scrutiny');await until(`!document.querySelector('[role=dialog]')`);
  for(const role of ['COMMISSIONER','CHIEF_ENGINEER','SUPERINTENDING_ENGINEER','EXECUTIVE_ENGINEER']){
    await login(role);await until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Review proposal')`);await click('Review proposal');await until(`!!document.querySelector('[role=dialog] textarea')`);await fill('[role=dialog] textarea','Documents and estimate verified');
    if(role==='SUPERINTENDING_ENGINEER')await evaluate(`(()=>{const select=document.querySelector('[role=dialog] select');select.value=select.options[1].value;select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    if(role==='EXECUTIVE_ENGINEER')await fill('[role=dialog] input','TS/PUNE/2026/101');
    await click(role==='EXECUTIVE_ENGINEER'?'Sanction & create project':role==='SUPERINTENDING_ENGINEER'?'Assign to division / EE':'Approve & forward');await until(`!document.querySelector('[role=dialog]')`);
  }
  await until(`document.body.textContent.includes('Project approved')`);
  assert.ok(await evaluate(`!!Array.from(document.querySelectorAll('a')).find(a=>a.textContent==='Open approved project')`));
  assert.ok(await evaluate('document.documentElement.scrollWidth<=390'));
  await send('Page.reload');await until(`document.body.textContent.includes('Project approved')`);
  assert.ok(await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts');const s=useStore.getState();const p=s.proposals[0];return p.history.filter(h=>h.action==='APPROVE').length===4&&s.projects.some(project=>project.id===p.projectId&&project.district==='Satara');})()`));
  await evaluate(`Array.from(document.querySelectorAll('a')).find(a=>a.textContent==='Open approved project').click()`);
  await until(`document.body.textContent.includes('Proposed Rural Hospital Extension')`);
  assert.equal(await evaluate(`document.body.textContent.includes('This page could not be opened') || document.body.textContent.includes('NaN')`), false);
  console.log('Mobile Ministry template + PDF upload, all four reviewer screens, EE sanction, approved project link and reload passed.');
}finally{socket?.close();browser.kill();await server.close()}
