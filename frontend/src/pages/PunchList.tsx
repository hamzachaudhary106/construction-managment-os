import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type PunchItem = {
  id: number;
  project: number;
  title: string;
  description: string;
  location: string;
  status: string;
  status_display?: string;
  assigned_to: number | null;
  due_date: string | null;
  completed_date: string | null;
  created_at: string;
};

export default function PunchList() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project: '',
    title: '',
    description: '',
    location: '',
    status: 'open',
    due_date: '',
  });

  const load = () => {
    const params: Record<string, string> = {};
    if (filterProject) params.project = filterProject;
    if (filterStatus) params.status = filterStatus;
    Promise.all([
      client.get('/projects/'),
      client.get('/site/punch-items/', { params }),
    ]).then(([p, i]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setItems(i.data?.results ?? i.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject, filterStatus]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/site/punch-items/', {
      project: Number(form.project),
      title: form.title,
      description: form.description || undefined,
      location: form.location || undefined,
      status: form.status,
      due_date: form.due_date || null,
    }).then(() => {
      toast.success('Punch item added');
      setShowForm(false);
      setForm({ project: '', title: '', description: '', location: '', status: 'open', due_date: '' });
      load();
    }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const updateStatus = (id: number, status: string) => {
    client.patch(`/site/punch-items/${id}/`, { status }).then(() => { toast.success('Status updated'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const deleteItem = (id: number) => {
    if (!confirm('Delete this punch item?')) return;
    client.delete(`/site/punch-items/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Site Issues to Fix" subtitle="List of defects and pending work before handover" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add item'}</button>
        </div>
        {showForm && (
          <form onSubmit={addItem} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input type="date" placeholder="Due date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minWidth: 200 }} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        <div className="table-responsive">
          <table className="table table-mobile-stack">
            <thead>
              <tr><th>Project</th><th>Title</th><th>Location</th><th>Status</th><th>Due date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{projectName(i.project)}</td>
                  <td><strong>{i.title}</strong>{i.description ? <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{i.description.slice(0, 60)}{i.description.length > 60 ? '…' : ''}</div> : null}</td>
                  <td>{i.location || '—'}</td>
                  <td>
                    <select className={`status-select status-${i.status}`} value={i.status} onChange={(e) => updateStatus(i.id, e.target.value)}>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td>{i.due_date || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn-action btn-action-danger" onClick={() => deleteItem(i.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <div className="empty-state">No punch items yet.</div>}
      </Card>
    </>
  );
}
