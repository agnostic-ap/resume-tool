CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free', 'pro')),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'canceled', 'expired')),
  CONSTRAINT subscriptions_source_check CHECK (source IN ('manual', 'stripe'))
);

CREATE TABLE IF NOT EXISTS usage_counters (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  period_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, period_key),
  CONSTRAINT usage_counters_kind_check CHECK (kind IN ('ai_draft', 'export')),
  CONSTRAINT usage_counters_count_check CHECK (count >= 0)
);

CREATE INDEX IF NOT EXISTS subscriptions_plan_status_idx ON subscriptions(plan, status);
CREATE INDEX IF NOT EXISTS usage_counters_user_kind_idx ON usage_counters(user_id, kind, period_key);
