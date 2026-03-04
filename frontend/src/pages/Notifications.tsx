import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import './Dashboard.css';

type Notification = { id: number; title: string; message: string; notification_type: string; read: boolean; link: string; created_at: string };
type WhatsAppLog = { id: number; phone: string; context: string; message: string; success: boolean; provider: string; created_at: string };

export default function Notifications() {
  const toast = useToast();
  const [list, setList] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get('/notifications/'),
      client.get('/notifications/whatsapp-log/'),
    ])
      .then(([n, l]) => {
        setList(n.data?.results ?? n.data ?? []);
        setLogs(l.data?.results ?? l.data ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = (id: number) => {
    client.patch(`/notifications/${id}/`, { read: true }).then(() => { toast.success('Marked as read'); load(); });
  };

  const markAllRead = () => {
    const unread = list.filter((n) => !n.read);
    if (unread.length === 0) { toast.info('No unread notifications'); return; }
    Promise.all(unread.map((n) => client.patch(`/notifications/${n.id}/`, { read: true }))).then(() => { toast.success(`${unread.length} marked as read`); load(); });
  };

  const resend = (id: number) => {
    setResendingId(id);
    client.post(`/notifications/${id}/resend/`)
      .then((r) => {
        if (r.data?.sent) {
          toast.success('WhatsApp alert resent');
        } else {
          toast.error('Could not send WhatsApp alert (check phone & notification settings)');
        }
      })
      .catch(() => toast.error('Failed to resend alert'))
      .finally(() => setResendingId(null));
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Notifications" subtitle="Alerts and WhatsApp message log" />
      <Card>
        {list.some((n) => !n.read) && (
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={markAllRead}>Mark all as read</button>
          </div>
        )}
        {list.length === 0 ? (
          <p className="muted">No notifications.</p>
        ) : (
          <ul className="notification-list">
            {list.map((n) => (
              <li key={n.id} className={n.read ? 'notification-item' : 'notification-item notification-unread'}>
                <strong>{n.title}</strong>
                <p className="notification-message">{n.message}</p>
                <span className="muted notification-time">{n.created_at}</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {!n.read && (
                    <button
                      type="button"
                      className="btn-action btn-action-primary"
                      onClick={() => markRead(n.id)}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => resend(n.id)}
                    disabled={resendingId === n.id}
                  >
                    {resendingId === n.id ? 'Resending…' : 'Resend via WhatsApp'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="WhatsApp message log" className="card-spaced">
        {logs.length === 0 ? (
          <p className="muted">No WhatsApp messages sent yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Phone</th>
                  <th>Context</th>
                  <th>Preview</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.created_at}</td>
                    <td>{log.phone}</td>
                    <td>{log.context || '—'}</td>
                    <td>{log.message ? (log.message.length > 80 ? `${log.message.slice(0, 77)}…` : log.message) : '—'}</td>
                    <td>
                      <span className={`badge ${log.success ? 'badge-paid' : 'badge-overdue'}`}>
                        {log.success ? 'Sent' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
