import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, StatCard } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import './Dashboard.css';

type DashboardData = {
  project: { id: number; name: string; status: string };
  financial: {
    total_income: number;
    total_expenses: number;
    total_investments?: number;
    total_withdrawals?: number;
    transfers_in?: number;
    transfers_out?: number;
    balance: number;
  };
  expenses_by_category: { category: string; total: number }[];
  bills: { pending_amount: number; overdue_amount: number; paid_amount: number };
  contracts: { expected_payments: number; completed_payments: number };
};

type HistoryEntry = {
  date: string;
  type: string;
  title: string;
  amount: number | null;
  extra: string | null;
  id: number | null;
};

type CostForecast = { project_id: number; project_name: string; budget_total: number; actual_expenses: number; approved_variations: number; estimated_total: number; cost_to_complete: number };

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [costForecast, setCostForecast] = useState<CostForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      client.get(`/reports/dashboard/${projectId}/`),
      client.get(`/reports/project/${projectId}/history/`),
      client.get('/reports/cost-forecast/', { params: { project_id: projectId } }),
    ])
      .then(([dashboardRes, historyRes, forecastRes]) => {
        setData(dashboardRes.data);
        setHistory(historyRes.data?.history ?? []);
        const fc = forecastRes.data;
        setCostForecast(fc && (typeof fc === 'object' && 'project_id' in fc) ? fc : null);
      })
      .catch(() => setError('Project not found'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="loading-state">Loading…</div>;
  if (error || !data) return <div className="text-danger">{error || 'Not found'}</div>;

  const { project, financial, expenses_by_category, bills, contracts } = data;
  const fmt = (n: number) => formatRs(n);
  const profit = financial.total_income - financial.total_expenses;
  const historyTypeLabel: Record<string, string> = {
    project: 'Project', income: 'Income', expense: 'Expense', bill: 'Bill',
    contract: 'Contract', contract_payment: 'Contract payment', investment: 'Investment',
    withdrawal: 'Withdrawal', transfer_in: 'Transfer in', transfer_out: 'Transfer out',
    milestone: 'Milestone', site_log: 'Site log', issue: 'Issue', document: 'Document',
    variation: 'Variation', guarantee: 'Bank guarantee', purchase_order: 'Purchase order',
  };
  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`Project dashboard · ${project.status}`}
      />
      <p className="muted" style={{ marginBottom: '1rem' }}>
        <Link to="/projects">← All projects</Link>
      </p>
      <div className="grid-cards">
        <StatCard title="Profit (Income − Expenses)" value={fmt(profit)} variant={profit >= 0 ? 'positive' : 'negative'} />
        <StatCard title="Total Income" value={fmt(financial.total_income)} variant="positive" />
        <StatCard title="Total Expenses" value={fmt(financial.total_expenses)} variant="negative" />
        {(financial.total_investments ?? 0) > 0 && <StatCard title="Investments" value={fmt(financial.total_investments!)} variant="positive" />}
        {(financial.total_withdrawals ?? 0) > 0 && <StatCard title="Partner withdrawals" value={fmt(financial.total_withdrawals!)} variant="negative" />}
        <StatCard title="Balance" value={fmt(financial.balance)} variant={financial.balance >= 0 ? 'positive' : 'negative'} />
      </div>
      <div className="grid-cards">
        <StatCard title="Pending Bills" value={fmt(bills.pending_amount)} variant="neutral" />
        <StatCard title="Overdue Bills" value={fmt(bills.overdue_amount)} variant="negative" />
        <StatCard title="Paid Bills" value={fmt(bills.paid_amount)} variant="positive" />
        <StatCard title="Expected (Contracts)" value={fmt(contracts.expected_payments)} variant="neutral" />
        <StatCard title="Completed (Contracts)" value={fmt(contracts.completed_payments)} variant="positive" />
      </div>
      {costForecast && (
        <Card title="Cost forecast" className="card-spaced">
          <div className="grid-cards">
            <StatCard title="Budget total" value={fmt(costForecast.budget_total)} variant="neutral" />
            <StatCard title="Actual expenses" value={fmt(costForecast.actual_expenses)} variant="negative" />
            <StatCard title="Approved variations" value={fmt(costForecast.approved_variations)} variant="positive" />
            <StatCard title="Estimated total" value={fmt(costForecast.estimated_total)} variant="neutral" />
            <StatCard title="Cost to complete" value={fmt(costForecast.cost_to_complete)} variant="negative" />
          </div>
        </Card>
      )}
      <Card title="Expenses by category">
        {expenses_by_category.length === 0 ? (
          <p className="muted">No expenses recorded yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses_by_category.map((row) => (
                <tr key={row.category}>
                  <td>{row.category}</td>
                  <td className="num">{formatRs(Number(row.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Project history (A to Z)">
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Chronological list of all activity on this project.
        </p>
        {history.length === 0 ? (
          <p className="muted">No history recorded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                  <th>Status / Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr key={`${entry.date}-${entry.type}-${idx}-${entry.id ?? ''}`}>
                    <td>{entry.date}</td>
                    <td><span className={`badge badge-${entry.type === 'income' || entry.type === 'investment' || entry.type === 'transfer_in' ? 'paid' : entry.type === 'expense' || entry.type === 'withdrawal' || entry.type === 'transfer_out' ? 'overdue' : 'pending'}`}>{historyTypeLabel[entry.type] ?? entry.type.replace(/_/g, ' ')}</span></td>
                    <td>{entry.title}</td>
                    <td className="num">{entry.amount != null ? formatRs(entry.amount) : '—'}</td>
                    <td>{entry.extra ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
