import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Material = { id: number; name: string; unit: string; category: string };
type ProjectMaterial = {
  id: number;
  project: number;
  project_name?: string;
  material: number;
  material_name?: string;
  material_unit?: string;
  quantity_required: string;
  quantity_used: string;
  reorder_level: string | null;
  notes: string;
};

export default function Materials() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'catalog' | 'project'>('project');
  const [filterProject, setFilterProject] = useState<string>('');
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showProjectMaterialForm, setShowProjectMaterialForm] = useState(false);
  const [materialForm, setMaterialForm] = useState({ name: '', unit: 'Nos', category: '' });
  const [projectMaterialForm, setProjectMaterialForm] = useState({
    project: '', material: '', quantity_required: '', quantity_used: '', reorder_level: '', notes: '',
  });

  const load = () => {
    const pmParams = filterProject ? { project: filterProject } : {};
    Promise.all([
      client.get('/projects/'),
      client.get('/materials/'),
      client.get('/materials/project-materials/', { params: pmParams }),
    ]).then(([p, m, pm]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setMaterials(m.data?.results ?? m.data ?? []);
      setProjectMaterials(pm.data?.results ?? pm.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject]);

  const addMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/materials/', { name: materialForm.name, unit: materialForm.unit, category: materialForm.category || undefined })
      .then(() => { toast.success('Material added'); setShowMaterialForm(false); setMaterialForm({ name: '', unit: 'Nos', category: '' }); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const addProjectMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/materials/project-materials/', {
      project: Number(projectMaterialForm.project),
      material: Number(projectMaterialForm.material),
      quantity_required: projectMaterialForm.quantity_required || 0,
      quantity_used: projectMaterialForm.quantity_used || 0,
      reorder_level: projectMaterialForm.reorder_level || null,
      notes: projectMaterialForm.notes || undefined,
    }).then(() => {
      toast.success('Project material added');
      setShowProjectMaterialForm(false);
      setProjectMaterialForm({ project: '', material: '', quantity_required: '', quantity_used: '', reorder_level: '', notes: '' });
      load();
    }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const deleteProjectMaterial = (id: number) => {
    if (!confirm('Remove this from project?')) return;
    client.delete(`/materials/project-materials/${id}/`).then(() => { toast.success('Removed'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Materials" subtitle="Material catalog and project usage" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className={tab === 'project' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('project')}>Project materials</button>
          <button type="button" className={tab === 'catalog' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('catalog')}>Catalog</button>
          {tab === 'project' && (
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ padding: '0.5rem' }}>
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          )}
          {tab === 'project' && <button type="button" className="btn-primary" onClick={() => setShowProjectMaterialForm(!showProjectMaterialForm)}>{showProjectMaterialForm ? 'Cancel' : '+ Add to project'}</button>}
          {tab === 'catalog' && <button type="button" className="btn-primary" onClick={() => setShowMaterialForm(!showMaterialForm)}>{showMaterialForm ? 'Cancel' : '+ Add material'}</button>}
        </div>
        {tab === 'catalog' && showMaterialForm && (
          <form onSubmit={addMaterial} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input placeholder="Name" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} required />
            <input placeholder="Unit" value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} />
            <input placeholder="Category" value={materialForm.category} onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'project' && showProjectMaterialForm && (
          <form onSubmit={addProjectMaterial} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={projectMaterialForm.project} onChange={(e) => setProjectMaterialForm({ ...projectMaterialForm, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            <select value={projectMaterialForm.material} onChange={(e) => setProjectMaterialForm({ ...projectMaterialForm, material: e.target.value })} required>
              <option value="">Material</option>
              {materials.map((m) => <option key={m.id} value={String(m.id)}>{m.name} ({m.unit})</option>)}
            </select>
            <input type="number" step="any" placeholder="Qty required" value={projectMaterialForm.quantity_required} onChange={(e) => setProjectMaterialForm({ ...projectMaterialForm, quantity_required: e.target.value })} />
            <input type="number" step="any" placeholder="Qty used" value={projectMaterialForm.quantity_used} onChange={(e) => setProjectMaterialForm({ ...projectMaterialForm, quantity_used: e.target.value })} />
            <input type="number" step="any" placeholder="Reorder level" value={projectMaterialForm.reorder_level} onChange={(e) => setProjectMaterialForm({ ...projectMaterialForm, reorder_level: e.target.value })} />
            <input placeholder="Notes" value={projectMaterialForm.notes} onChange={(e) => setProjectMaterialForm({ ...projectMaterialForm, notes: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'catalog' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Name</th><th>Unit</th><th>Category</th></tr></thead>
              <tbody>
                {materials.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.unit}</td><td>{m.category || '—'}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'project' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Material</th><th>Required</th><th>Used</th><th>Reorder</th><th>Actions</th></tr></thead>
              <tbody>
                {projectMaterials.map((pm) => (
                  <tr key={pm.id}>
                    <td>{pm.project_name ?? projectName(pm.project)}</td>
                    <td>{pm.material_name ?? pm.material} {pm.material_unit ? `(${pm.material_unit})` : ''}</td>
                    <td>{pm.quantity_required}</td>
                    <td>{pm.quantity_used}</td>
                    <td>{pm.reorder_level ?? '—'}</td>
                    <td><button type="button" className="btn-action btn-action-danger" onClick={() => deleteProjectMaterial(pm.id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {((tab === 'catalog' && materials.length === 0) || (tab === 'project' && projectMaterials.length === 0)) && <div className="empty-state">No data yet.</div>}
      </Card>
    </>
  );
}
