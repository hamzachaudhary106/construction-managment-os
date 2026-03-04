import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Partner = { id: number; name: string; phone?: string; notes?: string };
type Investment = {
  id: number;
  project: number;
  project_name?: string;
  amount: string;
  investment_date: string;
  partner: number | null;
  partner_name?: string;
  description: string;
};
type Withdrawal = {
  id: number;
  project: number;
  project_name?: string;
  partner: number;
  partner_name?: string;
  amount: string;
  withdrawal_date: string;
  description: string;
};

export default function PartnersFunds() {
  const toast = useToast();
  const [tab, setTab] = useState<'partners' | 'investments' | 'withdrawals'>('partners');
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/partners/'),
      client.get('/partners/investments/'),
      client.get('/partners/withdrawals/'),
    ]).then(([p, part, inv, wd]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setPartners(part.data?.results ?? part.data ?? []);
      setInvestments(inv.data?.results ?? inv.data ?? []);
      setWithdrawals(wd.data?.results ?? wd.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: '', phone: '', notes: '' });
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);

  const [showInvForm, setShowInvForm] = useState(false);
  const [invForm, setInvForm] = useState({ project: '', amount: '', investment_date: new Date().toISOString().slice(0, 10), partner: '', description: '', notes: '' });

  const [showWdForm, setShowWdForm] = useState(false);
  const [wdForm, setWdForm] = useState({ project: '', partner: '', amount: '', withdrawal_date: new Date().toISOString().slice(0, 10), description: '', notes: '' });

  const savePartner = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: partnerForm.name, phone: partnerForm.phone || '', notes: partnerForm.notes };
    if (editingPartnerId) {
      client.patch(`/partners/${editingPartnerId}/`, payload).then(() => { toast.success('Partner updated'); setEditingPartnerId(null); setShowPartnerForm(false); setPartnerForm({ name: '', phone: '', notes: '' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
    } else {
      client.post('/partners/', payload).then(() => { toast.success('Partner added'); setShowPartnerForm(false); setPartnerForm({ name: '', phone: '', notes: '' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
    }
  };

  const deletePartner = (id: number) => {
    if (!confirm('Delete this partner? Withdrawal records will remain but partner link may be lost.')) return;
    client.delete(`/partners/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const addInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/partners/investments/', {
      project: Number(invForm.project),
      amount: invForm.amount,
      investment_date: invForm.investment_date,
      partner: invForm.partner ? Number(invForm.partner) : null,
      description: invForm.description || '',
      notes: invForm.notes || '',
    }).then(() => { toast.success('Investment recorded'); setShowInvForm(false); setInvForm({ project: '', amount: '', investment_date: new Date().toISOString().slice(0, 10), partner: '', description: '', notes: '' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const deleteInvestment = (id: number) => {
    if (!confirm('Delete this investment record?')) return;
    client.delete(`/partners/investments/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const addWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    client.post('/partners/withdrawals/', {
      project: Number(wdForm.project),
      partner: Number(wdForm.partner),
      amount: wdForm.amount,
      withdrawal_date: wdForm.withdrawal_date,
      description: wdForm.description || '',
      notes: wdForm.notes || '',
    }).then(() => { toast.success('Withdrawal recorded'); setShowWdForm(false); setWdForm({ project: '', partner: '', amount: '', withdrawal_date: new Date().toISOString().slice(0, 10), description: '', notes: '' }); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const deleteWithdrawal = (id: number) => {
    if (!confirm('Delete this withdrawal record?')) return;
    client.delete(`/partners/withdrawals/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0] || 'Failed'));
  };

  const downloadInvestmentReceipt = (id: number) => {
    client.get(`/partners/investments/${id}/receipt-pdf/`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `investment-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Receipt downloaded');
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Download failed'));
  };

  const sendInvestmentReceiptWhatsApp = (id: number) => {
    client.post(`/partners/investments/${id}/send-receipt-whatsapp/`)
      .then(() => toast.success('Receipt sent to WhatsApp'))
      .catch((err) => toast.error(apiErrors(err)[0] || 'Send failed'));
  };

  const downloadWithdrawalReceipt = (id: number) => {
    client.get(`/partners/withdrawals/${id}/receipt-pdf/`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `withdrawal-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Receipt downloaded');
      })
      .catch((err) => toast.error(apiErrors(err)[0] || 'Download failed'));
  };

  const sendWithdrawalReceiptWhatsApp = (id: number) => {
    client.post(`/partners/withdrawals/${id}/send-receipt-whatsapp/`)
      .then(() => toast.success('Receipt sent to WhatsApp'))
      .catch((err) => toast.error(apiErrors(err)[0] || 'Send failed'));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;
  const partnerName = (id: number) => partners.find((p) => p.id === id)?.name ?? id;
  const partnerHasPhone = (partnerId: number | null) => partnerId && (partners.find((p) => p.id === partnerId)?.phone?.trim?.() ?? '');

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Partners & Funds" subtitle="Partners, project investments, and partner withdrawals" />
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        {(['partners', 'investments', 'withdrawals'] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t === 'partners' ? 'Partners' : t === 'investments' ? 'Investments' : 'Partner withdrawals'}
          </button>
        ))}
      </div>

      {tab === 'partners' && (
        <Card title="Partners">
          <p className="muted" style={{ marginBottom: '1rem' }}>Add partners (e.g. Hamza, Sami) who can invest in projects and withdraw funds. Withdrawals are recorded per partner.</p>
          <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => { setShowPartnerForm(!showPartnerForm); setEditingPartnerId(null); }}>{showPartnerForm ? 'Cancel' : '+ Add partner'}</button>
          {showPartnerForm && (
            <form onSubmit={savePartner} className="form-inline" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input placeholder="Partner name" value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} required />
              <input placeholder="WhatsApp number" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} />
              <input placeholder="Notes" value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} />
              <button type="submit" className="btn-primary">{editingPartnerId ? 'Update' : 'Add'}</button>
            </form>
          )}
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>Name</th><th>WhatsApp</th><th>Notes</th><th>Actions</th></tr></thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td className="muted">{p.phone || '—'}</td>
                    <td className="muted">{p.notes || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn-action" onClick={() => { setEditingPartnerId(p.id); setPartnerForm({ name: p.name, phone: p.phone ?? '', notes: p.notes ?? '' }); setShowPartnerForm(true); }}>Edit</button>
                      <button type="button" className="btn-action btn-action-danger" onClick={() => deletePartner(p.id)}>Delete</button>
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {partners.length === 0 && !showPartnerForm && <p className="muted">No partners yet. Add partners to record investments and withdrawals.</p>}
        </Card>
      )}

      {tab === 'investments' && (
        <Card title="Project investments">
          <p className="muted" style={{ marginBottom: '1rem' }}>Record funds invested into a project (by partners or others). These increase the project balance.</p>
          <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowInvForm(!showInvForm)}>{showInvForm ? 'Cancel' : '+ Record investment'}</button>
          {showInvForm && (
            <form onSubmit={addInvestment} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
              <select value={invForm.project} onChange={(e) => setInvForm({ ...invForm, project: e.target.value })} required>
                <option value="">Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Amount" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} required />
              <input type="date" value={invForm.investment_date} onChange={(e) => setInvForm({ ...invForm, investment_date: e.target.value })} />
              <select value={invForm.partner} onChange={(e) => setInvForm({ ...invForm, partner: e.target.value })}>
                <option value="">Investor (optional)</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="Description" value={invForm.description} onChange={(e) => setInvForm({ ...invForm, description: e.target.value })} />
              <button type="submit" className="btn-primary">Record</button>
            </form>
          )}
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>Project</th><th className="num">Amount</th><th>Date</th><th>Investor</th><th>Description</th><th>Actions</th></tr></thead>
              <tbody>
                {investments.map((i) => (
                  <tr key={i.id}>
                    <td>{i.project_name ?? projectName(i.project)}</td>
                    <td className="num text-success">{formatRs(i.amount)}</td>
                    <td>{i.investment_date}</td>
                    <td>{i.partner_name ?? (i.partner ? partnerName(i.partner) : '—')}</td>
                    <td className="muted">{i.description || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action" onClick={() => downloadInvestmentReceipt(i.id)}>Download receipt</button>
                        {partnerHasPhone(i.partner) && (
                          <button type="button" className="btn-action" onClick={() => sendInvestmentReceiptWhatsApp(i.id)}>Send via WhatsApp</button>
                        )}
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteInvestment(i.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {investments.length === 0 && !showInvForm && <p className="muted">No investments recorded.</p>}
        </Card>
      )}

      {tab === 'withdrawals' && (
        <Card title="Partner withdrawals">
          <p className="muted" style={{ marginBottom: '1rem' }}>Record funds withdrawn from a project by a partner. These reduce the project balance and keep a proper record per partner.</p>
          <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowWdForm(!showWdForm)}>{showWdForm ? 'Cancel' : '+ Record withdrawal'}</button>
          {showWdForm && (
            <form onSubmit={addWithdrawal} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
              <select value={wdForm.project} onChange={(e) => setWdForm({ ...wdForm, project: e.target.value })} required>
                <option value="">Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={wdForm.partner} onChange={(e) => setWdForm({ ...wdForm, partner: e.target.value })} required>
                <option value="">Partner</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Amount" value={wdForm.amount} onChange={(e) => setWdForm({ ...wdForm, amount: e.target.value })} required />
              <input type="date" value={wdForm.withdrawal_date} onChange={(e) => setWdForm({ ...wdForm, withdrawal_date: e.target.value })} />
              <input placeholder="Description" value={wdForm.description} onChange={(e) => setWdForm({ ...wdForm, description: e.target.value })} />
              <button type="submit" className="btn-primary">Record</button>
            </form>
          )}
          <div className="table-responsive">
            <table className="table">
              <thead><tr><th>Project</th><th>Partner</th><th className="num">Amount</th><th>Date</th><th>Description</th><th>Actions</th></tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{w.project_name ?? projectName(w.project)}</td>
                    <td><strong>{w.partner_name ?? partnerName(w.partner)}</strong></td>
                    <td className="num text-danger">{formatRs(w.amount)}</td>
                    <td>{w.withdrawal_date}</td>
                    <td className="muted">{w.description || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action" onClick={() => downloadWithdrawalReceipt(w.id)}>Download receipt</button>
                        {partnerHasPhone(w.partner) && (
                          <button type="button" className="btn-action" onClick={() => sendWithdrawalReceiptWhatsApp(w.id)}>Send via WhatsApp</button>
                        )}
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteWithdrawal(w.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {withdrawals.length === 0 && !showWdForm && <p className="muted">No withdrawals recorded.</p>}
        </Card>
      )}
    </>
  );
}
