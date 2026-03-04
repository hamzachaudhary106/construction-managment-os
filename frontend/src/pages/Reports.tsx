import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card, StatCard } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type FinancialReport = { total_income: number; total_expenses: number; net: number; project_id: number | null };
type PendingBillsReport = { bills: { id: number; project_name: string; description: string; amount: number; due_date: string; status: string }[]; total_pending_amount: number; count: number };
type WHTReport = {
  by_period: { tax_period: string; total_wht: number }[];
  rows: { source: string; project_name: string; description: string; amount: number; wht_amount: number; wht_certificate_number: string; wht_tax_period: string }[];
  project_id: number | null;
};
type PayablesAging = {
  by_party: { party_id: number; party_name: string; total: number }[];
  by_age: { current: number; '1_30': number; '31_60': number; '61_90': number; '90_plus': number };
  project_id: number | null;
};

export default function Reports() {
  const toast = useToast();
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [pendingBills, setPendingBills] = useState<PendingBillsReport | null>(null);
  const [aging, setAging] = useState<PayablesAging | null>(null);
  const [whtReport, setWhtReport] = useState<WHTReport | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    client.get('/projects/').then((r) => setProjects(r.data?.results ?? r.data ?? []));
  }, []);

  useEffect(() => {
    const params = projectFilter ? { project_id: projectFilter } : {};
    client.get('/reports/financial/', { params }).then((r) => setFinancial(r.data));
  }, [projectFilter]);

  useEffect(() => {
    const params = projectFilter ? { project_id: projectFilter } : {};
    client.get('/reports/pending-bills/', { params }).then((r) => setPendingBills(r.data));
  }, [projectFilter]);

  useEffect(() => {
    const params = projectFilter ? { project_id: projectFilter } : {};
    client.get('/reports/payables-aging/', { params }).then((r) => setAging(r.data));
  }, [projectFilter]);

  useEffect(() => {
    const params = projectFilter ? { project_id: projectFilter } : {};
    client.get('/reports/wht/', { params }).then((r) => setWhtReport(r.data));
  }, [projectFilter]);

  const downloadExport = (type: 'financial' | 'pending_bills' | 'cash_flow', format: 'xlsx' | 'pdf') => {
    const params: Record<string, string> = { type, format };
    if (projectFilter) params.project_id = projectFilter;
    const token = localStorage.getItem('accessToken');
    const qs = new URLSearchParams(params).toString();
    const url = `${client.defaults.baseURL}/reports/export/?${qs}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const ext = format === 'pdf' ? 'pdf' : 'xlsx';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `report-${type.replace('_', '-')}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const sendReportWhatsApp = (type: 'financial' | 'pending_bills' | 'cash_flow') => {
    client
      .post('/reports/export/send-whatsapp/', {
        type,
        format: 'pdf',
        project_id: projectFilter || null,
      })
      .then(() => {
        toast.success('Report sent to WhatsApp');
      })
      .catch((err) => {
        toast.error(apiErrors(err)[0] || 'Failed to send via WhatsApp');
      });
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="One-click financial and pending bills reports" />
      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <label className="muted" style={{ marginRight: '0.5rem' }}>Project filter:</label>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span style={{ marginLeft: '1rem' }} className="muted">Export:</span>
        <button type="button" className="btn-secondary" onClick={() => downloadExport('financial', 'xlsx')}>Financial (Excel)</button>
        <button type="button" className="btn-secondary" onClick={() => downloadExport('financial', 'pdf')}>Financial (PDF)</button>
        <button type="button" className="btn-secondary" onClick={() => sendReportWhatsApp('financial')}>Financial (WhatsApp)</button>
        <button type="button" className="btn-secondary" onClick={() => downloadExport('cash_flow', 'xlsx')}>Cash flow (Excel)</button>
        <button type="button" className="btn-secondary" onClick={() => downloadExport('cash_flow', 'pdf')}>Cash flow (PDF)</button>
        <button type="button" className="btn-secondary" onClick={() => sendReportWhatsApp('cash_flow')}>Cash flow (WhatsApp)</button>
        <button type="button" className="btn-secondary" onClick={() => downloadExport('pending_bills', 'xlsx')}>Pending bills (Excel)</button>
        <button type="button" className="btn-secondary" onClick={() => downloadExport('pending_bills', 'pdf')}>Pending bills (PDF)</button>
        <button type="button" className="btn-secondary" onClick={() => sendReportWhatsApp('pending_bills')}>Pending bills (WhatsApp)</button>
      </div>
      <div className="grid-cards">
        {financial && (
          <>
            <StatCard title="Total Income" value={formatRs(financial.total_income)} variant="positive" />
            <StatCard title="Total Expenses" value={formatRs(financial.total_expenses)} variant="negative" />
            <StatCard title="Profit (Income − Expenses)" value={formatRs(financial.net)} variant={financial.net >= 0 ? 'positive' : 'negative'} />
          </>
        )}
      </div>
      {pendingBills && (
        <Card title="Pending & Overdue Bills">
          <p className="muted">Total pending amount: <strong>{formatRs(pendingBills.total_pending_amount)}</strong> ({pendingBills.count} bills)</p>
          <div className="table-responsive">
            <table className="table table-mobile-stack" style={{ marginTop: '1rem' }}>
              <thead>
                <tr><th>Project</th><th>Description</th><th className="num">Amount</th><th>Due</th><th>Status</th></tr>
              </thead>
              <tbody>
                {pendingBills.bills.map((b) => (
                  <tr key={b.id}>
                    <td>{b.project_name}</td>
                    <td>{b.description}</td>
                    <td className="num">{formatRs(b.amount)}</td>
                    <td>{b.due_date}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pendingBills.bills.length === 0 && <p className="muted">No pending or overdue bills.</p>}
        </Card>
      )}
      {aging && (
        <Card title="Payables aging" className="card-spaced">
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>By age bucket</h3>
          <div className="grid-cards" style={{ marginBottom: '1.5rem' }}>
            <div className="card"><span className="muted">Current</span><div className="card-value">{formatRs(aging.by_age.current)}</div></div>
            <div className="card"><span className="muted">1–30 days overdue</span><div className="card-value text-warning">{formatRs(aging.by_age['1_30'])}</div></div>
            <div className="card"><span className="muted">31–60 days</span><div className="card-value text-warning">{formatRs(aging.by_age['31_60'])}</div></div>
            <div className="card"><span className="muted">61–90 days</span><div className="card-value text-danger">{formatRs(aging.by_age['61_90'])}</div></div>
            <div className="card"><span className="muted">90+ days</span><div className="card-value text-danger">{formatRs(aging.by_age['90_plus'])}</div></div>
          </div>
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>By party (contract schedules)</h3>
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Party</th><th className="num">Pending amount</th></tr></thead>
              <tbody>
                {aging.by_party.map((p) => (
                  <tr key={p.party_id || p.party_name}><td>{p.party_name}</td><td className="num">{formatRs(p.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {aging.by_party.length === 0 && <p className="muted">No payables by party.</p>}
        </Card>
      )}
      {whtReport && (
        <Card title="Withholding tax (WHT)" className="card-spaced">
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>By tax period</h3>
          <div className="grid-cards" style={{ marginBottom: '1rem' }}>
            {whtReport.by_period.map((p) => (
              <div key={p.tax_period} className="card">
                <span className="muted">{p.tax_period}</span>
                <div className="card-value">{formatRs(p.total_wht)}</div>
              </div>
            ))}
          </div>
          {whtReport.rows.length > 0 && (
            <div className="table-responsive">
              <table className="table table-mobile-stack">
                <thead><tr><th>Project</th><th>Description</th><th className="num">Amount</th><th className="num">WHT</th><th>Certificate</th><th>Period</th></tr></thead>
                <tbody>
                  {whtReport.rows.map((r, i) => (
                    <tr key={`${r.source}-${i}`}>
                      <td>{r.project_name}</td>
                      <td>{r.description}</td>
                      <td className="num">{formatRs(r.amount)}</td>
                      <td className="num">{formatRs(r.wht_amount)}</td>
                      <td>{r.wht_certificate_number || '—'}</td>
                      <td>{r.wht_tax_period || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {whtReport.rows.length === 0 && whtReport.by_period.length === 0 && <p className="muted">No WHT data.</p>}
        </Card>
      )}
    </>
  );
}
