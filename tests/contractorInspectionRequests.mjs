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

  await evaluate(`(async () => { const {useStore} = await import('/src/store/useStore.ts'); useStore.getState().login('CONTRACTOR'); })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', {url:'http://127.0.0.1:4197/dashboard'});
  async function until(expression) { for (let n=0;n<100;n++) { if(await evaluate(expression)) return; await new Promise(r=>setTimeout(r,100)); } throw new Error('Timed out: '+expression); }
  await until(`!!document.querySelector('h1')`);
  assert.equal(await evaluate(`!!document.querySelector('[data-testid=inspection-requests]')`), false);
  const projectId = await evaluate(`(async () => {const {useStore}=await import('/src/store/useStore.ts');return useStore.getState().currentUser.assignedProjectIds[0];})()`);
  await send('Page.navigate', {url:'http://127.0.0.1:4197/projects/' + projectId + '?tab=inspections'});
  await until(`Array.from(document.querySelectorAll('button')).some(b => b.textContent === 'Request site inspection')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Request site inspection').click()`);
  await until(`!!document.querySelector('[role=dialog] form')`);
  await evaluate(`(() => { const form=document.querySelector('[role=dialog] form'); for(const [selector,value] of [['input[type=date]','2026-10-01'],['input[type=time]','10:30'],['textarea','Contractor request integration test']]) {const field=form.querySelector(selector);Object.getOwnPropertyDescriptor(field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));} })()`);
  await evaluate(`document.querySelector('[role=dialog] form').requestSubmit()`);
  await until(`!document.querySelector('[role=dialog]')`);
  const request = await evaluate(`(async () => {const {useStore}=await import('/src/store/useStore.ts');const s=useStore.getState();const request=s.inspectionAppointments.find(a=>a.remarks==='Contractor request integration test');if(request.requestedById!==s.currentUser.id || request.status!=='REQUESTED' || request.assignedInspector) throw new Error('Incorrect request identity/status');return request;})()`);
  await evaluate(`(async () => {
    const {useStore}=await import('/src/store/useStore.ts');const {pendingWork}=await import('/src/lib/pendingWork.ts');const state=()=>useStore.getState();
    const rejects=fn=>{let failed=false;try{fn()}catch{failed=true}if(!failed)throw new Error('Unauthorized action accepted')};
    const request=state().inspectionAppointments.find(a=>a.id==='${request.id}');
    const project=state().projects.find(p=>p.id===request.projectId);
    const input={projectId:project.id,sourceRequestId:request.id,category:request.inspectionType,scheduledDate:request.date,scheduledTime:request.time,location:request.site,scope:request.remarks,assignedToId:project.siteEngineerId,inspector:'',comments:''};
    rejects(()=>state().scheduleInspection(input));
    rejects(()=>state().requestAppointment({...request,projectId:state().projects.find(p=>p.contractorId!==project.contractorId).id}));
    state().login('DEPUTY_ENGINEER',project.siteEngineerId);
    rejects(()=>state().scheduleInspection(input));
    rejects(()=>state().scheduleAppointment(request.id,request.date,request.time,'Forged inspector'));
    rejects(()=>state().declineInspectionRequest(request.id,'No'));
    const outside=state().users.find(u=>u.role==='EXECUTIVE_ENGINEER'&&!u.assignedProjectIds.includes(project.id)&&u.id!==project.executiveEngineerId);
    state().login('EXECUTIVE_ENGINEER',outside.id);
    rejects(()=>state().scheduleInspection(input));
    rejects(()=>state().declineInspectionRequest(request.id,'No'));
    state().login('EXECUTIVE_ENGINEER',project.executiveEngineerId);
    if(!pendingWork(state(),'2026-09-24').some(t=>t.id===request.id&&t.ownerRole==='EXECUTIVE_ENGINEER'))throw new Error('Request missing from EE work');
    rejects(()=>state().declineInspectionRequest(request.id,' '));
  })()`);
  await send('Page.navigate',{url:'http://127.0.0.1:4197/dashboard'});
  await until(`!!document.querySelector('[data-request-id="${request.id}"]')`);
  assert.equal(await evaluate(`document.querySelector('[data-testid=inspection-requests] button[aria-expanded]').getAttribute('aria-expanded')`), 'false');
  assert.equal(await evaluate(`document.querySelector('[data-request-id="${request.id}"]').getClientRects().length`), 0);
  await evaluate(`document.querySelector('[data-testid=inspection-requests] button[aria-expanded]').click()`);
  await until(`document.querySelector('[data-testid=inspection-requests] button[aria-expanded]').getAttribute('aria-expanded') === 'true'`);
  assert.ok(await evaluate(`document.querySelector('[data-request-id="${request.id}"]').getClientRects().length > 0`));
  assert.ok(await evaluate(`document.querySelector('[data-request-id="${request.id}"]').textContent.includes('${request.requestedBy}')`));
  await evaluate(`Array.from(document.querySelectorAll('[data-request-id="${request.id}"] button')).find(b=>b.textContent==='Review and assign JE').click()`);
  await until(`!!document.querySelector('[role=dialog] form')`);
  assert.equal(await evaluate(`document.querySelector('[role=dialog] textarea').value`),'Contractor request integration test');
  await evaluate(`document.querySelector('[role=dialog] form').requestSubmit()`);
  await until(`!document.querySelector('[role=dialog]')`);
  await evaluate(`(async () => {
    const {useStore}=await import('/src/store/useStore.ts');const state=()=>useStore.getState();const {saveBillFiles}=await import('/src/lib/billAttachments.ts');
    const request=state().inspectionAppointments.find(a=>a.id==='${request.id}');const project=state().projects.find(p=>p.id===request.projectId);const inspection=state().inspections.find(i=>i.id===request.linkedInspectionId);
    if(request.status!=='SCHEDULED'||inspection.assignedToId!==project.siteEngineerId||request.assignedById!==state().currentUser.id||request.requestedBy!=='${request.requestedBy}')throw new Error('EE allocation did not link request and correct people');
    let duplicate=false;try{state().scheduleInspection({...inspection})}catch{duplicate=true}if(!duplicate)throw new Error('Duplicate allocation accepted');
    state().login('DEPUTY_ENGINEER',project.siteEngineerId);state().startInspection(inspection.id);
    const docs=await saveBillFiles([{file:new File(['%PDF-1.4 test'],'request.pdf',{type:'application/pdf'}),category:'SUPPORTING'}]);state().setInspectionDocuments(inspection.id,docs);
    state().submitInspection(inspection.id,[{id:'check',requirement:'Readiness',measurement:'',standard:'Site',result:'FAIL',remarks:'Repair required',evidence:''}],'FAIL','Repair required');
    state().login('EXECUTIVE_ENGINEER',project.executiveEngineerId);state().reviewInspection(inspection.id,'RAISE_DEFECT','Repair required');
    if(state().inspectionAppointments.find(a=>a.id===request.id).status!=='COMPLETED')throw new Error('Request did not complete after review');
    state().login('CONTRACTOR');const second=state().requestAppointment({...request,remarks:'Decline test'});
    state().login('EXECUTIVE_ENGINEER',project.executiveEngineerId);state().declineInspectionRequest(second.id,'Site is not ready');
    if(state().inspectionAppointments.find(a=>a.id===second.id).reviewReason!=='Site is not ready')throw new Error('Decline reason lost');
    state().login('CONTRACTOR');await useStore.persist.rehydrate();
    if(state().inspectionAppointments.find(a=>a.id===request.id).status!=='COMPLETED')throw new Error('Request status lost on reload');
  })()`);
  await send('Page.navigate',{url:'http://127.0.0.1:4197/projects/' + projectId + '?tab=inspections'});
  await until(`!!document.querySelector('[data-request-id="${request.id}"]')`);
  assert.ok(await evaluate(`document.querySelector('[data-request-id="${request.id}"]').textContent.toLowerCase().includes('completed')`));
  assert.ok(await evaluate('document.documentElement.scrollWidth <= 390'));
  console.log('Contractor request form, EE inbox, scoped permissions, allocation, duplicate prevention, document review, decline and reload passed.');
} finally { socket?.close(); browser.kill(); await server.close(); }
