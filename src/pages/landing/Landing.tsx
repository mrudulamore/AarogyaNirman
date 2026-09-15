import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import {
  Landmark, ShieldCheck, ArrowRight, Quote, Activity, Wallet, ClipboardCheck, KeyRound, Building2, MapPinned, Layers, Crown,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { Avatar } from '../../components/ui/forms';
import { ROLE_LABELS, ALL_DISTRICTS } from '../../lib/constants';
import type { Role } from '../../types';
import { cn } from '../../lib/utils';

/** Card that tilts toward the cursor for a subtle 3D feel — pure CSS transform, no library. */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(800px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateZ(0)`,
    });
  }
  function onLeave() {
    setStyle({ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)' });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transition: 'transform 0.2s ease-out', transformStyle: 'preserve-3d', ...style }}
      className={className}
    >
      {children}
    </div>
  );
}

/** Fades + lifts a section in the first time it scrolls into view — keeps the page feeling
 * alive on scroll, not just on first paint. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
      className={cn('transition-all duration-700 ease-out', visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)}
    >
      {children}
    </div>
  );
}

/** Animates a stat's leading integer counting up from 0 on mount; non-numeric values
 * ("4-Stage") render as-is with no animation. */
function Counter({ value }: { value: string }) {
  const match = value.match(/^(\d+)(\+?)$/);
  const [display, setDisplay] = useState<string>(match ? '0' : value);

  useEffect(() => {
    if (!match) return;
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

  return <>{display}</>;
}

const RING_SQUASH = 0.4;
const RING_UNSQUASH = 1 / RING_SQUASH;
const RING_CONFIGS = [
  { angle: -50, size: 190, duration: 9, color: '#265aa0' },
  { angle: 25, size: 245, duration: 12, color: '#0d9488' },
  { angle: 75, size: 300, duration: 15, color: '#3d5f95' },
  { angle: -15, size: 355, duration: 18, color: '#059669' },
];

/** "Atom" hero visual — a central Maharashtra nucleus with tilted orbit rings, one per live
 * stat. Each ring carries a fixed, always-upright count badge (rotation+non-uniform-scale don't
 * commute, so a badge can't both spin around the ellipse *and* stay readable — cancelling the
 * ring's static tilt is exact, cancelling a continuously-changing spin on top of a squash is
 * not) plus a small round "electron" that actually orbits — a circle looks the same at any
 * rotation, so it can safely spin without needing to be counter-rotated. */
function AtomDiagram({ stats }: { stats: { icon: LucideIcon; value: string; label: string }[] }) {
  return (
    <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center sm:h-[360px] sm:w-[360px]">
      <style>{`
        @keyframes atom-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes atom-glow { 0%, 100% { opacity: 0.55; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
      `}</style>

      <div className="absolute z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-br from-govblue-600 to-emerald-500 text-white shadow-xl shadow-govblue-300/50 ring-4 ring-white sm:h-28 sm:w-28">
        <Landmark size={20} />
        <span className="mt-1 text-[10px] font-bold leading-none">Maharashtra</span>
      </div>

      {stats.map((s, i) => {
        const cfg = RING_CONFIGS[i % RING_CONFIGS.length];
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: cfg.size, height: cfg.size,
              border: `1.5px solid ${cfg.color}45`,
              transform: `rotate(${cfg.angle}deg) scaleY(${RING_SQUASH})`,
            }}
          >
            {/* fixed, always-upright count badge */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div style={{ transform: `scaleY(${RING_UNSQUASH}) rotate(${-cfg.angle}deg)` }}>
                <div
                  className="flex items-center gap-1 whitespace-nowrap rounded-full border bg-white px-2.5 py-1 shadow-md"
                  style={{ borderColor: `${cfg.color}40` }}
                >
                  <s.icon size={11} style={{ color: cfg.color }} />
                  <span className="text-[11px] font-bold text-slate-800"><Counter value={s.value} /></span>
                </div>
              </div>
            </div>

            {/* orbiting electron dot — symmetric, safe to spin without counter-rotation */}
            <div className="absolute inset-0" style={{ animation: `atom-spin ${cfg.duration}s linear infinite` }}>
              <div
                className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: cfg.color, boxShadow: `0 0 8px 1px ${cfg.color}80`, animation: `atom-glow ${cfg.duration / 3}s ease-in-out infinite` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const LEADERSHIP_ROLES: Role[] = ['MINISTER', 'COMMISSIONER', 'REGIONAL_DIRECTOR'];
const LEADERSHIP_ICONS: Partial<Record<Role, typeof Crown>> = { MINISTER: Crown, COMMISSIONER: Landmark, REGIONAL_DIRECTOR: MapPinned };

export function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);

  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true });
  }, [currentUser, navigate]);

  if (currentUser) return null;

  const stats = [
    { icon: Building2, value: `${projects.length}+`, label: t('landing.statsProjects') },
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

  const leaders = LEADERSHIP_ROLES.map((role) => users.find((u) => u.role === role)).filter((u): u is NonNullable<typeof u> => !!u);

  const darkCta = 'bg-navy-900/90 ring-1 ring-inset ring-white/10 text-white shadow-lg shadow-navy-900/30 transition-all hover:-translate-y-0.5 hover:bg-navy-800 hover:shadow-xl';
  const softCard = 'rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_-10px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-14px_rgba(38,90,160,0.25)] hover:border-govblue-200';

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-govblue-500 to-emerald-500 shadow-md shadow-govblue-200">
              <Landmark size={18} className="text-white" />
            </div>
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
      <section className="relative isolate overflow-hidden px-6 pb-16 pt-14 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-blob absolute -top-24 left-[6%] h-80 w-80 rounded-full bg-govblue-200/50 blur-3xl" />
          <div className="animate-blob-delay absolute top-16 right-[6%] h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.35]" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)', backgroundSize: '30px 30px',
          }} />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-center lg:text-left">
            <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-govblue-200 bg-govblue-50 px-3.5 py-1 text-[11px] font-medium text-govblue-700">
              <ShieldCheck size={12} /> {t('landing.heroEyebrow')}
            </span>
            <h1 className="animate-fade-up mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl" style={{ animationDelay: '0.05s' }}>
              {t('landing.heroTitle')}
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
            <AtomDiagram stats={stats} />
          </Reveal>
        </div>
      </section>

      {/* Quote */}
      <section className="relative border-y border-slate-100 bg-gradient-to-b from-govblue-50/60 to-emerald-50/40 px-6 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Quote size={28} className="mx-auto text-govblue-400" />
          <blockquote className="mt-4 text-balance text-lg font-medium italic leading-relaxed text-slate-800 sm:text-xl">
            “{t('landing.quote')}”
          </blockquote>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('landing.quoteAuthor')}</p>
        </Reveal>
      </section>

      {/* Leadership */}
      {leaders.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('landing.leadershipTitle')}</h2>
            <p className="mt-2.5 text-sm text-slate-500">{t('landing.leadershipSubtitle')}</p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {leaders.map((u, i) => {
              const RoleIcon = LEADERSHIP_ICONS[u.role] ?? Landmark;
              return (
                <Reveal key={u.id} delay={i * 100}>
                  <TiltCard className={cn(softCard, 'flex items-center gap-4 p-5')}>
                    <div className="relative shrink-0">
                      <Avatar name={u.name} size={54} />
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-govblue-500 to-emerald-500 ring-2 ring-white">
                        <RoleIcon size={11} className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-govblue-700">{u.designation}</p>
                      <p className="mt-0.5 truncate text-[10.5px] text-slate-400">{u.department}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
          <p className="mx-auto mt-6 max-w-lg text-center text-[10.5px] text-slate-400">{t('landing.leadershipNote')}</p>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('landing.featuresTitle')}</h2>
          <p className="mt-2.5 text-sm text-slate-500">{t('landing.featuresSubtitle')}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 90}>
              <TiltCard className={cn(softCard, 'p-5')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-govblue-500 to-emerald-500 text-white shadow-md shadow-govblue-200">
                  <f.icon size={18} />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">{f.title}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{f.desc}</p>
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
