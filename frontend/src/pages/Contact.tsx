import './Marketing.css';

export default function Contact() {
  return (
    <div className="marketing-page">
      <main className="marketing-main">
        <section className="pricing-intro">
          <h2>Contact us</h2>
          <p>
            Have a question about Construx360, pricing or onboarding your team? Share a few details and we&apos;ll get
            back to you.
          </p>
        </section>

        <section className="marketing-contact-grid">
          <div>
            <h2>Get in touch</h2>
            <p>
              For now we keep it simple – reach out on email or WhatsApp and we will schedule a short call or demo based
              on your needs.
            </p>
          </div>
          <div>
            <form className="marketing-form">
              <label>
                Name
                <input type="text" placeholder="Your name" />
              </label>
              <label>
                Company
                <input type="text" placeholder="Company / organisation" />
              </label>
              <label>
                How many active projects?
                <input type="number" min={1} placeholder="e.g. 3" />
              </label>
              <label>
                What would you like to see in a demo?
                <textarea placeholder="Share a bit about your projects, challenges or workflows." />
              </label>
              <button type="button">Submit enquiry</button>
              <p className="marketing-meta-muted">
                Form is for demo purposes only. Please also email or WhatsApp so we can reply directly.
              </p>
            </form>
          </div>
        </section>

        <section className="marketing-section">
          <div>
            <h2>Direct contact</h2>
            <p>Prefer to reach us directly? Use the channels below and we&apos;ll respond as quickly as possible.</p>
          </div>
          <div>
            <ul className="marketing-list">
              <li>
                Email: <a href="mailto:support@agenbord.online">support@agenbord.online</a>
              </li>
              <li>Share your company name, role and how many active projects you manage.</li>
              <li>We&apos;ll reply with next steps, demo options and onboarding guidance.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

