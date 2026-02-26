import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type SubmittalItem = {
  id: number;
  project: number;
  project_name?: string;
  submittal_number: string;
  title: string;
  submittal_type: string;
  submittal_type_display?: string;
  status: string;
  status_display?: string;
  submitted_date: string | null;
  approved_date: string | null;
  review_notes: string;
  created_at: string;
};

export default function Submittals() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<SubmittalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project: '', title: '', submittal_type: 'other', description: '', status: 'draft',
  });

  const load = () => {
    const params: Record<string, string> = {};
    if (filterProject) params.project = filterProject;
    if (filterStatus) params.status = filterStatus;
    Promise.all([
      client.get('/projects/'),
      client.get('/submittals/', { params }),
    ]).then(([p, s]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setItems(s.data?.results ?? s.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject, filterStatus]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/submittals/', {
      project: Number(form.project),
      title: form.title,
      submittal_type: form.submittal_type,
      description: form.description || undefined,
      status: form.status,
    }).then(() => {
      toast.success('Submittal added');
      setShowForm(false);
      setForm({ project: '', title: '', submittal_type: 'other', description: '', status: 'draft' });
      load();
    }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const deleteItem = (id: number) => {
    if (!confirm('Delete this submittal?')) return;
    client.delete(`/submittals/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Approval Documents" subtitle="Material samples, method statements, shop drawings for approval" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision">Revision required</option>
          </select>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add submittal'}</button>
        </div>
        {showForm && (
          <form onSubmit={addItem} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ minWidth: 180 }} />
            <select value={form.submittal_type} onChange={(e) => setForm({ ...form, submittal_type: e.target.value })}>
              <option value="material">Material sample</option>
              <option value="method">Method statement</option>
              <option value="shop_drawing">Shop drawing</option>
              <option value="other">Other</option>
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </select>
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minWidth: 200 }} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>Project</th><th>Number</th><th>Title</th><th>Type</th><th>Status</th><th>Submitted</th><th>Approved</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.project_name ?? projectName(i.project)}</td>
                <td>{i.submittal_number || `#${i.id}`}</td>
                <td><strong>{i.title}</strong></td>
                <td>{i.submittal_type_display ?? i.submittal_type}</td>
                <td><span className="badge badge-active">{i.status_display ?? i.status}</span></td>
                <td>{i.submitted_date || '—'}</td>
                <td>{i.approved_date || '—'}</td>
                <td><button type="button" className="btn-action btn-action-danger" onClick={() => deleteItem(i.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state">No submittals yet.</div>}
      </Card>
    </>
  );
}
