import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Phase = { id: number; name: string; project: number };
type Photo = {
  id: number;
  project: number;
  phase: number | null;
  image: string;
  caption: string;
  photo_date: string;
  created_at: string;
};

export default function ProgressPhotos() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterPhase, setFilterPhase] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project: '',
    phase: '',
    caption: '',
    photo_date: new Date().toISOString().slice(0, 10),
    image: null as File | null,
  });

  const load = () => {
    const params: Record<string, string> = {};
    if (filterProject) params.project = filterProject;
    if (filterPhase) params.phase = filterPhase;
    Promise.all([
      client.get('/projects/'),
      client.get('/projects/phases/', { params: filterProject ? { project: filterProject } : {} }),
      client.get('/projects/progress-photos/', { params }),
    ]).then(([p, ph, pho]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setPhases(ph.data?.results ?? ph.data ?? []);
      setPhotos(pho.data?.results ?? pho.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject, filterPhase]);

  const upload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project || !form.photo_date || !form.image) {
      toast.error('Project, date and image are required');
      return;
    }
    const fd = new FormData();
    fd.append('project', form.project);
    fd.append('photo_date', form.photo_date);
    fd.append('image', form.image);
    if (form.phase) fd.append('phase', form.phase);
    if (form.caption) fd.append('caption', form.caption);
    client.post('/projects/progress-photos/', fd)
      .then(() => {
        toast.success('Photo uploaded');
        setShowForm(false);
        setForm({ project: '', phase: '', caption: '', photo_date: new Date().toISOString().slice(0, 10), image: null });
        load();
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Upload failed'));
  };

  const deletePhoto = (id: number) => {
    if (!confirm('Delete this photo?')) return;
    client.delete(`/projects/progress-photos/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;
  const phaseName = (id: number) => phases.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Progress Photos" subtitle="Upload and view progress photos by project and phase" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setFilterPhase(''); }} style={{ padding: '0.5rem' }}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <select value={filterPhase} onChange={(e) => setFilterPhase(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All phases</option>
            {phases.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Upload photo'}</button>
        </div>
        {showForm && (
          <form onSubmit={upload} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            <select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
              <option value="">Phase (optional)</option>
              {phases.filter((ph) => String(ph.project) === form.project).map((ph) => <option key={ph.id} value={String(ph.id)}>{ph.name}</option>)}
            </select>
            <input type="date" value={form.photo_date} onChange={(e) => setForm({ ...form, photo_date: e.target.value })} required />
            <input placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
            <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] ?? null })} required />
            <button type="submit" className="btn-primary">Upload</button>
          </form>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {photos.map((ph) => (
            <div key={ph.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '4/3', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ph.image ? (
                  <img src={ph.image.startsWith('http') ? ph.image : `/media/${ph.image}`} alt={ph.caption || 'Progress'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No image</span>
                )}
              </div>
              <div style={{ padding: '0.5rem 0.75rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{projectName(ph.project)}{ph.phase ? ` · ${phaseName(ph.phase)}` : ''}</div>
                <div style={{ fontWeight: 600 }}>{ph.photo_date}</div>
                {ph.caption && <div style={{ fontSize: '0.9rem' }}>{ph.caption}</div>}
                <button type="button" className="btn-action btn-action-danger" style={{ marginTop: 4 }} onClick={() => deletePhoto(ph.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        {photos.length === 0 && <div className="empty-state">No progress photos yet.</div>}
      </Card>
    </>
  );
}
