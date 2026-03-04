import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type ClientItem = {
  id: number;
  company: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
};

export default function Clients() {
  const toast = useToast();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '', contact_person: '', email: '', phone: '', address: '', notes: '',
  });

  const load = () => {
    client.get('/auth/clients/')
      .then((r) => setClients(r.data?.results ?? r.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      client.patch(`/auth/clients/${editingId}/`, form)
        .then(() => { toast.success('Client updated'); setEditingId(null); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }); load(); })
        .catch((err) => toast.error(apiErrors(err)[0] || 'Update failed'));
    } else {
      client.post('/auth/clients/', form)
        .then(() => { toast.success('Client added'); setShowForm(false); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }); load(); })
        .catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
    }
  };

  const deleteClient = (id: number) => {
    if (!confirm('Delete this client?')) return;
    client.delete(`/auth/clients/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const startEdit = (c: ClientItem) => {
    setEditingId(c.id);
    setForm({ name: c.name, contact_person: c.contact_person || '', email: c.email || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Clients" subtitle="Clients for projects and client portal" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          {!editingId && <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add client'}</button>}
          {editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }); }}>Cancel edit</button>}
        </div>
        {(showForm || editingId) && (
          <form onSubmit={save} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input placeholder="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ minWidth: 200 }} />
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'}</button>
          </form>
        )}
        <div className="table-responsive">
          <table className="table table-mobile-stack">
            <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.contact_person || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn-action" onClick={() => startEdit(c)}>Edit</button>
                      <button type="button" className="btn-action btn-action-danger" onClick={() => deleteClient(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clients.length === 0 && !showForm && <div className="empty-state">No clients yet.</div>}
      </Card>
    </>
  );
}
