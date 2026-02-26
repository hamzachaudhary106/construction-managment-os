import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Party = { id: number; name: string };
type Contract = {
  id: number;
  project: number;
  title: string;
  contractor_name: string;
  total_value: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  party_name?: string | null;
  payment_schedules?: { id: number; description: string; amount: string; due_date: string; status: string }[];
};

export default function Contracts() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project: '', party: '', title: '', contractor_name: '', total_value: '', status: 'draft',
    start_date: '', end_date: '', notes: '',
  });
  const [filterProject, setFilterProject] = useState<string>('');
  const [searchQ, setSearchQ] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = () => {
    const params: Record<string, string> = {};
    if (filterProject) params.project = filterProject;
    if (searchQ.trim()) params.search = searchQ.trim();
    Promise.all([
      client.get('/projects/'),
      client.get('/parties/'),
      client.get('/contracts/', { params }),
    ]).then(([p, partiesRes, c]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setParties(partiesRes.data?.results ?? partiesRes.data ?? []);
      setContracts(c.data?.results ?? c.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(), searchQ ? 300 : 0);
    return () => clearTimeout(t);
  }, [filterProject, searchQ]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    const payload = {
      ...form,
      project: Number(form.project),
      party: form.party ? Number(form.party) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    client.post('/contracts/', payload)
      .then(() => {
        toast.success('Contract created');
        setShowForm(false);
        setForm({ project: '', party: '', title: '', contractor_name: '', total_value: '', status: 'draft', start_date: '', end_date: '', notes: '' });
        load();
      })
      .catch((err) => {
        const msgs = apiErrors(err);
        setFormErrors(msgs);
        if (msgs[0]) toast.error(msgs[0]);
      });
  };

  const deleteContract = (id: number, title: string) => {
    if (!confirm(`Delete contract "${title}"? This will remove all payment schedules.`)) return;
    client.delete(`/contracts/${id}/`)
      .then(() => { toast.success('Contract deleted'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Delete failed'));
  };

  const updateContractStatus = (id: number, status: string) => {
    client.patch(`/contracts/${id}/`, { status })
      .then(() => { toast.success('Status updated'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Update failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Contract Management" subtitle="Contracts and payment schedules" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add contract'}</button>
          <input type="search" placeholder="Search title or contractor…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ padding: '0.5rem', minWidth: 200 }} />
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {formErrors.length > 0 && (
          <ul className="form-errors" style={{ color: 'var(--danger)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>{formErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        )}
        {showForm && (
          <form onSubmit={handleCreate} className="form-inline" style={{ flexWrap: 'wrap' }}>
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}>
              <option value="">Party (optional)</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Contract title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input placeholder="Contractor name" value={form.contractor_name} onChange={(e) => setForm({ ...form, contractor_name: e.target.value })} required />
            <input type="number" step="0.01" placeholder="Total value" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} required />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
            </select>
            <input type="date" placeholder="Start" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <input type="date" placeholder="End" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            <button type="submit" className="btn-primary">Create</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>Project</th><th>Title</th><th>Contractor / Party</th><th className="num">Total</th><th>Status</th><th>Payments</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id}>
                <td>{projectName(c.project)}</td>
                <td><strong>{c.title}</strong></td>
                <td>{c.party_name || c.contractor_name}</td>
                <td className="num">{formatRs(c.total_value)}</td>
                <td>
                  <select
                    className={`status-select status-${c.status}`}
                    value={c.status}
                    onChange={(e) => updateContractStatus(c.id, e.target.value)}
                    aria-label={`Change status for ${c.title}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </td>
                <td>
                  <Link to={`/contracts/${c.id}`} className="btn-action btn-action-primary">View & manage schedules</Link>
                  {' '}({c.payment_schedules?.length ?? 0})
                </td>
                <td>
                  <div className="table-actions">
                    <Link to={`/contracts/${c.id}`} className="btn-action btn-action-primary">Edit</Link>
                    <button type="button" className="btn-action btn-action-danger" onClick={() => deleteContract(c.id, c.title)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contracts.length === 0 && <div className="empty-state">No contracts yet. Add a contract to get started.</div>}
      </Card>
    </>
  );
}
