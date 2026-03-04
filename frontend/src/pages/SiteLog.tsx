import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type DailyLog = { id: number; project: number; log_date: string; weather: string; manpower_count: number | null; work_done: string };
type Issue = { id: number; project: number; title: string; status: string; severity: string; is_ncr: boolean; status_display?: string; severity_display?: string };

export default function SiteLog() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'logs' | 'issues'>('issues');
  const [filterProject, setFilterProject] = useState<string>('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [logForm, setLogForm] = useState({ project: '', log_date: new Date().toISOString().slice(0, 10), weather: '', manpower_count: '', work_done: '' });
  const [issueForm, setIssueForm] = useState({ project: '', title: '', status: 'open', severity: 'medium', is_ncr: false });

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/site/daily-logs/', { params: filterProject ? { project: filterProject } : {} }),
      client.get('/site/issues/', { params: filterProject ? { project: filterProject } : {} }),
    ]).then(([p, l, i]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setLogs(l.data?.results ?? l.data ?? []);
      setIssues(i.data?.results ?? i.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject]);

  const addLog = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/site/daily-logs/', { project: Number(logForm.project), log_date: logForm.log_date, weather: logForm.weather, manpower_count: logForm.manpower_count ? Number(logForm.manpower_count) : null, work_done: logForm.work_done }).then(() => { toast.success('Daily log added'); setShowLogForm(false); setLogForm({ project: '', log_date: new Date().toISOString().slice(0, 10), weather: '', manpower_count: '', work_done: '' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };
  const addIssue = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/site/issues/', { project: Number(issueForm.project), title: issueForm.title, status: issueForm.status, severity: issueForm.severity, is_ncr: issueForm.is_ncr }).then(() => { toast.success('Issue added'); setShowIssueForm(false); setIssueForm({ project: '', title: '', status: 'open', severity: 'medium', is_ncr: false }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };
  const deleteLog = (id: number) => { if (!confirm('Delete this log?')) return; client.delete(`/site/daily-logs/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0])); };
  const deleteIssue = (id: number) => { if (!confirm('Delete this issue?')) return; client.delete(`/site/issues/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0])); };
  const updateIssueStatus = (id: number, status: string) => {
    client.patch(`/site/issues/${id}/`, { status }).then(() => { toast.success('Status updated'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Update failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Daily Site Log" subtitle="Rozana site ka kaam, weather, manpower" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className={tab === 'issues' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('issues')}>Issues / NCR</button>
          <button type="button" className={tab === 'logs' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('logs')}>Daily logs</button>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {tab === 'logs' && <button type="button" className="btn-primary" onClick={() => setShowLogForm(!showLogForm)}>{showLogForm ? 'Cancel' : '+ Add log'}</button>}
          {tab === 'issues' && <button type="button" className="btn-primary" onClick={() => setShowIssueForm(!showIssueForm)}>{showIssueForm ? 'Cancel' : '+ Add issue'}</button>}
        </div>
        {tab === 'logs' && showLogForm && (
          <form onSubmit={addLog} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={logForm.project} onChange={(e) => setLogForm({ ...logForm, project: e.target.value })} required><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type="date" value={logForm.log_date} onChange={(e) => setLogForm({ ...logForm, log_date: e.target.value })} required />
            <input placeholder="Weather" value={logForm.weather} onChange={(e) => setLogForm({ ...logForm, weather: e.target.value })} />
            <input type="number" placeholder="Manpower" value={logForm.manpower_count} onChange={(e) => setLogForm({ ...logForm, manpower_count: e.target.value })} />
            <input placeholder="Work done" value={logForm.work_done} onChange={(e) => setLogForm({ ...logForm, work_done: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'issues' && showIssueForm && (
          <form onSubmit={addIssue} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={issueForm.project} onChange={(e) => setIssueForm({ ...issueForm, project: e.target.value })} required><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input placeholder="Title" value={issueForm.title} onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })} required />
            <select value={issueForm.status} onChange={(e) => setIssueForm({ ...issueForm, status: e.target.value })}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="closed">Closed</option></select>
            <select value={issueForm.severity} onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={issueForm.is_ncr} onChange={(e) => setIssueForm({ ...issueForm, is_ncr: e.target.checked })} />NCR</label>
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'logs' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Date</th><th>Weather</th><th>Manpower</th><th>Work done</th><th>Actions</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{projectName(l.project)}</td>
                    <td>{l.log_date}</td>
                    <td>{l.weather || '—'}</td>
                    <td>{l.manpower_count ?? '—'}</td>
                    <td style={{ maxWidth: 200 }}>{l.work_done ? `${l.work_done.slice(0, 80)}${l.work_done.length > 80 ? '…' : ''}` : '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteLog(l.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'issues' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Title</th><th>Status</th><th>Severity</th><th>NCR</th><th>Actions</th></tr></thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.id}>
                    <td>{projectName(i.project)}</td>
                    <td><strong>{i.title}</strong></td>
                    <td>
                      <select
                        className={`status-select status-${i.status}`}
                        value={i.status}
                        onChange={(e) => updateIssueStatus(i.id, e.target.value)}
                        aria-label={`Change status for ${i.title}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td><span className="badge badge-active">{i.severity_display ?? i.severity}</span></td>
                    <td>{i.is_ncr ? 'Yes' : '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteIssue(i.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {((tab === 'logs' && logs.length === 0) || (tab === 'issues' && issues.length === 0)) && <div className="empty-state">No data yet.</div>}
      </Card>
    </>
  );
}
