import { useState, useEffect, useCallback } from 'react';

const DALLAS_NEIGHBORHOODS = [
  { name: "Uptown",            lat: 32.7943, lng: -96.8017, avgRent: 28, avgValue: 850000,  tier: "premium"  },
  { name: "Downtown",          lat: 32.7767, lng: -96.7970, avgRent: 32, avgValue: 1200000, tier: "premium"  },
  { name: "Deep Ellum",        lat: 32.7831, lng: -96.7834, avgRent: 22, avgValue: 620000,  tier: "mid"      },
  { name: "Oak Lawn",          lat: 32.8031, lng: -96.8115, avgRent: 24, avgValue: 720000,  tier: "mid"      },
  { name: "Bishop Arts",       lat: 32.7462, lng: -96.8282, avgRent: 20, avgValue: 540000,  tier: "mid"      },
  { name: "Design District",   lat: 32.7962, lng: -96.8231, avgRent: 26, avgValue: 780000,  tier: "premium"  },
  { name: "Mockingbird",       lat: 32.8353, lng: -96.7847, avgRent: 18, avgValue: 480000,  tier: "standard" },
  { name: "Lower Greenville",  lat: 32.8186, lng: -96.7695, avgRent: 19, avgValue: 510000,  tier: "standard" },
  { name: "Henderson Ave",     lat: 32.8034, lng: -96.7770, avgRent: 21, avgValue: 590000,  tier: "mid"      },
  { name: "West End",          lat: 32.7831, lng: -96.8038, avgRent: 25, avgValue: 690000,  tier: "mid"      },
  { name: "Victory Park",      lat: 32.7900, lng: -96.8120, avgRent: 30, avgValue: 950000,  tier: "premium"  },
  { name: "Knox-Henderson",    lat: 32.8217, lng: -96.7898, avgRent: 27, avgValue: 820000,  tier: "premium"  },
  { name: "Lakewood",          lat: 32.8134, lng: -96.7362, avgRent: 16, avgValue: 420000,  tier: "standard" },
  { name: "East Dallas",       lat: 32.7934, lng: -96.7398, avgRent: 15, avgValue: 390000,  tier: "standard" },
  { name: "South Dallas",      lat: 32.7234, lng: -96.7598, avgRent: 12, avgValue: 280000,  tier: "emerging" },
  { name: "Oak Cliff",         lat: 32.7362, lng: -96.8398, avgRent: 14, avgValue: 340000,  tier: "emerging" },
  { name: "Irving Blvd",       lat: 32.7962, lng: -96.8731, avgRent: 16, avgValue: 410000,  tier: "standard" },
  { name: "Stemmons Corridor", lat: 32.8234, lng: -96.8498, avgRent: 18, avgValue: 460000,  tier: "standard" },
];

const PROPERTY_TYPES   = ["Office","Retail","Mixed-Use","Industrial","Restaurant","Medical","Warehouse","Flex Space"];
const OCCUPANCY_STATUS = ["Occupied","Vacant","Partially Occupied"];
const STREETS = ["Commerce St","Main St","Elm St","Cedar Springs Rd","McKinney Ave","Ross Ave","Greenville Ave","Henderson Ave","Fitzhugh Ave","Lemmon Ave","Oak Lawn Ave","Maple Ave","Market Center Blvd","Industrial Blvd","Harry Hines Blvd"];

