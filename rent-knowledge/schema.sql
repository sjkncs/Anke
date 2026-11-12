CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS rent_schema_version(version integer PRIMARY KEY);
INSERT INTO rent_schema_version VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS rent_sources (
  source_id text PRIMARY KEY, path text NOT NULL, sha256 text NOT NULL,
  usage_terms text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rent_observations (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES rent_sources,
  platform text NOT NULL, listing_id text NOT NULL,
  observed_on date NOT NULL, date_basis text NOT NULL,
  district text, community text, community_key text, community_url text,
  rent_monthly double precision CHECK(rent_monthly > 0 AND rent_monthly < 1000000),
  area_sqm double precision CHECK(area_sqm > 0 AND area_sqm < 2000),
  record_type text NOT NULL CHECK(record_type IN ('挂牌','成交')),
  lease text NOT NULL CHECK(lease IN ('整租','合租','未知')),
  source_url text NOT NULL, raw jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS rent_period_district ON rent_observations(observed_on, district);
CREATE INDEX IF NOT EXISTS rent_community ON rent_observations(community_key, observed_on);
CREATE TABLE IF NOT EXISTS rent_documents (
  id text PRIMARY KEY, title text NOT NULL, body text NOT NULL,
  source_url text NOT NULL, source_id text REFERENCES rent_sources,
  metadata jsonb NOT NULL DEFAULT '{}',
  embedding vector, embedding_model text,
  CHECK ((embedding IS NULL) = (embedding_model IS NULL))
);
CREATE TABLE IF NOT EXISTS rent_aggregate_evidence (
  id text PRIMARY KEY, period_start date NOT NULL, period_end date NOT NULL,
  granularity text NOT NULL CHECK(granularity IN ('year','quarter','month')),
  geography text NOT NULL, metric text NOT NULL,
  value double precision NOT NULL, unit text NOT NULL,
  source_url text NOT NULL, source_title text NOT NULL,
  series_key text NOT NULL, methodology text NOT NULL,
  CHECK(period_end >= period_start)
);
