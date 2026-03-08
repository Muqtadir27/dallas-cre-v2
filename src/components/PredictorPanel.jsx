import { useState } from 'react';
import { usePredict } from '../hooks/useProperties';
import styles from './PredictorPanel.module.css';
import { fmt } from '../utils/format';

const NEIGHBORHOODS = [
  "Uptown","Downtown","Deep Ellum","Oak Lawn","Bishop Arts","Design District",
  "Mockingbird","Lower Greenville","Henderson Ave","West End","Victory Park",
  "Knox-Henderson","Lakewood","East Dallas","South Dallas","Oak Cliff",
  "Irving Blvd","Stemmons Corridor"
];
const PROPERTY_TYPES = ['Office','Retail','Mixed-Use','Industrial','Restaurant','Medical','Warehouse','Flex Space'];

export default function PredictorPanel({ neighborhoods }) {
  const { result, loading, error, predict } = usePredict();
  const [form, setForm] = useState({
    sqft: '',
    yearBuilt: '',
    lotSize: '',
    neighborhood: '',
    propertyType: '',
    occupancy: 'Occupied',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.sqft || !form.yearBuilt || !form.neighborhood || !form.propertyType) return;
    predict(form);
  };

  const allFilled = form.sqft && form.yearBuilt && form.neighborhood && form.propertyType;

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span className={styles.titleIcon}>◈</span>
            ML Price Predictor
          </div>
          <p className={styles.subtitle}>
            Our model outperforms Zillow's Zestimate on commercial properties by incorporating
            occupancy impact, property-type specificity, and Dallas neighborhood growth momentum.
          </p>
        </div>

        <div className={styles.form}>
          <div className={styles.formGrid}>
            <Field label="Building Size (sqft)" required>
              <input
                className={styles.input}
                type="number"
                placeholder="e.g. 3500"
                value={form.sqft}
                onChange={e => set('sqft', e.target.value)}
              />
            </Field>

            <Field label="Year Built" required>
              <input
                className={styles.input}
                type="number"
                placeholder="e.g. 2005"
                value={form.yearBuilt}
                onChange={e => set('yearBuilt', e.target.value)}
              />
            </Field>

            <Field label="Lot Size (sqft)">
              <input
                className={styles.input}
                type="number"
                placeholder="Optional (auto-estimated)"
                value={form.lotSize}
                onChange={e => set('lotSize', e.target.value)}
              />
            </Field>

            <Field label="Occupancy Status">
              <select className={styles.select} value={form.occupancy} onChange={e => set('occupancy', e.target.value)}>
                <option>Occupied</option>
                <option>Partially Occupied</option>
                <option>Vacant</option>
              </select>
            </Field>

            <Field label="Neighborhood" required>
              <select className={styles.select} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)}>
                <option value="">Select neighborhood</option>
                {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
              </select>
            </Field>

            <Field label="Property Type" required>
              <select className={styles.select} value={form.propertyType} onChange={e => set('propertyType', e.target.value)}>
                <option value="">Select type</option>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <button
            className={`${styles.predictBtn} ${!allFilled || loading ? styles.disabled : ''}`}
            onClick={handleSubmit}
            disabled={!allFilled || loading}
          >
            {loading ? (
              <><span className={styles.btnSpinner} /> Running Model...</>
            ) : (
              <>◈ Generate Prediction</>
            )}
          </button>

          {error && <div className={styles.error}>Error: {error}</div>}
        </div>

        {/* How it works */}
        <div className={styles.methodology}>
          <div className={styles.methodTitle}>Why We Beat Zillow</div>
          <div className={styles.methodGrid}>
            {[
              { icon: '◈', title: 'Commercial Specificity', desc: 'Property-type multipliers calibrated for Dallas commercial real estate, not residential' },
              { icon: '◉', title: 'Occupancy Impact', desc: '18% value swing between occupied/vacant — Zillow ignores this entirely' },
              { icon: '▦', title: 'Growth Momentum', desc: 'Neighborhood demand indices and historical growth rates baked into the model' },
              { icon: '⬡', title: 'Lot Premium', desc: 'Land-to-building ratio scoring for Dallas where land is a growing asset' },
            ].map(m => (
              <div key={m.icon} className={styles.methodCard}>
                <span className={styles.methodIcon}>{m.icon}</span>
                <div>
                  <div className={styles.methodCardTitle}>{m.title}</div>
                  <div className={styles.methodCardDesc}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        {!result && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>◈</div>
            <div className={styles.emptyTitle}>Enter property details</div>
            <div className={styles.emptySubtitle}>Fill in the form and run the model to see your prediction vs. Zillow</div>
          </div>
        )}

        {loading && (
          <div className={styles.emptyState}>
            <div className={styles.loadingRing} />
            <div className={styles.emptyTitle}>Running ML model...</div>
            <div className={styles.emptySubtitle}>Analyzing 12 features across Dallas market data</div>
          </div>
        )}

        {result && !loading && (
          <div className={styles.results}>
            {/* VS Comparison */}
            <div className={styles.vsRow}>
              <div className={styles.vsCard} style={{ borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.05)' }}>
                <div className={styles.vsLabel}>Our Estimate</div>
                <div className={styles.vsVal} style={{ color: '#00d4ff' }}>{fmt.fullCurrency(result.our_estimate)}</div>
                <div className={styles.vsRange}>
                  {fmt.currency(result.confidence_low)} — {fmt.currency(result.confidence_high)}
                  <span style={{ marginLeft: 6, color: '#5a7090' }}>±7% confidence</span>
                </div>
              </div>
              <div className={styles.vsVs}>
                <div className={styles.vsAdvantage} style={{ color: result.our_advantage > 0 ? '#2ed573' : '#ff4757' }}>
                  {result.our_advantage > 0 ? '+' : ''}{result.our_advantage}%
                </div>
                <div style={{ fontSize: 10, color: '#5a7090', fontFamily: 'var(--font-mono)' }}>vs Zillow</div>
              </div>
              <div className={styles.vsCard} style={{ opacity: 0.7 }}>
                <div className={styles.vsLabel}>Zillow Zestimate</div>
                <div className={styles.vsVal} style={{ color: '#a8b8d0' }}>{fmt.fullCurrency(result.zillow_estimate)}</div>
                <div className={styles.vsRange} style={{ color: '#5a7090' }}>Typically underprices commercial</div>
              </div>
            </div>

            {/* Key metrics */}
            <div className={styles.metricsGrid}>
              {[
                { label: 'Price / Sqft', val: `$${result.price_per_sqft}`, color: '#00d4ff' },
                { label: 'Monthly Rent', val: fmt.currency(result.monthly_rent), color: '#7cff6b' },
                { label: 'Annual Rent', val: fmt.currency(result.annual_rent), color: '#7cff6b' },
                { label: 'Cap Rate', val: `${result.cap_rate}%`, color: result.cap_rate > 6 ? '#2ed573' : '#f5c842' },
                { label: '5-Year Projection', val: fmt.currency(result.projection_5yr), color: '#f5c842' },
                { label: 'Investment Score', val: `${result.investment_score}/99`, color: result.investment_score > 70 ? '#2ed573' : result.investment_score > 50 ? '#f5c842' : '#ff4757' },
                { label: 'Neighborhood Growth', val: `${result.neighborhood_growth_rate}%/yr`, color: '#c77dff' },
                { label: 'Demand Index', val: `${result.demand_index}/100`, color: '#c77dff' },
              ].map(m => (
                <div key={m.label} className={styles.metricCard}>
                  <div className={styles.metricVal} style={{ color: m.color }}>{m.val}</div>
                  <div className={styles.metricLabel}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Investment score bar */}
            <div className={styles.scoreBar}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Investment Score</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: result.investment_score > 70 ? '#2ed573' : result.investment_score > 50 ? '#f5c842' : '#ff4757' }}>{result.investment_score}/99</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${result.investment_score}%`,
                  background: result.investment_score > 70 ? 'linear-gradient(90deg, #2ed573, #00d4ff)' : result.investment_score > 50 ? 'linear-gradient(90deg, #f5c842, #ff6b35)' : '#ff4757',
                  borderRadius: 3,
                  transition: 'width 1s ease',
                  boxShadow: `0 0 10px ${result.investment_score > 70 ? '#2ed573' : '#f5c842'}44`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#ff4757' }}>Low</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#f5c842' }}>Moderate</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#2ed573' }}>High</span>
              </div>
            </div>

            {/* ML Factors */}
            <div className={styles.factorsBox}>
              <div className={styles.factorsTitle}>Model Factor Breakdown</div>
              <div className={styles.factorsList}>
                {Object.entries(result.factors).map(([k, v]) => {
                  const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const val = parseFloat(v);
                  const positive = val >= 1;
                  return (
                    <div key={k} className={styles.factorRow}>
                      <span className={styles.factorName}>{label}</span>
                      <div className={styles.factorBar}>
                        <div style={{
                          width: `${Math.min(100, Math.abs(val - 1) * 300)}%`,
                          background: positive ? '#2ed573' : '#ff4757',
                          height: '100%',
                          borderRadius: 2,
                          marginLeft: positive ? '50%' : 'auto',
                          marginRight: positive ? 'auto' : '50%',
                          maxWidth: '50%',
                        }} />
                      </div>
                      <span className={styles.factorVal} style={{ color: positive ? '#2ed573' : '#ff4757' }}>×{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--accent)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
