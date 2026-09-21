import { BrandLogo } from '../../components/common/BrandLogo';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import {
  Landmark, ShieldCheck, ArrowRight, Quote, Activity, Wallet, ClipboardCheck, KeyRound, Building2, MapPinned, Layers,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { ROLE_LABELS, ALL_DISTRICTS } from '../../lib/constants';
import { cn } from '../../lib/utils';

/** Feature cards share a restrained hover treatment. */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('landing-feature', className)}>{children}</div>;
}

/** Fades + lifts a section in the first time it scrolls into view — keeps the page feeling
 * alive on scroll, not just on first paint. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  useUiLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { setVisible(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn('landing-reveal transition-all duration-700 ease-out', visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)}
    >
      {children}
    </div>
  );
}

/** Animates a stat's leading integer counting up from 0 on mount; non-numeric values
 * ("4-Stage") render as-is with no animation. */
function Counter({ value }: { value: string }) {
  useUiLanguage();
  const match = value.match(/^(\d+)(\+?)$/);
  const [display, setDisplay] = useState<string>(match ? '0' : value);

  useEffect(() => {
    if (!match) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplay(value); return; }
    const target = parseInt(match[1], 10);
    const suffix = match[2];
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    function tick(now: number) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${Math.round(eased * target)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{uiText(display)}</>;
}

function HospitalIllustration({ stats }: { stats: { icon: LucideIcon; value: string; label: string }[] }) {
  return <div className="landing-hospital overflow-hidden rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-6 text-white shadow-2xl shadow-blue-900/20 sm:p-8">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-200">{uiText('Hospital infrastructure')}</p>
    <div className="hospital-buildings relative mt-6 flex h-44 items-end justify-center gap-2 border-b border-white/20 pb-0" aria-hidden="true">
      {[0,1,2].map(i=><div key={i} className={`relative grid grid-cols-3 gap-3 rounded-t-2xl border border-white/30 bg-white/10 p-4 ${i===1?'h-44 w-40':'h-32 w-24'}`}>
        {i===1 && <span className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-xl bg-sky-300 text-3xl font-bold text-blue-950">+</span>}
        {Array.from({length:9},(_,n)=><span key={n} className="rounded-sm bg-sky-200/50"/>)}
      </div>)}
    </div>
    <h2 className="mt-6 text-2xl font-semibold tracking-tight">{uiText('From foundation to better care')}</h2>
    <div className="mt-5 grid grid-cols-2 gap-3">{stats.map(s=><div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 p-4"><s.icon size={21} className="text-sky-200"/><p className="mt-2 text-3xl font-semibold"><Counter value={s.value}/></p><p className="mt-1 text-sm text-blue-100">{s.label}</p></div>)}</div>
  </div>;
}

// Official portraits: https://phd.maharashtra.gov.in/en/ (reviewed 2026-09-18).
const LEADERS = [
  { name: 'Devendra Fadnavis', title: 'Chief Minister', image: 'fadnavis.jpg' },
  { name: 'Eknath Shinde', title: 'Deputy Chief Minister', image: 'shinde.jpg' },
  { name: 'Sunetra Ajit Pawar', title: 'Deputy Chief Minister', image: 'pawar.png' },
  { name: 'Prakash Abitkar', title: 'Minister, Public Health and Family Welfare', image: 'abitkar.png' },
];

export function Landing() {
  useUiLanguage();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects);

  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true });
  }, [currentUser, navigate]);

  if (currentUser) return null;

  const stats = [
    { icon: Building2, value: `${projects.length}`, label: t('landing.statsProjects') },
    { icon: MapPinned, value: `${ALL_DISTRICTS.length}`, label: t('landing.statsDistricts') },
    { icon: Layers, value: '4', label: t('landing.statsTransparency') },
    { icon: ShieldCheck, value: `${Object.keys(ROLE_LABELS).length}`, label: t('landing.statsRoles') },
  ];

  const features = [
    { icon: Activity, title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { icon: Wallet, title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { icon: ClipboardCheck, title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
    { icon: KeyRound, title: t('landing.feature4Title'), desc: t('landing.feature4Desc') },
  ];



  const darkCta = 'bg-navy-900/90 ring-1 ring-inset ring-white/10 text-white shadow-lg shadow-navy-900/30 transition-all hover:-translate-y-0.5 hover:bg-navy-800 hover:shadow-xl';
  const softCard = 'rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_-10px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-14px_rgba(38,90,160,0.25)] hover:border-govblue-200';

  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="landing-nav mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-14 w-14" />
            <span className="text-sm font-bold tracking-wide text-slate-900">{t('landing.brand')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="inline" />
            <button
              onClick={() => navigate('/login')}
              className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t('landing.navSignIn')}
            </button>
            <button onClick={() => navigate('/select-role')} className={cn('rounded-md px-3.5 py-1.5 text-xs font-semibold', darkCta)}>
              {t('landing.navGetStarted')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero relative isolate overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-blob absolute -top-24 left-[6%] h-80 w-80 rounded-full bg-govblue-200/50 blur-3xl" />
          <div className="animate-blob-delay absolute top-16 right-[6%] h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.35]" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)', backgroundSize: '30px 30px',
          }} />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-center lg:text-left">
            <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-govblue-200 bg-govblue-50 px-3.5 py-1 text-[11px] font-medium text-govblue-700">
              <ShieldCheck size={12} /> {uiText('Hospital infrastructure · demonstration portal')}
            </span>
            <h1 className="animate-fade-up mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl" style={{ animationDelay: '0.05s' }}>
              {uiText('Building hospitals. Strengthening care.')}
            </h1>
            <p className="animate-fade-up mx-auto mt-5 max-w-xl text-sm text-slate-600 sm:text-base lg:mx-0" style={{ animationDelay: '0.1s' }}>
              {t('landing.heroSubtitle')}
            </p>
            <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start" style={{ animationDelay: '0.15s' }}>
              <button onClick={() => navigate('/select-role')} className={cn('group flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold', darkCta)}>
                {t('landing.ctaPrimary')} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                {t('landing.ctaSecondary')}
              </button>
            </div>
          </div>

          <Reveal delay={150}>
            <HospitalIllustration stats={stats} />
          </Reveal>
        </div>
      </section>

      {/* Leadership: generous portraits retain their original proportions. */}
      <section className="landing-leadership px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-blue-600">{t('landing.brand')}</p><h2 className="text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">{uiText('Leadership')}</h2></div>
            <Landmark size={40} className="text-blue-300" aria-hidden="true" />
          </Reveal>
          <div className="leadership-hierarchy">{LEADERS.map((person, i) => <Reveal key={person.name} delay={i * 80} className={`leader-rank leader-rank-${i === 0 ? "chief" : i < 3 ? "deputy" : "health"}`}>
            <article className="leadership-card">
              <div className="leadership-portrait"><img src={`/leadership/${person.image}`} alt={person.name} loading="lazy" /></div>
              <div className="leadership-caption"><span className="mb-4 block h-1 w-9 rounded-full bg-blue-500" aria-hidden="true"/><h3 className="text-lg font-bold tracking-tight text-blue-950">{uiText(person.name)}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{uiText(person.title)}</p></div>
            </article>
          </Reveal>)}</div>
          <p className="mt-6 text-xs leading-relaxed text-slate-500">{uiText('Portraits and designations sourced from the Maharashtra Public Health Department.')} <a href="https://phd.maharashtra.gov.in/en/" target="_blank" rel="noreferrer" className="underline">{uiText('Source')}</a></p>
        </div>
      </section>

      <section className="px-6 pt-16">
        <Reveal className="landing-quote mx-auto max-w-7xl">
          <Quote size={40} className="shrink-0 text-sky-300" aria-hidden="true" />
          <div><blockquote className="text-balance text-xl font-medium leading-relaxed sm:text-2xl">“{t('landing.quote')}”</blockquote><p className="mt-5 text-xs font-semibold uppercase tracking-widest text-blue-200">{t('landing.quoteAuthor')}</p></div>
        </Reveal>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('landing.featuresTitle')}</h2>
          <p className="mt-2.5 text-sm text-slate-500">{t('landing.featuresSubtitle')}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 90}>
              <TiltCard className={cn(softCard, 'h-full p-7')}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-govblue-500 to-blue-700 text-white shadow-md shadow-govblue-200">
                  <f.icon size={18} />
                </div>
                <p className="mt-6 text-lg font-semibold text-slate-900">{uiText(f.title)}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{uiText(f.desc)}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-8 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={13} /> {t('landing.footerTagline')}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[11px] text-slate-400">{t('landing.footerCopyright')}</p>
      </footer>
    </div>
  );
}
