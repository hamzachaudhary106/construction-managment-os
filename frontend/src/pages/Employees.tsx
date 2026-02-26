import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import { formatRs } from '../utils/format';
import './Dashboard.css';

type Employee = {
  id: number;
  company: number;
  code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  designation: string;
  department: string;
  employment_type: string;
  salary_type: string;
  base_salary: string;
  joining_date: string | null;
  leaving_date: string | null;
  is_active: boolean;
  phone: string;
  email: string;
  cnic: string;
  bank_name: string;
  bank_account_number: string;
  iban: string;
  notes: string;
  default_project?: number | null;
  default_project_name?: string | null;
};

const emptyForm: Omit<Employee, 'id' | 'company' | 'full_name' | 'default_project' | 'default_project_name'> = {
  code: '',
  first_name: '',
  last_name: '',
  designation: '',
  department: '',
  employment_type: 'full_time',
  salary_type: 'monthly',
  base_salary: '',
  joining_date: '',
  leaving_date: '',
  is_active: true,
  phone: '',
  email: '',
  cnic: '',
  bank_name: '',
  bank_account_number: '',
  iban: '',
  notes: '',
};

export default function Employees() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterActive, setFilterActive] = useState<string>('active');
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

  const load = () => {
    const params: Record<string, string> = {};
    if (filterActive === 'active') params.is_active = 'true';
    if (filterActive === 'inactive') params.is_active = 'false';
    client
      .get('/employees/employees/', { params })
      .then((r) => setEmployees(r.data?.results ?? r.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    client.get('/projects/')
      .then((r) => setProjects(r.data?.results ?? r.data ?? []))
      .catch(() => setProjects([]));
  }, [filterActive]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({
      code: e.code || '',
      first_name: e.first_name,
      last_name: e.last_name || '',
      designation: e.designation || '',
      department: e.department || '',
      employment_type: e.employment_type,
      salary_type: e.salary_type,
      base_salary: e.base_salary || '',
      joining_date: e.joining_date || '',
      leaving_date: e.leaving_date || '',
      is_active: e.is_active,
      phone: e.phone || '',
      email: e.email || '',
      cnic: e.cnic || '',
      bank_name: e.bank_name || '',
      bank_account_number: e.bank_account_number || '',
      iban: e.iban || '',
      notes: e.notes || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      base_salary: form.base_salary || '0',
      joining_date: form.joining_date || null,
      leaving_date: form.leaving_date || null,
    };
    if (editingId) {
      client.patch(`/employees/employees/${editingId}/`, payload)
        .then(() => { toast.success('Employee updated'); cancelForm(); load(); })
        .catch((err) => toast.error(apiErrors(err)[0] || 'Update failed'));
    } else {
      client.post('/employees/employees/', payload)
        .then(() => { toast.success('Employee added'); cancelForm(); load(); })
        .catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
    }
  };

  const toggleActive = (emp: Employee) => {
    client.patch(`/employees/employees/${emp.id}/`, { is_active: !emp.is_active })
      .then(() => { toast.success('Status updated'); load(); })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Update failed'));
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Employees" subtitle="Manage staff details and base salaries" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={() => (showForm ? cancelForm() : startCreate())}>
            {showForm || editingId ? 'Cancel' : '+ Add employee'}
          </button>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="active">Active employees</option>
            <option value="inactive">Inactive employees</option>
            <option value="all">All employees</option>
          </select>
        </div>
        {showForm && (
          <form onSubmit={save} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <input placeholder="Employee code (optional)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="daily_wage">Daily wage</option>
            </select>
            <select value={form.salary_type} onChange={(e) => setForm({ ...form, salary_type: e.target.value })}>
              <option value="monthly">Monthly salary</option>
              <option value="hourly">Hourly rate</option>
              <option value="daily">Daily rate</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Base salary"
              value={form.base_salary}
              onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
            />
            <input type="date" placeholder="Joining date" value={form.joining_date || ''} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            <input type="date" placeholder="Leaving date" value={form.leaving_date || ''} onChange={(e) => setForm({ ...form, leaving_date: e.target.value })} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="CNIC" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
            <input placeholder="Bank name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
            <input placeholder="Bank account number" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
            <input placeholder="IBAN (optional)" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
            <select
              value={(form as any).default_project || ''}
              onChange={(e) => setForm({ ...(form as any), default_project: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Default project for salary (optional)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ minWidth: 220 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'}</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Employment</th>
              <th>Base salary</th>
              <th>Project</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{e.full_name}</strong>
                  {e.code && <div className="muted" style={{ fontSize: '0.8rem' }}>Code: {e.code}</div>}
                </td>
                <td>{e.designation || '—'}</td>
                <td>{e.department || '—'}</td>
                <td>{e.employment_type.replace('_', ' ')}</td>
                <td className="num">{formatRs(e.base_salary || '0')}</td>
                <td>{e.default_project_name || '—'}</td>
                <td>{e.phone || '—'}</td>
                <td>
                  <span className={`badge ${e.is_active ? 'badge-active' : 'badge-muted'}`}>{e.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn-action" onClick={() => startEdit(e)}>Edit</button>
                    <button type="button" className="btn-action" onClick={() => toggleActive(e)}>{e.is_active ? 'Mark inactive' : 'Mark active'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && !showForm && <div className="empty-state">No employees yet.</div>}
      </Card>
    </>
  );
}

