import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import client from '../api/client';
import { formatRs } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { apiErrors } from '../utils/apiErrors';
import './Dashboard.css';
import './CostEstimation.css';

type Unit = { value: string; label: string };
type Category = { value: string; label: string };

/** City labels for display (API returns slugs). */
const CITY_LABELS: Record<string, string> = {
  lahore: 'Lahore', karachi: 'Karachi', islamabad: 'Islamabad', rawalpindi: 'Rawalpindi',
  faisalabad: 'Faisalabad', multan: 'Multan', peshawar: 'Peshawar', quetta: 'Quetta',
  sialkot: 'Sialkot', gujranwala: 'Gujranwala', other: 'Other',
};

const MIN_COVERED_SFT = 1;
const MAX_COVERED_SFT = 50_000_000;

type Estimate = {
  id: number;
  name: string;
  version: string;
  status: string;
  estimate_date: string | null;
  subtotal?: string;
  total?: string;
  overhead_percent?: string;
  contingency_percent?: string;
  items?: EstimateItem[];
  overhead_amount?: string;
  contingency_amount?: string;
};

type EstimateItem = {
  id: number;
  estimate: number;
  category: string;
  category_display?: string;
  description: string;
  quantity: string;
  unit: string;
  unit_display?: string;
  unit_rate: string;
  amount: string;
};

const DEFAULT_ITEM = {
  category: 'concrete',
  description: '',
  quantity: '1',
  unit: 'no',
  unit_rate: '0',
};

