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

  await evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { createRoot } = ReactDOM;
    const { useAssistantVoice } = await import('/src/lib/useAssistantVoice.ts');
    const check = (value, message) => { if (!value) throw new Error(message); };
    const tick = () => new Promise(resolve => setTimeout(resolve, 50));
    let active, api, transcript, spoken, canceled = 0;
    window.SpeechRecognition = class {
      constructor() { active = this; }
      start() {}
      abort() { this.aborted = true; }
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speak(value) { spoken = value; }, cancel() { canceled++; }
    }});
    function Harness({open, context}) {
      api = useAssistantVoice(open, context, text => { transcript = text; });
      return null;
    }
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    const render = async (open = true, context = 'project-a') => { root.render(React.createElement(Harness, {open, context})); await tick(); };
    await render();
    check(api.canListen && api.canSpeak, 'Voice capabilities missing');
    api.toggleListening(); await tick();
    check(api.listening && active.lang === 'en-IN', 'Microphone did not start');
    active.onresult({results: [[{transcript: 'What is the sanctioned amount?'}]]}); active.onend(); await tick();
    check(transcript === 'What is the sanctioned amount?' && !api.listening, 'Transcript was not captured');
    api.toggleListening(); await tick(); active.onerror({error: 'not-allowed'}); await tick();
    check(!api.listening && api.status.includes('denied'), 'Permission denial did not allow fallback');
    api.readAnswer('Budget is recorded.'); await tick();
    check(api.speaking && spoken.text === 'Budget is recorded.', 'Read aloud failed');
    api.stopSpeaking(); await tick(); check(!api.speaking && canceled === 1, 'Stop audio failed');
    api.toggleListening(); await tick(); const stale = active;
    await render(true, 'project-b');
    check(stale.aborted && stale.onresult === null && !api.listening, 'Context switch left microphone running');
    api.readAnswer('Another answer'); await tick(); await render(false, 'project-b');
    check(!api.speaking && canceled === 2, 'Close left audio playing');
    window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined;
    await render(); check(!api.canListen, 'Unsupported browser not detected');
    root.unmount();
  })()`);
  console.log('Voice capture, permission fallback, speech playback, stop, context cleanup, close cleanup, and unsupported-browser checks passed.');
} finally { socket?.close(); browser.kill(); await server.close(); }
