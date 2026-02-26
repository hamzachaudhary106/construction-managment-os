import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import './Dashboard.css';

type Project = { id: number; name: string };
type Transfer = {
  id: number;
  from_project: number;
  to_project: number;
  from_project_name?: string;
  to_project_name?: string;
  amount: string;
  transfer_date: string;
  notes: string;
};

export default function Transfers() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ from_project: '', to_project: '', amount: '', transfer_date: new Date().toISOString().slice(0, 10), notes: '' });

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/transfers/'),
    ]).then(([p, t]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setTransfers(t.data?.results ?? t.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.from_project === form.to_project) return;
    if (editingId) {
      client.patch(`/transfers/${editingId}/`, {
        ...form,
        from_project: Number(form.from_project),
        to_project: Number(form.to_project),
      }).then(() => { setEditingId(null); setShowForm(false); setForm({ from_project: '', to_project: '', amount: '', transfer_date: new Date().toISOString().slice(0, 10), notes: '' }); load(); });
    } else {
      client.post('/transfers/', {
        ...form,
        from_project: Number(form.from_project),
        to_project: Number(form.to_project),
      }).then(() => {
        setShowForm(false);
        setForm({ from_project: '', to_project: '', amount: '', transfer_date: new Date().toISOString().slice(0, 10), notes: '' });
        load();
      });
    }
  };

  const deleteTransfer = (id: number) => {
    if (confirm('Delete this transfer record?')) client.delete(`/transfers/${id}/`).then(load);
  };

  const startEdit = (t: Transfer) => {
    setEditingId(t.id);
    setForm({ from_project: String(t.from_project), to_project: String(t.to_project), amount: t.amount, transfer_date: t.transfer_date, notes: t.notes || '' });
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Cash Transfers" subtitle="Move cash between projects with full record" />
      <Card>
        <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => { setShowForm(!showForm); setEditingId(null); }}>{(showForm || editingId) ? 'Cancel' : '+ New transfer'}</button>
        {(showForm || editingId) && (
          <form onSubmit={handleCreate} className="form-inline">
            <select value={form.from_project} onChange={(e) => setForm({ ...form, from_project: e.target.value })} required>
              <option value="">From project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span className="muted">→</span>
            <select value={form.to_project} onChange={(e) => setForm({ ...form, to_project: e.target.value })} required>
              <option value="">To project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <input type="date" value={form.transfer_date} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} />
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button type="submit" className="btn-primary" disabled={form.from_project === form.to_project && !!form.from_project}>{editingId ? 'Save' : 'Transfer'}</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>From</th><th>To</th><th className="num">Amount</th><th>Date</th><th>Notes</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td>{t.from_project_name ?? projects.find((p) => p.id === t.from_project)?.name ?? t.from_project}</td>
                <td>{t.to_project_name ?? projects.find((p) => p.id === t.to_project)?.name ?? t.to_project}</td>
                <td className="num">{formatRs(t.amount)}</td>
                <td>{t.transfer_date}</td>
                <td className="muted">{t.notes || '—'}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn-action" onClick={() => { startEdit(t); setShowForm(true); }}>Edit</button>
                    <button type="button" className="btn-action btn-action-danger" onClick={() => deleteTransfer(t.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && !showForm && <p className="muted">No transfers yet.</p>}
      </Card>
    </>
  );
}
