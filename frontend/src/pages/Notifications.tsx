import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import './Dashboard.css';

type Notification = { id: number; title: string; message: string; notification_type: string; read: boolean; link: string; created_at: string };

export default function Notifications() {
  const toast = useToast();
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const load = () => client.get('/notifications/').then((r) => setList(r.data?.results ?? r.data ?? [])).finally(() => setLoading(false));

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
      <PageHeader title="Notifications" subtitle="Alerts for due bills, transfers, and milestones" />
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
    </>
  );
}
