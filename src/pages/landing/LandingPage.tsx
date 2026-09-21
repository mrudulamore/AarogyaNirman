import { BrandLogo } from '../../components/common/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Landmark, ShieldCheck, MapPinned, Layers } from 'lucide-react';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { uiText, useUiLanguage } from '../../i18n/ui';
import { useStore } from '../../store/useStore';
import './LandingPage.css';

const leaders = [
  { name: 'Devendra Fadnavis', title: 'Chief Minister', image: 'Rectangle 1032.png' },
  { name: 'Eknath Shinde', title: 'Deputy Chief Minister', image: 'Rectangle 1033.png' },
  { name: 'Sunetra Ajit Pawar', title: 'Deputy Chief Minister', image: 'Rectangle 1034.png' },
  { name: 'Prakash Abitkar', title: 'Minister, Public Health and Family Welfare', image: 'Rectangle 1035.png' },
];

const bannerStats = [
  { value: 24, label: 'Hospital Projects Tracked', icon: Landmark },
  { value: 21, label: 'Districts Covered', icon: MapPinned },
  { value: 4, label: 'Progress Traceability', icon: Layers },
  { value: 13, label: 'Accountable Role Tiers', icon: ShieldCheck },
];

function HospitalStatistics() {
  const language = useUiLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      if (reducedMotion.matches) { setProgress(1); return; }
      const beginning = performance.now();
      const tick = (now: number) => {
        const elapsed = Math.min((now - beginning) / 1800, 1);
        setProgress(1 - Math.pow(1 - elapsed, 3));
        if (elapsed < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const onPreferenceChange = () => {
      if (reducedMotion.matches) { cancelAnimationFrame(frame); setProgress(1); started = true; }
    };
    reducedMotion.addEventListener('change', onPreferenceChange);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { start(); observer?.disconnect(); }
    }, { threshold: 0.25 }) : null;
    if (reducedMotion.matches || !observer) start();
    else observer.observe(element);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); reducedMotion.removeEventListener('change', onPreferenceChange); };
  }, []);
  const format = (value: number) => new Intl.NumberFormat(language === 'en' ? 'en' : `${language || 'en'}-u-nu-deva`, { minimumIntegerDigits: 2, useGrouping: false }).format(value);
  return <div ref={ref} className="an-statistics" aria-labelledby="an-statistics-title">
    <h2 id="an-statistics-title">{uiText('From foundation to better care')}</h2>
    <div className="an-statistics-grid">{bannerStats.map(stat => <div className="an-statistic" key={stat.label}>
      <span className="an-statistic-icon"><stat.icon size={26} aria-hidden="true" /></span>
      <div><strong aria-label={format(stat.value)}><span aria-hidden="true">{format(Math.floor(stat.value * progress))}</span></strong><p>{uiText(stat.label)}</p></div>
    </div>)}</div>
  </div>;
}

const featureIcons = ['imgStreamlineWaveSignal', 'imgGroup1', 'imgGroup', 'imgHugeiconsKey01'];
const accountabilityCards = [
  { title: 'Field & contractor', description: 'Capture ground-truth progress, photos and measurements at the site.', roles: ['Contractor’s Site Supervisor', 'Data Entry Operator', 'PMC Inspector'] },
  { title: 'Engineering & review', description: 'Verify, measure and approve work against the sanctioned plan.', roles: ['Junior Engineer', 'Deputy Engineer', 'Architect / Consultant'] },
  { title: 'Department leadership', description: 'Oversee progress and spend across every hospital and district.', roles: ['Health Ministry Secretary', 'OSD', 'Minister'] },
];
const previewProjects = [
  { name: 'District Hospital', district: 'Nashik', progress: 82 },
  { name: 'Sub-District Hospital', district: 'Satara', progress: 64 },
  { name: 'District Hospital', district: 'Nagpur', progress: 47 },
  { name: 'Women & Child Hospital', district: 'Pune', progress: 91 },
  { name: 'District Hospital', district: 'Latur', progress: 30 },
];
const projectSteps = [
  { title: 'Sanction & approval', description: 'Administrative sanction is recorded and every rupee follows a verified approval chain.' },
  { title: 'Construction progress', description: 'Physical and financial progress is updated live for every hospital project.' },
  { title: 'Field verification', description: 'Geo-tagged photos and inspections back each construction milestone.' },
  // The repeated title is intentional: it matches the supplied Figma frame.
  { title: 'Sanction & approval', description: 'Defects are closed with evidence before the facility is handed over for operation.' },
];

