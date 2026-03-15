import { useState, useEffect } from 'react';
import styles from './RecommendationsPanel.module.css';
import { fmt } from '../utils/format';

const RATING_COLORS = {
  'STRONG BUY': '#2ed573',
  'BUY':        '#7cff6b',
  'HOLD':       '#f5c842',
  'WATCH':      '#ff9f43',
  'PASS':       '#ff6b6b',
};

const CATEGORIES = [
  { id: 'strongBuys',  label: 'Strong Buys',    icon: '🔥' },
  { id: 'undervalued', label: 'Undervalued',     icon: '💎' },
  { id: 'highCapRate', label: 'High Cap Rate',   icon: '📈' },
  { id: 'valueAdd',    label: 'Value-Add',       icon: '🏗️' },
];

export default function RecommendationsPanel({ onSelectProperty }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('strongBuys');

  useEffect(() => {
    fetch('/api/recommendations')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className={styles.wrap}>
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <div>Scoring {(14755).toLocaleString()} properties...</div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className={styles.wrap}>
      <div className={styles.error}>Failed to load recommendations</div>
    </div>
  );

  const { recommendations, neighborhood_rankings, economic_signals, total_scored } = data;
  const props = recommendations[activeTab] || [];

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.title}>Investment Intelligence</div>
          <div className={styles.subtitle}>{total_scored?.toLocaleString()} properties scored · DCAD 2025</div>
        </div>
        <div className={styles.signals}>
          <div className={styles.signal}>
            <span className={styles.signalVal} style={{color:'#f5c842'}}>{economic_signals.interest_rate}%</span>
            <span className={styles.signalLabel}>Fed Rate</span>
          </div>
          <div className={styles.signal}>
            <span className={styles.signalVal} style={{color:'#7cff6b'}}>{economic_signals.job_growth_pct}%</span>
            <span className={styles.signalLabel}>Job Growth</span>
          </div>
          <div className={styles.signal}>
            <span className={styles.signalVal} style={{color:'#00d4ff'}}>{economic_signals.cre_cap_rate_avg}%</span>
            <span className={styles.signalLabel}>Avg Cap Rate</span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* Left: Recommendations */}
        <div className={styles.left}>
          {/* Category tabs */}
          <div className={styles.tabs}>
            {CATEGORIES.map(c => (
              <button key={c.id}
                className={`${styles.tab} ${activeTab === c.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(c.id)}>
                <span>{c.icon}</span> {c.label}
                <span className={styles.tabCount}>{recommendations[c.id]?.length || 0}</span>
              </button>
            ))}
          </div>

          {/* Property list */}
          <div className={styles.propList}>
            {props.length === 0 ? (
              <div className={styles.empty}>No properties in this category</div>
            ) : props.map((p, i) => (
              <div key={p.id} className={styles.propCard} onClick={() => onSelectProperty(p)}>
                <div className={styles.propRank}>#{i+1}</div>
                <div className={styles.propMain}>
                  <div className={styles.propTop}>
                    <div className={styles.propAddress}>{p.address?.split(',')[0]}</div>
                    <div className={styles.propRating}
                      style={{color: RATING_COLORS[p.investment?.rating], borderColor: RATING_COLORS[p.investment?.rating]+'44', background: RATING_COLORS[p.investment?.rating]+'11'}}>
                      {p.investment?.rating}
                    </div>
                  </div>
                  <div className={styles.propMeta}>
                    <span>{p.neighborhood}</span>
                    <span>·</span>
                    <span>{p.property_type}</span>
                    <span>·</span>
                    <span style={{color: p.occupancy_status === 'Vacant' ? '#ff6b35' : '#7cff6b'}}>{p.occupancy_status}</span>
                  </div>
                  <div className={styles.propMetrics}>
                    <div className={styles.metricChip}>
                      <span className={styles.metricVal}>{fmt.currency(p.predicted_value)}</span>
                      <span className={styles.metricLabel}>Value</span>
                    </div>
                    <div className={styles.metricChip}>
                      <span className={styles.metricVal} style={{color:'#2ed573'}}>{p.cap_rate}%</span>
                      <span className={styles.metricLabel}>Cap Rate</span>
                    </div>
                    <div className={styles.metricChip}>
                      <span className={styles.metricVal} style={{color:'#00d4ff'}}>{p.investment?.score}/100</span>
                      <span className={styles.metricLabel}>Score</span>
                    </div>
                    {p.sqft > 0 && (
                      <div className={styles.metricChip}>
                        <span className={styles.metricVal}>{p.sqft?.toLocaleString()} sf</span>
                        <span className={styles.metricLabel}>Size</span>
                      </div>
                    )}
                  </div>
                  {p.investment?.reasons?.length > 0 && (
                    <div className={styles.reasons}>
                      {p.investment.reasons.slice(0,2).map((r,i) => (
                        <span key={i} className={styles.reason}>✓ {r}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Neighborhood rankings */}
        <div className={styles.right}>
          <div className={styles.sectionTitle}>Neighborhood Rankings</div>
          <div className={styles.nbrList}>
            {neighborhood_rankings?.slice(0,12).map((n, i) => (
              <div key={n.name} className={styles.nbrRow}>
                <div className={styles.nbrRank} style={{color: i < 3 ? '#f5c842' : '#5a7090'}}>
                  #{i+1}
                </div>
                <div className={styles.nbrMain}>
                  <div className={styles.nbrName}>{n.name}</div>
                  <div className={styles.nbrStats}>
                    <span>{n.count} properties</span>
                    <span>·</span>
                    <span style={{color:'#2ed573'}}>{n.avgCapRate}% cap</span>
                  </div>
                </div>
                <div className={styles.nbrScore}>
                  <div className={styles.nbrScoreVal}>{n.avgScore}</div>
                  <div className={styles.nbrScoreBar}>
                    <div style={{width:`${n.avgScore}%`, height:'100%', background: n.avgScore >= 70 ? '#2ed573' : n.avgScore >= 50 ? '#f5c842' : '#ff6b6b', borderRadius:2}} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Market context */}
          <div className={styles.marketContext}>
            <div className={styles.sectionTitle} style={{marginTop:20}}>Market Context</div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>Market Trend</span>
              <span className={styles.contextVal} style={{color:'#2ed573', textTransform:'capitalize'}}>
                {economic_signals.market_trend} ↑
              </span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>Population Growth</span>
              <span className={styles.contextVal}>{economic_signals.population_growth}% YoY</span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>Job Growth</span>
              <span className={styles.contextVal} style={{color:'#7cff6b'}}>{economic_signals.job_growth_pct}% YoY</span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>Data Source</span>
              <span className={styles.contextVal}>DCAD 2025 Certified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}