import './Marketing.css';

export default function About() {
  return (
    <div className="marketing-page">
      <main className="marketing-main">
        <section className="pricing-intro">
          <h2>About Construx360</h2>
          <p>
            Construx360 is a focused construction project and finance management system built for small and mid-sized
            builders in Pakistan. It grew out of real project experience where budgets, bills and site updates were
            scattered across Excel, WhatsApp and paper files.
          </p>
        </section>

        <section className="marketing-section">
          <div>
            <h2>Why we built it</h2>
            <p>
              Traditional ERPs are too heavy, while generic spreadsheets quickly become fragile as projects and team
              members grow. We wanted something simple enough to adopt in days, but structured enough to keep money,
              documents and decisions under control.
            </p>
          </div>
          <div>
            <ul className="marketing-list">
              <li>Designed around projects, contracts, cashflow and site execution.</li>
              <li>Opinionated workflows that match how local contractors actually work.</li>
              <li>WhatsApp alerts where they add value, not another noisy app.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