export function LandingPage() {
  const language = useUiLanguage();
  const { t } = useTranslation();
  const currentUser = useStore(s => s.currentUser);
  const portalPath = currentUser ? '/dashboard' : '/select-role';
  const actions = <>
    <Link className="an-button an-button-secondary" to="/login">{t('landing.navSignIn')}</Link>
    <Link className="an-button an-button-primary" to={portalPath}>{t('landing.navGetStarted')}<ArrowRight size={19} aria-hidden="true" /></Link>
  </>;

  return <div className="an-landing" data-language={language}>
    <a className="an-skip" href="#landingpage-main">Skip to content</a>
    <header className="an-header">
      <Link to="/landingpage" className="an-brand" aria-label={t('landing.brand')}>
        <BrandLogo className="h-14 w-14" />
        <span>{t('landing.brand')}</span>
      </Link>
      <nav className="an-navigation" aria-label="Main navigation"><LanguageSwitcher variant="inline" />{actions}</nav>
    </header>
    <main id="landingpage-main">
      <section className="an-hero" aria-labelledby="an-title">
        <img className="an-dots" src="/landingpage/an/Layer_1 1.png" alt="" aria-hidden="true" width="2280" height="3856" />
        <div className="an-hero-copy">
          <h1 id="an-title">{uiText('Building hospitals. Strengthening care.')}</h1>
          <p>{t('landing.heroSubtitle')}</p>
          <div className="an-actions">{actions}</div>
        </div>
        <div className="an-banner"><img src="/landingpage/an/hospital-banner.png" alt="Hospital construction and completed hospital building side by side" width="6656" height="2560" fetchPriority="high" /><HospitalStatistics /></div>
      </section>
      <section className="an-section an-leadership" aria-label={uiText('Leadership')}>
        <img className="an-leadership-art" src="/landingpage/an/Frame 33854.png" alt="Leadership: Devendra Fadnavis, Chief Minister; Eknath Shinde and Sunetra Ajit Pawar, Deputy Chief Ministers; Prakash Abitkar, Minister, Public Health and Family Welfare." width="1725" height="1574" loading="lazy" />
        <div className="an-leadership-responsive">
        <p className="an-eyebrow">{t('landing.brand')}</p>
        <h2 id="an-leadership-title">{uiText('Leadership')}</h2>
        <div className="an-leaders">{leaders.map(person => <article className="an-leader" key={person.name}>
          <img src={`/landingpage/an/${person.image}`} alt={person.name} width="600" height="650" loading="lazy" />
          <div><h3>{uiText(person.name)}</h3><p>{uiText(person.title)}</p></div>
        </article>)}</div>
        </div>
        <img className="an-leadership-pattern" src="/landingpage/an/Group.png" alt="" aria-hidden="true" width="6900" height="3148" loading="lazy" />
      </section>
      <section className="an-quote-section" aria-label={uiText('Public health')} data-node-id="21:8214">
        <figure className="an-quote" data-node-id="21:8213">
          <span className="an-quote-symbol" aria-hidden="true"><img src="/landingpage/imgFluentTextQuote28Filled.svg" alt="" /></span>
          <blockquote>&ldquo;{t('landing.quote')}&rdquo;</blockquote>
          <span className="an-quote-divider" aria-hidden="true"><img src="/landingpage/imgLine6.svg" alt="" /></span>
          <figcaption>{t('landing.quoteAuthor')}</figcaption>
        </figure>
      </section>
      <section className="an-section an-features" aria-labelledby="an-features-title" data-node-id="21:12403">
        <h2 id="an-features-title">{t('landing.featuresTitle')}</h2>
        <p className="an-section-description">{t('landing.featuresSubtitle')}</p>
        <div className="an-feature-grid">{featureIcons.map((icon, index) => <article className="an-feature" key={icon}>
          <span className="an-feature-icon" aria-hidden="true"><img src={`/landingpage/${icon}.svg`} alt="" /></span>
          <h3>{t(`landing.feature${index + 1}Title`)}</h3>
          <p>{t(`landing.feature${index + 1}Desc`)}</p>
        </article>)}</div>
      </section>
      <section className="an-journey-section" aria-labelledby="an-journey-title" data-node-id="21:12211">
        <div className="an-section an-journey">
          <h2 id="an-journey-title">{uiText('One verified path, from sanction to handover')}</h2>
          <p className="an-section-description">{uiText('Every hospital project follows the same accountable chain, so progress and spend can be checked at each step.')}</p>
          <div className="an-steps-wrap">
            <img className="an-steps-line" src="/landingpage/imgLine7.svg" alt="" aria-hidden="true" />
            <ol className="an-steps">{projectSteps.map((step, index) => <li className="an-step" key={index}>
              <span className="an-step-number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{uiText(step.title)}</h3>
              <p>{uiText(step.description)}</p>
            </li>)}</ol>
          </div>
        </div>
      </section>
      <section className="an-section an-project-preview" aria-labelledby="an-preview-title">
        <h2 id="an-preview-title">{uiText('See every project’s status at a glance')}</h2>
        <p className="an-section-description">{uiText('Live progress, verified evidence and role-based views, together in one place.')}</p>
        <div className="an-preview-layout">
          <ul className="an-preview-benefits">
            {['Live physical and financial progress for every hospital', 'Geo-tagged evidence attached to each milestone', 'Role-based views, from field engineers to leadership'].map(text => <li key={text}><span><ShieldCheck size={24} aria-hidden="true" /></span>{uiText(text)}</li>)}
          </ul>
          <figure className="an-command-preview" aria-label="Illustrative project command view">
            <span className="an-preview-stamp an-preview-verified"><ShieldCheck size={16} aria-hidden="true" />{uiText('Inspection verified')}</span>
            <div className="an-command-heading"><strong>{uiText('Command view')}</strong><span>{uiText('Sample data')}</span></div>
            <div className="an-command-rows">{previewProjects.map(project => <div className="an-command-row" key={project.district}>
              <span className="an-preview-hospital"><Landmark size={20} aria-hidden="true" /></span>
              <div className="an-preview-project-name"><strong>{uiText(project.name)}</strong><span>{uiText(project.district)}</span></div>
              <div className="an-preview-progress" role="progressbar" aria-label={`${project.name}, ${project.district}`} aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${project.progress}%` }} /></div>
              <strong className="an-preview-percent">{project.progress}%</strong>
              <span className={`an-preview-status${project.progress < 50 ? ' an-preview-attention' : ''}`}>{uiText(project.progress < 50 ? 'Needs attention' : 'On track')}</span>
            </div>)}</div>
            <figcaption><span>{uiText('Physical progress by project')}</span><span>{uiText('Illustrative figures only')}</span></figcaption>
            <span className="an-preview-stamp an-preview-evidence"><Landmark size={16} aria-hidden="true" />{uiText('Geo-tagged evidence')}</span>
          </figure>
        </div>
      </section>
      <section className="an-export-section an-accountability an-accountability-live" aria-labelledby="an-accountability-title">
        <h2 id="an-accountability-title">{uiText('Accountability at every tier')}</h2>
        <p className="an-section-description">{uiText('13 accountable role tiers, from field engineers to the Superadmin.')}</p>
        <div className="an-accountability-cards">{accountabilityCards.map(card => <article key={card.title}>
          <span className="an-accountability-icon"><ShieldCheck size={28} aria-hidden="true" /></span>
          <h3>{uiText(card.title)}</h3><p>{uiText(card.description)}</p>
          <ul>{card.roles.map(role => <li key={role}>{uiText(role)}</li>)}</ul>
        </article>)}</div>
      </section>
      <section className="an-export-section an-closing an-closing-live" aria-labelledby="an-closing-title">
        <div className="an-closing-panel">
          <h2 id="an-closing-title">{uiText('Ready to enter the command center?')}</h2>
          <p>{uiText('Sign in with your department credentials to track projects, approvals and spend.')}</p>
          <div className="an-closing-live-actions">
            <Link to={portalPath} className="an-button an-button-secondary">{t('landing.navGetStarted')}<ArrowRight size={19} aria-hidden="true" /></Link>
            <Link to="/login" className="an-button an-button-primary">{t('landing.navSignIn')}</Link>
          </div>
        </div>
        <footer className="an-closing-footer"><ul>{['Secure government access', 'Role-based authorization', 'Full audit trail'].map(label => <li key={label}><ShieldCheck size={16} aria-hidden="true" />{uiText(label)}</li>)}</ul><p>{t('landing.footerCopyright')}</p></footer>
      </section>
    </main>
  </div>;
}
