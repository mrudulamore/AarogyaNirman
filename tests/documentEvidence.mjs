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

  const result=await evaluate(`(async()=>{
    const {useStore}=await import('/src/store/useStore.ts');
    const {saveBillFiles,readBillFile}=await import('/src/lib/billAttachments.ts');
    const {withSampleDocuments,sampleDocumentBlob}=await import('/src/lib/sampleDocuments.ts');
    await useStore.persist.rehydrate();
    const state=useStore.getState();
    for (const key of ['bills','documents','defects']) {
      const row=state[key].find(row=>row.attachments?.[0]?.sample);
      if(!row)throw Error('Missing sample '+key);
      const blob=await sampleDocumentBlob(row.attachments[0].sample);
      if(!(await blob.text()).startsWith('%PDF-'))throw Error('Invalid sample PDF');
    }
    const bill=state.bills.find(row=>row.attachments?.[0]?.sample);
    const original=withSampleDocuments({...state,bills:[{...bill,attachments:[{id:'real-file'}]},{...bill,id:'user-created',attachments:[]}]},state);
    if(original.bills[0].attachments[0].id!=='real-file'||original.bills[1].attachments.length)throw Error('Samples must preserve uploads and exclude new records');

    const {jsPDF}=await import('/node_modules/jspdf/dist/jspdf.es.min.js');
    const pdf=new jsPDF();pdf.text('Evidence page one',20,20);pdf.addPage();pdf.text('Evidence page two',20,20);
    const file=new File([pdf.output('blob')],'proof.pdf',{type:'application/pdf'});
    const attachments=await saveBillFiles([{file,category:'SUPPORTING'}]);
    useStore.getState().login('DEPUTY_ENGINEER');const user=useStore.getState().currentUser;
    const p=useStore.getState().projects.find(p=>user.assignedProjectIds.includes(p.id));
    const defect=useStore.getState().createDefect({projectId:p.id,location:'Ward',category:'CIVIL',severity:'MEDIUM',description:'Evidence test',imageSeed:0,reportedBy:user.name,contractorId:p.contractorId,dueDate:'2026-10-30',attachments});
    window.evidenceTest={id:defect.id,attachment:attachments[0],size:file.size};
    const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=ReactDOM;const {PdfPreview}=await import('/src/components/common/PdfPreview.tsx');
    const div=document.createElement('div');document.body.appendChild(div);createRoot(div).render(React.createElement(PdfPreview,{url:URL.createObjectURL(await readBillFile(attachments[0].id))}));
    return {id:defect.id,size:file.size};
  })()`);
  await until("!!document.querySelector('canvas') && document.querySelector('canvas').width>0 && !document.body.textContent.includes('Loading...')");
  assert.ok(await evaluate("document.body.textContent.includes('1 / 2')"));
  await evaluate("document.querySelector('[aria-label=Next]').click()");
  await until("document.body.textContent.includes('2 / 2')");
  const saved=await evaluate(`(async()=>{const {useStore}=await import('/src/store/useStore.ts');await useStore.persist.rehydrate();const d=useStore.getState().defects.find(d=>d.id==='${result.id}');const {readBillFile}=await import('/src/lib/billAttachments.ts');return {count:d.attachments.length,size:(await readBillFile(d.attachments[0].id)).size};})()`);
  assert.equal(saved.count,1);assert.equal(saved.size,result.size);
  console.log('Demo sample PDFs generated; uploads preserved. Real defect attachment persists; PDF canvas renders and page navigation works.');
}finally{socket?.close();browser.kill();await server.close()}
