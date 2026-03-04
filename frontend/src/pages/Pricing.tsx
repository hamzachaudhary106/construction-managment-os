import { Link } from 'react-router-dom';
import './Pricing.css';

const plans = [
  {
    id: 'starter',
    name: 'Starter Site',
    description: 'For solo contractors moving off WhatsApp & Excel.',
    oneTime: '₨ 39,000',
    originalOneTime: '₨ 78,000',
    monthly: '₨ 1,900',
    features: [
      '1 active project at a time',
      'Dashboard, bills, cashflow & basic reports',
      'Site diary, documents & progress photos',
      'Cost estimation in PKR',
      'Investor & partner contribution tracking',
      'RFIs, variations, submittals & approvals',
      'Client portal for project tracking',
      'Unlimited users & mobile access',
      'WhatsApp alerts & notifications',
    ],
  },
  {
    id: 'pro',
    name: 'Growing Builder',
    description: 'For small teams handling 3–10 active sites a year.',
    oneTime: '₨ 59,000',
    originalOneTime: '₨ 118,000',
    monthly: '₨ 3,000',
    highlight: true,
    features: [
      'Up to 3 active projects at a time',
      'Dashboard, bills, cashflow & basic reports',
      'Site diary, documents & progress photos',
      'Cost estimation in PKR',
      'Investor & partner contribution tracking',
      'RFIs, variations, submittals & approvals',
      'Client portal for project tracking',
      'Unlimited users & mobile access',
      'WhatsApp alerts & notifications for all projects',
    ],
  },
  {
    id: 'enterprise',
    name: 'Firm / Developer',
    description: 'For established firms that need full portfolio control.',
    oneTime: '₨ 99,000',
    originalOneTime: '₨ 198,000',
    monthly: '₨ 5,900',
    features: [
      'Unlimited active projects at a time',
      'Dashboard, bills, cashflow & basic reports',
      'Site diary, documents & progress photos',
      'Cost estimation in PKR',
      'Investor & partner contribution tracking',
      'RFIs, variations, submittals & approvals',
      'Client portal for project tracking',
      'Unlimited users & mobile access',
      'WhatsApp alerts & notifications for all projects',
    ],
  },
];

const allIncluded = [
  'Unlimited users in every plan',
  'Secure cloud hosting with daily backups',
  'PKR‑first setup (taxes, units, local formats)',
  'Free onboarding call and training session',
  'Access from laptop, tablet and mobile',
];

const faqs = [
  {
    q: 'Is this really a one‑time setup plus monthly fee?',
    a: 'Yes. You pay the one‑time setup to get your workspace configured, then a small recurring fee to keep hosting, backups and support running.',
  },
  {
    q: 'Can I upgrade later as my company grows?',
    a: 'You can move between plans anytime. We only charge the difference in one‑time fee when you upgrade.',
  },
  {
    q: 'Do you help migrate my existing data?',
    a: 'Starter includes light migration (up to a few projects). Pro and Firm plans include guided migration for more projects and historical data.',
  },
  {
    q: 'Is there a long‑term contract?',
    a: 'No long‑term lock‑in. Cancel the monthly fee any time; your data can be exported on request.',
  },
];

export default function Pricing() {
  return (
    <div className="pricing-page">
      <header className="pricing-header">
        <div className="pricing-brand">
          <div className="pricing-icon" aria-hidden>
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="pricing-icon-svg">
              <path
                d="M16 4L4 14v12h24V14L16 4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M12 26V16h8v10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <div>
            <h1 className="pricing-wordmark">
              <span className="pricing-wordmark-construx">Construx</span>
              <span className="pricing-wordmark-360">360</span>
            </h1>
            <p className="pricing-tagline">Construction management for Pakistani builders.</p>
          </div>
        </div>
        <div className="pricing-header-cta">
          <Link to="/login" className="pricing-link-login">
            Sign in
          </Link>
          <span className="pricing-header-note">All prices in PKR. One‑time setup + small monthly fee.</span>
        </div>
      </header>

      <main className="pricing-main">
        <section className="pricing-intro">
          <h2>Stop running multi‑crore projects from Excel and WhatsApp</h2>
          <p>
            Construx360 gives you a single place for costs, bills, site diary, documents and approvals – built for
            contractors and developers in Pakistan. Pick a plan that matches where your business is today.
          </p>
        </section>

        <section className="pricing-grid" aria-label="Pricing plans">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`pricing-card${plan.highlight ? ' pricing-card-highlight' : ''}`}
            >
              <div className={`pricing-strip${plan.highlight ? ' pricing-strip-highlight' : ''}`}>
                <span className="pricing-strip-label">
                  {plan.highlight ? 'Most popular • 50% launch discount' : '50% launch discount'}
                </span>
              </div>
              <div className="pricing-card-inner">
                <h3 className="pricing-plan-name">{plan.name}</h3>
                <p className="pricing-plan-desc">{plan.description}</p>
                <div className="pricing-price-block">
                  <div className="pricing-price-main-row">
                    <span className="pricing-price-original">{plan.originalOneTime}</span>
                    <div className="pricing-price-main">{plan.oneTime}</div>
                    <span className="pricing-price-main-tag">one‑time setup today</span>
                  </div>
                  <div className="pricing-price-monthly">
                    <span className="pricing-price-sub">{plan.monthly}</span>
                    <span className="pricing-price-monthly-tag">per month afterwards</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={
                    plan.highlight
                      ? 'pricing-btn-primary pricing-btn-primary--filled'
                      : 'pricing-btn-primary pricing-btn-primary--outline'
                  }
                >
                  Choose plan
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="pricing-section">
          <div className="pricing-section-left">
            <h2>Everything you need to stay in control</h2>
            <p>
              Every plan includes the same core Construx360 engine – reliable hosting, backups and features that keep
              your projects on track. Higher plans simply unlock more projects, reporting and support.
            </p>
          </div>
          <div className="pricing-section-right">
            <ul className="pricing-list">
              {allIncluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="pricing-section pricing-section-faq">
          <div className="pricing-section-left">
            <h2>Questions from other builders</h2>
            <p>
              If you are not sure which plan is right for you, start with Starter or Pro and we will help you choose
              during onboarding.
            </p>
          </div>
          <div className="pricing-faq-grid" aria-label="Frequently asked questions">
            {faqs.map((item) => (
              <article key={item.q} className="pricing-faq-card">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="pricing-footer">
          <div className="pricing-footer-inner">
            <div className="pricing-footer-brand">
              <span className="pricing-footer-logo" aria-hidden>
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16 4L4 14v12h24V14L16 4z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M12 26V16h8v10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </span>
              <div>
                <span className="pricing-footer-name">Construx360</span>
                <span className="pricing-footer-tagline">Construction management</span>
              </div>
            </div>
            <div className="pricing-footer-links">
              <Link to="/pricing">Pricing</Link>
              <Link to="/login">Sign in</Link>
            </div>
            <div className="pricing-footer-meta">
              <span>© {new Date().getFullYear()} Construx360. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

