import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Bill = {
  id: number;
  project: number;
  description: string;
  billed_to_name?: string;
  billed_to_phone?: string;
  amount: string;
  wht_amount?: string | null;
  wht_certificate_number?: string;
  wht_tax_period?: string;
  due_date: string;
  expected_payment_date: string | null;
  status: string;
  paid_date: string | null;
};

export default function Bills() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project: '',
    description: '',
    billed_to_name: '',
    billed_to_phone: '',
    amount: '',
    due_date: '',
    expected_payment_date: '',
    status: 'pending',
  });
  const [filterStatus, setFilterStatus] = useState<string>(() => searchParams.get('status') || '');
  const [searchQ, setSearchQ] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkPaidDate, setBulkPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    billed_to_name: '',
    billed_to_phone: '',
    amount: '',
    wht_amount: '',
    wht_certificate_number: '',
    wht_tax_period: '',
    due_date: '',
    expected_payment_date: '',
    status: 'pending',
  });

  const load = () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (searchQ.trim()) params.search = searchQ.trim();
    Promise.all([
      client.get('/projects/'),
      client.get('/bills/', { params }),
    ]).then(([p, b]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setBills(b.data?.results ?? b.data ?? []);
      setSelectedIds(new Set());
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(), searchQ ? 300 : 0);
    return () => clearTimeout(t);
  }, [filterStatus, searchQ]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const pending = bills.filter((b) => b.status !== 'paid');
    if (selectedIds.size >= pending.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pending.map((b) => b.id)));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    client.post('/bills/', {
      ...form,
      project: Number(form.project),
      billed_to_name: form.billed_to_name || '',
      billed_to_phone: form.billed_to_phone || '',
      expected_payment_date: form.expected_payment_date || null,
    }).then(() => {
      toast.success('Bill created');
      setShowForm(false);
      setForm({
        project: '',
        description: '',
        billed_to_name: '',
        billed_to_phone: '',
        amount: '',
        due_date: '',
        expected_payment_date: '',
        status: 'pending',
      });
      load();
    }).catch((err) => {
      const msgs = apiErrors(err);
      setFormErrors(msgs);
      if (msgs.length) toast.error(msgs[0]);
    });
  };

  const updateStatus = (id: number, status: string, paid_date?: string) => {
    client.patch(`/bills/${id}/`, { status, paid_date: paid_date || null })
      .then(() => { toast.success('Bill updated'); load(); })
      .catch((err) => { toast.error(apiErrors(err)[0] || 'Update failed'); });
  };

  const bulkMarkPaid = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) { toast.error('Select at least one bill'); return; }
    client.post('/bills/bulk-mark-paid/', { bill_ids: ids, paid_date: bulkPaidDate })
      .then((r) => {
        toast.success(`${r.data.updated} bill(s) marked as paid`);
        load();
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Bulk update failed'));
  };

  const deleteBill = (id: number) => {
    if (!confirm('Delete this bill?')) return;
    client.delete(`/bills/${id}/`)
      .then(() => { toast.success('Bill deleted'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Delete failed'));
  };

  const downloadBillPdf = (id: number) => {
    client.get(`/bills/${id}/pdf/`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bill-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('PDF downloaded');
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Download failed'));
  };

  const sendBillPdfWhatsApp = (bill: Bill) => {
    if (!bill.billed_to_phone) {
      toast.error('Add a WhatsApp phone number (billed to phone) first.');
      return;
    }
    client.post(`/bills/${bill.id}/send-pdf-whatsapp/`)
      .then(() => toast.success('PDF sent to WhatsApp'))
      .catch((err) => toast.error(apiErrors(err)[0] || 'Send failed'));
  };

  const openEdit = (b: Bill) => {
    setEditingBill(b);
    setEditForm({
      description: b.description,
      billed_to_name: b.billed_to_name ?? '',
      billed_to_phone: b.billed_to_phone ?? '',
      amount: b.amount,
      wht_amount: b.wht_amount ?? '',
      wht_certificate_number: b.wht_certificate_number ?? '',
      wht_tax_period: b.wht_tax_period ?? '',
      due_date: b.due_date,
      expected_payment_date: b.expected_payment_date || '',
      status: b.status,
    });
  };
  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    client.patch(`/bills/${editingBill.id}/`, {
      description: editForm.description,
      billed_to_name: editForm.billed_to_name || '',
      billed_to_phone: editForm.billed_to_phone || '',
      amount: editForm.amount,
      wht_amount: editForm.wht_amount ? editForm.wht_amount : null,
      wht_certificate_number: editForm.wht_certificate_number || '',
      wht_tax_period: editForm.wht_tax_period || '',
      due_date: editForm.due_date,
      expected_payment_date: editForm.expected_payment_date || null,
      status: editForm.status,
    })
      .then(() => { toast.success('Bill updated'); setEditingBill(null); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Update failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;
  const pendingBills = bills.filter((b) => b.status !== 'paid');

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Bill Management" subtitle="Track paid, pending, and expected bills" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add bill'}</button>
          <input type="search" placeholder="Search description…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ padding: '0.5rem', minWidth: 160 }} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          {pendingBills.length > 0 && (
            <>
              <button type="button" className="btn-secondary" onClick={toggleSelectAll}>
                {selectedIds.size >= pendingBills.length ? 'Clear selection' : 'Select all pending'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <input type="date" value={bulkPaidDate} onChange={(e) => setBulkPaidDate(e.target.value)} style={{ padding: '0.5rem' }} />
                  <button type="button" className="btn-primary" onClick={bulkMarkPaid}>Mark {selectedIds.size} as paid</button>
                </>
              )}
            </>
          )}
        </div>
        {formErrors.length > 0 && (
          <ul className="form-errors" style={{ color: 'var(--danger)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>
            {formErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        {showForm && (
          <form onSubmit={handleCreate} className="form-inline">
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <input placeholder="Billed to (name)" value={form.billed_to_name} onChange={(e) => setForm({ ...form, billed_to_name: e.target.value })} />
            <input placeholder="Billed to phone (WhatsApp)" value={form.billed_to_phone} onChange={(e) => setForm({ ...form, billed_to_phone: e.target.value })} />
            <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <input type="date" placeholder="Due date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
            <input type="date" placeholder="Expected payment" value={form.expected_payment_date} onChange={(e) => setForm({ ...form, expected_payment_date: e.target.value })} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <button type="submit" className="btn-primary">Add</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                {pendingBills.length > 0 && (
                  <input type="checkbox" checked={selectedIds.size === pendingBills.length && pendingBills.length > 0} onChange={toggleSelectAll} aria-label="Select all pending" />
                )}
              </th>
              <th>Project</th>
              <th>Billed to</th>
              <th>Description</th>
              <th className="num">Amount</th>
              <th>Due</th>
              <th>Expected pay</th>
              <th>Status</th>
              <th style={{ width: '1%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.status !== 'paid' && (
                    <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} aria-label={`Select bill ${b.id}`} />
                  )}
                </td>
                <td>{projectName(b.project)}</td>
                <td>
                  {b.billed_to_name || '—'}
                  {b.billed_to_phone && (
                    <div className="muted" style={{ fontSize: '12px' }}>
                      {b.billed_to_phone}
                    </div>
                  )}
                </td>
                <td>{b.description}</td>
                <td className="num">{formatRs(b.amount)}</td>
                <td>{b.due_date}</td>
                <td>{b.expected_payment_date || '—'}</td>
                <td>
                  <select
                    className={`status-select status-${b.status}`}
                    value={b.status}
                    onChange={(e) => updateStatus(b.id, e.target.value, e.target.value === 'paid' ? new Date().toISOString().slice(0, 10) : undefined)}
                    aria-label={`Change status for ${b.description}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn-action" onClick={() => downloadBillPdf(b.id)}>Download PDF</button>
                    <button type="button" className="btn-action" onClick={() => sendBillPdfWhatsApp(b)}>Send PDF via WhatsApp</button>
                    <button type="button" className="btn-action" onClick={() => openEdit(b)}>Edit</button>
                    {b.status !== 'paid' && (
                      <button type="button" className="btn-action btn-action-primary" onClick={() => updateStatus(b.id, 'paid', new Date().toISOString().slice(0, 10))}>Mark paid</button>
                    )}
                    <button type="button" className="btn-action btn-action-danger" onClick={() => deleteBill(b.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bills.length === 0 && <p className="muted">No bills.</p>}
        {editingBill && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius)' }}>
            <strong>Edit bill</strong>
            <form onSubmit={saveEdit} className="form-inline" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <input placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required />
              <input placeholder="Billed to (name)" value={editForm.billed_to_name} onChange={(e) => setEditForm({ ...editForm, billed_to_name: e.target.value })} />
              <input placeholder="Billed to phone (WhatsApp)" value={editForm.billed_to_phone} onChange={(e) => setEditForm({ ...editForm, billed_to_phone: e.target.value })} />
              <input type="number" step="0.01" placeholder="Amount" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required />
              <input type="number" step="0.01" placeholder="WHT amount" value={editForm.wht_amount} onChange={(e) => setEditForm({ ...editForm, wht_amount: e.target.value })} />
              <input placeholder="WHT certificate" value={editForm.wht_certificate_number} onChange={(e) => setEditForm({ ...editForm, wht_certificate_number: e.target.value })} />
              <input placeholder="WHT period (e.g. 2024-01)" value={editForm.wht_tax_period} onChange={(e) => setEditForm({ ...editForm, wht_tax_period: e.target.value })} />
              <input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} required />
              <input type="date" placeholder="Expected payment" value={editForm.expected_payment_date} onChange={(e) => setEditForm({ ...editForm, expected_payment_date: e.target.value })} />
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <button type="submit" className="btn-primary">Update</button>
              <button type="button" className="btn-secondary" onClick={() => setEditingBill(null)}>Cancel</button>
            </form>
          </div>
        )}
      </Card>
    </>
  );
}
