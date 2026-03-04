import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import './Dashboard.css';

type Settings = {
  whatsapp_bills: boolean;
  whatsapp_contracts: boolean;
  whatsapp_milestones: boolean;
  whatsapp_transfers: boolean;
  whatsapp_wht: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  whatsapp_bills: false,
  whatsapp_contracts: false,
  whatsapp_milestones: false,
  whatsapp_transfers: false,
  whatsapp_wht: false,
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/notifications/settings/')
      .then((res) => setSettings({ ...DEFAULT_SETTINGS, ...(res.data || {}) }))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = () => {
    setSaving(true);
    setError('');
    client
      .put('/notifications/settings/', settings)
      .then((res) => setSettings(res.data || settings))
      .catch(() => setError('Failed to save settings'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="loading-state">Loading notification settings…</div>;

  return (
    <>
      <PageHeader title="Notification settings" subtitle="Choose which alerts you receive via WhatsApp" />
      <Card>
        {error && <p className="text-danger" style={{ marginBottom: '1rem' }}>{error}</p>}
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-mobile-stack" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th>Notification type</th>
                <th>WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Bills</strong> <span className="muted">– due / overdue</span></td>
                <td><input type="checkbox" checked={settings.whatsapp_bills} onChange={() => toggle('whatsapp_bills')} /></td>
              </tr>
              <tr>
                <td><strong>Contracts & guarantees</strong> <span className="muted">– payments, retention, guarantee expiry</span></td>
                <td><input type="checkbox" checked={settings.whatsapp_contracts} onChange={() => toggle('whatsapp_contracts')} /></td>
              </tr>
              <tr>
                <td><strong>Milestones</strong> <span className="muted">– added / completed</span></td>
                <td><input type="checkbox" checked={settings.whatsapp_milestones} onChange={() => toggle('whatsapp_milestones')} /></td>
              </tr>
              <tr>
                <td><strong>Fund transfers</strong> <span className="muted">– money moved between projects</span></td>
                <td><input type="checkbox" checked={settings.whatsapp_transfers} onChange={() => toggle('whatsapp_transfers')} /></td>
              </tr>
              <tr>
                <td><strong>WHT reminders</strong> <span className="muted">– monthly withholding tax filing</span></td>
                <td><input type="checkbox" checked={settings.whatsapp_wht} onChange={() => toggle('whatsapp_wht')} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          <p className="muted" style={{ margin: 0 }}>
            WhatsApp alerts require a valid phone number on your user profile and WhatsApp Cloud API configuration on the server.
          </p>
        </div>
      </Card>
    </>
  );
}
