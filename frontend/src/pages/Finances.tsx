import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';

type Project = { id: number; name: string };
type Phase = { id: number; project: number; name: string };
type PO = { id: number; project: number; po_number: string };
type Budget = { id: number; project: number; phase?: number | null; category: string; category_display?: string; amount: string };
type Expense = { id: number; project: number; phase?: number | null; purchase_order?: number | null; category: string; category_display?: string; amount: string; description: string; date: string };
type Income = { id: number; project: number; amount: string; description: string; date: string };

const CATEGORIES = ['materials', 'labor', 'equipment', 'subcontractors', 'permits', 'other'];

export default function Finances() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [tab, setTab] = useState<'budgets' | 'expenses' | 'incomes'>('budgets');
  const [loading, setLoading] = useState(true);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [budgetErrors, setBudgetErrors] = useState<string[]>([]);
  const [expenseErrors, setExpenseErrors] = useState<string[]>([]);
  const [incomeErrors, setIncomeErrors] = useState<string[]>([]);

  const load = () => {
    Promise.all([
      client.get('/projects/'),
      client.get('/finances/budgets/'),
      client.get('/finances/expenses/'),
      client.get('/finances/incomes/'),
    ]).then(([p, b, e, i]) => {
      setProjects(p.data?.results ?? p.data ?? []);
      setBudgets(b.data?.results ?? b.data ?? []);
      setExpenses(e.data?.results ?? e.data ?? []);
      setIncomes(i.data?.results ?? i.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [budgetForm, setBudgetForm] = useState({ project: '', phase: '', category: 'materials', amount: '', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ project: '', phase: '', purchase_order: '', category: 'materials', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [incomeForm, setIncomeForm] = useState({ project: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    if (!budgetForm.project && !expenseForm.project) return;
    const pid = budgetForm.project || expenseForm.project;
    Promise.all([
      client.get('/projects/phases/', { params: { project: pid } }).then((r) => setPhases(r.data?.results ?? r.data ?? [])),
      client.get('/purchase-orders/', { params: { project: pid } }).then((r) => setPurchaseOrders(r.data?.results ?? r.data ?? [])),
    ]).catch(() => {});
  }, [budgetForm.project, expenseForm.project]);

  const addBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetErrors([]);
    const amount = parseFloat(budgetForm.amount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Amount must be greater than zero.';
      setBudgetErrors([msg]);
      toast.error(msg);
      return;
    }
    setSavingBudget(true);
    const payload: Record<string, unknown> = { ...budgetForm, project: Number(budgetForm.project), phase: budgetForm.phase ? Number(budgetForm.phase) : null };
    client.post('/finances/budgets/', payload).then(() => {
      toast.success('Budget added');
      setShowBudgetForm(false);
      setBudgetForm({ project: '', phase: '', category: 'materials', amount: '', notes: '' });
      setBudgetErrors([]);
      load();
    }).catch((err) => {
      const msgs = apiErrors(err);
      setBudgetErrors(msgs);
      toast.error(msgs[0] || 'Failed');
    }).finally(() => setSavingBudget(false));
  };
  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseErrors([]);
    const amount = parseFloat(expenseForm.amount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Amount must be greater than zero.';
      setExpenseErrors([msg]);
      toast.error(msg);
      return;
    }
    setSavingExpense(true);
    const payload: Record<string, unknown> = { ...expenseForm, project: Number(expenseForm.project), phase: expenseForm.phase ? Number(expenseForm.phase) : null, purchase_order: expenseForm.purchase_order ? Number(expenseForm.purchase_order) : null };
    client.post('/finances/expenses/', payload).then(() => {
      toast.success('Expense added');
      setShowExpenseForm(false);
      setExpenseForm({ project: '', phase: '', purchase_order: '', category: 'materials', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setExpenseErrors([]);
      load();
    }).catch((err) => {
      const msgs = apiErrors(err);
      setExpenseErrors(msgs);
      toast.error(msgs[0] || 'Failed');
    }).finally(() => setSavingExpense(false));
  };
  const addIncome = (e: React.FormEvent) => {
    e.preventDefault();
    setIncomeErrors([]);
    const amount = parseFloat(incomeForm.amount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Amount must be greater than zero.';
      setIncomeErrors([msg]);
      toast.error(msg);
      return;
    }
    setSavingIncome(true);
    client.post('/finances/incomes/', { ...incomeForm, project: Number(incomeForm.project) }).then(() => {
      toast.success('Income added');
      setShowIncomeForm(false);
      setIncomeForm({ project: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setIncomeErrors([]);
      load();
    }).catch((err) => {
      const msgs = apiErrors(err);
      setIncomeErrors(msgs);
      toast.error(msgs[0] || 'Failed');
    }).finally(() => setSavingIncome(false));
  };

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetId) return;
    setBudgetErrors([]);
    const amount = parseFloat(budgetForm.amount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Amount must be greater than zero.';
      setBudgetErrors([msg]);
      toast.error(msg);
      return;
    }
    setSavingBudget(true);
    client.patch(`/finances/budgets/${editingBudgetId}/`, { ...budgetForm, project: Number(budgetForm.project), phase: budgetForm.phase ? Number(budgetForm.phase) : null }).then(() => {
      toast.success('Budget updated');
      setEditingBudgetId(null);
      setBudgetErrors([]);
      load();
    }).catch((err) => {
      const msgs = apiErrors(err);
      setBudgetErrors(msgs);
      toast.error(msgs[0] || 'Failed');
    }).finally(() => setSavingBudget(false));
  };
  const saveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseId) return;
    setExpenseErrors([]);
    const amount = parseFloat(expenseForm.amount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Amount must be greater than zero.';
      setExpenseErrors([msg]);
      toast.error(msg);
      return;
    }
    setSavingExpense(true);
    client.patch(`/finances/expenses/${editingExpenseId}/`, { ...expenseForm, project: Number(expenseForm.project), phase: expenseForm.phase ? Number(expenseForm.phase) : null, purchase_order: expenseForm.purchase_order ? Number(expenseForm.purchase_order) : null }).then(() => {
      toast.success('Expense updated');
      setEditingExpenseId(null);
      setExpenseErrors([]);
      load();
    }).catch((err) => {
      const msgs = apiErrors(err);
      setExpenseErrors(msgs);
      toast.error(msgs[0] || 'Failed');
    }).finally(() => setSavingExpense(false));
  };
  const saveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncomeId) return;
    setIncomeErrors([]);
    const amount = parseFloat(incomeForm.amount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Amount must be greater than zero.';
      setIncomeErrors([msg]);
      toast.error(msg);
      return;
    }
    setSavingIncome(true);
    client.patch(`/finances/incomes/${editingIncomeId}/`, { ...incomeForm, project: Number(incomeForm.project) }).then(() => {
      toast.success('Income updated');
      setEditingIncomeId(null);
      setIncomeErrors([]);
      load();
    }).catch((err) => {
      const msgs = apiErrors(err);
      setIncomeErrors(msgs);
      toast.error(msgs[0] || 'Failed');
    }).finally(() => setSavingIncome(false));
  };

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? id;

  const deleteBudget = (id: number) => { if (confirm('Delete this budget?')) client.delete(`/finances/budgets/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0])); };
  const deleteExpense = (id: number) => { if (confirm('Delete this expense?')) client.delete(`/finances/expenses/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0])); };
  const deleteIncome = (id: number) => { if (confirm('Delete this income?')) client.delete(`/finances/incomes/${id}/`).then(() => { toast.success('Deleted'); load(); }).catch((err) => toast.error(apiErrors(err)[0])); };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader title="Financial Management" subtitle="Budgets, expenses, and income by project" />
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        {(['budgets', 'expenses', 'incomes'] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'budgets' && (
        <Card title="Budgets by category">
          <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowBudgetForm(!showBudgetForm)}>+ Add budget</button>
          {showBudgetForm && (
            <form onSubmit={addBudget} className="form-inline" style={{ flexWrap: 'wrap' }}>
              <select value={budgetForm.project} onChange={(e) => setBudgetForm({ ...budgetForm, project: e.target.value })} required>
                <option value="">Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={budgetForm.phase} onChange={(e) => setBudgetForm({ ...budgetForm, phase: e.target.value })}>
                <option value="">Phase (optional)</option>
                {phases.filter((ph) => String(ph.project) === budgetForm.project).map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
              <select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Amount" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} required />
              <input placeholder="Notes" value={budgetForm.notes} onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })} />
              <button type="submit" className="btn-primary" disabled={savingBudget}>{savingBudget ? 'Saving…' : 'Save'}</button>
            </form>
          )}
          {budgetErrors.length > 0 && (
            <ul className="form-errors" style={{ color: 'var(--danger)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>
              {budgetErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Category</th><th className="num">Amount</th><th>Actions</th></tr></thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id}>
                    <td>{projectName(b.project)}</td>
                    <td>{b.category_display || b.category}</td>
                    <td className="num">{formatRs(b.amount)}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action" onClick={() => { setEditingBudgetId(b.id); setBudgetForm({ project: String(b.project), phase: b.phase ? String(b.phase) : '', category: b.category, amount: b.amount, notes: '' }); }}>Edit</button>
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteBudget(b.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingBudgetId && (
            <form onSubmit={saveBudget} className="form-inline" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius)' }}>
              <strong>Edit budget</strong>
              <select value={budgetForm.project} onChange={(e) => setBudgetForm({ ...budgetForm, project: e.target.value })} required><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={budgetForm.phase} onChange={(e) => setBudgetForm({ ...budgetForm, phase: e.target.value })}><option value="">Phase</option>{phases.filter((ph) => String(ph.project) === budgetForm.project).map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}</select>
              <select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input type="number" step="0.01" placeholder="Amount" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} required />
              <button type="submit" className="btn-primary" disabled={savingBudget}>{savingBudget ? 'Updating…' : 'Update'}</button>
              <button type="button" className="btn-secondary" onClick={() => setEditingBudgetId(null)}>Cancel</button>
            </form>
          )}
        </Card>
      )}

      {tab === 'expenses' && (
        <Card title="Expenses">
          <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowExpenseForm(!showExpenseForm)}>+ Add expense</button>
          {showExpenseForm && (
            <form onSubmit={addExpense} className="form-inline" style={{ flexWrap: 'wrap' }}>
              <select value={expenseForm.project} onChange={(e) => setExpenseForm({ ...expenseForm, project: e.target.value })} required>
                <option value="">Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={expenseForm.phase} onChange={(e) => setExpenseForm({ ...expenseForm, phase: e.target.value })}>
                <option value="">Phase (optional)</option>
                {phases.filter((ph) => String(ph.project) === expenseForm.project).map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
              <select value={expenseForm.purchase_order} onChange={(e) => setExpenseForm({ ...expenseForm, purchase_order: e.target.value })}>
                <option value="">PO (optional)</option>
                {purchaseOrders.filter((po) => String(po.project) === expenseForm.project).map((po) => <option key={po.id} value={po.id}>{po.po_number || `PO #${po.id}`}</option>)}
              </select>
              <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
              <input type="number" step="0.01" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
              <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
              <button type="submit" className="btn-primary" disabled={savingExpense}>{savingExpense ? 'Saving…' : 'Save'}</button>
            </form>
          )}
          {expenseErrors.length > 0 && (
            <ul className="form-errors" style={{ color: 'var(--danger)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>
              {expenseErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Category</th><th>Description</th><th>Date</th><th className="num">Amount</th><th>Actions</th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{projectName(e.project)}</td><td>{e.category_display || e.category}</td><td>{e.description}</td><td>{e.date}</td><td className="num text-danger">{formatRs(e.amount)}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action" onClick={() => { setEditingExpenseId(e.id); setExpenseForm({ project: String(e.project), phase: e.phase ? String(e.phase) : '', purchase_order: e.purchase_order ? String(e.purchase_order) : '', category: e.category, amount: e.amount, description: e.description, date: e.date }); }}>Edit</button>
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteExpense(e.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingExpenseId && (
            <form onSubmit={saveExpense} className="form-inline" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
              <strong>Edit expense</strong>
              <select value={expenseForm.project} onChange={(e) => setExpenseForm({ ...expenseForm, project: e.target.value })} required><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select value={expenseForm.phase} onChange={(e) => setExpenseForm({ ...expenseForm, phase: e.target.value })}><option value="">Phase</option>{phases.filter((ph) => String(ph.project) === expenseForm.project).map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}</select>
              <select value={expenseForm.purchase_order} onChange={(e) => setExpenseForm({ ...expenseForm, purchase_order: e.target.value })}><option value="">PO</option>{purchaseOrders.filter((po) => String(po.project) === expenseForm.project).map((po) => <option key={po.id} value={po.id}>{po.po_number || `PO #${po.id}`}</option>)}</select>
              <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input placeholder="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
              <input type="number" step="0.01" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
              <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
              <button type="submit" className="btn-primary" disabled={savingExpense}>{savingExpense ? 'Updating…' : 'Update'}</button>
              <button type="button" className="btn-secondary" onClick={() => setEditingExpenseId(null)}>Cancel</button>
            </form>
          )}
        </Card>
      )}

      {tab === 'incomes' && (
        <Card title="Income">
          <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowIncomeForm(!showIncomeForm)}>+ Add income</button>
          {showIncomeForm && (
            <form onSubmit={addIncome} className="form-inline">
              <select value={incomeForm.project} onChange={(e) => setIncomeForm({ ...incomeForm, project: e.target.value })} required>
                <option value="">Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="Description" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} required />
              <input type="number" step="0.01" placeholder="Amount" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} required />
              <input type="date" value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} />
              <button type="submit" className="btn-primary" disabled={savingIncome}>{savingIncome ? 'Saving…' : 'Save'}</button>
            </form>
          )}
          {incomeErrors.length > 0 && (
            <ul className="form-errors" style={{ color: 'var(--danger)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>
              {incomeErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Project</th><th>Description</th><th>Date</th><th className="num">Amount</th><th>Actions</th></tr></thead>
              <tbody>
                {incomes.map((i) => (
                  <tr key={i.id}>
                    <td>{projectName(i.project)}</td><td>{i.description}</td><td>{i.date}</td><td className="num text-success">{formatRs(i.amount)}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action" onClick={() => { setEditingIncomeId(i.id); setIncomeForm({ project: String(i.project), amount: i.amount, description: i.description, date: i.date }); }}>Edit</button>
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteIncome(i.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingIncomeId && (
            <form onSubmit={saveIncome} className="form-inline" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius)' }}>
              <strong>Edit income</strong>
              <select value={incomeForm.project} onChange={(e) => setIncomeForm({ ...incomeForm, project: e.target.value })} required><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input placeholder="Description" value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} required />
              <input type="number" step="0.01" placeholder="Amount" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} required />
              <input type="date" value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} />
              <button type="submit" className="btn-primary" disabled={savingIncome}>{savingIncome ? 'Updating…' : 'Update'}</button>
              <button type="button" className="btn-secondary" onClick={() => setEditingIncomeId(null)}>Cancel</button>
            </form>
          )}
        </Card>
      )}

    </>
  );
}
