import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapView.module.css';
import { TIER_COLORS, OCCUPANCY_COLORS, fmt } from '../utils/format';

export default function MapView({ properties, loading, mapMode, setMapMode, onSelectProperty }) {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const markersLayer = useRef(null);
  const heatLayer    = useRef(null);
  const clusterLayer = useRef(null);

  // Init map once
  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [32.7767, -96.7970],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
    }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current  = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  // Redraw on mode or data change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !properties.length) return;

    // Clear all layers
    markersLayer.current.clearLayers();
    if (heatLayer.current)    { map.removeLayer(heatLayer.current);    heatLayer.current    = null; }
    if (clusterLayer.current) { map.removeLayer(clusterLayer.current); clusterLayer.current = null; }

    if (mapMode === 'heatmap') {
      // Manual heatmap using canvas circles
      const canvas = document.createElement('canvas');
      const bounds = map.getBounds();
      const size   = map.getSize();
      canvas.width  = size.x;
      canvas.height = size.y;
      const ctx = canvas.getContext('2d');

      properties.forEach(p => {
        const pt = map.latLngToContainerPoint([p.latitude, p.longitude]);
        const intensity = Math.min(1, p.predicted_value / 2000000);
        const radius = 30 + intensity * 20;
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
        const alpha = 0.15 + intensity * 0.25;
        if (p.tier === 'premium')       grad.addColorStop(0, `rgba(0,212,255,${alpha})`);
        else if (p.tier === 'mid')      grad.addColorStop(0, `rgba(124,255,107,${alpha})`);
        else if (p.tier === 'standard') grad.addColorStop(0, `rgba(245,200,66,${alpha})`);
        else                            grad.addColorStop(0, `rgba(255,107,53,${alpha})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      const dataUrl  = canvas.toDataURL();
      const sw       = map.containerPointToLatLng([0, size.y]);
      const ne       = map.containerPointToLatLng([size.x, 0]);
      const imgBounds = L.latLngBounds([sw, ne]);
      heatLayer.current = L.imageOverlay(dataUrl, imgBounds, { opacity: 0.85 }).addTo(map);

      // Also add faint dots so you can see property locations
      properties.forEach(p => {
        const color = TIER_COLORS[p.tier] || '#a8b8d0';
        const icon  = L.divIcon({
          className: '',
          html: `<div style="width:5px;height:5px;background:${color};border-radius:50%;opacity:0.6;"></div>`,
          iconSize: [5,5], iconAnchor: [2.5,2.5],
        });
        markersLayer.current.addLayer(L.marker([p.latitude, p.longitude], { icon }));
      });
      return;
    }

    if (mapMode === 'clusters') {
      // Manual clustering by grouping nearby properties
      const GRID = 0.015; // degrees per cell
      const cells = {};
      properties.forEach(p => {
        const cellLat = Math.round(p.latitude  / GRID) * GRID;
        const cellLng = Math.round(p.longitude / GRID) * GRID;
        const key     = `${cellLat},${cellLng}`;
        if (!cells[key]) cells[key] = { lat: cellLat, lng: cellLng, items: [] };
        cells[key].items.push(p);
      });

      Object.values(cells).forEach(cell => {
        const count  = cell.items.length;
        const avgVal = cell.items.reduce((s,p) => s + p.predicted_value, 0) / count;
        // dominant tier
        const tierCounts = {};
        cell.items.forEach(p => { tierCounts[p.tier] = (tierCounts[p.tier]||0)+1; });
        const dominantTier = Object.entries(tierCounts).sort((a,b)=>b[1]-a[1])[0][0];
        const color = TIER_COLORS[dominantTier] || '#a8b8d0';
        const size  = count === 1 ? 10 : count <= 3 ? 24 : count <= 7 ? 34 : 44;

        const icon = L.divIcon({
          className: '',
          html: count === 1
            ? `<div style="width:10px;height:10px;background:${color};border-radius:50%;border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 0 8px ${color}88;cursor:pointer;"></div>`
            : `<div style="
                width:${size}px;height:${size}px;
                background:${color}22;border:2px solid ${color};
                border-radius:50%;display:flex;align-items:center;justify-content:center;
                box-shadow:0 0 12px ${color}55;cursor:pointer;
              ">
                <span style="color:${color};font-size:${size>30?12:10}px;font-weight:700;font-family:monospace;">${count}</span>
              </div>`,
          iconSize:   [size, size],
          iconAnchor: [size/2, size/2],
        });

        const marker = L.marker([cell.lat, cell.lng], { icon });
        marker.bindPopup(`
          <div style="padding:12px;font-family:sans-serif;">
            <div style="font-size:9px;color:${color};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${dominantTier} cluster</div>
            <div style="font-size:15px;font-weight:700;color:#f0f4ff;margin-bottom:4px;">${count} properties</div>
            <div style="font-size:11px;color:#a8b8d0;">Avg value: ${fmt.currency(avgVal)}</div>
          </div>
        `);

        if (count === 1) {
          marker.on('click', () => onSelectProperty(cell.items[0]));
        }
        markersLayer.current.addLayer(marker);
      });
      map.invalidateSize();
      return;
    }

    // Default: individual markers
    properties.forEach(p => {
      const color = TIER_COLORS[p.tier] || '#a8b8d0';
      const size  = p.predicted_value > 1000000 ? 13 : p.predicted_value > 500000 ? 10 : 8;
      const icon  = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;background:${color};border-radius:50%;
          border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 0 ${size+2}px ${color}88;cursor:pointer;
        "></div>`,
        iconSize: [size, size], iconAnchor: [size/2, size/2],
      });
      const marker = L.marker([p.latitude, p.longitude], { icon });
      marker.bindPopup(`
        <div style="padding:12px;min-width:220px;font-family:sans-serif;">
          <div style="font-size:9px;color:${color};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${p.tier} · ${p.property_type}</div>
          <div style="font-size:15px;font-weight:700;color:#f0f4ff;margin-bottom:4px;">${fmt.currency(p.predicted_value)}</div>
          <div style="font-size:11px;color:#a8b8d0;margin-bottom:8px;">${p.address}</div>
          <div style="display:flex;gap:14px;">
            <div><div style="font-size:12px;color:#f0f4ff;">${p.sqft.toLocaleString()} sqft</div><div style="font-size:9px;color:#5a7090;">Size</div></div>
            <div><div style="font-size:12px;color:${p.cap_rate>6?'#2ed573':'#f5c842'};">${p.cap_rate}%</div><div style="font-size:9px;color:#5a7090;">Cap Rate</div></div>
            <div><div style="font-size:12px;color:${OCCUPANCY_COLORS[p.occupancy_status]};">${p.occupancy_status}</div><div style="font-size:9px;color:#5a7090;">Status</div></div>
          </div>
        </div>
      `, { closeButton: true });
      marker.on('click', () => onSelectProperty(p));
      markersLayer.current.addLayer(marker);
    });
    map.invalidateSize();
  }, [properties, mapMode]);

  return (
    <div className={styles.wrap}>
      <div ref={mapRef} className={styles.map} />

      <div className={styles.controls}>
        <div className={styles.modeGroup}>
          {[
            { id: 'markers',  label: 'Markers',  icon: '◉' },
            { id: 'heatmap',  label: 'Heatmap',  icon: '◈' },
            { id: 'clusters', label: 'Clusters', icon: '⬡' },
          ].map(m => (
            <button key={m.id}
              className={`${styles.modeBtn} ${mapMode === m.id ? styles.modeBtnActive : ''}`}
              onClick={() => setMapMode(m.id)}>
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Market Tier</div>
        {Object.entries(TIER_COLORS).map(([tier, color]) => (
          <div key={tier} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: color, boxShadow:`0 0 6px ${color}66` }} />
            <span style={{ textTransform:'capitalize' }}>{tier}</span>
          </div>
        ))}
      </div>

      {/* Data source badge */}
      <div className={styles.sourceBadge}>
        <span className={styles.sourceIcon}>◉</span>
        Dallas CRE Model · 240 properties · Synthetic (based on real market averages)
        &nbsp;·&nbsp;
        <a href="https://www.attomdata.com" target="_blank" rel="noreferrer" style={{color:'var(--accent)',textDecoration:'none'}}>
          Connect Attom API for live data →
        </a>
      </div>

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>Loading properties...</div>
        </div>
      )}

      {!loading && properties.length > 0 && (
        <div className={styles.countBadge}>
          <span className={styles.countNum}>{properties.length}</span>
          <span className={styles.countLabel}>properties</span>
        </div>
      )}
    </div>
  );
}
