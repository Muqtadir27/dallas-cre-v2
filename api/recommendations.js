// api/recommendations.js
// Investment scoring + top property recommendations
// Combines DCAD data + economic signals for investor intelligence

const SUPABASE_URL  = process.env.SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || '';

// Real Dallas economic signals (updated manually quarterly)
// Sources: Dallas Fed, BLS, CoStar market reports
const ECONOMIC_SIGNALS = {
  interest_rate:     5.25,   // Fed funds rate
  cre_cap_rate_avg:  6.8,    // Dallas CRE average cap rate
  market_trend:      'appreciating', // appreciating/stable/declining
  job_growth_pct:    3.2,    // Dallas metro YoY job growth
  population_growth: 2.1,    // Dallas metro YoY population growth
};

// Neighborhood investment scores based on real Dallas market knowledge
const NBR_SCORES = {
  'Downtown':        { growth: 0.85, demand: 0.90, risk: 0.25 },
  'Uptown':          { growth: 0.92, demand: 0.95, risk: 0.20 },
  'Deep Ellum':      { growth: 0.88, demand: 0.85, risk: 0.30 },
  'Design District': { growth: 0.82, demand: 0.88, risk: 0.22 },
  'Knox-Henderson':  { growth: 0.90, demand: 0.92, risk: 0.18 },
  'Mockingbird':     { growth: 0.75, demand: 0.78, risk: 0.28 },
  'Oak Lawn':        { growth: 0.80, demand: 0.82, risk: 0.25 },
  'Bishop Arts':     { growth: 0.85, demand: 0.80, risk: 0.32 },
  'East Dallas':     { growth: 0.70, demand: 0.72, risk: 0.35 },
  'South Dallas':    { growth: 0.65, demand: 0.60, risk: 0.45 },
  'Oak Cliff':       { growth: 0.72, demand: 0.68, risk: 0.38 },
};

// Property type multipliers
const TYPE_MULT = {
  'Medical':    { score: 1.20, reason: 'Healthcare demand is recession-proof' },
  'Warehouse':  { score: 1.15, reason: 'E-commerce driving industrial demand' },
  'Office':     { score: 0.85, reason: 'Remote work reducing office demand' },
  'Retail':     { score: 0.95, reason: 'Mixed outlook, location-dependent' },
  'Restaurant': { score: 0.90, reason: 'High turnover risk' },
  'Industrial': { score: 1.18, reason: 'Supply chain reshoring driving demand' },
  'Mixed-Use':  { score: 1.10, reason: 'Diverse income streams reduce risk' },
  'Flex Space': { score: 1.05, reason: 'Adaptable to market changes' },
};

