CREATE TABLE IF NOT EXISTS rent_environment_assets (
  asset_id text PRIMARY KEY,
  source_path text NOT NULL,
  source_sha256 text NOT NULL CHECK(length(source_sha256)=64),
  asset_type text NOT NULL CHECK(asset_type IN ('streetview','regional_raster')),
  metadata jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS rent_environment_features (
  feature_id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES rent_environment_assets(asset_id),
  method text NOT NULL,
  model_revision text NOT NULL,
  values_json jsonb NOT NULL,
  validation_status text NOT NULL CHECK(validation_status IN ('pending','reviewed'))
);
CREATE TABLE IF NOT EXISTS rent_environment_match_candidates (
  candidate_id text PRIMARY KEY,
  observation_id text NOT NULL REFERENCES rent_observations(id),
  metadata jsonb NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  CHECK (accepted = false)
);
