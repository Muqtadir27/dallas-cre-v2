import styles from './PropertyDrawer.module.css';
import { fmt, TIER_COLORS, OCCUPANCY_COLORS, TYPE_ICONS } from '../utils/format';

export default function PropertyDrawer({ property: p, onClose }) {
  if (!p) return null;
  const tierColor = TIER_COLORS[p.tier] || '#a8b8d0';
  const occColor = OCCUPANCY_COLORS[p.occupancy_status] || '#a8b8d0';
  const roi = p.cap_rate ? p.cap_rate.toFixed(2) : null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.header} style={{ borderTop: `3px solid ${tierColor}` }}>
          <div className={styles.headerTop}>
            <div className={styles.typeTag} style={{ color: tierColor, borderColor: `${tierColor}33`, background: `${tierColor}11` }}>
              <span>{TYPE_ICONS[p.property_type] || '🏢'}</span>
              <span>{p.property_type}</span>
              <span className={styles.tierDot} style={{ background: tierColor }} />
              <span style={{ textTransform: 'capitalize' }}>{p.tier}</span>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div className={styles.address}>{p.address}</div>
          <div className={styles.neighborhood}>{p.neighborhood}, Dallas TX</div>
        </div>

        <div className={styles.content}>
          {/* Primary value */}
          <div className={styles.valueBlock}>
            <div className={styles.valueLabel}>Estimated Value</div>
            <div className={styles.valuePrimary} style={{ color: tierColor }}>{fmt.fullCurrency(p.predicted_value)}</div>
            <div className={styles.valueSub}>{fmt.currency(p.price_per_sqft)}/sqft</div>
          </div>

          {/* Status */}
          <div className={styles.statusRow}>
            <div className={styles.statusPill} style={{ color: occColor, borderColor: `${occColor}33`, background: `${occColor}11` }}>
              <span className={styles.statusDot} style={{ background: occColor }} />
              {p.occupancy_status}
            </div>
            <div className={styles.domBadge}>
              {p.days_on_market}d on market
            </div>
          </div>

          {/* Key metrics grid */}
          <div className={styles.metricsGrid}>
            {[
              { label: 'Monthly Rent', val: fmt.currency(p.monthly_rent), color: '#7cff6b' },
              { label: 'Cap Rate', val: `${p.cap_rate}%`, color: p.cap_rate > 6 ? '#2ed573' : '#f5c842' },
              { label: 'Annual Rent', val: fmt.currency(p.monthly_rent * 12), color: '#7cff6b' },
              { label: 'Price/Sqft', val: `$${p.price_per_sqft}`, color: '#00d4ff' },
            ].map(m => (
              <div key={m.label} className={styles.metric}>
                <div className={styles.metricVal} style={{ color: m.color }}>{m.val}</div>
                <div className={styles.metricLabel}>{m.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          {/* Property details */}
          <div className={styles.detailsTitle}>Property Details</div>
          <div className={styles.detailsList}>
            {[
              { label: 'Building Size', val: fmt.sqft(p.sqft) },
              p.lot_size_sqft && { label: 'Lot Size', val: fmt.sqft(p.lot_size_sqft) },
              { label: 'Year Built', val: p.year_built },
              { label: 'Building Age', val: `${2025 - p.year_built} years` },
              { label: 'Property Type', val: p.property_type },
              { label: 'Days on Market', val: `${p.days_on_market} days` },
            ].filter(Boolean).map(d => (
              <div key={d.label} className={styles.detailRow}>
                <span className={styles.detailLabel}>{d.label}</span>
                <span className={styles.detailVal}>{d.val}</span>
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          {/* Location */}
          <div className={styles.detailsTitle}>Location</div>
          <div className={styles.coordRow}>
            <div className={styles.coord}><span className={styles.coordLabel}>LAT</span>{p.latitude}</div>
            <div className={styles.coord}><span className={styles.coordLabel}>LNG</span>{p.longitude}</div>
          </div>

          {/* Cap rate bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>CAP RATE</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#2ed573' }}>{p.cap_rate}%</span>
            </div>
            <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, p.cap_rate * 7)}%`, height: '100%', background: 'linear-gradient(90deg, #2ed573, #00d4ff)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
