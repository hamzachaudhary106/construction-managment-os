import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = {
  id: number;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

export default function Projects() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const [searchQ, setSearchQ] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = searchQ.trim() ? { search: searchQ.trim() } : {};
    return client.get('/projects/', { params }).then((res) => setProjects(res.data?.results ?? res.data ?? []));
  };

  useEffect(() => {
    const t = setTimeout(() => { load().finally(() => setLoading(false)); }, searchQ ? 300 : 0);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const req = editingId
      ? client.patch(`/projects/${editingId}/`, form)
      : client.post('/projects/', form);
    req.then(() => {
      if (editingId) {
        toast.success('Project updated');
      } else {
        toast.success('Project created');
      }
      setEditingId(null);
      setForm({ name: '', description: '', status: 'active' });
      setShowForm(false);
      load();
    }).catch((err) => {
      toast.error(apiErrors(err)[0] || 'Failed to save project');
    }).finally(() => setSubmitting(false));
  };

  const updateStatus = (id: number, status: string) => {
    client.patch(`/projects/${id}/`, { status }).then(() => {
      load();
    }).catch((err) => {
      toast.error(apiErrors(err)[0] || 'Failed to update status');
    });
  };

  const deleteProject = (id: number) => {
    if (!confirm('Delete this project? This will remove related data.')) return;
    client.delete(`/projects/${id}/`).then(() => {
      toast.success('Project deleted');
      load();
    }).catch((err) => {
      toast.error(apiErrors(err)[0] || 'Failed to delete project');
    });
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Projects" subtitle="Manage construction projects" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
            {showForm ? 'Cancel' : '+ Add project'}
          </button>
          <input type="search" placeholder="Search name or description…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ padding: '0.5rem', minWidth: 200 }} />
        </div>
        {editingId && (
          <form onSubmit={handleCreate} className="form-inline" style={{ marginBottom: '1rem' }}>
            <input placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn-link" onClick={() => setEditingId(null)}>Cancel</button>
          </form>
        )}
        {showForm && !editingId && (
          <form onSubmit={handleCreate} className="form-inline">
            <input
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</button>
          </form>
        )}
        {projects.length === 0 && !showForm ? (
          <p className="muted">No projects. Add one above.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th style={{ width: '1%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>
                      <select
                        className={`status-select status-${p.status}`}
                        value={p.status}
                        onChange={(e) => updateStatus(p.id, e.target.value)}
                        aria-label={`Change status for ${p.name}`}
                      >
                        <option value="active">Active</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="muted">{p.start_date || '—'} to {p.end_date || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/projects/${p.id}/dashboard`} className="btn-action btn-action-primary">Dashboard</Link>
                        <button type="button" className="btn-action" onClick={() => { setEditingId(p.id); setForm({ name: p.name, description: p.description || '', status: p.status }); }}>Edit</button>
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteProject(p.id)}>Delete</button>
                      </div>
                    </td>
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
