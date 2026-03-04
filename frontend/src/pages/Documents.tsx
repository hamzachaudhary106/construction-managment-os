import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Doc = {
  id: number;
  project: number;
  title: string;
  doc_type: string;
  revision: string;
  file: string | null;
  doc_type_display?: string;
};

const DOC_TYPES = ['drawing', 'boq', 'variation', 'noc', 'contract', 'other'];

export default function Documents() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [list, setList] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project: '', title: '', doc_type: 'other', revision: '', notes: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/documents/', { params: filterProject ? { project: filterProject } : {} }),
    ]).then(([p, d]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setList(d.data?.results ?? d.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    const payload = new FormData();
    payload.append('project', form.project);
    payload.append('title', form.title);
    payload.append('doc_type', form.doc_type);
    if (form.revision) payload.append('revision', form.revision);
    if (form.notes) payload.append('notes', form.notes);
    if (selectedFile) payload.append('file', selectedFile);
    client.post('/documents/', payload)
      .then(() => {
        toast.success('Document added');
        setShowForm(false);
        setForm({ project: '', title: '', doc_type: 'other', revision: '', notes: '' });
        setSelectedFile(null);
        load();
      })
      .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); })
      .finally(() => setSubmitting(false));
  };

  const deleteDoc = (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    client.delete(`/documents/${id}/`).then(() => { toast.success('Document deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;
  const fileUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const base = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? '';
    const prefix = base ? base.replace(/\/api\/?$/, '') : '';
    return (prefix || '') + (path.startsWith('/') ? path : `/${path}`);
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Project Documents" subtitle="Drawings, BOQ, NOC, and other files" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add document'}</button>
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
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Revision" value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} />
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="muted">File (optional):</span>
              <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
              {selectedFile && <span className="muted">{selectedFile.name}</span>}
            </label>
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add'}</button>
          </form>
        )}
        <div className="table-responsive">
          <table className="table table-mobile-stack">
            <thead>
              <tr><th>Project</th><th>Title</th><th>Type</th><th>Revision</th><th>File</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td>{projectName(d.project)}</td>
                  <td><strong>{d.title}</strong></td>
                  <td>{d.doc_type_display ?? d.doc_type}</td>
                  <td>{d.revision || '—'}</td>
                  <td>{d.file ? <a href={fileUrl(d.file) ?? '#'} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn-action btn-action-danger" onClick={() => deleteDoc(d.id, d.title)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && !showForm && <div className="empty-state">No documents yet.</div>}
      </Card>
    </>
  );
}
