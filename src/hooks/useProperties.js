import { useState, useEffect } from 'react';

// Seeded random for stable fallback data
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

const NEIGHBORHOODS = [
  { name: "Uptown",          zip: "75219", lat: 32.7943, lng: -96.8017, tier: "premium"  },
  { name: "Downtown",        zip: "75201", lat: 32.7767, lng: -96.7970, tier: "premium"  },
  { name: "Deep Ellum",      zip: "75226", lat: 32.7831, lng: -96.7834, tier: "mid"      },
  { name: "Design District", zip: "75207", lat: 32.7962, lng: -96.8231, tier: "premium"  },
  { name: "Oak Lawn",        zip: "75219", lat: 32.8031, lng: -96.8115, tier: "mid"      },
  { name: "Victory Park",    zip: "75219", lat: 32.7900, lng: -96.8120, tier: "premium"  },
  { name: "Bishop Arts",     zip: "75208", lat: 32.7462, lng: -96.8282, tier: "mid"      },
  { name: "Knox-Henderson",  zip: "75205", lat: 32.8217, lng: -96.7898, tier: "premium"  },
  { name: "East Dallas",     zip: "75214", lat: 32.7934, lng: -96.7398, tier: "standard" },
  { name: "Oak Cliff",       zip: "75208", lat: 32.7362, lng: -96.8398, tier: "emerging" },
  { name: "South Dallas",    zip: "75215", lat: 32.7234, lng: -96.7598, tier: "emerging" },
  { name: "Mockingbird",     zip: "75206", lat: 32.8353, lng: -96.7847, tier: "standard" },
];

function generateFallback() {
  const TYPES = ['Office','Retail','Mixed-Use','Industrial','Restaurant','Medical','Warehouse','Flex Space'];
  const OCCS  = ['Occupied','Occupied','Occupied','Partially Occupied','Vacant'];
  const STREETS = ['Commerce St','Main St','Elm St','McKinney Ave','Ross Ave',
    'Cedar Springs Rd','Greenville Ave','Henderson Ave','Oak Lawn Ave','Lemmon Ave'];
  const TIER_BASE = { premium: 420, mid: 280, standard: 180, emerging: 110 };

  const properties = [];
  let id = 1;

  for (const nbr of NEIGHBORHOODS) {
    const count = nbr.tier === 'premium' ? 20 : nbr.tier === 'mid' ? 15 : 10;
    for (let i = 0; i < count; i++) {
      const seed = nbr.zip.charCodeAt(0) * 137 + i * 31;
      const r = (n) => seededRand(seed + n);
      const sqft = Math.round(1000 + r(1) * 18000);
      const yearBuilt = Math.round(1955 + r(2) * 68);
      const age = 2025 - yearBuilt;
      const ageFactor = age < 10 ? 1.15 : age < 20 ? 1.06 : age < 35 ? 0.99 : 0.88;
      const basePerSqft = TIER_BASE[nbr.tier] * (0.88 + r(3) * 0.25);
      const value = Math.round(sqft * basePerSqft * ageFactor);
      const rentPerSqft = { premium: 30, mid: 22, standard: 16, emerging: 11 }[nbr.tier];
      const monthlyRent = Math.round((sqft * rentPerSqft * (0.85 + r(4) * 0.3)) / 12);

      properties.push({
        id,
        source: 'fallback',
        address: `${Math.round(1000 + r(5)*8000)} ${STREETS[Math.floor(r(6)*STREETS.length)]}, Dallas, TX ${nbr.zip}`,
        neighborhood: nbr.name,
        latitude: parseFloat((nbr.lat + (r(7)-0.5)*0.022).toFixed(6)),
        longitude: parseFloat((nbr.lng + (r(8)-0.5)*0.022).toFixed(6)),
        property_type: TYPES[Math.floor(r(9)*TYPES.length)],
        sqft,
        year_built: yearBuilt,
        occupancy_status: OCCS[Math.floor(r(11)*OCCS.length)],
        list_price: value,
        predicted_value: value,
        monthly_rent: monthlyRent,
        price_per_sqft: Math.round(value / sqft),
        cap_rate: parseFloat(((monthlyRent * 12) / value * 100).toFixed(2)),
        days_on_market: Math.round(r(12) * 200),
        tier: nbr.tier,
      });
      id++;
    }
  }
  return properties;
}

export function useProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('loading');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/properties');
        if (res.ok) {
          const data = await res.json();
          if (data.properties && data.properties.length > 0) {
            setProperties(data.properties);
            setSource(data.source || 'supabase');
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log('API unavailable, using fallback:', e.message);
      }
      // Fallback to generated data
      setProperties(generateFallback());
      setSource('synthetic');
      setLoading(false);
    }
    load();
  }, []);

  return { properties, loading, source };
}

export function usePredict() {
  function predict({ sqft, yearBuilt, propertyType, occupancy, neighborhood }) {
    const age = 2025 - (yearBuilt || 2000);
    const ageFactor = age < 10 ? 1.15 : age < 20 ? 1.06 : age < 35 ? 0.99 : 0.88;
    const TYPE_MULT = { 'Office': 1.1, 'Retail': 1.05, 'Mixed-Use': 1.08, 'Medical': 1.2, 'Industrial': 0.85, 'Warehouse': 0.78, 'Restaurant': 1.0, 'Flex Space': 0.9 };
    const NBR_BASE = { 'Uptown': 420, 'Downtown': 400, 'Design District': 390, 'Victory Park': 380, 'Knox-Henderson': 360, 'Oak Lawn': 300, 'Deep Ellum': 280, 'Bishop Arts': 270, 'Mockingbird': 200, 'East Dallas': 190, 'Oak Cliff': 130, 'South Dallas': 115 };
    const base = NBR_BASE[neighborhood] || 220;
    const typeMult = TYPE_MULT[propertyType] || 1.0;
    const occMult = occupancy === 'Occupied' ? 1.05 : occupancy === 'Vacant' ? 0.82 : 0.93;
    const estimate = Math.round((sqft || 5000) * base * typeMult * ageFactor * occMult);
    const zillow = Math.round(estimate * 0.89);
    const capRate = parseFloat(((estimate * 0.07) / estimate * 100).toFixed(2));
    const score = Math.min(99, Math.round(60 + (typeMult - 0.78) * 40 + (ageFactor - 0.88) * 30 + (occMult - 0.82) * 25));
    return { estimate, zillow, capRate, score, fiveYear: Math.round(estimate * 1.22) };
  }
  return { predict };
}