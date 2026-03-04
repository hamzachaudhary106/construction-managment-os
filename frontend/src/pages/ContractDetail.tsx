import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import './Dashboard.css';

type Contract = {
  id: number;
  project: number;
  title: string;
  contractor_name: string;
  total_value: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  payment_schedules?: PaymentSchedule[];
};

type PaymentSchedule = {
  id: number;
  contract: number;
  description: string;
  amount: string;
  due_date: string;
  status: string;
  paid_date: string | null;
};

export default function ContractDetail() {
  const { contractId } = useParams<{ contractId: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ description: '', amount: '', due_date: '' });

  const load = () => {
    if (!contractId) return;
    client.get(`/contracts/${contractId}/`).then((r) => setContract(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [contractId]);

  const addSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId) return;
    client.post('/contracts/payment-schedules/', { contract: Number(contractId), ...scheduleForm }).then(() => {
      setShowScheduleForm(false);
      setScheduleForm({ description: '', amount: '', due_date: '' });
      load();
    });
  };

  const markSchedulePaid = (id: number) => {
    client.patch(`/contracts/payment-schedules/${id}/`, { status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).then(load);
  };

  const deleteSchedule = (id: number) => {
    if (confirm('Delete this payment schedule?')) client.delete(`/contracts/payment-schedules/${id}/`).then(load);
  };

  const updateContract = (field: string, value: string) => {
    if (!contract) return;
    client.patch(`/contracts/${contract.id}/`, { ...contract, [field]: value }).then((r) => setContract(r.data));
  };

  if (loading || !contract) return <div className="loading-state">Loading…</div>;

  const schedules = contract.payment_schedules ?? [];

  return (
    <>
      <PageHeader title={contract.title} subtitle={`Contract · ${contract.contractor_name}`} />
      <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/contracts">← All contracts</Link>
      </p>
      <Card title="Contract details">
        <div className="detail-grid">
          <div><span className="muted">Project ID</span><br />{contract.project}</div>
          <div><span className="muted">Total value</span><br />{formatRs(contract.total_value)}</div>
          <div><span className="muted">Status</span><br />
            <select value={contract.status} onChange={(e) => updateContract('status', e.target.value)} className={`status-select status-${contract.status}`}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div><span className="muted">Start / End</span><br />{contract.start_date || '—'} / {contract.end_date || '—'}</div>
        </div>
        {contract.notes && <p className="muted"><strong>Notes:</strong> {contract.notes}</p>}
      </Card>
      <Card title="Payment schedules">
        <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowScheduleForm(!showScheduleForm)}>
          {showScheduleForm ? 'Cancel' : '+ Add payment schedule'}
        </button>
        {showScheduleForm && (
          <form onSubmit={addSchedule} className="form-inline">
            <input placeholder="Description" value={scheduleForm.description} onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })} required />
            <input type="number" step="0.01" placeholder="Amount" value={scheduleForm.amount} onChange={(e) => setScheduleForm({ ...scheduleForm, amount: e.target.value })} required />
            <input type="date" placeholder="Due date" value={scheduleForm.due_date} onChange={(e) => setScheduleForm({ ...scheduleForm, due_date: e.target.value })} required />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        <div className="table-responsive">
          <table className="table table-mobile-stack">
            <thead>
              <tr><th>Description</th><th className="num">Amount</th><th>Due date</th><th>Status</th><th>Paid date</th><th style={{ width: '1%' }}>Actions</th></tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>{s.description}</td>
                  <td className="num">{formatRs(s.amount)}</td>
                  <td>{s.due_date}</td>
                  <td>
                    <select
                      className={`status-select status-${s.status}`}
                      value={s.status}
                      onChange={(e) => {
                        if (e.target.value === 'paid') markSchedulePaid(s.id);
                        else client.patch(`/contracts/payment-schedules/${s.id}/`, { status: e.target.value }).then(load);
                      }}
                      aria-label={`Change status for ${s.description}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                  <td>{s.paid_date || '—'}</td>
                  <td>
                    <div className="table-actions">
                      {s.status !== 'paid' && <button type="button" className="btn-action btn-action-primary" onClick={() => markSchedulePaid(s.id)}>Mark paid</button>}
                      <button type="button" className="btn-action btn-action-danger" onClick={() => deleteSchedule(s.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {schedules.length === 0 && !showScheduleForm && <p className="muted">No payment schedules.</p>}
      </Card>
    </>
  );
}
