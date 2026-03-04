import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Allocation = {
  id: number;
  equipment: number;
  equipment_name: string;
  project: number;
  project_name: string;
  from_date: string;
  to_date: string | null;
  rate_per_day: string | null;
};
type Maintenance = {
  id: number;
  equipment: number;
  equipment_name: string;
  maintenance_date: string;
  maintenance_type: string;
  maintenance_type_display?: string;
  description: string;
  cost: string | null;
  next_due_date: string | null;
  performed_by: string;
};

export default function Equipment() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [equipment, setEquipment] = useState<{ id: number; name: string; equipment_type: string; owner_type: string }[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'equipment' | 'allocations' | 'maintenance'>('allocations');
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [equipForm, setEquipForm] = useState({ name: '', equipment_type: '', owner_type: 'owned' });
  const [allocForm, setAllocForm] = useState({ equipment: '', project: '', from_date: '', to_date: '', rate_per_day: '' });
  const [maintForm, setMaintForm] = useState({ equipment: '', maintenance_date: new Date().toISOString().slice(0, 10), maintenance_type: 'scheduled', description: '', cost: '', next_due_date: '', performed_by: '' });

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/equipment/'),
      client.get('/equipment/allocations/'),
      client.get('/equipment/maintenance/'),
    ]).then(([p, e, a, m]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setEquipment(e.data?.results ?? e.data ?? []);
      setAllocations(a.data?.results ?? a.data ?? []);
      setMaintenance(m.data?.results ?? m.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/equipment/', equipForm).then(() => { toast.success('Equipment added'); setShowEquipForm(false); setEquipForm({ name: '', equipment_type: '', owner_type: 'owned' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };
  const addAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/equipment/allocations/', { equipment: Number(allocForm.equipment), project: Number(allocForm.project), from_date: allocForm.from_date, to_date: allocForm.to_date || null, rate_per_day: allocForm.rate_per_day || null }).then(() => { toast.success('Allocation added'); setShowAllocForm(false); setAllocForm({ equipment: '', project: '', from_date: '', to_date: '', rate_per_day: '' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };
  const deleteEquipment = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    client.delete(`/equipment/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };
  const deleteAllocation = (id: number) => {
    if (!confirm('Remove this allocation?')) return;
    client.delete(`/equipment/allocations/${id}/`).then(() => { toast.success('Removed'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };
  const addMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/equipment/maintenance/', {
      equipment: Number(maintForm.equipment),
      maintenance_date: maintForm.maintenance_date,
      maintenance_type: maintForm.maintenance_type,
      description: maintForm.description || undefined,
      cost: maintForm.cost ? Number(maintForm.cost) : null,
      next_due_date: maintForm.next_due_date || null,
      performed_by: maintForm.performed_by || undefined,
    }).then(() => { toast.success('Maintenance recorded'); setShowMaintForm(false); setMaintForm({ equipment: '', maintenance_date: new Date().toISOString().slice(0, 10), maintenance_type: 'scheduled', description: '', cost: '', next_due_date: '', performed_by: '' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };
  const deleteMaintenance = (id: number) => {
    if (!confirm('Delete this maintenance record?')) return;
    client.delete(`/equipment/maintenance/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Equipment & Plant" subtitle="Equipment and project allocations" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className={tab === 'allocations' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('allocations')}>Allocations</button>
          <button type="button" className={tab === 'equipment' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('equipment')}>Equipment</button>
          <button type="button" className={tab === 'maintenance' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('maintenance')}>Maintenance</button>
          {tab === 'allocations' && <button type="button" className="btn-primary" onClick={() => setShowAllocForm(!showAllocForm)}>{showAllocForm ? 'Cancel' : '+ Add allocation'}</button>}
          {tab === 'equipment' && <button type="button" className="btn-primary" onClick={() => setShowEquipForm(!showEquipForm)}>{showEquipForm ? 'Cancel' : '+ Add equipment'}</button>}
          {tab === 'maintenance' && <button type="button" className="btn-primary" onClick={() => setShowMaintForm(!showMaintForm)}>{showMaintForm ? 'Cancel' : '+ Add maintenance'}</button>}
        </div>
        {tab === 'allocations' && showAllocForm && (
          <form onSubmit={addAllocation} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={allocForm.equipment} onChange={(e) => setAllocForm({ ...allocForm, equipment: e.target.value })} required>
              <option value="">Equipment</option>
              {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
            <select value={allocForm.project} onChange={(e) => setAllocForm({ ...allocForm, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={allocForm.from_date} onChange={(e) => setAllocForm({ ...allocForm, from_date: e.target.value })} required />
            <input type="date" value={allocForm.to_date} onChange={(e) => setAllocForm({ ...allocForm, to_date: e.target.value })} />
            <input type="number" step="0.01" placeholder="Rate/day" value={allocForm.rate_per_day} onChange={(e) => setAllocForm({ ...allocForm, rate_per_day: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'equipment' && showEquipForm && (
          <form onSubmit={addEquipment} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input placeholder="Name" value={equipForm.name} onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })} required />
            <input placeholder="Type" value={equipForm.equipment_type} onChange={(e) => setEquipForm({ ...equipForm, equipment_type: e.target.value })} />
            <select value={equipForm.owner_type} onChange={(e) => setEquipForm({ ...equipForm, owner_type: e.target.value })}>
              <option value="owned">Owned</option>
              <option value="hired">Hired</option>
            </select>
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'maintenance' && showMaintForm && (
          <form onSubmit={addMaintenance} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={maintForm.equipment} onChange={(e) => setMaintForm({ ...maintForm, equipment: e.target.value })} required>
              <option value="">Equipment</option>
              {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
            <input type="date" value={maintForm.maintenance_date} onChange={(e) => setMaintForm({ ...maintForm, maintenance_date: e.target.value })} required />
            <select value={maintForm.maintenance_type} onChange={(e) => setMaintForm({ ...maintForm, maintenance_type: e.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
              <option value="other">Other</option>
            </select>
            <input type="number" step="0.01" placeholder="Cost" value={maintForm.cost} onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })} />
            <input type="date" placeholder="Next due" value={maintForm.next_due_date} onChange={(e) => setMaintForm({ ...maintForm, next_due_date: e.target.value })} />
            <input placeholder="Performed by" value={maintForm.performed_by} onChange={(e) => setMaintForm({ ...maintForm, performed_by: e.target.value })} />
            <input placeholder="Description" value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        {tab === 'allocations' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Equipment</th><th>Project</th><th>From</th><th>To</th><th className="num">Rate/day</th><th>Actions</th></tr></thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.equipment_name}</strong></td>
                    <td>{a.project_name}</td>
                    <td>{a.from_date}</td>
                    <td>{a.to_date || '—'}</td>
                    <td className="num">{a.rate_per_day ? formatRs(a.rate_per_day) : '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteAllocation(a.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'equipment' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Name</th><th>Type</th><th>Owner</th><th>Actions</th></tr></thead>
              <tbody>
                {equipment.map((e) => (
                  <tr key={e.id}>
                    <td><strong>{e.name}</strong></td>
                    <td>{e.equipment_type || '—'}</td>
                    <td><span className="badge badge-active">{e.owner_type}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteEquipment(e.id, e.name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'maintenance' && (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Equipment</th><th>Date</th><th>Type</th><th className="num">Cost</th><th>Next due</th><th>Performed by</th><th>Actions</th></tr></thead>
              <tbody>
                {maintenance.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.equipment_name}</strong></td>
                    <td>{m.maintenance_date}</td>
                    <td><span className="badge badge-active">{m.maintenance_type_display ?? m.maintenance_type}</span></td>
                    <td className="num">{m.cost != null ? formatRs(m.cost) : '—'}</td>
                    <td>{m.next_due_date || '—'}</td>
                    <td>{m.performed_by || '—'}</td>
                    <td><button type="button" className="btn-action btn-action-danger" onClick={() => deleteMaintenance(m.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {((tab === 'allocations' && allocations.length === 0) || (tab === 'equipment' && equipment.length === 0) || (tab === 'maintenance' && maintenance.length === 0)) && <div className="empty-state">No data yet.</div>}
      </Card>
    </>
  );
}
