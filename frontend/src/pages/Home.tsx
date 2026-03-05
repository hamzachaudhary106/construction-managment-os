import { Link } from 'react-router-dom';
import './Marketing.css';

export default function Home() {
  return (
    <div className="marketing-page">
      <main className="marketing-main">
        <section className="marketing-hero">
          <div>
            <div className="marketing-hero-eyebrow">Construction management OS for Pakistan</div>
            <h1 className="marketing-hero-title">Run every project and rupee from one clean workspace.</h1>
            <p className="marketing-hero-text">
              Construx360 replaces scattered Excel sheets, WhatsApp chats and paper files with a single, structured app
              for budgets, bills, RFIs, partners and site work – built specifically for contractors and developers.
            </p>
            <div className="marketing-hero-cta">
              <Link to="/login" className="pricing-btn-primary pricing-btn-primary--filled">
                Sign in to your workspace
              </Link>
              <Link to="/pricing" className="pricing-btn-primary pricing-btn-primary--outline">
                View plans in PKR
              </Link>
              <span className="marketing-hero-meta">Simple one‑time setup + small monthly fee.</span>
            </div>
          </div>
          <aside className="marketing-hero-aside">
            <h2 className="marketing-hero-aside-title">Designed around how you actually build</h2>
            <p className="marketing-hero-aside-text">
              Not a generic ERP. Construx360 follows the real flow of Pakistani projects: land, contracts, cashflow,
              site issues and partners.
            </p>
            <ul className="marketing-hero-aside-list">
              <li>Per‑project dashboards for income, costs, transfers and partner withdrawals.</li>
              <li>Daily view of bills due, guarantees expiring and open RFIs or punch items.</li>
              <li>WhatsApp alerts so the right people act on time – without another noisy app.</li>
            </ul>
          </aside>
        </section>

        <section className="marketing-section">
          <div>
            <h2>What Construx360 gives you</h2>
            <p>
              A single, opinionated OS for projects, money and site activity. Everything is connected so you always know
              where each rupee and decision lives.
            </p>
            <div className="marketing-cards">
              <article className="marketing-card">
                <h3 className="marketing-card-title">True financial picture</h3>
                <p className="marketing-card-text">
                  Track budgets, bills, variations, transfers and partner money in one balance – no more guessing from
                  5 different spreadsheets.
                </p>
              </article>
              <article className="marketing-card">
                <h3 className="marketing-card-title">Clean site record</h3>
                <p className="marketing-card-text">
                  Site diary, RFIs, submittals, documents, progress photos and punch items organised by project and
                  phase, always searchable.
                </p>
              </article>
              <article className="marketing-card">
                <h3 className="marketing-card-title">Partners & clients onside</h3>
                <p className="marketing-card-text">
                  Separate client view and partner tracking so stakeholders see what they need without exposing your
                  internal working.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

