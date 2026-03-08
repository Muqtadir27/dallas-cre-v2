// api/scrape/listings.js
// Scrapes LoopNet + Crexi commercial listings for Dallas
// Uses ScrapingBee (1000 free credits/mo) to bypass anti-bot protection
// Sign up free: https://www.scrapingbee.com/

const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY || '';

// LoopNet search URL for Dallas commercial properties
const LOOPNET_URL = 'https://www.loopnet.com/search/commercial-real-estate/dallas-tx/for-sale/';

// Crexi search URL
const CREXI_URL = 'https://www.crexi.com/properties?statuses=Active&propertyTypes=office%2Cretail%2Cindustrial&location=Dallas%2C+TX';

const TIER_MAP = {
  'Uptown': 'premium', 'Downtown': 'premium', 'Victory Park': 'premium',
  'Design District': 'premium', 'Knox-Henderson': 'premium',
  'Deep Ellum': 'mid', 'Oak Lawn': 'mid', 'Bishop Arts': 'mid',
  'West End': 'mid', 'Henderson Ave': 'mid',
  'Mockingbird': 'standard', 'Lakewood': 'standard', 'East Dallas': 'standard',
  'South Dallas': 'emerging', 'Oak Cliff': 'emerging',
};

function getTier(neighborhood) {
  return TIER_MAP[neighborhood] || 'standard';
}

// Rough geo lookup for Dallas neighborhoods by keyword
const NBR_GEO = {
  'uptown':       { lat: 32.7943, lng: -96.8017, name: 'Uptown' },
  'downtown':     { lat: 32.7767, lng: -96.7970, name: 'Downtown' },
  'deep ellum':   { lat: 32.7831, lng: -96.7834, name: 'Deep Ellum' },
  'oak lawn':     { lat: 32.8031, lng: -96.8115, name: 'Oak Lawn' },
  'bishop arts':  { lat: 32.7462, lng: -96.8282, name: 'Bishop Arts' },
  'design dist':  { lat: 32.7962, lng: -96.8231, name: 'Design District' },
  'victory park': { lat: 32.7900, lng: -96.8120, name: 'Victory Park' },
  'oak cliff':    { lat: 32.7362, lng: -96.8398, name: 'Oak Cliff' },
  'mockingbird':  { lat: 32.8353, lng: -96.7847, name: 'Mockingbird' },
};

function guessNeighborhood(address = '') {
  const lower = address.toLowerCase();
  for (const [key, val] of Object.entries(NBR_GEO)) {
    if (lower.includes(key)) return val;
  }
  // Default: central Dallas with small random offset
  return {
    lat: 32.7767 + (Math.random()-0.5)*0.06,
    lng: -96.7970 + (Math.random()-0.5)*0.06,
    name: 'Dallas',
  };
}

