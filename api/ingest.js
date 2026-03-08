// api/ingest.js
// n8n posts scraped + normalized properties here → we write to Supabase
// Protected by INGEST_SECRET env var

const SUPABASE_URL    = process.env.SUPABASE_URL    || '';
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY || ''; // service role key
const INGEST_SECRET   = process.env.INGEST_SECRET   || 'dallas-cre-secret';

// ML value prediction (same logic as frontend, runs server-side for ingested data)
const NEIGHBORHOOD_SCORES = {
  'Uptown':{'score':92,'growth_rate':0.087},'Downtown':{'score':95,'growth_rate':0.092},
  'Deep Ellum':{'score':78,'growth_rate':0.112},'Oak Lawn':{'score':84,'growth_rate':0.078},
  'Bishop Arts':{'score':76,'growth_rate':0.105},'Design District':{'score':88,'growth_rate':0.095},
  'Mockingbird':{'score':72,'growth_rate':0.065},'Victory Park':{'score':90,'growth_rate':0.098},
  'Knox-Henderson':{'score':87,'growth_rate':0.091},'West End':{'score':82,'growth_rate':0.088},
  'Dallas':{'score':70,'growth_rate':0.070},
};

const TYPE_MULT = {
  'Office':1.20,'Retail':1.10,'Mixed-Use':1.30,'Industrial':0.80,
  'Restaurant':1.05,'Medical':1.35,'Warehouse':0.75,'Flex Space':0.90,
};

function enrichProperty(p) {
  const nbr   = NEIGHBORHOOD_SCORES[p.neighborhood] || NEIGHBORHOOD_SCORES['Dallas'];
  const tMult = TYPE_MULT[p.property_type] || 1.0;
  const sqft  = p.sqft || 2000;
  const age   = 2025 - (p.year_built || 2000);

  const ageFactor = age < 10 ? 1.12 : age < 20 ? 1.05 : age < 35 ? 0.98 : 0.88;

  // If we have a real list price, use ML to validate/adjust it
  // If no price, generate from model
  const modelValue = Math.round(
    sqft * (80 + nbr.score * 2.8) * tMult * ageFactor
  );

  const predicted_value = p.list_price
    ? Math.round(p.list_price * 0.97) // slight discount from list
    : modelValue;

  const monthly_rent    = Math.round((sqft * (8 + nbr.score * 0.22) * tMult) / 12);
  const cap_rate        = parseFloat(((monthly_rent * 12) / predicted_value * 100).toFixed(2));
  const price_per_sqft  = Math.round(predicted_value / sqft);

  // Tier
  const tier = p.tier || (
    nbr.score > 85 ? 'premium' : nbr.score > 75 ? 'mid' : nbr.score > 60 ? 'standard' : 'emerging'
  );

  return {
    ...p,
    predicted_value,
    monthly_rent:  p.monthly_rent  || monthly_rent,
    cap_rate:      p.cap_rate      || cap_rate,
    price_per_sqft: p.price_per_sqft || price_per_sqft,
    tier,
  };
}

async function upsertToSupabase(properties) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required');
  }

  const url = `${SUPABASE_URL}/rest/v1/properties`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'resolution=merge-duplicates', // upsert on unique constraint
    },
    body: JSON.stringify(properties),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }

  return res.json().catch(() => ({ ok: true }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-ingest-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  // Auth check
  const secret = req.headers['x-ingest-secret'];
  if (secret !== INGEST_SECRET) {
    return res.status(401).json({ error: 'Unauthorized — wrong x-ingest-secret header' });
  }

  const { properties = [] } = req.body || {};

  if (!properties.length) {
    return res.status(400).json({ error: 'No properties in body' });
  }

  // Enrich all properties with ML predictions
  const enriched = properties.map(enrichProperty);

  try {
    await upsertToSupabase(enriched);
    return res.status(200).json({
      ok:       true,
      ingested: enriched.length,
      message:  `${enriched.length} properties upserted to Supabase`,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
