import styles from './TopBar.module.css';
import { fmt } from '../utils/format';

export default function TopBar({ activeView, setActiveView, stats, loading }) {
  const views = [
    { id: 'map', label: 'Intelligence Map', icon: '◉' },
    { id: 'analytics',       label: 'Analytics',    icon: '▦' },
    { id: 'predictor',       label: 'ML Predictor', icon: '◈' },
    { id: 'recommendations', label: 'Invest',        icon: '🔥' },
  ];

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <div>
            <div className={styles.logoName}>Dallas CRE</div>
            <div className={styles.logoSub}>Commercial Intelligence</div>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        {views.map(v => (
          <button
            key={v.id}
            className={`${styles.navBtn} ${activeView === v.id ? styles.active : ''}`}
            onClick={() => setActiveView(v.id)}
          >
            <span className={styles.navIcon}>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </nav>

      <div className={styles.statsRow}>
        {loading ? (
          <>
            <div className={`${styles.stat} skeleton`} style={{width:80,height:32}} />
            <div className={`${styles.stat} skeleton`} style={{width:80,height:32}} />
            <div className={`${styles.stat} skeleton`} style={{width:80,height:32}} />
          </>
        ) : stats ? (
          <>
            <div className={styles.stat}>
              <div className={styles.statVal}>{fmt.number(stats.total)}</div>
              <div className={styles.statLabel}>Properties</div>
            </div>
            <div className={styles.divider} />
            <div className={styles.stat}>
              <div className={styles.statVal}>{fmt.currency(stats.avgValue)}</div>
              <div className={styles.statLabel}>Avg Value</div>
            </div>
            <div className={styles.divider} />
            <div className={styles.stat}>
              <div className={styles.statVal}>{stats.avgCapRate}%</div>
              <div className={styles.statLabel}>Avg Cap Rate</div>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}