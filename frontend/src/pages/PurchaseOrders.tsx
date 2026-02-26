import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Party = { id: number; name: string };
type PO = {
  id: number;
  project: number;
  supplier: number | null;
  po_number: string;
  status: string;
  order_date: string | null;
  expected_date: string | null;
  notes?: string;
};

const PO_STATUSES = ['draft', 'approved', 'ordered', 'received', 'cancelled'];

export default function PurchaseOrders() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [list, setList] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    project: '', supplier: '', po_number: '', status: 'draft', order_date: '', expected_date: '', notes: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/parties/'),
      client.get('/purchase-orders/', { params: filterProject ? { project: filterProject } : {} }),
    ]).then(([p, partiesRes, po]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setParties(partiesRes.data?.results ?? partiesRes.data ?? []);
      setList(po.data?.results ?? po.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProject]);

  const suppliers = parties.filter((p) => p.id); // all parties can be suppliers
  const openCreate = () => {
    setEditingId(null);
    setForm({ project: '', supplier: '', po_number: '', status: 'draft', order_date: '', expected_date: '', notes: '' });
    setFormErrors([]);
    setShowForm(true);
  };
  const openEdit = (po: PO) => {
    setEditingId(po.id);
    setForm({
      project: String(po.project),
      supplier: po.supplier ? String(po.supplier) : '',
      po_number: po.po_number || '',
      status: po.status,
      order_date: po.order_date || '',
      expected_date: po.expected_date || '',
      notes: po.notes || '',
    });
    setFormErrors([]);
    setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditingId(null); setFormErrors([]); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    const payload = {
      project: Number(form.project),
      supplier: form.supplier ? Number(form.supplier) : null,
      po_number: form.po_number || '',
      status: form.status,
      order_date: form.order_date || null,
      expected_date: form.expected_date || null,
      notes: form.notes || '',
    };
    if (editingId) {
      client.patch(`/purchase-orders/${editingId}/`, payload)
        .then(() => { toast.success('Purchase order updated'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    } else {
      client.post('/purchase-orders/', payload)
        .then(() => { toast.success('Purchase order created'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    }
  };

  const deletePO = (id: number) => {
    if (!confirm('Delete this purchase order?')) return;
    client.delete(`/purchase-orders/${id}/`)
      .then(() => { toast.success('Purchase order deleted'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Delete failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;
  const supplierName = (id: number | null) => (id ? parties.find((p) => p.id === id)?.name : '—') ?? '—';

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="Track POs by project and supplier" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => showForm ? cancelForm() : openCreate()}>{showForm ? 'Cancel' : '+ Add PO'}</button>
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
            <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
              <option value="">Supplier (optional)</option>
              {suppliers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="PO number" value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {PO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" placeholder="Order date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
            <input type="date" placeholder="Expected date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} />
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>PO #</th><th>Project</th><th>Supplier</th><th>Status</th><th>Order date</th><th>Expected</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((po) => (
              <tr key={po.id}>
                <td><strong>{po.po_number || `PO-${po.id}`}</strong></td>
                <td>{projectName(po.project)}</td>
                <td>{supplierName(po.supplier)}</td>
                <td><span className={`badge badge-${po.status}`}>{po.status}</span></td>
                <td>{po.order_date || '—'}</td>
                <td>{po.expected_date || '—'}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn-action" onClick={() => openEdit(po)}>Edit</button>
                    <button type="button" className="btn-action btn-action-danger" onClick={() => deletePO(po.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !showForm && <div className="empty-state">No purchase orders yet.</div>}
      </Card>
    </>
  );
}
