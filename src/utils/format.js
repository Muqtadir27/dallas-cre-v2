export const fmt = {
  currency: (n) => n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : n >= 1000
    ? `$${(n / 1000).toFixed(0)}K`
    : `$${n}`,
  
  fullCurrency: (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n),

  number: (n) => new Intl.NumberFormat('en-US').format(n),

  percent: (n) => `${n}%`,

  sqft: (n) => `${new Intl.NumberFormat('en-US').format(n)} sqft`,
};

export const TIER_COLORS = {
  premium: '#00d4ff',
  mid: '#7cff6b',
  standard: '#f5c842',
  emerging: '#ff6b35',
};

export const TIER_LABELS = {
  premium: 'Premium',
  mid: 'Mid-Market',
  standard: 'Standard',
  emerging: 'Emerging',
};

export const TYPE_ICONS = {
  'Office': '🏢',
  'Retail': '🏪',
  'Mixed-Use': '🏙️',
  'Industrial': '🏭',
  'Restaurant': '🍽️',
  'Medical': '🏥',
  'Warehouse': '📦',
  'Flex Space': '🔧',
};

export const OCCUPANCY_COLORS = {
  'Occupied': '#2ed573',
  'Partially Occupied': '#f5c842',
  'Vacant': '#ff4757',
};

export function getMarkerColor(property) {
  const colors = TIER_COLORS;
  return colors[property.tier] || '#a8b8d0';
}

export function createCustomIcon(color, size = 10) {
  const L = window.L;
  if (!L) return null;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50%;
      border:2px solid rgba(255,255,255,0.3);
      box-shadow:0 0 ${size}px ${color}88;
      transition:all 0.2s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
}
