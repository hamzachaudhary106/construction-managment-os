import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

type AuditEntry = { id: number; username: string; action: string; model_name: string; object_id: string; details: Record<string, unknown>; timestamp: string };

export default function AuditLog() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    client.get('/audit/').then((r) => setEntries(r.data?.results ?? r.data ?? [])).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return <div className="text-danger">Access denied. Admin only.</div>;
  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Record of actions with user, timestamp, and details" />
      <Card>
        <div className="table-responsive">
          <table className="table table-mobile-stack">
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Model</th><th>Object ID</th><th>Details</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="muted" style={{ fontSize: '0.85rem' }}>{e.timestamp}</td>
                  <td>{e.username}</td>
                  <td>{e.action}</td>
                  <td>{e.model_name}</td>
                  <td>{e.object_id}</td>
                  <td style={{ fontSize: '0.85rem' }}>{Object.keys(e.details || {}).length ? JSON.stringify(e.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && <p className="muted">No audit entries yet.</p>}
      </Card>
    </>
  );
}
