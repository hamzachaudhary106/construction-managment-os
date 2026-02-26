import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

type User = { id: number; username: string; email: string; first_name: string; last_name: string; role: string; phone: string };

export default function Users() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'staff', phone: '' });

  const load = () => client.get('/auth/users/').then((r) => setUsers(r.data?.results ?? r.data ?? []));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const payload: Record<string, string> = { username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, role: form.role, phone: form.phone };
      if (form.password) payload.password = form.password;
      client.patch(`/auth/users/${editingId}/`, payload).then(() => { setEditingId(null); setForm({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'staff', phone: '' }); load(); });
    } else {
      client.post('/auth/users/', form).then(() => {
        setShowForm(false);
        setForm({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'staff', phone: '' });
        load();
      });
    }
  };

  const startEdit = (u: User) => { setEditingId(u.id); setShowForm(false); setForm({ username: u.username, email: u.email || '', password: '', first_name: u.first_name || '', last_name: u.last_name || '', role: u.role, phone: u.phone || '' }); };

  if (!isAdmin) return <div className="text-danger">Access denied.</div>;
  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="User Management" subtitle="Admin, manager, and staff roles" />
      <Card>
        <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => { setShowForm(!showForm); setEditingId(null); }}>{showForm ? 'Cancel' : '+ Add user'}</button>
        {editingId && (
          <form onSubmit={handleSubmit} className="form-inline" style={{ marginBottom: '1rem' }}>
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="New password (leave blank to keep)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" className="btn-link" onClick={() => setEditingId(null)}>Cancel</button>
          </form>
        )}
        {showForm && !editingId && (
          <form onSubmit={handleSubmit} className="form-inline">
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <button type="submit" className="btn-primary">Create</button>
          </form>
        )}
        <table className="table">
          <thead>
            <tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td>{u.first_name} {u.last_name}</td>
                <td>{u.email}</td>
                <td><span className="badge badge-active">{u.role}</span></td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="btn-action" onClick={() => startEdit(u)}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
