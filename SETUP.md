# Dallas CRE — Full Data Pipeline Setup Guide

## Architecture
```
Dallas CAD (free) ──┐
LoopNet (scrape) ───┤──► n8n (every 6h) ──► /api/ingest ──► Supabase ──► Your site
Crexi (scrape) ─────┘                         (normalizes      (free DB)    (reads live)
                                               + ML enriches)
```

---

## Step 1 — Supabase (5 mins)

1. Go to https://supabase.com → New Project → name: `dallas-cre`
2. SQL Editor → paste contents of `supabase_schema.sql` → Run
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY` (keep secret!)

---

## Step 2 — Deploy to Vercel (3 mins)

1. Push this folder to GitHub
2. vercel.com → Import repo → Deploy
3. In Vercel **Settings → Environment Variables**, add:

```
SUPABASE_URL          = https://xxxx.supabase.co
SUPABASE_ANON_KEY     = eyJ...
SUPABASE_SERVICE_KEY  = eyJ...
INGEST_SECRET         = dallas-cre-secret   ← change this to something private
SCRAPINGBEE_KEY       = your_key_here       ← get free key at scrapingbee.com
```

4. Redeploy after adding env vars

---

## Step 3 — ScrapingBee (2 mins, free tier)

1. Go to https://www.scrapingbee.com → Sign up free (1000 credits/month)
2. Copy your API key → paste as `SCRAPINGBEE_KEY` in Vercel

> Without this, only Dallas CAD (free public API) will work.
> LoopNet and Crexi require it to bypass anti-bot protection.

---

## Step 4 — n8n Workflow (10 mins)

1. Go to https://n8n.io → Sign up free (cloud hosted)
2. **New Workflow → Import from JSON** → paste `n8n_workflow.json`
3. Find every node that says `YOUR-VERCEL-URL` → replace with your actual Vercel URL
   e.g. `https://dallas-cre.vercel.app`
4. In "POST to Ingest API" node → update `x-ingest-secret` to match your `INGEST_SECRET`
5. **Activate** the workflow (toggle top right)

The workflow will:
- Run every 6 hours automatically
- Fetch from Dallas CAD + LoopNet + Crexi in parallel
- Normalize and deduplicate all properties
- Enrich with ML predictions
- Upsert to Supabase (no duplicates)
- Your site instantly shows live data on next load

---

## Step 5 — Test It

### Test scrapers manually:
```
https://your-site.vercel.app/api/scrape/dallas-cad
https://your-site.vercel.app/api/scrape/listings?source=loopnet
https://your-site.vercel.app/api/scrape/listings?source=crexi
```

### Test ingest manually (curl):
```bash
curl -X POST https://your-site.vercel.app/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: dallas-cre-secret" \
  -d '{"properties":[{"source":"test","external_id":"t1","address":"123 Main St, Dallas, TX","neighborhood":"Uptown","latitude":32.7943,"longitude":-96.8017,"property_type":"Office","sqft":3000,"year_built":2010,"occupancy_status":"Occupied","tier":"premium"}]}'
```

### Trigger n8n manually:
In n8n → open workflow → click "Execute Workflow"

---

## Data Sources

| Source       | Type          | Cost  | Reliability | Notes                          |
|-------------|---------------|-------|-------------|--------------------------------|
| Dallas CAD  | Public API    | Free  | High        | Official appraisal data        |
| LoopNet     | Scrape        | Free* | Medium      | Needs ScrapingBee              |
| Crexi       | Scrape        | Free* | Medium      | Needs ScrapingBee              |
| Zillow      | Not included  | —     | Low         | Mostly residential, blocks bots|

*ScrapingBee free tier: 1000 credits/month (~200 scrapes)

---

## Upgrade Path (when you outgrow free tier)

- **More data**: Attom API ($200/mo) — best commercial data for Dallas
- **More scraping**: ScrapingBee paid ($49/mo) — 150k credits
- **Bigger DB**: Supabase Pro ($25/mo) — 8GB, no pausing
- **n8n**: Self-host on Railway ($5/mo) for unlimited workflows

---

## How the Site Uses Data

1. On every page load → frontend calls `/api/properties`
2. `/api/properties` checks if `SUPABASE_URL` is set
3. If yes → queries `properties_clean` view in Supabase
4. If no (or Supabase empty) → falls back to generated data
5. n8n keeps Supabase fresh every 6 hours

So the site always works, even before Supabase is set up.
