// api/properties.js
const SUPABASE_URL  = process.env.SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || '';

const NEIGHBORHOODS = [
  { name:"Uptown",lat:32.7943,lng:-96.8017,tier:"premium",avgRent:28 },
  { name:"Downtown",lat:32.7767,lng:-96.7970,tier:"premium",avgRent:32 },
  { name:"Deep Ellum",lat:32.7831,lng:-96.7834,tier:"mid",avgRent:22 },
  { name:"Oak Lawn",lat:32.8031,lng:-96.8115,tier:"mid",avgRent:24 },
  { name:"Bishop Arts",lat:32.7462,lng:-96.8282,tier:"mid",avgRent:20 },
  { name:"Design District",lat:32.7962,lng:-96.8231,tier:"premium",avgRent:26 },
  { name:"Mockingbird",lat:32.8353,lng:-96.7847,tier:"standard",avgRent:18 },
  { name:"Victory Park",lat:32.7900,lng:-96.8120,tier:"premium",avgRent:30 },
  { name:"Knox-Henderson",lat:32.8217,lng:-96.7898,tier:"premium",avgRent:27 },
  { name:"Oak Cliff",lat:32.7362,lng:-96.8398,tier:"emerging",avgRent:14 },
  { name:"South Dallas",lat:32.7234,lng:-96.7598,tier:"emerging",avgRent:12 },
  { name:"East Dallas",lat:32.7934,lng:-96.7398,tier:"standard",avgRent:15 },
];
const TYPES = ["Office","Retail","Mixed-Use","Industrial","Restaurant","Medical","Warehouse","Flex Space"];
const OCC   = ["Occupied","Vacant","Partially Occupied"];
const TIER_MULT = {premium:1.45,mid:1.15,standard:0.92,emerging:0.72};

function sr(seed){const x=Math.sin(seed+1)*43758.5453123;return x-Math.floor(x);}

function generateFallback() {
  const props=[]; let id=1;
  for(const n of NEIGHBORHOODS){
    const count = n.tier==='premium'?18:n.tier==='mid'?14:10;
    for(let i=0;i<count;i++){
      const s=id*137, r=(n)=>sr(s+n);
      const sqft=Math.round(800+r(4)*15000);
      const yr=Math.round(1960+r(5)*63);
      const age=2025-yr;
      const ageFactor=age<10?1.12:age<20?1.05:age<35?0.98:0.88;
      const occ=OCC[Math.floor(r(7)*(n.tier==='premium'?2:3))];
      const occF=occ==='Occupied'?1.08:occ==='Partially Occupied'?0.95:0.82;
      const val=Math.max(120000,Math.round(sqft*(80+2.8*{premium:92,mid:80,standard:68,emerging:54}[n.tier])*TIER_MULT[n.tier]*ageFactor*occF*(1+(r(8)-0.5)*0.08)));
      const rent=Math.round((sqft*n.avgRent*(0.85+r(9)*0.3))/12);
      props.push({
        id, source:'generated',
        address:`${Math.round(1000+r(11)*8000)} ${['Commerce St','Main St','Elm St','McKinney Ave','Ross Ave'][Math.floor(r(12)*5)]}, Dallas, TX`,
        neighborhood:n.name, tier:n.tier,
        latitude:parseFloat((n.lat+(r(1)-0.5)*0.025).toFixed(6)),
        longitude:parseFloat((n.lng+(r(2)-0.5)*0.025).toFixed(6)),
        property_type:TYPES[Math.floor(r(3)*TYPES.length)],
        sqft, year_built:yr, occupancy_status:occ,
        predicted_value:val, monthly_rent:rent,
        price_per_sqft:Math.round(val/sqft),
        cap_rate:parseFloat(((rent*12)/val*100).toFixed(2)),
        days_on_market:Math.round(r(13)*180),
      });
      id++;
    }
  }
  return props;
}

