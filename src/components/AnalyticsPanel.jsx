import styles from './AnalyticsPanel.module.css';
import { fmt, TIER_COLORS } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, ScatterChart, Scatter, ZAxis
} from 'recharts';

const CHART_COLORS = ['#00d4ff', '#7cff6b', '#f5c842', '#ff6b35', '#c77dff', '#ff4757', '#2ed573', '#a8b8d0'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border-bright)',
      borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)',
      fontSize: 11, color: 'var(--text-0)'
    }}>
      {label && <div style={{ color: 'var(--text-2)', marginBottom: 4, fontSize: 10 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--accent)' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmt.currency(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPanel({ stats, properties, loading }) {
  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;
  if (!stats || !properties.length) return <div className={styles.empty}>No data available</div>;

  // Prepare charts data
  const neighborhoodData = stats.neighborhoodBreakdown
    .sort((a, b) => b.avgValue - a.avgValue)
    .slice(0, 10);

  const typeData = stats.typeBreakdown.sort((a, b) => b.count - a.count);

  const occupancyData = [
    { name: 'Occupied', value: stats.occupiedCount, color: '#2ed573' },
    { name: 'Partial', value: stats.total - stats.occupiedCount - stats.vacantCount, color: '#f5c842' },
    { name: 'Vacant', value: stats.vacantCount, color: '#ff4757' },
  ];

  const capRateDistribution = [];
  for (let i = 0; i <= 14; i += 2) {
    const count = properties.filter(p => p.cap_rate >= i && p.cap_rate < i + 2).length;
    if (count > 0) capRateDistribution.push({ range: `${i}-${i+2}%`, count });
  }

  const scatterData = properties.slice(0, 200).map(p => ({
    sqft: p.sqft,
    value: p.predicted_value,
    tier: p.tier,
    capRate: p.cap_rate,
  }));

  const tierBreakdown = Object.entries(TIER_COLORS).map(([tier, color]) => ({
    name: tier,
    count: properties.filter(p => p.tier === tier).length,
    avgValue: Math.round(properties.filter(p => p.tier === tier).reduce((s, p) => s + p.predicted_value, 0) / Math.max(1, properties.filter(p => p.tier === tier).length)),
    color,
  })).filter(t => t.count > 0);

  return (
    <div className={styles.panel}>
      {/* KPI Row */}
      <div className={styles.kpiRow}>
        {[
          { label: 'Total Portfolio Value', val: fmt.currency(stats.totalValue), accent: '#00d4ff' },
          { label: 'Average Property Value', val: fmt.currency(stats.avgValue), accent: '#7cff6b' },
          { label: 'Average Monthly Rent', val: fmt.currency(stats.avgRent), accent: '#f5c842' },
          { label: 'Average Cap Rate', val: `${stats.avgCapRate}%`, accent: '#ff6b35' },
          { label: 'Vacancy Rate', val: `${((stats.vacantCount / stats.total) * 100).toFixed(1)}%`, accent: '#ff4757' },
          { label: 'Total Properties', val: fmt.number(stats.total), accent: '#c77dff' },
        ].map(k => (
          <div key={k.label} className={styles.kpi}>
            <div className={styles.kpiVal} style={{ color: k.accent }}>{k.val}</div>
            <div className={styles.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.chartsGrid}>
        {/* Average Value by Neighborhood */}
        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.chartTitle}>Average Property Value by Neighborhood</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={neighborhoodData} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#5a7090', fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#5a7090', fontSize: 9 }} tickFormatter={v => fmt.currency(v)} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgValue" name="Avg Value" radius={[3, 3, 0, 0]}>
                {neighborhoodData.map((n, i) => (
                  <Cell key={i} fill={TIER_COLORS[n.tier] || '#00d4ff'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Pie */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Occupancy Distribution</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={occupancyData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                  {occupancyData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {occupancyData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text-0)' }}>{d.value}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)' }}>{d.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Property Type Breakdown */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Property Types</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 60 }}>
              <XAxis type="number" tick={{ fill: '#5a7090', fontSize: 9 }} />
              <YAxis type="category" dataKey="type" tick={{ fill: '#a8b8d0', fontSize: 10 }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Count" radius={[0, 3, 3, 0]}>
                {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cap Rate Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Cap Rate Distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={capRateDistribution} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" tick={{ fill: '#5a7090', fontSize: 9 }} />
              <YAxis tick={{ fill: '#5a7090', fontSize: 9 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Properties" stroke="#00d4ff" fill="url(#capGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Value vs SqFt Scatter */}
        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.chartTitle}>Value vs Building Size (sample of 200)</div>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="sqft" name="Sqft" tick={{ fill: '#5a7090', fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} label={{ value: 'Building Size (sqft)', position: 'insideBottom', offset: -10, fill: '#5a7090', fontSize: 10 }} />
              <YAxis dataKey="value" name="Value" tick={{ fill: '#5a7090', fontSize: 9 }} tickFormatter={v => fmt.currency(v)} width={65} />
              <ZAxis range={[20, 80]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              {Object.entries(TIER_COLORS).map(([tier, color]) => (
                <Scatter
                  key={tier}
                  name={tier}
                  data={scatterData.filter(d => d.tier === tier)}
                  fill={color}
                  fillOpacity={0.6}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Tier breakdown */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Market Tier Performance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {tierBreakdown.map(t => (
              <div key={t.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: t.color, textTransform: 'capitalize', fontWeight: 700 }}>{t.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-0)' }}>{fmt.currency(t.avgValue)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(t.count / stats.total * 100)}%`,
                    background: t.color,
                    borderRadius: 2,
                    boxShadow: `0 0 6px ${t.color}66`,
                  }} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)' }}>{t.count} properties</div>
              </div>
            ))}
          </div>
        </div>

        {/* Neighborhood cap rate */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Cap Rate by Neighborhood</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={neighborhoodData.slice(0, 8)} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#5a7090', fontSize: 8 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#5a7090', fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgCapRate" name="Cap Rate" radius={[3, 3, 0, 0]} fill="#7cff6b" fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
