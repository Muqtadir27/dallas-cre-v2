-- Run this in Supabase SQL Editor

create table if not exists properties (
  id              bigserial primary key,
  source          text not null,           -- 'dallas_cad' | 'loopnet' | 'crexi' | 'zillow'
  external_id     text,                    -- ID from the source
  address         text not null,
  neighborhood    text,
  city            text default 'Dallas',
  state           text default 'TX',
  zip             text,
  latitude        double precision,
  longitude       double precision,
  property_type   text,
  sqft            integer,
  lot_size_sqft   integer,
  year_built      integer,
  occupancy_status text,
  list_price      bigint,
  predicted_value bigint,
  monthly_rent    integer,
  price_per_sqft  integer,
  cap_rate        double precision,
  days_on_market  integer,
  tier            text,
  raw_data        jsonb,                   -- full original payload
  fetched_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Index for fast geo queries
create index if not exists idx_properties_lat_lng on properties(latitude, longitude);
create index if not exists idx_properties_source  on properties(source);
create index if not exists idx_properties_fetched on properties(fetched_at desc);

-- Upsert helper: prevent duplicates by source + external_id
alter table properties
  add constraint unique_source_external unique (source, external_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_properties_updated
  before update on properties
  for each row execute function update_updated_at();

-- View for the frontend (clean, computed fields)
create or replace view properties_clean as
select
  id, source, address, neighborhood, zip,
  latitude, longitude, property_type,
  sqft, lot_size_sqft, year_built, occupancy_status,
  coalesce(predicted_value, list_price) as predicted_value,
  list_price, monthly_rent,
  coalesce(price_per_sqft, (coalesce(predicted_value,list_price) / nullif(sqft,0))::int) as price_per_sqft,
  cap_rate, days_on_market, tier, fetched_at
from properties
where latitude is not null and longitude is not null
order by fetched_at desc;