const TYPE_MULTIPLIERS = {
  "Office":{"value":1.20,"rent":1.15},"Retail":{"value":1.10,"rent":1.20},
  "Mixed-Use":{"value":1.30,"rent":1.25},"Industrial":{"value":0.80,"rent":0.85},
  "Restaurant":{"value":1.05,"rent":1.30},"Medical":{"value":1.35,"rent":1.40},
  "Warehouse":{"value":0.75,"rent":0.80},"Flex Space":{"value":0.90,"rent":0.95},
};
const TIER_MULT = { premium:1.45, mid:1.15, standard:0.92, emerging:0.72 };
const TIER_SCORE = { premium:92, mid:80, standard:68, emerging:54 };

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function generateProperties() {
  const props = [];
  let id = 1;
  for (const nbr of DALLAS_NEIGHBORHOODS) {
    const count = nbr.tier === "premium" ? 18 : nbr.tier === "mid" ? 14 : 10;
    for (let i = 0; i < count; i++) {
      const seed = id * 137;
      const r = (n) => seededRand(seed + n);
      const lat = nbr.lat + (r(1) - 0.5) * 0.025;
      const lng = nbr.lng + (r(2) - 0.5) * 0.025;
      const propertyType = PROPERTY_TYPES[Math.floor(r(3) * PROPERTY_TYPES.length)];
      const sqft = Math.round(800 + r(4) * 15000);
      const yearBuilt = Math.round(1960 + r(5) * 63);
      const lotSize = Math.round(sqft * (1.2 + r(6) * 2.5));
      const occupancy = OCCUPANCY_STATUS[Math.floor(r(7) * (nbr.tier === "premium" ? 2 : 3))];
      const tm = TYPE_MULTIPLIERS[propertyType] || { value:1, rent:1 };
      const age = 2025 - yearBuilt;
      const ageFactor = age < 10 ? 1.12 : age < 20 ? 1.05 : age < 35 ? 0.98 : 0.88;
      const occFactor = occupancy === "Occupied" ? 1.08 : occupancy === "Partially Occupied" ? 0.95 : 0.82;
      const base = sqft * (80 + 2.8 * TIER_SCORE[nbr.tier]);
      const predictedValue = Math.max(120000, Math.round(base * TIER_MULT[nbr.tier] * tm.value * ageFactor * occFactor * (1 + (r(8) - 0.5) * 0.08)));
      const monthlyRent = Math.round((sqft * nbr.avgRent * (0.85 + r(9) * 0.3)) / 12);
      const capRate = parseFloat(((monthlyRent * 12) / predictedValue * 100).toFixed(2));
      props.push({
        id, address: `${Math.round(1000 + r(11)*8000)} ${STREETS[Math.floor(r(12)*STREETS.length)]}, Dallas, TX`,
        neighborhood: nbr.name, tier: nbr.tier,
        latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)),
        property_type: propertyType, sqft, year_built: yearBuilt, lot_size_sqft: lotSize,
        occupancy_status: occupancy, monthly_rent: monthlyRent, predicted_value: predictedValue,
        price_per_sqft: Math.round(predictedValue / sqft), cap_rate: capRate,
        roi_percent: parseFloat((capRate * (1 + r(10) * 0.4)).toFixed(2)),
        days_on_market: Math.round(r(13) * 180), walk_score: Math.round(40 + r(14) * 55), transit_score: Math.round(30 + r(15) * 60),
      });
      id++;
    }
  }
  return props;
}

function buildStats(properties) {
  if (!properties.length) return null;
  const total = properties.length;
  const avgValue = Math.round(properties.reduce((s,p) => s + p.predicted_value, 0) / total);
  const avgRent = Math.round(properties.reduce((s,p) => s + p.monthly_rent, 0) / total);
  const avgCapRate = (properties.reduce((s,p) => s + p.cap_rate, 0) / total).toFixed(2);
  const vacantCount = properties.filter(p => p.occupancy_status === "Vacant").length;
  const occupiedCount = properties.filter(p => p.occupancy_status === "Occupied").length;
  const totalValue = properties.reduce((s,p) => s + p.predicted_value, 0);
  const neighborhoodBreakdown = DALLAS_NEIGHBORHOODS.map(n => {
    const sub = properties.filter(p => p.neighborhood === n.name);
    return { name: n.name, tier: n.tier, count: sub.length,
      avgValue: sub.length ? Math.round(sub.reduce((s,p) => s + p.predicted_value, 0) / sub.length) : 0,
      avgCapRate: sub.length ? parseFloat((sub.reduce((s,p) => s + p.cap_rate, 0) / sub.length).toFixed(2)) : 0 };
  }).filter(n => n.count > 0);
  const typeBreakdown = PROPERTY_TYPES.map(t => {
    const sub = properties.filter(p => p.property_type === t);
    return { type: t, count: sub.length, avgValue: sub.length ? Math.round(sub.reduce((s,p) => s + p.predicted_value, 0) / sub.length) : 0 };
  }).filter(t => t.count > 0);
  return { total, avgValue, avgRent, avgCapRate, vacantCount, occupiedCount, totalValue, neighborhoodBreakdown, typeBreakdown };
}

const ALL_PROPERTIES = generateProperties();
export const ALL_NEIGHBORHOODS = DALLAS_NEIGHBORHOODS;

export function useProperties(filters = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      let props = [...ALL_PROPERTIES];
      if (filters.tier && filters.tier !== 'all') props = props.filter(p => p.tier === filters.tier);
      if (filters.type && filters.type !== 'all') props = props.filter(p => p.property_type === filters.type);
      if (filters.occupancy && filters.occupancy !== 'all') props = props.filter(p => p.occupancy_status === filters.occupancy);
      if (filters.minValue) props = props.filter(p => p.predicted_value >= parseInt(filters.minValue));
      if (filters.maxValue) props = props.filter(p => p.predicted_value <= parseInt(filters.maxValue));
      setData({ properties: props, stats: buildStats(props), neighborhoods: DALLAS_NEIGHBORHOODS });
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [JSON.stringify(filters)]);
  return { data, loading, error: null, refetch: () => {} };
}

