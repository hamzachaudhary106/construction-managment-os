import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, StatCard } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

type ProjectSummary = {
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

type CashFlowMonth = { month: string; income: number; expenses: number; net: number };

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowMonth[]>([]);
  const [forecast, setForecast] = useState<{
    overdue_total: number;
    expected_in_next_30_days: number;
    expected_out_next_30_days: number;
    net_next_30_days: number;
  } | null>(null);
  const [summary, setSummary] = useState<{
    overdue_bills_count: number;
    open_issues_count: number;
    guarantees_expiring_30_days: number;
    pending_variations_count: number;
  } | null>(null);
  const [companyDashboard, setCompanyDashboard] = useState<{
    project_count: number;
    total_balance: number;
    overdue_bills_total: number;
    open_punch_items_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/reports/overview/'),
      client.get('/reports/cash-flow/'),
      client.get('/reports/cash-flow-forecast/'),
      client.get('/reports/dashboard-summary/'),
      client.get('/reports/company-dashboard/'),
    ]).then(([overview, cf, fc, sum, company]) => {
      setProjects(Array.isArray(overview.data) ? overview.data : overview.data?.results ?? []);
      setCashFlow(cf.data?.cash_flow ?? []);
      setForecast(fc.data ?? null);
      setSummary(sum.data ?? null);
      setCompanyDashboard(company.data ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalIncome = projects.reduce((s, p) => s + p.total_income, 0);
  const totalExpenses = projects.reduce((s, p) => s + p.total_expenses, 0);
  const totalProfit = totalIncome - totalExpenses;
  const totalInvestments = projects.reduce((s, p) => s + (p.total_investments ?? 0), 0);
  const totalWithdrawals = projects.reduce((s, p) => s + (p.total_withdrawals ?? 0), 0);
  const totalBalance = projects.reduce((s, p) => s + p.balance, 0);
  const activeProjects = projects.filter((p) => p.status === 'active').length;

  if (loading) return <div className="loading-state">Loading dashboard…</div>;

  return (
    <>
      <div className="dashboard-header-row">
        <PageHeader title="Dashboard" subtitle="Live view of your projects, cash, and risks." />
        {isAdmin && (
          <div className="dashboard-header-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/projects')}>
              Manage projects
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/users')}>
              Manage users
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/notifications')}>
              View notifications
            </button>
          </div>
        )}
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-column">
          <Card className="card-spaced dashboard-hero">
            <div className="dashboard-hero-header">
              <div>
                <div className="dashboard-hero-title">Company snapshot</div>
                <div className="dashboard-hero-subtitle">Today’s position across all active projects.</div>
              </div>
              <div className="dashboard-hero-actions">
                <button type="button" className="btn-primary" onClick={() => navigate('/bills')}>
                  Add / view bills
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate('/finances')}>
                  Record expense / income
                </button>
              </div>
            </div>
            <div className="dashboard-hero-metrics">
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Net balance</span>
                <span className={`dashboard-hero-value ${totalBalance >= 0 ? 'positive' : 'negative'}`}>{formatRs(totalBalance)}</span>
              </div>
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Active projects</span>
                <span className="dashboard-hero-value">{activeProjects}</span>
              </div>
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Total income</span>
                <span className="dashboard-hero-value muted">{formatRs(totalIncome)}</span>
              </div>
              <div className="dashboard-hero-metric">
                <span className="dashboard-hero-label">Total expenses</span>
                <span className="dashboard-hero-value muted">{formatRs(totalExpenses)}</span>
              </div>
            </div>
            {companyDashboard && (
              <div className="dashboard-hero-chips">
                <span className="dashboard-chip">
                  {companyDashboard.project_count} project{companyDashboard.project_count !== 1 ? 's' : ''}
                </span>
                <span className="dashboard-chip warning">
                  {formatRs(companyDashboard.overdue_bills_total)} overdue bills
                </span>
                <span className="dashboard-chip danger">
                  {companyDashboard.open_punch_items_count} open punch item{companyDashboard.open_punch_items_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </Card>

          <Card title="Performance" className="card-spaced">
            <div className="grid-cards">
              <StatCard title="Total Income" value={formatRs(totalIncome)} variant="positive" />
              <StatCard title="Total Expenses" value={formatRs(totalExpenses)} variant="negative" />
              <StatCard title="Profit (Income − Expenses)" value={formatRs(totalProfit)} variant={totalProfit >= 0 ? 'positive' : 'negative'} />
              {totalInvestments > 0 && <StatCard title="Total Investments" value={formatRs(totalInvestments)} variant="positive" />}
              {totalWithdrawals > 0 && <StatCard title="Partner Withdrawals" value={formatRs(totalWithdrawals)} variant="negative" />}
              <StatCard title="Net Balance" value={formatRs(totalBalance)} variant={totalBalance >= 0 ? 'positive' : 'negative'} />
            </div>
          </Card>
        </div>

        <div className="dashboard-column">
          {forecast && (
            <Card title="Next 30 days – cash forecast" className="card-spaced">
              <div className="grid-cards">
                <StatCard title="Overdue (bills + schedules)" value={formatRs(forecast.overdue_total)} variant="negative" />
                <StatCard title="Expected in (next 30 days)" value={formatRs(forecast.expected_in_next_30_days)} variant="positive" />
                <StatCard title="Expected out (next 30 days)" value={formatRs(forecast.expected_out_next_30_days)} variant="negative" />
                <StatCard title="Net (next 30 days)" value={formatRs(forecast.net_next_30_days)} variant={forecast.net_next_30_days >= 0 ? 'positive' : 'negative'} />
              </div>
            </Card>
          )}

          {summary && (summary.overdue_bills_count > 0 || summary.open_issues_count > 0 || summary.guarantees_expiring_30_days > 0 || summary.pending_variations_count > 0 || (companyDashboard && companyDashboard.open_punch_items_count > 0)) && (
            <Card title="Alerts & risks" className="card-spaced">
              <div className="dashboard-alerts">
                {summary.overdue_bills_count > 0 && (
                  <button type="button" className="dashboard-alert-pill danger" onClick={() => navigate('/bills?status=overdue')}>
                    <span className="label">Overdue bills</span>
                    <span className="value">{summary.overdue_bills_count}</span>
                  </button>
                )}
                {summary.open_issues_count > 0 && (
                  <button type="button" className="dashboard-alert-pill warning" onClick={() => navigate('/site')}>
                    <span className="label">Open site issues</span>
                    <span className="value">{summary.open_issues_count}</span>
                  </button>
                )}
                {companyDashboard && companyDashboard.open_punch_items_count > 0 && (
                  <button type="button" className="dashboard-alert-pill warning" onClick={() => navigate('/site-issues')}>
                    <span className="label">Open punch items</span>
                    <span className="value">{companyDashboard.open_punch_items_count}</span>
                  </button>
                )}
                {summary.guarantees_expiring_30_days > 0 && (
                  <button type="button" className="dashboard-alert-pill neutral" onClick={() => navigate('/guarantees')}>
                    <span className="label">Guarantees expiring (30 days)</span>
                    <span className="value">{summary.guarantees_expiring_30_days}</span>
                  </button>
                )}
                {summary.pending_variations_count > 0 && (
                  <button type="button" className="dashboard-alert-pill neutral" onClick={() => navigate('/variations')}>
                    <span className="label">Pending variations</span>
                    <span className="value">{summary.pending_variations_count}</span>
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {cashFlow.length > 0 && (
        <Card title="Cash flow by month" className="card-spaced">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Month</th><th className="num">Income</th><th className="num">Expenses</th><th className="num">Net</th></tr>
              </thead>
              <tbody>
                {cashFlow.slice(-6).reverse().map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td className="num text-success">{formatRs(row.income)}</td>
                    <td className="num text-danger">{formatRs(row.expenses)}</td>
                    <td className={`num ${row.net >= 0 ? 'text-success' : 'text-danger'}`}>{formatRs(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