function computeInvestmentScore(p, nbrAvgValue) {
  // 1. Value score — how undervalued vs neighborhood average (0-25 pts)
  const valueGap = nbrAvgValue > 0 ? (nbrAvgValue - p.predicted_value) / nbrAvgValue : 0;
  const valueScore = Math.min(25, Math.max(0, valueGap * 100 + 12));

  // 2. Cap rate score — higher is better for investors (0-25 pts)
  const capScore = Math.min(25, Math.max(0, (p.cap_rate - 5) * 5));

  // 3. Neighborhood score (0-25 pts)
  const nbr = NBR_SCORES[p.neighborhood] || { growth: 0.70, demand: 0.70, risk: 0.35 };
  const nbrScore = ((nbr.growth + nbr.demand) / 2 - nbr.risk / 2) * 25;

  // 4. Property type score (0-15 pts)
  const typeMult = TYPE_MULT[p.property_type] || { score: 1.0 };
  const typeScore = (typeMult.score - 0.7) * 37.5;

  // 5. Occupancy bonus (0-10 pts)
  const occScore = p.occupancy_status === 'Occupied' ? 10
                 : p.occupancy_status === 'Partially Occupied' ? 5 : 0;

  const total = Math.round(valueScore + capScore + nbrScore + typeScore + occScore);
  const score = Math.min(100, Math.max(0, total));

  const rating = score >= 75 ? 'STRONG BUY'
               : score >= 60 ? 'BUY'
               : score >= 45 ? 'HOLD'
               : score >= 30 ? 'WATCH'
               : 'PASS';

  const reasons = [];
  if (valueGap > 0.1) reasons.push(`${Math.round(valueGap*100)}% below neighborhood average`);
  if (p.cap_rate > 8)  reasons.push(`High ${p.cap_rate}% cap rate`);
  if (nbr.growth > 0.85) reasons.push(`${p.neighborhood} is high-growth area`);
  if (typeMult.score > 1.1) reasons.push(TYPE_MULT[p.property_type].reason);
  if (p.occupancy_status === 'Vacant') reasons.push('Vacant — value-add opportunity');

  return { score, rating, reasons };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    // Fetch all properties
    let allProps = [];
    let offset = 0;
    while (true) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/properties_clean?select=*&limit=1000&offset=${offset}`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      const page = await r.json();
      if (!page.length) break;
      allProps = allProps.concat(page);
      if (page.length < 1000) break;
      offset += 1000;
    }

    // Compute neighborhood averages
    const nbrAvg = {};
    const nbrGroups = {};
    allProps.forEach(p => {
      if (!nbrGroups[p.neighborhood]) nbrGroups[p.neighborhood] = [];
      nbrGroups[p.neighborhood].push(p.predicted_value || 0);
    });
    Object.entries(nbrGroups).forEach(([nbr, vals]) => {
      nbrAvg[nbr] = vals.reduce((a,b)=>a+b,0) / vals.length;
    });

    // Score all properties
    const scored = allProps.map(p => ({
      ...p,
      investment: computeInvestmentScore(p, nbrAvg[p.neighborhood] || 0),
    }));

    // Top recommendations by category
    const strongBuys = scored
      .filter(p => p.investment.rating === 'STRONG BUY')
      .sort((a,b) => b.investment.score - a.investment.score)
      .slice(0, 10);

    const undervalued = scored
      .filter(p => p.predicted_value < (nbrAvg[p.neighborhood] || Infinity) * 0.85)
      .sort((a,b) => b.investment.score - a.investment.score)
      .slice(0, 10);

    const highCapRate = scored
      .filter(p => p.cap_rate >= 9)
      .sort((a,b) => b.cap_rate - a.cap_rate)
      .slice(0, 10);

    const valueAdd = scored
      .filter(p => p.occupancy_status === 'Vacant' && p.investment.score >= 40)
      .sort((a,b) => b.investment.score - a.investment.score)
      .slice(0, 10);

    // Neighborhood rankings
    const nbrRankings = Object.entries(nbrGroups).map(([name, vals]) => {
      const nbrProps = scored.filter(p => p.neighborhood === name);
      const avgScore = nbrProps.reduce((s,p)=>s+p.investment.score,0)/nbrProps.length;
      const avgCapRate = nbrProps.reduce((s,p)=>s+(p.cap_rate||0),0)/nbrProps.length;
      return {
        name,
        count: nbrProps.length,
        avgValue: Math.round(nbrAvg[name]),
        avgScore: Math.round(avgScore),
        avgCapRate: parseFloat(avgCapRate.toFixed(2)),
        tier: nbrProps[0]?.tier || 'standard',
      };
    }).sort((a,b) => b.avgScore - a.avgScore);

    return res.status(200).json({
      total_scored: scored.length,
      economic_signals: ECONOMIC_SIGNALS,
      recommendations: { strongBuys, undervalued, highCapRate, valueAdd },
      neighborhood_rankings: nbrRankings,
      generated_at: new Date().toISOString(),
    });

  } catch(e) {
    console.error('Recommendations error:', e);
    return res.status(500).json({ error: e.message });
  }
}