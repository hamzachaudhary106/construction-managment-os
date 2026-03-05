import './Marketing.css';

export default function HowItWorks() {
  return (
    <div className="marketing-page">
      <main className="marketing-main">
        <section className="pricing-intro">
          <h2>How Construx360 works</h2>
          <p>
            You bring your projects, contracts and bills. Construx360 gives you a single source of truth for money,
            documents and site activity – with clear dashboards for you, your team, partners and clients.
          </p>
        </section>

        <section className="pricing-section">
          <div className="pricing-section-left">
            <h2>1. Set up your company & projects</h2>
            <p>
              We help you add your company, invite your team and create your first projects. Define budgets, contracts
              and key stakeholders for each site.
            </p>
          </div>
          <div className="pricing-section-right">
            <ul className="pricing-list">
              <li>Import or create projects with locations, clients and partners.</li>
              <li>Add contracts, payment schedules and guarantees in one place.</li>
              <li>Configure roles so admins, managers and staff see what they need.</li>
            </ul>
          </div>
        </section>

        <section className="pricing-section">
          <div className="pricing-section-left">
            <h2>2. Run your day-to-day work</h2>
            <p>
              Record income, expenses, bills, RFIs, issues and progress as work happens. The system keeps the running
              balance and audit trail for you.
            </p>
          </div>
          <div className="pricing-section-right">
            <ul className="pricing-list">
              <li>Track bills, approvals and payments with WhatsApp notifications.</li>
              <li>Manage site diary, photos, RFIs, submittals and punch items.</li>
              <li>Share a clean client view without exposing internal details.</li>
            </ul>
          </div>
        </section>

        <section className="pricing-section">
          <div className="pricing-section-left">
            <h2>3. Stay in control of money</h2>
            <p>
              At any time you can see true project balances, partner positions and upcoming cash needs – instead of
              guessing from multiple spreadsheets.
            </p>
          </div>
          <div className="pricing-section-right">
            <ul className="pricing-list">
              <li>Per-project dashboards for income, expenses and transfers.</li>
              <li>Company-wide overview of balances, overdue bills and open issues.</li>
              <li>Reports you can export and share with partners, clients and banks.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

