import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Party = {
  id: number;
  party_type: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  tax_id: string;
  address: string;
  notes: string;
};

const emptyForm: {
  party_type: 'subcontractor' | 'supplier';
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  tax_id: string;
  address: string;
  notes: string;
} = {
  party_type: 'subcontractor',
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  tax_id: '',
  address: '',
  notes: '',
};

export default function Parties() {
  const toast = useToast();
  const [list, setList] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [filterType, setFilterType] = useState<string>('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = () => {
    client.get('/parties/', { params: filterType ? { party_type: filterType } : {} })
      .then((r) => setList(r.data?.results ?? r.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterType]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormErrors([]); setShowForm(true); };
  const openEdit = (p: Party) => {
    setEditingId(p.id);
    setForm({
      party_type: p.party_type as 'subcontractor' | 'supplier',
      name: p.name,
      contact_person: p.contact_person || '',
      phone: p.phone || '',
      email: p.email || '',
      tax_id: p.tax_id || '',
      address: p.address || '',
      notes: p.notes || '',
    });
    setFormErrors([]);
    setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setFormErrors([]); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    if (editingId) {
      client.patch(`/parties/${editingId}/`, form)
        .then(() => { toast.success('Party updated'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    } else {
      client.post('/parties/', form)
        .then(() => { toast.success('Party created'); cancelForm(); load(); })
        .catch((err) => { const msgs = apiErrors(err); setFormErrors(msgs); if (msgs[0]) toast.error(msgs[0]); });
    }
  };

  const deleteParty = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This may affect contracts linked to this party.`)) return;
    client.delete(`/parties/${id}/`)
      .then(() => { toast.success('Party deleted'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Delete failed'));
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Vendors & Subcontractors" subtitle="All your subcontractors and material suppliers" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => showForm ? cancelForm() : openCreate()}>
            {showForm ? 'Cancel' : '+ Add party'}
          </button>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All types</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="supplier">Supplier</option>
          </select>
        </div>
        {formErrors.length > 0 && (
          <ul className="form-errors" style={{ color: 'var(--danger)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>
            {formErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        {showForm && (
          <form onSubmit={handleSubmit} className="form-inline" style={{ flexWrap: 'wrap' }}>
            <select value={form.party_type} onChange={(e) => setForm({ ...form, party_type: e.target.value as 'subcontractor' | 'supplier' })}>
              <option value="subcontractor">Subcontractor</option>
              <option value="supplier">Supplier</option>
            </select>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Tax ID" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>Type</th><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td><span className="badge badge-active">{p.party_type}</span></td>
                <td><strong>{p.name}</strong></td>
                <td>{p.contact_person || '—'}</td>
                <td>{p.phone || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn-action" onClick={() => openEdit(p)}>Edit</button>
                    <button type="button" className="btn-action btn-action-danger" onClick={() => deleteParty(p.id, p.name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && !showForm && <div className="empty-state">No parties yet. Add a subcontractor or supplier.</div>}
      </Card>
    </>
  );
}
