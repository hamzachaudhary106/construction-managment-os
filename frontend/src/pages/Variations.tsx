import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Contract = { id: number; title: string; project: number };
type Variation = {
  id: number;
  project: number;
  contract: number | null;
  title: string;
  description?: string;
  amount: string;
  status: string;
  variation_date: string | null;
  contract_title?: string;
};

export default function Variations() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [list, setList] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ project: '', contract: '', title: '', description: '', amount: '', status: 'pending', variation_date: '' });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/contracts/'),
      client.get('/variations/', { params: filterProject ? { project: filterProject } : {} }),
    ]).then(([p, c, v]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setContracts(c.data?.results ?? c.data ?? []);
      setList(v.data?.results ?? v.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject]);

  const contractsForProject = form.project ? contracts.filter((c) => c.project === Number(form.project)) : [];
  const openCreate = () => { setEditingId(null); setForm({ project: '', contract: '', title: '', description: '', amount: '', status: 'pending', variation_date: '' }); setFormErrors([]); setShowForm(true); };
  const openEdit = (v: Variation) => {
    setEditingId(v.id);
    setForm({
      project: String(v.project),
      contract: v.contract ? String(v.contract) : '',
      title: v.title,
      description: v.description || '',
      amount: v.amount,
      status: v.status,
      variation_date: v.variation_date || '',
    });
    setFormErrors([]);
    setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditingId(null); setFormErrors([]); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    const payload = {
      project: Number(form.project),
      contract: form.contract ? Number(form.contract) : null,
      title: form.title,
      description: form.description || '',
      amount: form.amount,
      status: form.status,
      variation_date: form.variation_date || null,
    };
    if (editingId) {
      client.patch(`/variations/${editingId}/`, payload)
        .then(() => { toast.success('Variation updated'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    } else {
      client.post('/variations/', payload)
        .then(() => { toast.success('Variation created'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    }
  };

  const deleteVariation = (id: number, title: string) => {
    if (!confirm(`Delete variation "${title}"?`)) return;
    client.delete(`/variations/${id}/`)
      .then(() => { toast.success('Variation deleted'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Delete failed'));
  };

  const updateVariationStatus = (id: number, status: string) => {
    client.patch(`/variations/${id}/`, { status })
      .then(() => { toast.success('Status updated'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Update failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Extra Work" subtitle="Record extra work and its approved value" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => showForm ? cancelForm() : openCreate()}>{showForm ? 'Cancel' : '+ Add variation'}</button>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {formErrors.length > 0 && (
          <ul className="form-errors" style={{ color: 'var(--danger)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>{formErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        )}
        {showForm && (
          <form onSubmit={handleSubmit} className="form-inline" style={{ flexWrap: 'wrap' }}>
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value, contract: '' })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.contract} onChange={(e) => setForm({ ...form, contract: e.target.value })}>
              <option value="">Contract (optional)</option>
              {contractsForProject.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="date" placeholder="Variation date" value={form.variation_date} onChange={(e) => setForm({ ...form, variation_date: e.target.value })} />
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
          </form>
        )}
        <div className="table-responsive">
          <table className="table table-mobile-stack">
            <thead>
              <tr><th>Project</th><th>Title</th><th className="num">Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id}>
                  <td>{projectName(v.project)}</td>
                  <td><strong>{v.title}</strong></td>
                  <td className="num">{formatRs(v.amount)}</td>
                  <td>
                    <select
                      className={`status-select status-${v.status}`}
                      value={v.status}
                      onChange={(e) => updateVariationStatus(v.id, e.target.value)}
                      aria-label={`Change status for ${v.title}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>{v.variation_date || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn-action" onClick={() => openEdit(v)}>Edit</button>
                      <button type="button" className="btn-action btn-action-danger" onClick={() => deleteVariation(v.id, v.title)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && !showForm && <div className="empty-state">No variations yet.</div>}
      </Card>
    </>
  );
}