const NEIGHBORHOOD_SCORES = {
  "Uptown":{"score":92,"growth_rate":0.087,"demand_index":94},"Downtown":{"score":95,"growth_rate":0.092,"demand_index":96},
  "Deep Ellum":{"score":78,"growth_rate":0.112,"demand_index":82},"Oak Lawn":{"score":84,"growth_rate":0.078,"demand_index":86},
  "Bishop Arts":{"score":76,"growth_rate":0.105,"demand_index":79},"Design District":{"score":88,"growth_rate":0.095,"demand_index":90},
  "Mockingbird":{"score":72,"growth_rate":0.065,"demand_index":74},"Lower Greenville":{"score":74,"growth_rate":0.072,"demand_index":76},
  "Henderson Ave":{"score":80,"growth_rate":0.082,"demand_index":81},"West End":{"score":82,"growth_rate":0.088,"demand_index":85},
  "Victory Park":{"score":90,"growth_rate":0.098,"demand_index":92},"Knox-Henderson":{"score":87,"growth_rate":0.091,"demand_index":89},
  "Lakewood":{"score":68,"growth_rate":0.058,"demand_index":70},"East Dallas":{"score":65,"growth_rate":0.055,"demand_index":67},
  "South Dallas":{"score":52,"growth_rate":0.048,"demand_index":54},"Oak Cliff":{"score":58,"growth_rate":0.062,"demand_index":60},
  "Irving Blvd":{"score":64,"growth_rate":0.057,"demand_index":65},"Stemmons Corridor":{"score":67,"growth_rate":0.061,"demand_index":68},
};

function runML({ sqft, yearBuilt, lotSize, neighborhood, propertyType, occupancy }) {
  const nbr = NEIGHBORHOOD_SCORES[neighborhood] || { score:70, growth_rate:0.065, demand_index:72 };
  const tm = TYPE_MULTIPLIERS[propertyType] || { value:1.0, rent:1.0 };
  const age = 2025 - yearBuilt;
  const ageFactor = age < 5 ? 1.18 : age < 10 ? 1.12 : age < 20 ? 1.05 : age < 35 ? 0.98 : age < 50 ? 0.90 : 0.82;
  const sizeFactor = sqft < 2000 ? 1.08 : sqft < 5000 ? 1.02 : sqft < 10000 ? 0.97 : 0.93;
  const lotRatio = (lotSize || sqft * 1.8) / sqft;
  const lotPremium = lotRatio > 3 ? 1.12 : lotRatio > 2 ? 1.06 : lotRatio > 1.5 ? 1.02 : 1.0;
  const growthP = 1 + nbr.growth_rate * 2.5;
  const occFactor = occupancy === "Occupied" ? 1.08 : occupancy === "Partially Occupied" ? 0.95 : 0.82;
  const ourEstimate = Math.round(sqft * (80 + nbr.score * 2.8) * tm.value * ageFactor * sizeFactor * lotPremium * growthP * occFactor);
  const zillowEstimate = Math.round(ourEstimate * 0.89);
  const monthlyRent = Math.round((sqft * (8 + nbr.score * 0.22) * tm.rent * occFactor) / 12);
  const annualRent = monthlyRent * 12;
  const capRate = parseFloat(((annualRent / ourEstimate) * 100).toFixed(2));
  return {
    our_estimate: ourEstimate, zillow_estimate: zillowEstimate,
    our_advantage: Math.round(((ourEstimate - zillowEstimate) / zillowEstimate) * 100),
    confidence_low: Math.round(ourEstimate * 0.93), confidence_high: Math.round(ourEstimate * 1.07),
    monthly_rent: monthlyRent, annual_rent: annualRent,
    price_per_sqft: Math.round(ourEstimate / sqft), cap_rate: capRate,
    projection_5yr: Math.round(ourEstimate * Math.pow(1 + nbr.growth_rate, 5)),
    investment_score: Math.min(99, Math.round(nbr.demand_index * 0.35 + capRate * 4 + nbr.growth_rate * 200 + occFactor * 15)),
    neighborhood_growth_rate: (nbr.growth_rate * 100).toFixed(1), demand_index: nbr.demand_index,
    factors: {
      age_factor: ageFactor.toFixed(3), size_efficiency: sizeFactor.toFixed(3),
      lot_premium: lotPremium.toFixed(3), growth_premium: growthP.toFixed(3),
      occupancy_factor: occFactor.toFixed(3), type_multiplier: tm.value.toFixed(3),
    },
  };
}

export function usePredict() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const predict = useCallback((input) => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(runML({ sqft: parseInt(input.sqft), yearBuilt: parseInt(input.yearBuilt), lotSize: parseInt(input.lotSize) || 0, neighborhood: input.neighborhood, propertyType: input.propertyType, occupancy: input.occupancy || 'Occupied' }));
      setLoading(false);
    }, 600);
  }, []);
  return { result, loading, error: null, predict };
}
