-- Speech Coach V2 OpenAI Realtime token usage + cost telemetry

CREATE TABLE IF NOT EXISTS speech_coach_v2_session_token_usage (
  id serial PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  user_id text NOT NULL,
  child_id integer NOT NULL,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  input_audio_tokens bigint NOT NULL DEFAULT 0,
  output_audio_tokens bigint NOT NULL DEFAULT 0,
  cached_input_tokens bigint NOT NULL DEFAULT 0,
  input_text_tokens bigint NOT NULL DEFAULT 0,
  output_text_tokens bigint NOT NULL DEFAULT 0,
  response_count integer NOT NULL DEFAULT 0,
  model text,
  estimated_cost_usd real NOT NULL DEFAULT 0,
  estimated_cost_inr real NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS speech_coach_v2_session_token_user_idx
  ON speech_coach_v2_session_token_usage (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS speech_coach_v2_session_token_child_idx
  ON speech_coach_v2_session_token_usage (user_id, child_id, created_at DESC);

CREATE TABLE IF NOT EXISTS speech_coach_v2_monthly_cost_usage (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  child_id integer NOT NULL,
  month text NOT NULL,
  session_count integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  estimated_cost_usd real NOT NULL DEFAULT 0,
  estimated_cost_inr real NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, child_id, month)
);

CREATE INDEX IF NOT EXISTS speech_coach_v2_monthly_cost_user_idx
  ON speech_coach_v2_monthly_cost_usage (user_id, month);
