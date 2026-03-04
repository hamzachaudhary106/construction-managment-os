import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Incident = { id: number; project: number; project_name?: string; title: string; description: string; incident_date: string; severity: string; severity_display?: string; location: string; corrective_action: string };
type ToolboxTalk = { id: number; project: number; project_name?: string; topic: string; talk_date: string; attendees_count: number | null; notes: string };

export default function Safety() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [talks, setTalks] = useState<ToolboxTalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'incidents' | 'talks'>('incidents');
  const [filterProject, setFilterProject] = useState<string>('');
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showTalkForm, setShowTalkForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ project: '', title: '', description: '', incident_date: new Date().toISOString().slice(0, 10), severity: 'medium', location: '', corrective_action: '' });
  const [talkForm, setTalkForm] = useState({ project: '', topic: '', talk_date: new Date().toISOString().slice(0, 10), attendees_count: '', notes: '' });

  const load = () => {
    const params = filterProject ? { project: filterProject } : {};
    Promise.all([
      client.get('/projects/'),
      client.get('/safety/incidents/', { params }),
      client.get('/safety/toolbox-talks/', { params }),
    ]).then(([p, i, t]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setIncidents(i.data?.results ?? i.data ?? []);
      setTalks(t.data?.results ?? t.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject]);

  const addIncident = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/safety/incidents/', { project: Number(incidentForm.project), title: incidentForm.title, description: incidentForm.description || undefined, incident_date: incidentForm.incident_date, severity: incidentForm.severity, location: incidentForm.location || undefined, corrective_action: incidentForm.corrective_action || undefined })
      .then(() => { toast.success('Incident added'); setShowIncidentForm(false); setIncidentForm({ project: '', title: '', description: '', incident_date: new Date().toISOString().slice(0, 10), severity: 'medium', location: '', corrective_action: '' }); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const addTalk = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/safety/toolbox-talks/', { project: Number(talkForm.project), topic: talkForm.topic, talk_date: talkForm.talk_date, attendees_count: talkForm.attendees_count ? Number(talkForm.attendees_count) : null, notes: talkForm.notes || undefined })
      .then(() => { toast.success('Toolbox talk added'); setShowTalkForm(false); setTalkForm({ project: '', topic: '', talk_date: new Date().toISOString().slice(0, 10), attendees_count: '', notes: '' }); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const deleteIncident = (id: number) => {
    if (!confirm('Delete this incident?')) return;
    client.delete(`/safety/incidents/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const deleteTalk = (id: number) => {
    if (!confirm('Delete this toolbox talk?')) return;
    client.delete(`/safety/toolbox-talks/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Safety" subtitle="Incidents and toolbox talks" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className={tab === 'incidents' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('incidents')}>Incidents</button>
          <button type="button" className={tab === 'talks' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('talks')}>Toolbox talks</button>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          {tab === 'incidents' && <button type="button" className="btn-primary" onClick={() => setShowIncidentForm(!showIncidentForm)}>{showIncidentForm ? 'Cancel' : '+ Add incident'}</button>}
          {tab === 'talks' && <button type="button" className="btn-primary" onClick={() => setShowTalkForm(!showTalkForm)}>{showTalkForm ? 'Cancel' : '+ Add toolbox talk'}</button>}
        </div>
        {tab === 'incidents' && showIncidentForm && (
          <form onSubmit={addIncident} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={incidentForm.project} onChange={(e) => setIncidentForm({ ...incidentForm, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            <input placeholder="Title" value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} required />
            <input type="date" value={incidentForm.incident_date} onChange={(e) => setIncidentForm({ ...incidentForm, incident_date: e.target.value })} required />
            <select value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input placeholder="Location" value={incidentForm.location} onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })} />
            <textarea placeholder="Description" value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} />
            <textarea placeholder="Corrective action" value={incidentForm.corrective_action} onChange={(e) => setIncidentForm({ ...incidentForm, corrective_action: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'talks' && showTalkForm && (
          <form onSubmit={addTalk} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={talkForm.project} onChange={(e) => setTalkForm({ ...talkForm, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            <input placeholder="Topic" value={talkForm.topic} onChange={(e) => setTalkForm({ ...talkForm, topic: e.target.value })} required />
            <input type="date" value={talkForm.talk_date} onChange={(e) => setTalkForm({ ...talkForm, talk_date: e.target.value })} required />
            <input type="number" placeholder="Attendees" value={talkForm.attendees_count} onChange={(e) => setTalkForm({ ...talkForm, attendees_count: e.target.value })} />
            <input placeholder="Notes" value={talkForm.notes} onChange={(e) => setTalkForm({ ...talkForm, notes: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'incidents' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Title</th><th>Date</th><th>Severity</th><th>Location</th><th>Actions</th></tr></thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
                    <td>{i.project_name ?? projectName(i.project)}</td>
                    <td><strong>{i.title}</strong></td>
                    <td>{i.incident_date}</td>
                    <td><span className="badge badge-active">{i.severity_display ?? i.severity}</span></td>
                    <td>{i.location || '—'}</td>
                    <td><button type="button" className="btn-action btn-action-danger" onClick={() => deleteIncident(i.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'talks' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Topic</th><th>Date</th><th>Attendees</th><th>Actions</th></tr></thead>
              <tbody>
                {talks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.project_name ?? projectName(t.project)}</td>
                    <td><strong>{t.topic}</strong></td>
                    <td>{t.talk_date}</td>
                    <td>{t.attendees_count ?? '—'}</td>
                    <td><button type="button" className="btn-action btn-action-danger" onClick={() => deleteTalk(t.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {((tab === 'incidents' && incidents.length === 0) || (tab === 'talks' && talks.length === 0)) && <div className="empty-state">No data yet.</div>}
      </Card>
    </>
  );
}
