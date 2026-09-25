import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Maximize2, Minimize2, Mic, Send, Sparkles, Square, Volume2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useStore } from '../../store/useStore';
import { useProjectScope } from '../../lib/scope';
import { answerProjectQuestion, canUseProjectAssistant, type AssistantAnswer } from '../../lib/projectAssistant';
import { todayDate } from '../../lib/fundDisbursal';
import { useAssistantVoice } from '../../lib/useAssistantVoice';
import './ProjectAssistant.css';
import { assistantText, assistantSummary, assistantLocales, type AssistantLanguage } from '../../lib/assistantLanguages';
import i18n from '../../i18n';

function BotAvatar({ large = false, listening = false }: { large?: boolean; listening?: boolean }) {
  return <span aria-hidden="true" className={`nirman-avatar ${large ? 'nirman-avatar-large' : ''} ${listening ? 'nirman-avatar-listening' : ''}`}>
    <span className="nirman-antenna" /><span className="nirman-face"><span className="nirman-eyes"><i /><i /></span><span className="nirman-smile" /></span>
  </span>;
}

const SUGGESTIONS = [
  { label: 'Sanctioned amount', question: 'What is the sanctioned amount?' },
  { label: 'Inspections', question: 'How many inspections are pending?' },
  { label: 'Progress', question: 'Show physical progress' },
  { label: 'Completion date', question: 'What is the planned completion date?' },
  { label: 'Funds available', question: 'Show the available balance' },
  { label: 'Overview', question: 'Give me a project overview' },
  { label: 'Released funds', question: 'How much funding has been released?' },
  { label: 'Expenditure', question: 'How much has been spent?' },
  { label: 'Pending bills', question: 'Show pending bills' },
  { label: 'Delayed milestones', question: 'What milestones are delayed?' },
  { label: 'Open defects', question: 'Show open defects' },
  { label: 'Latest inspection', question: 'Show the latest inspection' },
  { label: 'Open risks', question: 'Show open risks' },
  { label: 'Approvals', question: 'Show approvals' },
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
  if (!user || !canUseProjectAssistant(state)) return null;
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
  const [language, setLanguage] = useState<AssistantLanguage>(() => { const lang = i18n.resolvedLanguage?.split('-')[0]; return lang === 'hi' || lang === 'mr' ? lang : 'en'; });
  const t = (text: string) => assistantText(text, language);
  const voice = useAssistantVoice(open, selection, setQuestion, assistantLocales[language]);
  const conversation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = conversation.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [messages, open]);
  function ask(value: string) {
    if (!value.trim()) return;
    voice.stopListening();
    voice.stopSpeaking();
    const answer = answerProjectQuestion(useStore.getState(), value, selection, todayDate());
    setMessages(previous => [...previous.slice(-9), { question: value, answer }]);
    setQuestion('');
  }
  return <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
    <Dialog.Trigger asChild>
      <button type="button" aria-label="Open AI Assistant" title="Ask Nirman" className="nirman-launcher fixed right-4 z-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <BotAvatar /><span className="hidden sm:block text-left"><span className="block text-[10px] font-medium text-blue-100">{t("YOUR PROJECT GUIDE")}</span><span className="text-sm font-semibold">{t("Ask Nirman")}</span></span><Sparkles size={16} aria-hidden="true" />
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      {open && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[3px]" />}
      <Dialog.Content lang={language} onInteractOutside={event => event.preventDefault()} className={`nirman-panel fixed z-50 flex flex-col overflow-hidden bg-white focus:outline-none ${maximized ? 'left-1/2 top-1/2 h-[780px] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2' : 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-3 h-[690px] max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] w-[calc(100vw-1.5rem)] sm:w-[420px]'}`}>
        <header className="nirman-header flex shrink-0 items-center gap-3 px-5 py-4 text-white">
          <BotAvatar listening={voice.listening} />
          <div className="flex-1">
            <Dialog.Title className="text-lg font-semibold tracking-tight">Nirman <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 align-middle text-[10px] font-medium tracking-wide">{t("AI GUIDE")}</span></Dialog.Title>
            <Dialog.Description className="mt-1 flex items-center gap-1.5 text-xs text-blue-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />{t("Your project companion")}</Dialog.Description>
          </div>
          <button type="button" onClick={() => setMaximized(value => !value)} aria-label={maximized ? 'Restore chatbot size' : 'Maximize chatbot'} title={maximized ? 'Restore size' : 'Maximize'} aria-pressed={maximized} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white">
            {maximized ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
          </button>
          <Dialog.Close aria-label={t("Close assistant")} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"><X size={18} /></Dialog.Close>
        </header>
        <div className="shrink-0 border-b border-blue-50 bg-white px-5 py-3">
          <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">English / हिंदी / मराठी</span><select aria-label="Assistant language" value={language} onChange={event => { setLanguage(event.target.value as AssistantLanguage); setQuestion(''); }} className="min-h-9 rounded-lg border border-blue-100 bg-white px-2 text-xs text-blue-800"><option value="en">English</option><option value="hi">हिंदी</option><option value="mr">मराठी</option></select></div><label htmlFor="nirman-project" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{t("Explore your project")}</label>
          <select id="nirman-project" aria-label="Assistant project context" value={selection} onChange={event => { setSelection(event.target.value); setMessages([]); setQuestion(''); }} className="min-h-11 w-full rounded-xl border border-blue-100 bg-blue-50/50 px-3 text-sm text-slate-700 focus:border-govblue-500 focus:outline-none focus:ring-2 focus:ring-govblue-100">
            <option value="">{t("Choose a project")}</option><option value="all">{t("All accessible projects")}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div ref={conversation} role="log" aria-label="AI Assistant conversation" aria-live="polite" aria-relevant="additions" className="nirman-body min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          {!messages.length && <div className="nirman-welcome text-center">
            <div className="nirman-orbit"><BotAvatar large listening={voice.listening} /><Sparkles className="nirman-sparkle" size={19} aria-hidden="true" /></div>
            <p className="mt-3 text-[22px] font-semibold tracking-tight text-slate-800">{t('Hi, I’m Nirman.')}</p>
            <p className="mx-auto mt-2 max-w-64 text-sm leading-relaxed text-slate-500">{t('Let’s make your project easier to understand. What would you like to know?')}</p>
            {voice.canListen && <button type="button" onClick={voice.toggleListening} aria-pressed={voice.listening} className="nirman-talk mt-4"><Mic size={17} />{t(voice.listening ? 'Listening… Tap to stop' : 'Talk to Nirman')}</button>}
          </div>}
          {!messages.length && <div className="space-y-2"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{t("A few things you can ask")}</p><div aria-label="Demo questions" className="grid gap-2">{SUGGESTIONS.map((item, index) => <button key={t(item.label)} type="button" onClick={() => ask(t(item.question))} className="nirman-prompt"><span className="nirman-prompt-number">{String(index + 1).padStart(2, '0')}</span><span className="flex-1">{t(item.question)}</span><span aria-hidden="true" className="text-blue-500">↗</span></button>)}</div></div>}
          {messages.map((message, index) => <article key={index} className="space-y-3 text-sm">
            <div className="flex justify-end"><p className="nirman-question max-w-[90%] whitespace-pre-wrap break-words px-4 py-3 text-white">{message.question}</p></div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-blue-700"><Bot size={16} />Nirman<span className="font-normal text-slate-400">· {t('Project insight')}</span></div>
            <div className="nirman-answer space-y-3 p-4 leading-relaxed text-slate-700">
              <p className="whitespace-pre-wrap font-medium text-slate-900">{assistantSummary(message.answer, message.question, language)}</p>
              {voice.canSpeak && <button type="button" onClick={() => voice.readAnswer([assistantSummary(message.answer, message.question, language), ...(language === 'en' ? answerPreview(message.answer) : [])].join('. '))} className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-govblue-700"><Volume2 size={15} />{t("Read answer aloud")}</button>}
              {language === 'en' && answerPreview(message.answer).map((line, n) => <p key={n}>{t(line)}</p>)}
              {message.answer.sections.filter(s => s.title === 'At a glance' || s.title === 'Record inconsistencies').map((section, n) => <div key={n} className={section.title === 'Record inconsistencies' ? 'rounded-lg bg-amber-50 p-2 text-xs text-amber-900' : 'space-y-1'}>{section.lines?.map((line, k) => <p key={k}>{t(line)}</p>)}</div>)}
              {message.answer.sections.some(s => s.title !== 'At a glance' && s.title !== 'Record inconsistencies' && s.title !== 'Calculation sources') && <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-govblue-700">{t("View details")}</summary>
                <div className="mt-3 space-y-4">{language !== 'en' && <p className="text-xs text-slate-500">{t('Some detailed records are shown in their original language.')}</p>}{message.answer.sections.filter(s => s.title !== 'Record inconsistencies' && s.title !== 'Calculation sources').map((section, n) => <section key={n} className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800">{t(section.title)}</h3>
                  {section.lines?.map((line, k) => <p key={k} className="text-xs text-slate-600">{t(line)}</p>)}
                  {section.columns && (section.rows?.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={section.title}><table className="w-full text-left text-xs"><thead><tr>{section.columns.map((column, k) => <th key={k} scope="col" className="border-b bg-slate-50 p-2">{t(column)}</th>)}</tr></thead><tbody>{section.rows.map((row, k) => <tr key={k}>{row.map((cell, j) => <td key={j} className="min-w-24 border-b p-2 align-top">{t(cell)}</td>)}</tr>)}</tbody></table></div> : <p className="text-xs text-slate-500">{t("No matching records.")}</p>)}
                </section>)}</div>
              </details>}
            </div>
          </article>)}
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white px-5 pb-4 pt-3">
          {!!messages.length && <div aria-label="Suggested questions" className="mb-3 flex gap-2 overflow-x-auto pb-1">{SUGGESTIONS.map(item => <button key={t(item.label)} title={t(item.question)} type="button" onClick={() => ask(t(item.question))} className="min-h-9 shrink-0 rounded-full border border-blue-100 bg-blue-50/50 px-3 text-xs text-blue-700 hover:bg-blue-100">{t(item.label)}</button>)}</div>}
          <form onSubmit={event => { event.preventDefault(); ask(question); }} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-govblue-400 focus-within:ring-2 focus-within:ring-govblue-100">
            <input aria-label="Ask a project question" maxLength={600} value={question} onChange={event => setQuestion(event.target.value)} placeholder={t('Ask Nirman anything about your project…')} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
            {voice.canListen && <button type="button" onClick={voice.toggleListening} aria-label={t(voice.listening ? 'Stop microphone' : 'Ask with microphone')} aria-pressed={voice.listening} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${voice.listening ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>{voice.listening ? <Square size={17} /> : <Mic size={17} />}</button>}
            <button type="submit" disabled={!question.trim()} aria-label={t("Send question")} className="nirman-send flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden="true" /></button>
          </form>
          <p role="status" className="mt-2 text-[11px] text-slate-500">{t(voice.status || (voice.canListen ? 'Your browser may send audio to its speech service.' : 'Voice input is not supported in this browser. Type or select a demo question.'))}</p>
          {voice.speaking && <button type="button" onClick={voice.stopSpeaking} className="mt-1 inline-flex min-h-9 items-center gap-2 text-xs text-govblue-700"><Square size={14} />{t("Stop reading")}</button>}
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400"><span className="flex items-center gap-1"><Sparkles size={11} />{t('Aarogya Nirman · Project records only')}</span>{!!messages.length && <button type="button" onClick={() => { voice.stopSpeaking(); voice.stopListening(); setMessages([]); }} className="min-h-8 text-slate-500 hover:text-govblue-800">{t("Start fresh")}</button>}</div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}