export default function CostEstimation() {
  const toast = useToast();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [constants, setConstants] = useState<{ units: Unit[]; categories: Category[]; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quick' | 'detailed'>('quick');
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [estimateForm, setEstimateForm] = useState({
    name: '',
    version: '',
    status: 'draft',
    estimate_date: new Date().toISOString().slice(0, 10),
    notes: '',
    overhead_percent: '0',
    contingency_percent: '0',
  });
  const [itemForm, setItemForm] = useState(DEFAULT_ITEM);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  /* Quick calculator (like reference UI) */
  const [quickCity, setQuickCity] = useState('lahore');
  const [quickAreaSize, setQuickAreaSize] = useState('');
  const [quickAreaUnit, setQuickAreaUnit] = useState<'marla' | 'sft'>('marla');
  const [quickCoveredArea, setQuickCoveredArea] = useState('');
  const [quickCategory, setQuickCategory] = useState<string>('complete_standard');
  const [quickConstructionMode, setQuickConstructionMode] = useState<'with_material' | 'without_material'>('without_material');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [quickOverheadPercent, setQuickOverheadPercent] = useState('0');
  const [quickContingencyPercent, setQuickContingencyPercent] = useState('5');
  const [quickResult, setQuickResult] = useState<{
    subtotal: string; overhead: string; contingency: string; total: string;
    rate_per_sft: string; rate_effective_date: string; rate_source: string;
    rate_min?: string; rate_max?: string;
    formula_steps?: string[];
  } | null>(null);
  const [savingQuick, setSavingQuick] = useState(false);
  const [quickCalcRates, setQuickCalcRates] = useState<{
    cities: string[];
    rates_effective_date: string;
    disclaimer: string;
    construction_categories?: { value: string; label: string }[];
    construction_modes?: { value: string; label: string }[];
  } | null>(null);
  const [quickCalcCalculating, setQuickCalcCalculating] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [creatingEstimate, setCreatingEstimate] = useState(false);
  const [updatingEstimate, setUpdatingEstimate] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const loadEstimates = () => {
    Promise.all([
      client.get('/estimates/'),
      client.get('/estimates/constants/'),
    ]).then(([e, c]) => {
      setEstimates(e.data?.results ?? e.data ?? []);
      setConstants(c.data || null);
    }).catch(() => toast.error('Failed to load data')).finally(() => setLoading(false));
  };

  useEffect(() => { loadEstimates(); }, []);

  useEffect(() => {
    if (activeTab === 'quick') {
      client.get('/estimates/quick-calc-rates/')
        .then((r) => setQuickCalcRates({
          cities: r.data?.cities ?? ['lahore'],
          rates_effective_date: r.data?.rates_effective_date ?? '',
          disclaimer: r.data?.disclaimer ?? 'This estimate is for planning only. Obtain detailed quotes for binding contracts.',
          construction_categories: r.data?.construction_categories ?? [
            { value: 'grey_structure_only', label: 'Grey Structure Only' },
            { value: 'complete_standard', label: 'Complete House – Standard Finish' },
            { value: 'complete_mid_range', label: 'Complete House – Mid-Range Finish' },
            { value: 'complete_premium', label: 'Complete House – Premium Finish' },
          ],
          construction_modes: r.data?.construction_modes ?? [
            { value: 'with_material', label: 'With Materials (Contractor + Materials)' },
            { value: 'without_material', label: 'Without Materials (Labour Only)' },
          ],
        }))
        .catch(() => setQuickCalcRates({
          cities: ['lahore'], rates_effective_date: '', disclaimer: 'Rates loaded from server. This estimate is for planning only.',
          construction_categories: [
            { value: 'grey_structure_only', label: 'Grey Structure Only' },
            { value: 'complete_standard', label: 'Complete House – Standard Finish' },
            { value: 'complete_mid_range', label: 'Complete House – Mid-Range Finish' },
            { value: 'complete_premium', label: 'Complete House – Premium Finish' },
          ],
          construction_modes: [
            { value: 'with_material', label: 'With Materials (Contractor + Materials)' },
            { value: 'without_material', label: 'Without Materials (Labour Only)' },
          ],
        }));
    }
  }, [activeTab]);

  const loadEstimateDetail = (id: number) => {
    client.get(`/estimates/${id}/`).then((r) => setSelectedEstimate(r.data)).catch(() => toast.error('Failed to load estimate'));
  };

  const createEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: estimateForm.name,
      version: estimateForm.version || undefined,
      status: estimateForm.status,
      estimate_date: estimateForm.estimate_date || null,
      notes: estimateForm.notes || undefined,
      overhead_percent: estimateForm.overhead_percent || 0,
      contingency_percent: estimateForm.contingency_percent || 0,
    };
    setCreatingEstimate(true);
    client.post('/estimates/', payload).then((res) => {
      toast.success('Scenario created');
      setShowForm(false);
      setEstimateForm({ name: '', version: '', status: 'draft', estimate_date: new Date().toISOString().slice(0, 10), notes: '', overhead_percent: '0', contingency_percent: '0' });
      loadEstimates();
      loadEstimateDetail(res.data.id);
    }).catch((err) => {
      toast.error(apiErrors(err)[0] || 'Failed');
    }).finally(() => setCreatingEstimate(false));
  };

  const updateEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstimate) return;
    const payload = {
      name: estimateForm.name,
      version: estimateForm.version || undefined,
      status: estimateForm.status,
      estimate_date: estimateForm.estimate_date || null,
      notes: estimateForm.notes || undefined,
      overhead_percent: estimateForm.overhead_percent || 0,
      contingency_percent: estimateForm.contingency_percent || 0,
    };
    setUpdatingEstimate(true);
    client.patch(`/estimates/${selectedEstimate.id}/`, payload).then(() => {
      toast.success('Scenario updated');
      loadEstimateDetail(selectedEstimate.id);
      loadEstimates();
    }).catch((err) => {
      toast.error(apiErrors(err)[0] || 'Failed');
    }).finally(() => setUpdatingEstimate(false));
  };

  const deleteEstimate = (id: number) => {
    if (!confirm('Delete this estimate and all its line items?')) return;
    client.delete(`/estimates/${id}/`).then(() => {
      toast.success('Estimate deleted');
      setSelectedEstimate(null);
      loadEstimates();
    }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstimate) return;
    setSavingItem(true);
    client.post(`/estimates/${selectedEstimate.id}/items/`, {
      ...itemForm,
      quantity: itemForm.quantity || 1,
      unit_rate: itemForm.unit_rate || 0,
    }).then(() => {
      toast.success('Line item added');
      setItemForm(DEFAULT_ITEM);
      loadEstimateDetail(selectedEstimate.id);
    }).catch((err) => {
      toast.error(apiErrors(err)[0] || 'Failed');
    }).finally(() => setSavingItem(false));
  };

  const updateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstimate || !editingItemId) return;
    setSavingItem(true);
    client.patch(`/estimates/${selectedEstimate.id}/items/${editingItemId}/`, {
      ...itemForm,
      quantity: itemForm.quantity || 1,
      unit_rate: itemForm.unit_rate || 0,
    }).then(() => {
      toast.success('Line item updated');
      setEditingItemId(null);
      setItemForm(DEFAULT_ITEM);
      loadEstimateDetail(selectedEstimate.id);
    }).catch((err) => {
      toast.error(apiErrors(err)[0] || 'Failed');
    }).finally(() => setSavingItem(false));
  };

  const deleteItem = (estimateId: number, itemId: number) => {
    if (!confirm('Remove this line item?')) return;
    client.delete(`/estimates/${estimateId}/items/${itemId}/`).then(() => {
      toast.success('Item removed');
      loadEstimateDetail(estimateId);
    }).catch((err) => toast.error(apiErrors(err)[0]));
  };

  const openEstimate = (est: Estimate) => {
    setSelectedEstimate(est);
    setEstimateForm({
      name: est.name,
      version: est.version || '',
      status: est.status || 'draft',
      estimate_date: est.estimate_date || new Date().toISOString().slice(0, 10),
      notes: '',
      overhead_percent: est.overhead_percent ?? '0',
      contingency_percent: est.contingency_percent ?? '0',
    });
    loadEstimateDetail(est.id);
  };

  const runQuickCalculate = () => {
    const raw = quickCoveredArea?.replace(/,/g, '').trim() || '';
    const coveredSft = parseFloat(raw);
    if (Number.isNaN(coveredSft) || coveredSft < MIN_COVERED_SFT) {
      const msg = 'Enter a valid covered area (at least 1 sq. ft.).';
      setQuickError(msg);
      toast.error(msg);
      return;
    }
    if (coveredSft > MAX_COVERED_SFT) {
      const msg = `Covered area must not exceed ${MAX_COVERED_SFT.toLocaleString()} sq. ft.`;
      setQuickError(msg);
      toast.error(msg);
      return;
    }
    setQuickCalcCalculating(true);
    setQuickResult(null);
    setQuickError(null);
    client.post('/estimates/quick-calc/', {
      city: quickCity,
      covered_area_sft: coveredSft,
      construction_type: quickCategory,
      construction_mode: quickConstructionMode,
      overhead_percent: parseFloat(quickOverheadPercent || '0') || 0,
      contingency_percent: parseFloat(quickContingencyPercent || '5') ?? 5,
    })
      .then((r) => setQuickResult({
        subtotal: r.data.subtotal,
        overhead: r.data.overhead,
        contingency: r.data.contingency,
        total: r.data.total,
        rate_per_sft: r.data.rate_per_sft,
        rate_effective_date: r.data.rate_effective_date,
        rate_source: r.data.rate_source,
        rate_min: r.data.rate_min,
        rate_max: r.data.rate_max,
        formula_steps: r.data.formula_steps,
      }))
      .catch((err) => {
        const msg = err.response?.data?.error || apiErrors(err)[0] || 'Calculation failed';
        setQuickError(msg);
        toast.error(msg);
      })
      .finally(() => setQuickCalcCalculating(false));
  };

  const saveQuickAsScenario = async () => {
    if (!quickResult) return;
    const coveredSft = parseFloat(quickCoveredArea?.replace(/,/g, '') || '0');
    const cityLabel = CITY_LABELS[quickCity] ?? quickCity;
    const categoryLabel = quickCalcRates?.construction_categories?.find((c) => c.value === quickCategory)?.label ?? quickCategory;
    const modeLabel = quickConstructionMode === 'with_material' ? 'With Materials' : 'Without Materials';
    const scenarioName = `${cityLabel} – ${categoryLabel}, ${modeLabel}`;
    setSavingQuick(true);
    try {
      const estRes = await client.post('/estimates/', {
        name: scenarioName,
        version: quickCoveredArea ? `Covered ${quickCoveredArea} sft` : 'Quick calc',
        status: 'draft',
        estimate_date: new Date().toISOString().slice(0, 10),
        overhead_percent: quickOverheadPercent || 0,
        contingency_percent: quickContingencyPercent || 0,
      });
      await client.post(`/estimates/${estRes.data.id}/items/`, {
        category: 'other',
        description: `Construction (${categoryLabel}, ${modeLabel}) – ${coveredSft.toLocaleString()} sft @ ${quickResult.rate_per_sft} PKR/sft`,
        quantity: String(coveredSft),
        unit: 'sft',
        unit_rate: quickResult.rate_per_sft,
      });
      toast.success('Saved as scenario');
      loadEstimates();
      setActiveTab('detailed');
      setQuickResult(null);
    } catch (err) {
      toast.error(apiErrors(err)[0] || 'Failed to save');
    } finally {
      setSavingQuick(false);
    }
  };

  const units = constants?.units ?? [];
  const categories = constants?.categories ?? [];

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <>
      <PageHeader
        title="Cost Estimation Calculator"
        subtitle="Pakistan Standard (PKR) — Quick calculator by city & area, or detailed BOQ with line items."
      />

      <div className="cost-calc-tabs">
        <button type="button" className={`cost-calc-tab ${activeTab === 'quick' ? 'active' : ''}`} onClick={() => setActiveTab('quick')}>
          Quick Calculator
        </button>
        <button type="button" className={`cost-calc-tab ${activeTab === 'detailed' ? 'active' : ''}`} onClick={() => setActiveTab('detailed')}>
          Detailed BOQ & Scenarios
        </button>
      </div>

      {activeTab === 'quick' && (
        <Card title="Quick cost calculator">
          {quickCalcRates?.disclaimer && (
            <p className="cost-calc-disclaimer" role="alert">
              {quickCalcRates.disclaimer}
            </p>
          )}
          {quickError && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '0.5rem' }}>{quickError}</p>
          )}
          {quickCalcRates?.rates_effective_date && (
            <p className="cost-calc-effective-date">
              Rates effective as of <strong>{quickCalcRates.rates_effective_date}</strong>. Calculation is server-side for accuracy.
            </p>
          )}
          <div className="cost-calc-quick">
            <div>
              <div className="cost-calc-fields">
                <div className="cost-calc-field">
                  <label>City</label>
                  <select value={quickCity} onChange={(e) => setQuickCity(e.target.value)}>
                    {(quickCalcRates?.cities ?? ['lahore']).map((c) => (
                      <option key={c} value={c}>{CITY_LABELS[c] ?? c}</option>
                    ))}
                  </select>
                </div>
                <div className="cost-calc-field">
                  <label>Area Size</label>
                  <div className="cost-calc-field-row">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter area size"
                      value={quickAreaSize}
                      onChange={(e) => setQuickAreaSize(e.target.value)}
                    />
                    <select value={quickAreaUnit} onChange={(e) => setQuickAreaUnit(e.target.value as 'marla' | 'sft')}>
                      <option value="marla">Marla</option>
                      <option value="sft">Sq. ft.</option>
                    </select>
                  </div>
                </div>
                <div className="cost-calc-field">
                  <label>Covered Area <span className="info-icon" title="Built-up area to be costed">ⓘ</span></label>
                  <div className="cost-calc-field-row">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Enter covered area"
                      value={quickCoveredArea}
                      onChange={(e) => setQuickCoveredArea(e.target.value)}
                    />
                    <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-muted)', minWidth: '50px' }}>Sq. ft.</span>
                  </div>
                </div>
                <div className="cost-calc-field">
                  <label>Category <span className="info-icon" title="Type of construction / finish level">ⓘ</span></label>
                  <select value={quickCategory} onChange={(e) => setQuickCategory(e.target.value)}>
                    {(quickCalcRates?.construction_categories ?? []).map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="cost-calc-field">
                  <label>With Materials or Labour Only <span className="info-icon" title="Contractor+Materials vs Labour only">ⓘ</span></label>
                  <div className="cost-calc-options">
                    {(quickCalcRates?.construction_modes ?? []).map((m) => (
                      <button key={m.value} type="button" className={`cost-calc-option ${quickConstructionMode === m.value ? 'selected' : ''}`} onClick={() => setQuickConstructionMode(m.value as 'with_material' | 'without_material')}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <details className="cost-calc-scope-def" style={{ marginTop: '0.75rem' }}>
                <summary>What do these options mean?</summary>
                <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  <li><strong>Grey Structure Only:</strong> Foundation, structure, brickwork, roofing slab — no finishes. Rs 3,000–3,600/sft (with materials) or Rs 1,500–2,500/sft (labour).</li>
                  <li><strong>Complete – Standard Finish:</strong> Grey + standard materials, plaster, flooring, paint, sanitary, electrical. Rs 5,000–6,500/sft (with materials).</li>
                  <li><strong>Complete – Mid-Range Finish:</strong> Better-than-standard materials and finishes. Rs 6,500–8,000/sft (with materials).</li>
                  <li><strong>Complete – Premium Finish:</strong> High-end materials and finishes. Rs 8,000+/sft (with materials).</li>
                  <li><strong>With Materials:</strong> Contractor + materials included in the rate.</li>
                  <li><strong>Without Materials (Labour Only):</strong> Labour only; rates vary by task; client arranges materials.</li>
                </ul>
              </details>
              {showMoreOptions && (
                <div className="cost-calc-advanced">
                  <div className="cost-calc-field">
                    <label>Overhead %</label>
                    <input type="number" step="0.01" min="0" value={quickOverheadPercent} onChange={(e) => setQuickOverheadPercent(e.target.value)} />
                  </div>
                  <div className="cost-calc-field">
                    <label>Contingency %</label>
                    <input type="number" step="0.01" min="0" value={quickContingencyPercent} onChange={(e) => setQuickContingencyPercent(e.target.value)} />
                  </div>
                </div>
              )}
              <button type="button" className="cost-calc-more-link" onClick={() => setShowMoreOptions(!showMoreOptions)} style={{ marginTop: '0.75rem' }}>
                {showMoreOptions ? '▲ Less options' : '▼ More options'}
              </button>
            </div>
            <div className="cost-calc-actions">
              <button type="button" className="btn-calculate" onClick={runQuickCalculate} disabled={quickCalcCalculating}>
                {quickCalcCalculating ? 'Calculating…' : 'Calculate Cost'}
              </button>
            </div>
          </div>
          {quickResult && (
            <div className="cost-calc-result">
              <p className="cost-calc-result-meta">
                {quickResult.rate_min != null && quickResult.rate_max != null ? (
                  <>Rate range: <strong>{formatRs(quickResult.rate_min)} – {formatRs(quickResult.rate_max)}/sq.ft</strong> (calculation uses midpoint).</>
                ) : (
                  <>Rate used: <strong>{formatRs(quickResult.rate_per_sft)}/sq.ft</strong>.</>
                )}{' '}
                Effective {quickResult.rate_effective_date}, source: {quickResult.rate_source}.
              </p>
              {quickResult.formula_steps && quickResult.formula_steps.length > 0 && (
                <ul className="cost-calc-formula-steps" aria-label="Calculation steps">
                  {quickResult.formula_steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              )}
              <div className="cost-calc-result-row"><span>Subtotal (construction)</span><strong>{formatRs(quickResult.subtotal)}</strong></div>
              {Number(quickResult.overhead) > 0 && <div className="cost-calc-result-row"><span>Overhead</span><strong>{formatRs(quickResult.overhead)}</strong></div>}
              {Number(quickResult.contingency) > 0 && <div className="cost-calc-result-row"><span>Contingency</span><strong>{formatRs(quickResult.contingency)}</strong></div>}
              <div className="cost-calc-result-row cost-calc-result-total"><span>Total (PKR)</span><strong>{formatRs(quickResult.total)}</strong></div>
              <div className="cost-calc-result-actions">
                <button type="button" className="btn-primary" onClick={saveQuickAsScenario} disabled={savingQuick}>{savingQuick ? 'Saving…' : 'Save as scenario'}</button>
                <button type="button" className="btn-secondary" onClick={() => setQuickResult(null)}>Clear</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'detailed' && (
        <>
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className="btn-primary" onClick={() => { setShowForm(true); setSelectedEstimate(null); }}>
          + New scenario
        </button>
      </div>

      {showForm && !selectedEstimate && (
        <Card title="New cost scenario (Pakistan Standard – PKR)">
          <form onSubmit={createEstimate} className="form-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <input placeholder="Scenario name *" value={estimateForm.name} onChange={(e) => setEstimateForm({ ...estimateForm, name: e.target.value })} required />
            <input placeholder="Version (e.g. v1, Option A)" value={estimateForm.version} onChange={(e) => setEstimateForm({ ...estimateForm, version: e.target.value })} />
            <input type="date" value={estimateForm.estimate_date} onChange={(e) => setEstimateForm({ ...estimateForm, estimate_date: e.target.value })} />
            <input type="number" step="0.01" placeholder="Overhead %" value={estimateForm.overhead_percent} onChange={(e) => setEstimateForm({ ...estimateForm, overhead_percent: e.target.value })} style={{ width: '6rem' }} />
            <input type="number" step="0.01" placeholder="Contingency %" value={estimateForm.contingency_percent} onChange={(e) => setEstimateForm({ ...estimateForm, contingency_percent: e.target.value })} style={{ width: '6rem' }} />
            <button type="submit" className="btn-primary" disabled={creatingEstimate}>{creatingEstimate ? 'Creating…' : 'Create scenario'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedEstimate ? '1fr 2fr' : '1fr', gap: '1rem', marginTop: '1rem' }}>
        <Card title="Your scenarios">
          <div className="table-responsive">
            <table className="table table-mobile-stack">
              <thead><tr><th>Name</th><th>Version</th><th className="num">Total (PKR)</th><th>Actions</th></tr></thead>
              <tbody>
                {estimates.map((est) => (
                  <tr key={est.id}>
                    <td>{est.name}</td>
                    <td>{est.version || '–'}</td>
                    <td className="num">{formatRs(est.total ?? '0')}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-action" onClick={() => openEstimate(est)}>Open</button>
                        <button type="button" className="btn-action btn-action-danger" onClick={() => deleteEstimate(est.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {estimates.length === 0 && <p style={{ padding: '1rem', color: 'var(--neutral-500)' }}>No scenarios yet. Create one to start.</p>}
        </Card>

        {selectedEstimate && (
          <Card title={`Calculator: ${selectedEstimate.name} ${selectedEstimate.version ? `(${selectedEstimate.version})` : ''}`}>
            <form onSubmit={updateEstimate} className="form-inline" style={{ flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius)' }}>
              <input placeholder="Scenario name" value={estimateForm.name} onChange={(e) => setEstimateForm({ ...estimateForm, name: e.target.value })} required />
              <input placeholder="Version" value={estimateForm.version} onChange={(e) => setEstimateForm({ ...estimateForm, version: e.target.value })} />
              <input type="date" value={estimateForm.estimate_date} onChange={(e) => setEstimateForm({ ...estimateForm, estimate_date: e.target.value })} />
              <select value={estimateForm.status} onChange={(e) => setEstimateForm({ ...estimateForm, status: e.target.value })}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="approved">Approved</option></select>
              <input type="number" step="0.01" placeholder="Overhead %" value={estimateForm.overhead_percent} onChange={(e) => setEstimateForm({ ...estimateForm, overhead_percent: e.target.value })} style={{ width: '5rem' }} />
              <input type="number" step="0.01" placeholder="Contingency %" value={estimateForm.contingency_percent} onChange={(e) => setEstimateForm({ ...estimateForm, contingency_percent: e.target.value })} style={{ width: '5rem' }} />
              <button type="submit" className="btn-primary" disabled={updatingEstimate}>{updatingEstimate ? 'Saving…' : 'Save header'}</button>
            </form>

            <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Add line item (Pakistan units)</p>
            <form onSubmit={editingItemId ? updateItem : addItem} className="form-inline" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} required style={{ minWidth: '12rem' }} />
              <input type="number" step="0.0001" placeholder="Qty" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} style={{ width: '5rem' }} />
              <select value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}>
                {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Rate (PKR)" value={itemForm.unit_rate} onChange={(e) => setItemForm({ ...itemForm, unit_rate: e.target.value })} style={{ width: '7rem' }} />
              <button type="submit" className="btn-primary" disabled={savingItem}>{savingItem ? 'Saving…' : editingItemId ? 'Update item' : 'Add item'}</button>
              {editingItemId && <button type="button" className="btn-secondary" onClick={() => { setEditingItemId(null); setItemForm(DEFAULT_ITEM); }}>Cancel</button>}
            </form>

            <div className="table-responsive">
              <table className="table table-mobile-stack">
                <thead>
                  <tr><th>Category</th><th>Description</th><th className="num">Qty</th><th>Unit</th><th className="num">Rate (PKR)</th><th className="num">Amount (PKR)</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {(selectedEstimate.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.category_display || item.category}</td>
                      <td>{item.description}</td>
                      <td className="num">{Number(item.quantity).toLocaleString('en-PK')}</td>
                      <td>{item.unit_display || item.unit}</td>
                      <td className="num">{formatRs(item.unit_rate)}</td>
                      <td className="num">{formatRs(item.amount)}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn-action" onClick={() => { setEditingItemId(item.id); setItemForm({ category: item.category, description: item.description, quantity: item.quantity, unit: item.unit, unit_rate: item.unit_rate }); }}>Edit</button>
                          <button type="button" className="btn-action btn-action-danger" onClick={() => deleteItem(selectedEstimate.id, item.id)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--neutral-100)', borderRadius: 'var(--radius)', textAlign: 'right' }}>
              <div>Subtotal: <strong>{formatRs(selectedEstimate.subtotal ?? '0')}</strong></div>
              {Number(selectedEstimate.overhead_percent ?? 0) > 0 && (
                <div>Overhead ({selectedEstimate.overhead_percent}%): <strong>{formatRs(selectedEstimate.overhead_amount ?? '0')}</strong></div>
              )}
              {Number(selectedEstimate.contingency_percent ?? 0) > 0 && (
                <div>Contingency ({selectedEstimate.contingency_percent}%): <strong>{formatRs(selectedEstimate.contingency_amount ?? '0')}</strong></div>
              )}
              <div style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>Total (PKR): <strong>{formatRs(selectedEstimate.total ?? '0')}</strong></div>
            </div>

            <button type="button" className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setSelectedEstimate(null)}>Close calculator</button>
          </Card>
        )}
      </div>
        </>
      )}
    </>
  );
}
