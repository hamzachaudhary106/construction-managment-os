import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, StatCard } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

type ClientProjectSummary = {
  id: number;
  name: string;
  status: string;
  total_income: number;
  total_expenses: number;
  total_investments?: number;
  total_withdrawals?: number;
  transfers_in?: number;
  transfers_out?: number;
  balance: number;
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ClientProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/reports/client/overview/')
      .then((res) => {
        setProjects(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalIncome = projects.reduce((s, p) => s + (p.total_income ?? 0), 0);
  const totalExpenses = projects.reduce((s, p) => s + (p.total_expenses ?? 0), 0);
  const totalBalance = projects.reduce((s, p) => s + (p.balance ?? 0), 0);

  if (loading) return <div className="loading-state">Loading client dashboard…</div>;

  const clientName = user?.client_name || user?.company_name || undefined;

  return (
    <>
      <PageHeader
        title="Client dashboard"
        subtitle={clientName ? `${clientName} · Project overview` : 'Overview of your projects and payments.'}
      />

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <Card className="card-spaced dashboard-hero">
            <div className="dashboard-hero-header">
              <div>
                <div className="dashboard-hero-title">Your portfolio snapshot</div>
                <div className="dashboard-hero-subtitle">High-level view of all projects you are a client on.</div>
              </div>
            </div>
            <div className="dashboard-hero-metrics">
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Net balance</span>
                <span className={`dashboard-hero-value ${totalBalance >= 0 ? 'positive' : 'negative'}`}>{formatRs(totalBalance)}</span>
              </div>
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Projects</span>
                <span className="dashboard-hero-value">{projects.length}</span>
              </div>
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Total billed (income)</span>
                <span className="dashboard-hero-value muted">{formatRs(totalIncome)}</span>
              </div>
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Total expenses</span>
                <span className="dashboard-hero-value muted">{formatRs(totalExpenses)}</span>
              </div>
            </div>
          </Card>

          <Card title="Projects" className="card-spaced">
            {projects.length === 0 ? (
              <p className="muted">No projects are currently linked to your client account.</p>
            ) : (
              <div className="grid-cards">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="card"
                    style={{ textAlign: 'left' }}
                    onClick={() => navigate(`/client/projects/${p.id}`)}
                  >
                    <h2 className="card-title">{p.name}</h2>
                    <div className="muted" style={{ marginBottom: 8, textTransform: 'capitalize' }}>{p.status}</div>
                    <div className="detail-grid">
                      <div>
                        <div className="muted">Balance</div>
                        <div className={`card-value ${p.balance >= 0 ? 'positive' : 'negative'}`}>{formatRs(p.balance)}</div>
                      </div>
                      <div>
                        <div className="muted">Income</div>
                        <div className="card-value">{formatRs(p.total_income ?? 0)}</div>
                      </div>
                      <div>
                        <div className="muted">Expenses</div>
                        <div className="card-value">{formatRs(p.total_expenses ?? 0)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="dashboard-column">
          <Card title="Summary" className="card-spaced">
            <div className="grid-cards">
              <StatCard title="Total income" value={formatRs(totalIncome)} variant="positive" />
              <StatCard title="Total expenses" value={formatRs(totalExpenses)} variant="negative" />
              <StatCard
                title="Net balance"
                value={formatRs(totalBalance)}
                variant={totalBalance >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

