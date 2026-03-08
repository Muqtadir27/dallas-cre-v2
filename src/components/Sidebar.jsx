import { useState } from 'react';
import styles from './Sidebar.module.css';
import { TIER_COLORS, TIER_LABELS, fmt } from '../utils/format';

const PROPERTY_TYPES = ['Office','Retail','Mixed-Use','Industrial','Restaurant','Medical','Warehouse','Flex Space'];
const OCCUPANCY_OPTIONS = ['Occupied','Partially Occupied','Vacant'];

export default function Sidebar({ open, setOpen, filters, setFilters, stats, neighborhoods, loading }) {
  const [expandedSection, setExpandedSection] = useState('type');

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({});

  const activeCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <>
      <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span>Filters</span>
            {activeCount > 0 && (
              <span className={styles.badge}>{activeCount}</span>
            )}
          </div>
          {activeCount > 0 && (
            <button className={styles.clearBtn} onClick={clearFilters}>Clear all</button>
          )}
        </div>

        <div className={styles.content}>
          {/* Neighborhood tier quick-filter */}
          <Section label="Market Tier" expanded={expandedSection === 'tier'} onToggle={() => setExpandedSection(expandedSection === 'tier' ? null : 'tier')}>
            <div className={styles.tierGrid}>
              {Object.entries(TIER_LABELS).map(([tier, label]) => (
                <button
                  key={tier}
                  className={`${styles.tierBtn} ${filters.tier === tier ? styles.tierActive : ''}`}
                  style={{ '--tier-color': TIER_COLORS[tier] }}
                  onClick={() => setFilter('tier', filters.tier === tier ? 'all' : tier)}
                >
                  <span className={styles.tierDot} />
                  {label}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Property Type" expanded={expandedSection === 'type'} onToggle={() => setExpandedSection(expandedSection === 'type' ? null : 'type')}>
            <div className={styles.chipGrid}>
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t}
                  className={`${styles.chip} ${filters.type === t ? styles.chipActive : ''}`}
                  onClick={() => setFilter('type', filters.type === t ? 'all' : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Occupancy" expanded={expandedSection === 'occ'} onToggle={() => setExpandedSection(expandedSection === 'occ' ? null : 'occ')}>
            <div className={styles.chipGrid}>
              {OCCUPANCY_OPTIONS.map(o => (
                <button
                  key={o}
                  className={`${styles.chip} ${filters.occupancy === o ? styles.chipActive : ''}`}
                  onClick={() => setFilter('occupancy', filters.occupancy === o ? 'all' : o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Value Range" expanded={expandedSection === 'val'} onToggle={() => setExpandedSection(expandedSection === 'val' ? null : 'val')}>
            <div className={styles.rangeGroup}>
              <label className={styles.rangeLabel}>Min Value</label>
              <select className={styles.select} value={filters.minValue || ''} onChange={e => setFilter('minValue', e.target.value)}>
                <option value="">Any</option>
                <option value="100000">$100K+</option>
                <option value="250000">$250K+</option>
                <option value="500000">$500K+</option>
                <option value="1000000">$1M+</option>
                <option value="2000000">$2M+</option>
              </select>
              <label className={styles.rangeLabel}>Max Value</label>
              <select className={styles.select} value={filters.maxValue || ''} onChange={e => setFilter('maxValue', e.target.value)}>
                <option value="">Any</option>
                <option value="500000">Under $500K</option>
                <option value="1000000">Under $1M</option>
                <option value="2000000">Under $2M</option>
                <option value="5000000">Under $5M</option>
              </select>
            </div>
          </Section>

          {/* Live stats */}
          {stats && !loading && (
            <div className={styles.statsBox}>
              <div className={styles.statsTitle}>Current Filter Results</div>
              <div className={styles.statsGrid}>
                <div className={styles.statsItem}>
                  <div className={styles.statsVal}>{fmt.number(stats.total)}</div>
                  <div className={styles.statsKey}>Properties</div>
                </div>
                <div className={styles.statsItem}>
                  <div className={styles.statsVal}>{fmt.currency(stats.avgValue)}</div>
                  <div className={styles.statsKey}>Avg Value</div>
                </div>
                <div className={styles.statsItem}>
                  <div className={styles.statsVal}>{stats.vacantCount}</div>
                  <div className={styles.statsKey}>Vacant</div>
                </div>
                <div className={styles.statsItem}>
                  <div className={styles.statsVal}>{stats.avgCapRate}%</div>
                  <div className={styles.statsKey}>Cap Rate</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <button className={styles.collapseBtn} onClick={() => setOpen(!open)}>
          {open ? '‹' : '›'}
        </button>
      </aside>
    </>
  );
}

function Section({ label, expanded, onToggle, children }) {
  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={onToggle}>
        <span>{label}</span>
        <span className={styles.chevron}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}
