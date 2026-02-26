import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import './Dashboard.css';

type Project = { id: number; name: string };
type Milestone = {
  id: number;
  project: number;
  title: string;
  due_date: string | null;
  completed: boolean;
  completed_date: string | null;
  notes: string;
};

export default function Milestones() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project: '', title: '', due_date: '', notes: '' });
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterCompleted, setFilterCompleted] = useState<string>('');

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/projects/milestones/', { params: { project: filterProject || undefined, completed: filterCompleted || undefined } }),
    ]).then(([p, m]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setMilestones(m.data?.results ?? m.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject, filterCompleted]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/projects/milestones/', { ...form, project: Number(form.project), due_date: form.due_date || null }).then(() => {
      setShowForm(false);
      setForm({ project: '', title: '', due_date: '', notes: '' });
      load();
    });
  };

  const toggleComplete = (m: Milestone) => {
    client.patch(`/projects/milestones/${m.id}/`, {
      completed: !m.completed,
      completed_date: !m.completed ? new Date().toISOString().slice(0, 10) : null,
    }).then(load);
  };

  const deleteMilestone = (id: number) => {
    if (confirm('Delete this milestone?')) client.delete(`/projects/milestones/${id}/`).then(load);
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Project Milestones" subtitle="Track and complete project milestones" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add milestone'}</button>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterCompleted} onChange={(e) => setFilterCompleted(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All</option>
            <option value="true">Completed</option>
            <option value="false">Not completed</option>
          </select>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="form-inline">
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Milestone title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input type="date" placeholder="Due date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>Project</th><th>Title</th><th>Due date</th><th>Status</th><th>Completed date</th><th style={{ width: '1%' }}>Actions</th></tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/projects/${m.project}/dashboard`} className="btn-action btn-action-primary">{projectName(m.project)}</Link></td>
                <td><strong>{m.title}</strong></td>
                <td>{m.due_date || '—'}</td>
                <td><span className={m.completed ? 'badge badge-paid' : 'badge badge-pending'}>{m.completed ? 'Completed' : 'Pending'}</span></td>
                <td>{m.completed_date || '—'}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className={m.completed ? 'btn-action' : 'btn-action btn-action-primary'} onClick={() => toggleComplete(m)}>{m.completed ? 'Mark incomplete' : 'Mark complete'}</button>
                    <button type="button" className="btn-action btn-action-danger" onClick={() => deleteMilestone(m.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {milestones.length === 0 && !showForm && <p className="muted">No milestones.</p>}
      </Card>
    </>
  );
}
