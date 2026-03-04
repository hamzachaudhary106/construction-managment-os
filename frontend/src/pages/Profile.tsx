import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Profile.css';

type ProfileForm = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<ProfileForm>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        password: '',
      });
    }
  }, [user]);

  if (!user) {
    return <div className="loading-state">Loading profile…</div>;
  }

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, string> = {
      username: form.username,
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
    };
    if (form.password.trim()) {
      payload.password = form.password.trim();
    }
    client
      .patch(`/auth/users/${user.id}/`, payload)
      .then(async () => {
        toast.success('Profile updated');
        await refreshUser();
        setForm((prev) => ({ ...prev, password: '' }));
      })
      .catch((err) => {
        const msgs = apiErrors(err);
        toast.error(msgs[0] || 'Failed to update profile');
      })
      .finally(() => setSaving(false));
  };

  return (
    <>
      <PageHeader title="Your profile" subtitle="Manage your personal info and login details." />
      <div className="profile-layout">
        <Card className="profile-card profile-card-summary">
          <div className="profile-avatar">
            <span>
              {(user.first_name || user.username || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="profile-summary-main">
            <h2>{user.first_name || user.username}</h2>
            {user.email && <p className="profile-summary-email">{user.email}</p>}
          </div>
          <div className="profile-summary-meta">
            <div>
              <span className="profile-meta-label">Role</span>
              <span className="profile-meta-value">{user.role}</span>
            </div>
            {user.company_name && (
              <div>
                <span className="profile-meta-label">Company</span>
                <span className="profile-meta-value">{user.company_name}</span>
              </div>
            )}
            <div>
              <span className="profile-meta-label">Username</span>
              <span className="profile-meta-value">{user.username}</span>
            </div>
          </div>
        </Card>

        <Card className="profile-card profile-card-form">
          <h2 className="card-title">Edit details</h2>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="profile-form-row">
              <label className="profile-label">
                <span>First name</span>
                <input
                  value={form.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                />
              </label>
              <label className="profile-label">
                <span>Last name</span>
                <input
                  value={form.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </label>
            </div>

            <div className="profile-form-row">
              <label className="profile-label">
                <span>Username</span>
                <input
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  required
                />
              </label>
              <label className="profile-label">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </label>
            </div>

            <div className="profile-form-row">
              <label className="profile-label">
                <span>Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </label>
            </div>

            <div className="profile-form-row">
              <label className="profile-label">
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  minLength={8}
                />
              </label>
            </div>

            <div className="profile-hint">
              Changes apply only to your own account. Password is updated only if you enter a new one.
            </div>

            <div className="profile-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

