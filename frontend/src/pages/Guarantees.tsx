import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Guarantee = {
  id: number;
  project: number;
  guarantee_type: string;
  bank_name: string;
  amount: string;
  validity_from: string;
  validity_to: string;
  reference_number?: string;
  notes?: string;
  guarantee_type_display?: string;
};

const GUARANTEE_TYPES = [
  { value: 'performance', label: 'Performance' },
  { value: 'advance', label: 'Advance' },
  { value: 'retention', label: 'Retention' },
];

export default function Guarantees() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [list, setList] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    project: '', guarantee_type: 'performance', bank_name: '', amount: '',
    validity_from: '', validity_to: '', reference_number: '', notes: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/guarantees/', { params: filterProject ? { project: filterProject } : {} }),
    ]).then(([p, g]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setList(g.data?.results ?? g.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ project: '', guarantee_type: 'performance', bank_name: '', amount: '', validity_from: '', validity_to: '', reference_number: '', notes: '' });
    setFormErrors([]);
    setShowForm(true);
  };
  const openEdit = (g: Guarantee) => {
    setEditingId(g.id);
    setForm({
      project: String(g.project),
      guarantee_type: g.guarantee_type,
      bank_name: g.bank_name,
      amount: g.amount,
      validity_from: g.validity_from,
      validity_to: g.validity_to,
      reference_number: g.reference_number || '',
      notes: g.notes || '',
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
      guarantee_type: form.guarantee_type,
      bank_name: form.bank_name,
      amount: form.amount,
      validity_from: form.validity_from,
      validity_to: form.validity_to,
      reference_number: form.reference_number || '',
      notes: form.notes || '',
    };
    if (editingId) {
      client.patch(`/guarantees/${editingId}/`, payload)
        .then(() => { toast.success('Bank guarantee updated'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    } else {
      client.post('/guarantees/', payload)
        .then(() => { toast.success('Bank guarantee created'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    }
  };

  const deleteGuarantee = (id: number, bank: string) => {
    if (!confirm(`Delete guarantee with ${bank}?`)) return;
    client.delete(`/guarantees/${id}/`)
      .then(() => { toast.success('Bank guarantee deleted'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Delete failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Bank Guarantees" subtitle="Performance, advance, and retention guarantees" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => showForm ? cancelForm() : openCreate()}>{showForm ? 'Cancel' : '+ Add guarantee'}</button>
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
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.guarantee_type} onChange={(e) => setForm({ ...form, guarantee_type: e.target.value })}>
              {GUARANTEE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input placeholder="Bank name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} required />
            <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <input type="date" placeholder="Valid from" value={form.validity_from} onChange={(e) => setForm({ ...form, validity_from: e.target.value })} required />
            <input type="date" placeholder="Valid to" value={form.validity_to} onChange={(e) => setForm({ ...form, validity_to: e.target.value })} required />
            <input placeholder="Reference no." value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>Project</th><th>Type</th><th>Bank</th><th className="num">Amount</th><th>Valid from</th><th>Valid to</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.id}>
                <td>{projectName(g.project)}</td>
                <td><span className="badge badge-active">{g.guarantee_type_display ?? g.guarantee_type}</span></td>
                <td>{g.bank_name}</td>
                <td className="num">{formatRs(g.amount)}</td>
                <td>{g.validity_from}</td>
                <td>{g.validity_to}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn-action" onClick={() => openEdit(g)}>Edit</button>
                    <button type="button" className="btn-action btn-action-danger" onClick={() => deleteGuarantee(g.id, g.bank_name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !showForm && <div className="empty-state">No bank guarantees yet.</div>}
      </Card>
    </>
  );
}