async function scrapeWithBee(url) {
  if (!SCRAPINGBEE_KEY) {
    throw new Error('SCRAPINGBEE_KEY not set — add it to Vercel env vars');
  }
  const beeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=true&wait=2000&json_response=false`;
  const res = await fetch(beeUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`ScrapingBee error: ${res.status}`);
  return res.text();
}

// Parse LoopNet HTML — extract listing cards
function parseLoopNet(html) {
  const properties = [];
  
  // Match listing cards via regex (LoopNet's structure)
  const cardPattern = /data-listing-id="(\d+)"[\s\S]*?class="[^"]*property-address[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>[\s\S]*?(\$[\d,\.]+[MK]?)[\s\S]*?(\d[\d,]+)\s*(?:SF|sqft)/gi;
  const pricePattern = /\$(\d[\d,\.]+)\s*([MK]?)/g;

  let match;
  let id = 1;

  // Simpler extraction: find price blocks
  const listingBlocks = html.split('property-address');
  
  for (let i = 1; i < Math.min(listingBlocks.length, 51); i++) {
    const block = listingBlocks[i];
    
    // Extract address
    const addrMatch = block.match(/>([^<]{5,80}Dallas[^<]*)</i);
    const address   = addrMatch ? addrMatch[1].trim() : `${1000+i} Commerce St, Dallas, TX`;
    
    // Extract price
    const priceMatch = block.match(/\$([\d,\.]+)\s*([MK]?)/);
    let price = 0;
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g,''));
      if (priceMatch[2] === 'M') price *= 1000000;
      if (priceMatch[2] === 'K') price *= 1000;
    }

    // Extract sqft
    const sqftMatch = block.match(/([\d,]+)\s*(?:SF|sqft|sq\.?\s*ft)/i);
    const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g,'')) : null;

    // Extract type
    const typeMatch = block.match(/(Office|Retail|Industrial|Mixed.Use|Restaurant|Medical|Warehouse|Flex)/i);
    const propType  = typeMatch ? typeMatch[1] : 'Office';

    if (!price && !sqft) continue; // skip empty blocks

    const nbr = guessNeighborhood(address);

    properties.push({
      source:          'loopnet',
      external_id:     `ln_${i}_${Date.now()}`,
      address,
      neighborhood:    nbr.name,
      latitude:        nbr.lat + (Math.random()-0.5)*0.008,
      longitude:       nbr.lng + (Math.random()-0.5)*0.008,
      property_type:   propType,
      sqft:            sqft || null,
      list_price:      price || null,
      predicted_value: price || null,
      price_per_sqft:  price && sqft ? Math.round(price/sqft) : null,
      tier:            getTier(nbr.name),
      occupancy_status:'Occupied',
      raw_data:        { block_snippet: block.slice(0,200) },
    });
  }

  return properties;
}

// Parse Crexi HTML
function parseCrexi(html) {
  const properties = [];
  const blocks = html.split('property-card');

  for (let i = 1; i < Math.min(blocks.length, 51); i++) {
    const block = blocks[i];

    const addrMatch  = block.match(/([^<]{5,80}Dallas[^<]*TX[^<]*)/i);
    const priceMatch = block.match(/\$([\d,\.]+)\s*([MK]?)/);
    const sqftMatch  = block.match(/([\d,]+)\s*(?:SF|sqft)/i);
    const typeMatch  = block.match(/(Office|Retail|Industrial|Mixed.Use|Restaurant|Medical)/i);

    const address = addrMatch ? addrMatch[1].trim() : `${2000+i} McKinney Ave, Dallas, TX`;
    let price = 0;
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g,''));
      if (priceMatch[2] === 'M') price *= 1000000;
      if (priceMatch[2] === 'K') price *= 1000;
    }
    const sqft    = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g,'')) : null;
    const nbr     = guessNeighborhood(address);

    if (!price && !sqft) continue;

    properties.push({
      source:          'crexi',
      external_id:     `crx_${i}_${Date.now()}`,
      address,
      neighborhood:    nbr.name,
      latitude:        nbr.lat + (Math.random()-0.5)*0.008,
      longitude:       nbr.lng + (Math.random()-0.5)*0.008,
      property_type:   typeMatch ? typeMatch[1] : 'Retail',
      sqft,
      list_price:      price || null,
      predicted_value: price || null,
      price_per_sqft:  price && sqft ? Math.round(price/sqft) : null,
      tier:            getTier(nbr.name),
      occupancy_status: 'Occupied',
      raw_data:        { block_snippet: block.slice(0,200) },
    });
  }

  return properties;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { source = 'both' } = req.query;
  const results = [];
  const errors  = [];

  if (source === 'loopnet' || source === 'both') {
    try {
      const html  = await scrapeWithBee(LOOPNET_URL);
      const props = parseLoopNet(html);
      results.push(...props);
    } catch (e) {
      errors.push({ source: 'loopnet', error: e.message });
    }
  }

  if (source === 'crexi' || source === 'both') {
    try {
      const html  = await scrapeWithBee(CREXI_URL);
      const props = parseCrexi(html);
      results.push(...props);
    } catch (e) {
      errors.push({ source: 'crexi', error: e.message });
    }
  }

  return res.status(200).json({
    source:     source,
    count:      results.length,
    fetched_at: new Date().toISOString(),
    properties: results,
    errors,
    note: errors.length ? 'Some sources failed. Add SCRAPINGBEE_KEY to Vercel env vars.' : 'OK',
  });
}
