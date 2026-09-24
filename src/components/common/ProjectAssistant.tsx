import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Maximize2, Minimize2, MessageCircle, Send, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { answerProjectQuestion, type AssistantAnswer } from '../../lib/projectAssistant';
import { todayDate } from '../../lib/fundDisbursal';

const SUGGESTIONS = [
  { label: 'Sanctioned amount', question: 'What is the sanctioned amount?' },
  { label: 'Overview', question: 'Give me a project overview' },
  { label: 'Finance', question: 'Show me the financial position' },
  { label: 'Inspections', question: 'How many inspections are pending?' },
  { label: 'Progress', question: 'Show physical progress' },
  { label: 'Completion date', question: 'What is the planned completion date?' },
  { label: 'Delayed milestones', question: 'What milestones are delayed?' },
  { label: 'Pending bills', question: 'Show pending bills' },
  { label: 'Funds available', question: 'Show the available balance' },
  { label: 'Open defects', question: 'Show open defects' },
  { label: 'Latest inspection', question: 'Show the latest inspection' },
  { label: 'Open risks', question: 'Show open risks' },
  { label: 'Approvals', question: 'Show approvals' },
  { label: 'Technical sanction', question: 'Show the Technical Sanction' },
  { label: 'Work order', question: 'Show the work order' },
];
function answerPreview(answer: AssistantAnswer): string[] {
  if (answer.directAnswer) return [];
  if (answer.sections.some(section => section.title === 'At a glance')) return [];
  const finance = answer.sections.find(section => section.title === 'Finance');
  if (finance?.rows?.length === 1) {
    const row = finance.rows[0];
    return [`Released (recorded): ${row[2]}`, `Spent (recorded): ${row[3]}`, `Balance: ${row[8]}`];
  }
  const first = answer.sections.find(section => section.title !== 'Record inconsistencies');
  if (first?.lines) return first.lines.slice(0, 3);
  if (first?.rows) return [first.rows.length ? `${first.rows.length} matching records. Open details to view them.` : 'No matching records.'];
  return [];
}
export function ProjectAssistant() {
  const state = useStore();
  const location = useLocation();
  const { projects } = useProjectScope();
  const user = state.currentUser;
  if (!user || user.role === 'WORKFORCE' || !(state.rolePermissions[user.role] ?? []).includes('projects')) return null;
  const accessKey = `${user.id}:${user.role}:${(state.rolePermissions[user.role] ?? []).join(',')}:${projects.map(p => p.id).join(',')}:${location.pathname}`;
  const pageId = location.pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  const initial = projects.some(p => p.id === pageId) ? pageId! : projects.length === 1 ? projects[0].id : '';
  return <AssistantPanel key={accessKey} initial={initial} />;
}
function AssistantPanel({ initial }: { initial: string }) {
  const { projects } = useProjectScope();
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [selection, setSelection] = useState(initial);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ question: string; answer: AssistantAnswer }[]>([]);
  const conversation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = conversation.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [messages, open]);
  function ask(value: string) {
    if (!value.trim()) return;
    const answer = answerProjectQuestion(useStore.getState(), value, selection, todayDate());
    setMessages(previous => [...previous.slice(-9), { question: value, answer }]);
    setQuestion('');
  }
  return <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
    <Dialog.Trigger asChild>
      <button type="button" aria-label="Open AI Assistant" title="AI Assistant" className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-700 to-govblue-600 text-white shadow-lg shadow-govblue-900/20 transition-colors hover:bg-govblue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-govblue-300" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <MessageCircle size={24} aria-hidden="true" />
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      {open && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[3px]" />}
      <Dialog.Content onInteractOutside={event => event.preventDefault()} className={`fixed z-50 flex flex-col overflow-hidden border border-white/70 bg-white/90 backdrop-blur-xl shadow-2xl focus:outline-none ${maximized ? 'left-1/2 top-1/2 h-[720px] max-h-[calc(100dvh-3rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl' : 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-3 h-[560px] max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] w-[calc(100vw-1.5rem)] rounded-2xl sm:w-[380px]'}`}>
        <header className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-navy-800 to-govblue-700 px-4 py-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Bot size={22} aria-hidden="true" /></span>
          <div className="flex-1">
            <Dialog.Title className="text-sm font-semibold">AI Assistant</Dialog.Title>
            <Dialog.Description className="mt-0.5 text-xs text-govblue-100">Ask about your projects</Dialog.Description>
          </div>
          <button type="button" onClick={() => setMaximized(value => !value)} aria-label={maximized ? 'Restore chatbot size' : 'Maximize chatbot'} title={maximized ? 'Restore size' : 'Maximize'} aria-pressed={maximized} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white">
            {maximized ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
          </button>
          <Dialog.Close aria-label="Close assistant" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"><X size={18} /></Dialog.Close>
        </header>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <select aria-label="Assistant project context" value={selection} onChange={event => { setSelection(event.target.value); setMessages([]); }} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-govblue-500 focus:outline-none focus:ring-2 focus:ring-govblue-100">
            <option value="">Choose a project</option><option value="all">All accessible projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div ref={conversation} role="log" aria-label="AI Assistant conversation" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-50/80 p-4">
          {!messages.length && <div className="pt-6">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-govblue-100 bg-govblue-50 text-govblue-800"><Bot size={24} aria-hidden="true" /></span>
            <p className="text-base font-semibold text-slate-800">How can I help?</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Choose a project and ask a question, or try a topic below.</p>
          </div>}
          {messages.map((message, index) => <article key={index} className="space-y-3 text-sm">
            <div className="flex justify-end"><p className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-govblue-800 px-3 py-2.5 text-white">{message.question}</p></div>
            <div className="space-y-3 rounded-2xl rounded-bl-sm border border-slate-200/80 bg-white p-3 leading-relaxed text-slate-700">
              <p className="font-medium text-slate-900">{message.answer.summary}</p>
              {answerPreview(message.answer).map((line, n) => <p key={n}>{line}</p>)}
              {message.answer.sections.filter(s => s.title === 'At a glance' || s.title === 'Record inconsistencies').map((section, n) => <div key={n} className={section.title === 'Record inconsistencies' ? 'rounded-lg bg-amber-50 p-2 text-xs text-amber-900' : 'space-y-1'}>{section.lines?.map((line, k) => <p key={k}>{line}</p>)}</div>)}
              {message.answer.sections.some(s => s.title !== 'At a glance' && s.title !== 'Record inconsistencies' && s.title !== 'Calculation sources') && <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-govblue-700">View details</summary>
                <div className="mt-3 space-y-4">{message.answer.sections.filter(s => s.title !== 'Record inconsistencies' && s.title !== 'Calculation sources').map((section, n) => <section key={n} className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800">{section.title}</h3>
                  {section.lines?.map((line, k) => <p key={k} className="text-xs text-slate-600">{line}</p>)}
                  {section.columns && (section.rows?.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={section.title}><table className="w-full text-left text-xs"><thead><tr>{section.columns.map((column, k) => <th key={k} scope="col" className="border-b bg-slate-50 p-2">{column}</th>)}</tr></thead><tbody>{section.rows.map((row, k) => <tr key={k}>{row.map((cell, j) => <td key={j} className="min-w-24 border-b p-2 align-top">{cell}</td>)}</tr>)}</tbody></table></div> : <p className="text-xs text-slate-500">No matching records.</p>)}
                </section>)}</div>
              </details>}
            </div>
          </article>)}
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white p-3">
          <div aria-label="Suggested questions" className="mb-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto overscroll-contain">{SUGGESTIONS.map(item => <button key={item.label} type="button" title={item.question} onClick={() => ask(item.question)} className="min-h-9 shrink-0 rounded-full border border-slate-200 px-3 text-xs text-slate-600 transition-colors hover:border-govblue-200 hover:bg-govblue-50 hover:text-govblue-800">{item.label}</button>)}</div>
          <form onSubmit={event => { event.preventDefault(); ask(question); }} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-govblue-400 focus-within:ring-2 focus-within:ring-govblue-100">
            <input aria-label="Ask a project question" maxLength={600} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about your project..." className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
            <button type="submit" disabled={!question.trim()} aria-label="Send question" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-govblue-800 text-white hover:bg-govblue-900 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden="true" /></button>
          </form>
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400"><span>Local records only · Read-only</span>{!!messages.length && <button type="button" onClick={() => setMessages([])} className="py-1 text-slate-500 hover:text-govblue-800">Clear chat</button>}</div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}




