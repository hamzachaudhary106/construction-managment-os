import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type PayrollPeriod = {
  id: number;
  year: number;
  month: number;
  status: string;
  notes: string;
};

type PayrollEntry = {
  id: number;
  period: number;
  employee: number;
  employee_name: string;
  basic_salary: string;
  allowances: string;
  overtime_hours: string;
  overtime_rate: string;
  bonuses: string;
  advance_recovery: string;
  other_deductions: string;
  tax: string;
  net_salary: string;
  is_paid: boolean;
  paid_date: string | null;
  notes: string;
};

export default function Payroll() {
  const toast = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const totalNet = entries.reduce((sum, e) => sum + (parseFloat(e.net_salary || '0') || 0), 0);

  const loadPeriod = () => {
    setLoading(true);
    client
      .get('/employees/payroll-periods/', { params: { year, month } })
      .then((r) => {
        const list: PayrollPeriod[] = r.data?.results ?? r.data ?? [];
        if (list.length > 0) {
          const p = list[0];
          setPeriod(p);
          return client.get('/employees/payroll-entries/', { params: { period: p.id } });
        }
        setPeriod(null);
        setEntries([]);
        return null;
      })
      .then((r) => {
        if (r) setEntries(r.data?.results ?? r.data ?? []);
      })
      .catch(() => {
        setPeriod(null);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPeriod(); }, [year, month]);

  const ensurePeriod = () => {
    setLoading(true);
    client
      .post('/employees/payroll-periods/', { year, month })
      .then((r) => {
        const p: PayrollPeriod = r.data;
        setPeriod(p);
        return client.get('/employees/payroll-entries/', { params: { period: p.id } });
      })
      .then((r) => {
        setEntries(r.data?.results ?? r.data ?? []);
        toast.success('Payroll created for this month');
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Failed to create payroll'))
      .finally(() => setLoading(false));
  };

  const updateEntryField = (id: number, field: keyof PayrollEntry, value: string | boolean) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const saveEntries = () => {
    if (!period) return;
    setSaving(true);
    client
      .patch('/employees/payroll-entries/bulk-update/', {
        entries: entries.map((e) => ({
          id: e.id,
          basic_salary: e.basic_salary,
          allowances: e.allowances,
          overtime_hours: e.overtime_hours,
          overtime_rate: e.overtime_rate,
          bonuses: e.bonuses,
          advance_recovery: e.advance_recovery,
          other_deductions: e.other_deductions,
          tax: e.tax,
          is_paid: e.is_paid,
          paid_date: e.paid_date || null,
          notes: e.notes,
        })),
      })
      .then((r) => {
        const updated = r.data?.updated ?? 0;
        if (updated > 0) toast.success(`Saved ${updated} payroll rows`);
        // Reload to get recalculated net salaries
        if (period) {
          client.get('/employees/payroll-entries/', { params: { period: period.id } })
            .then((res) => setEntries(res.data?.results ?? res.data ?? []));
        }
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Save failed'))
      .finally(() => setSaving(false));
  };

  const changeStatus = (status: string) => {
    if (!period) return;
    client
      .patch(`/employees/payroll-periods/${period.id}/`, { status })
      .then((r) => {
        setPeriod(r.data);
        toast.success(`Payroll status set to ${status}`);
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Could not update status'));
  };

  const markAllPaidToday = () => {
    if (!period) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    client
      .post(`/employees/payroll-periods/${period.id}/mark-paid/`, { paid_date: todayStr })
      .then(() => {
        toast.success('All entries marked as paid for today');
        loadPeriod();
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Could not mark all paid'));
  };

  const monthOptions = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  if (loading) return <div className="loading-state">Loading payroll…</div>;

  return (
    <>
      <PageHeader title="Payroll" subtitle="Monthly salaries for employees" />
      <Card>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center',
        }}
        >
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: '0.5rem' }}>
            {monthOptions.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 80, padding: '0.5rem' }}
          />
          {!period && (
            <button type="button" className="btn-primary" onClick={ensurePeriod}>Create payroll for this month</button>
          )}
          {period && (
            <>
              <span className="badge badge-active">Status: {period.status}</span>
              <button type="button" className="btn-secondary" onClick={() => changeStatus('draft')}>Mark draft</button>
              <button type="button" className="btn-secondary" onClick={() => changeStatus('approved')}>Mark approved</button>
              <button type="button" className="btn-secondary" onClick={() => changeStatus('paid')}>Set status to paid</button>
              <button type="button" className="btn-primary" onClick={markAllPaidToday}>Mark all paid (today)</button>
            </>
          )}
          {period && (
            <button
              type="button"
              className="btn-primary"
              onClick={saveEntries}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>

        {!period && <div className="empty-state">No payroll created for this month. Click "Create payroll for this month" to generate entries for all active employees.</div>}

        {period && (
          <>
            <div className="table-responsive">
              <table className="table table-mobile-stack">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th className="num">Basic</th>
                    <th className="num">Allowances</th>
                    <th className="num">OT hours</th>
                    <th className="num">OT rate</th>
                    <th className="num">Bonuses</th>
                    <th className="num">Adv. recovery</th>
                    <th className="num">Other deductions</th>
                    <th className="num">Tax</th>
                    <th className="num">Net salary</th>
                    <th>Paid?</th>
                <th>Paid date</th>
                <th>Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td><strong>{e.employee_name}</strong></td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.basic_salary}
                          onChange={(ev) => updateEntryField(e.id, 'basic_salary', ev.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.allowances}
                          onChange={(ev) => updateEntryField(e.id, 'allowances', ev.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.overtime_hours}
                          onChange={(ev) => updateEntryField(e.id, 'overtime_hours', ev.target.value)}
                          style={{ width: 70 }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.overtime_rate}
                          onChange={(ev) => updateEntryField(e.id, 'overtime_rate', ev.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.bonuses}
                          onChange={(ev) => updateEntryField(e.id, 'bonuses', ev.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.advance_recovery}
                          onChange={(ev) => updateEntryField(e.id, 'advance_recovery', ev.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.other_deductions}
                          onChange={(ev) => updateEntryField(e.id, 'other_deductions', ev.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          value={e.tax}
                          onChange={(ev) => updateEntryField(e.id, 'tax', ev.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="num">{e.net_salary}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={e.is_paid}
                          onChange={(ev) => updateEntryField(e.id, 'is_paid', ev.target.checked)}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={e.paid_date || ''}
                          onChange={(ev) => updateEntryField(e.id, 'paid_date', ev.target.value)}
                        />
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-action"
                            onClick={async () => {
                              try {
                                const res = await client.get(`/employees/payroll-entries/${e.id}/payslip/`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(res.data);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `payslip-${e.id}.pdf`;
                                a.click();
                                window.URL.revokeObjectURL(url);
                              } catch (err) {
                                toast.error(apiErrors(err)[0] || 'Download failed');
                              }
                            }}
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            className="btn-action"
                            onClick={async () => {
                              try {
                                await client.post(`/employees/payroll-entries/${e.id}/send-payslip-whatsapp/`);
                                toast.success('Payslip sent via WhatsApp');
                              } catch (err) {
                                toast.error(apiErrors(err)[0] || 'Send failed');
                              }
                            }}
                          >
                            WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entries.length === 0 && <div className="empty-state">No employees found for this payroll. Add employees first.</div>}
            {entries.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <div className="muted">
                  Total net salary for this month:&nbsp;
                  <strong>{totalNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

