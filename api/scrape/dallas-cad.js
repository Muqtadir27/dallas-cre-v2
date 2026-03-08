// api/scrape/dallas-cad.js
// Dallas Central Appraisal District - FREE public data, no auth needed
// Docs: https://www.dallascad.org/

const DALLAS_CAD_BASE = 'https://www.dallascad.org/AcctDetailRes.aspx';

// Dallas CAD has a public search endpoint we can query
// Commercial property type codes: A=commercial, B=industrial, C=office, D=retail
const CAD_SEARCH_URL = 'https://publicaccess.dallascad.org/PublicAccess/Disclaimer.aspx';

// Neighborhood bounding boxes for targeted queries
const NEIGHBORHOODS = [
  { name: 'Uptown',          zip: '75219', lat: 32.7943, lng: -96.8017 },
  { name: 'Downtown',        zip: '75201', lat: 32.7767, lng: -96.7970 },
  { name: 'Deep Ellum',      zip: '75226', lat: 32.7831, lng: -96.7834 },
  { name: 'Design District', zip: '75207', lat: 32.7962, lng: -96.8231 },
  { name: 'Oak Lawn',        zip: '75219', lat: 32.8031, lng: -96.8115 },
  { name: 'Victory Park',    zip: '75219', lat: 32.7900, lng: -96.8120 },
  { name: 'Bishop Arts',     zip: '75208', lat: 32.7462, lng: -96.8282 },
  { name: 'Knox-Henderson',  zip: '75205', lat: 32.8217, lng: -96.7898 },
];

// Property type tier mapping
function getTier(propType, zip) {
  const premiumZips = ['75201','75219','75207'];
  const midZips     = ['75226','75208','75205'];
  if (premiumZips.includes(zip)) return 'premium';
  if (midZips.includes(zip))     return 'mid';
  return 'standard';
}

function classifyType(cadCode) {
  const map = {
    'A': 'Office', 'B': 'Industrial', 'C': 'Retail',
    'D': 'Mixed-Use', 'E': 'Warehouse', 'F': 'Medical',
    'G': 'Restaurant', 'H': 'Flex Space',
  };
  return map[cadCode] || 'Office';
}

// Fetch from Dallas CAD open data portal (SODA API)
// https://data.dallascounty.org/resource/ — public, no key needed
async function fetchCADProperties(zip) {
  const url = `https://data.dallascounty.org/resource/yjaw-skdh.json?zip_code=${zip}&property_use_code=A&$limit=50&$offset=0`;
  
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('CAD fetch error:', e.message);
    return [];
  }
}

// Transform CAD record to our schema
function transformCAD(record, neighborhood) {
  const sqft     = parseInt(record.building_area) || 0;
  const value    = parseInt(record.appraised_value) || 0;
  const yearBuilt = parseInt(record.year_built) || 1990;
  const tier     = getTier(record.property_use_code, record.zip_code);

  return {
    source:          'dallas_cad',
    external_id:     record.account_number || record.parcel_id,
    address:         `${record.situs_num || ''} ${record.situs_street || ''}, Dallas, TX`.trim(),
    neighborhood:    neighborhood.name,
    zip:             record.zip_code || neighborhood.zip,
    latitude:        parseFloat(record.latitude)  || neighborhood.lat + (Math.random()-0.5)*0.01,
    longitude:       parseFloat(record.longitude) || neighborhood.lng + (Math.random()-0.5)*0.01,
    property_type:   classifyType(record.property_use_code),
    sqft:            sqft || null,
    year_built:      yearBuilt,
    occupancy_status: 'Occupied',
    list_price:      value || null,
    predicted_value: value || null,
    price_per_sqft:  sqft && value ? Math.round(value / sqft) : null,
    tier,
    raw_data:        record,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const results = [];
  const errors  = [];

  // Fetch across all target neighborhoods in parallel
  await Promise.all(
    NEIGHBORHOODS.map(async (nbr) => {
      try {
        const records = await fetchCADProperties(nbr.zip);
        records.forEach(r => results.push(transformCAD(r, nbr)));
      } catch (e) {
        errors.push({ neighborhood: nbr.name, error: e.message });
      }
    })
  );

  // If CAD API is down or returns nothing (common), return structured empty response
  // so n8n knows to fall back to other sources
  return res.status(200).json({
    source:    'dallas_cad',
    count:     results.length,
    fetched_at: new Date().toISOString(),
    properties: results,
    errors,
  });
}