async function fetchFromSupabase(filters={}) {
  // Fetch all pages up to 14,755 properties
  let allProperties = [];
  let offset = 0;
  const pageSize = 1000;

  while(true) {
    let url = `${SUPABASE_URL}/rest/v1/properties_clean?select=*&limit=${pageSize}&offset=${offset}`;

    if(filters.tier      && filters.tier      !=='all') url+=`&tier=eq.${filters.tier}`;
    if(filters.type      && filters.type      !=='all') url+=`&property_type=eq.${encodeURIComponent(filters.type)}`;
    if(filters.occupancy && filters.occupancy !=='all') url+=`&occupancy_status=eq.${encodeURIComponent(filters.occupancy)}`;
    if(filters.minValue) url+=`&predicted_value=gte.${filters.minValue}`;
    if(filters.maxValue) url+=`&predicted_value=lte.${filters.maxValue}`;

    const res = await fetch(url, {
      headers:{ 'apikey': SUPABASE_ANON, 'Authorization':`Bearer ${SUPABASE_ANON}` },
      signal: AbortSignal.timeout(10000),
    });
    if(!res.ok) throw new Error(`Supabase ${res.status}`);
    const page = await res.json();
    if(!page.length) break;
    allProperties = allProperties.concat(page);
    if(page.length < pageSize) break;
    offset += pageSize;
  }

  return allProperties;
}

function buildStats(properties) {
  if(!properties.length) return null;
  const total      = properties.length;
  const avgValue   = Math.round(properties.reduce((s,p)=>s+(p.predicted_value||0),0)/total);
  const avgRent    = Math.round(properties.reduce((s,p)=>s+(p.monthly_rent||0),0)/total);
  const avgCapRate = (properties.reduce((s,p)=>s+(p.cap_rate||0),0)/total).toFixed(2);
  const vacantCount   = properties.filter(p=>p.occupancy_status==='Vacant').length;
  const occupiedCount = properties.filter(p=>p.occupancy_status==='Occupied').length;
  const totalValue    = properties.reduce((s,p)=>s+(p.predicted_value||0),0);

  const nbrNames = [...new Set(properties.map(p=>p.neighborhood))];
  const neighborhoodBreakdown = nbrNames.map(name=>{
    const sub=properties.filter(p=>p.neighborhood===name);
    return{name,count:sub.length,
      tier:sub[0]?.tier||'standard',
      avgValue:Math.round(sub.reduce((s,p)=>s+(p.predicted_value||0),0)/sub.length),
      avgCapRate:parseFloat((sub.reduce((s,p)=>s+(p.cap_rate||0),0)/sub.length).toFixed(2))};
  }).sort((a,b)=>b.avgValue-a.avgValue);

  const typeNames = [...new Set(properties.map(p=>p.property_type))];
  const typeBreakdown = typeNames.map(type=>{
    const sub=properties.filter(p=>p.property_type===type);
    return{type,count:sub.length,
      avgValue:Math.round(sub.reduce((s,p)=>s+(p.predicted_value||0),0)/sub.length)};
  });

  return{total,avgValue,avgRent,avgCapRate,vacantCount,occupiedCount,totalValue,neighborhoodBreakdown,typeBreakdown};
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-cache');

  const filters = {
    tier:      req.query.tier,
    type:      req.query.type,
    occupancy: req.query.occupancy,
    minValue:  req.query.minValue,
    maxValue:  req.query.maxValue,
  };

  let properties = [];
  let dataSource = 'generated';

  if(SUPABASE_URL && SUPABASE_ANON){
    try{
      properties = await fetchFromSupabase(filters);
      dataSource = 'supabase';
      console.log(`Loaded ${properties.length} properties from Supabase`);
    }catch(e){
      console.error('Supabase failed, using fallback:', e.message);
    }
  }

  if(!properties.length){
    let all = generateFallback();
    if(filters.tier      && filters.tier!=='all')      all=all.filter(p=>p.tier===filters.tier);
    if(filters.type      && filters.type!=='all')      all=all.filter(p=>p.property_type===filters.type);
    if(filters.occupancy && filters.occupancy!=='all') all=all.filter(p=>p.occupancy_status===filters.occupancy);
    if(filters.minValue) all=all.filter(p=>p.predicted_value>=parseInt(filters.minValue));
    if(filters.maxValue) all=all.filter(p=>p.predicted_value<=parseInt(filters.maxValue));
    properties = all;
  }

  return res.status(200).json({
    properties,
    stats:      buildStats(properties),
    data_source: dataSource,
    fetched_at: new Date().toISOString(),
  });
}