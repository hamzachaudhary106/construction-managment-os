import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, StatCard } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import './Dashboard.css';

type ClientProject = {
  id: number;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type ClientFinancial = {
  total_income: number;
  total_expenses: number;
  total_investments?: number;
  total_withdrawals?: number;
  transfers_in?: number;
  transfers_out?: number;
  balance: number;
};

type ClientBill = {
  id: number;
  description: string;
  amount: number;
  due_date: string;
  status: string;
};

type ClientVariation = {
  id: number;
  title: string;
  amount: number;
  variation_date: string;
  description: string;
};

type ClientActivity = {
  date: string | null;
  type: string;
  title: string;
  amount: number | null;
  extra: string | null;
};

type ClientProjectDetailResponse = {
  project: ClientProject;
  financial: ClientFinancial;
  pending_bills: ClientBill[];
  approved_variations: ClientVariation[];
  recent_activity: ClientActivity[];
};

export default function ClientProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<ClientProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    client
      .get(`/reports/client/projects/${projectId}/`)
      .then((res) => setData(res.data))
      .catch(() => setError('Project not found or you do not have access.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="loading-state">Loading project…</div>;
  if (error || !data) return <div className="text-danger">{error || 'Not found'}</div>;

  const { project, financial, pending_bills, approved_variations, recent_activity } = data;
  const profit = (financial.total_income ?? 0) - (financial.total_expenses ?? 0);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`Client view · ${project.status}${project.start_date ? ` · Started ${project.start_date}` : ''}`}
      />
      <p className="muted" style={{ marginBottom: '1rem' }}>
        <Link to="/client/dashboard">← Back to client dashboard</Link>
      </p>

      <div className="grid-cards">
        <StatCard
          title="Net balance"
          value={formatRs(financial.balance)}
          variant={financial.balance >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          title="Profit (Income − Expenses)"
          value={formatRs(profit)}
          variant={profit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard title="Total income" value={formatRs(financial.total_income ?? 0)} variant="positive" />
        <StatCard title="Total expenses" value={formatRs(financial.total_expenses ?? 0)} variant="negative" />
      </div>

      <div className="dashboard-layout" style={{ marginTop: '1.5rem' }}>
        <div className="dashboard-column">
          <Card title="Pending & overdue bills" className="card-spaced">
            {pending_bills.length === 0 ? (
              <p className="muted">No pending or overdue bills for this project.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-mobile-stack">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="num">Amount</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending_bills.map((b) => (
                      <tr key={b.id}>
                        <td>{b.description}</td>
                        <td className="num">{formatRs(b.amount)}</td>
                        <td>{b.due_date}</td>
                        <td>
                          <span className={`badge badge-${b.status}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Approved variations (extra work)" className="card-spaced">
            {approved_variations.length === 0 ? (
              <p className="muted">No approved variations yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-mobile-stack">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th className="num">Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approved_variations.map((v) => (
                      <tr key={v.id}>
                        <td>{v.title}</td>
                        <td className="num">{formatRs(v.amount)}</td>
                        <td>{v.variation_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="dashboard-column">
          <Card title="Recent activity" className="card-spaced">
            {recent_activity.length === 0 ? (
              <p className="muted">No recent financial activity for this project.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-mobile-stack">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_activity.map((e, idx) => (
                      <tr key={`${e.date}-${e.type}-${idx}`}>
                        <td>{e.date || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{e.type.replace(/_/g, ' ')}</td>
                        <td>{e.title}</td>
                        <td className="num">{e.amount != null ? formatRs(e.amount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

