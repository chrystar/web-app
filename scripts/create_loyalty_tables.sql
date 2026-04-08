-- Loyalty engine schema
-- Supports:
-- 1) Points per order / spend-based points
-- 2) Threshold rewards (e.g., spend ₦200,000 => 1 crate of eggs)

-- Program-level configuration (single row for now, extensible)
CREATE TABLE IF NOT EXISTS loyalty_configs (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL DEFAULT 'default',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  points_label VARCHAR(50) NOT NULL DEFAULT 'points',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

INSERT INTO loyalty_configs (name, is_enabled, points_label)
VALUES ('default', true, 'points')
ON CONFLICT (name) DO NOTHING;

-- Rule types:
-- points_per_order: fixed points per successful order
-- points_per_amount: points based on order total (points_rate per amount_unit)
-- spend_threshold_reward: rewards issued when cumulative spend crosses threshold_amount
CREATE TABLE IF NOT EXISTS loyalty_rules (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_stackable BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,

  -- points config
  points_award INTEGER,
  points_rate NUMERIC(12,4),
  amount_unit NUMERIC(12,2),

  -- threshold config
  threshold_amount NUMERIC(12,2),
  reward_id BIGINT,

  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_uses_per_customer INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_loyalty_rule_type CHECK (
    rule_type IN ('points_per_order', 'points_per_amount', 'spend_threshold_reward')
  )
);

-- Redeemable rewards catalog
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  reward_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  points_cost INTEGER,
  reward_value_amount NUMERIC(12,2),
  coupon_code VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_redemptions_total INTEGER,
  max_redemptions_per_customer INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_reward_type CHECK (reward_type IN ('discount_coupon', 'free_delivery', 'free_item', 'custom'))
);

-- Compatibility patch: if an older loyalty_rewards shape exists, normalize columns.
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50);
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS reward_value_amount NUMERIC(12,2);
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(100);
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS max_redemptions_total INTEGER;
ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS max_redemptions_per_customer INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'loyalty_rewards'
      AND column_name = 'reward_kind'
  ) THEN
    EXECUTE $migrate$
      UPDATE loyalty_rewards
      SET reward_type = CASE reward_kind
        WHEN 'discount' THEN 'discount_coupon'
        WHEN 'free_shipping' THEN 'free_delivery'
        WHEN 'gift_item' THEN 'free_item'
        ELSE 'custom'
      END
      WHERE reward_type IS NULL OR reward_type = ''
    $migrate$;
  END IF;
END $$;

UPDATE loyalty_rewards
SET reward_type = 'custom'
WHERE reward_type IS NULL OR reward_type = '';

ALTER TABLE loyalty_rewards
ALTER COLUMN reward_type SET DEFAULT 'custom',
ALTER COLUMN reward_type SET NOT NULL;

ALTER TABLE loyalty_rewards DROP CONSTRAINT IF EXISTS chk_reward_kind;
ALTER TABLE loyalty_rewards DROP CONSTRAINT IF EXISTS chk_reward_type;
ALTER TABLE loyalty_rewards
ADD CONSTRAINT chk_reward_type CHECK (reward_type IN ('discount_coupon', 'free_delivery', 'free_item', 'custom'));

DO $$
BEGIN
  ALTER TABLE loyalty_rules
    ADD CONSTRAINT fk_loyalty_rules_reward
    FOREIGN KEY (reward_id)
    REFERENCES loyalty_rewards(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Customer wallet summary
CREATE TABLE IF NOT EXISTS customer_points_wallet (
  id BIGSERIAL PRIMARY KEY,
  guest_user_id UUID NOT NULL REFERENCES guest_users(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_points_redeemed INTEGER NOT NULL DEFAULT 0,
  lifetime_spend NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guest_user_id)
);

-- Immutable points ledger
CREATE TABLE IF NOT EXISTS customer_points_ledger (
  id BIGSERIAL PRIMARY KEY,
  guest_user_id UUID NOT NULL REFERENCES guest_users(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  rule_id BIGINT REFERENCES loyalty_rules(id) ON DELETE SET NULL,
  transaction_type VARCHAR(20) NOT NULL,
  points_delta INTEGER NOT NULL,
  amount_snapshot NUMERIC(12,2),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_points_transaction_type CHECK (
    transaction_type IN ('earn', 'redeem', 'adjustment', 'reversal')
  )
);

-- Idempotency guard: do not award same rule twice for same order+customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_order_rule_unique
ON customer_points_ledger(guest_user_id, order_id, rule_id)
WHERE transaction_type = 'earn' AND order_id IS NOT NULL AND rule_id IS NOT NULL;

-- Reward redemptions/grants
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id BIGSERIAL PRIMARY KEY,
  guest_user_id UUID NOT NULL REFERENCES guest_users(id) ON DELETE CASCADE,
  reward_id BIGINT NOT NULL REFERENCES loyalty_rewards(id) ON DELETE RESTRICT,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  source_rule_id BIGINT REFERENCES loyalty_rules(id) ON DELETE SET NULL,
  redemption_type VARCHAR(30) NOT NULL DEFAULT 'threshold_grant',
  points_spent INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'granted',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_redemption_type CHECK (redemption_type IN ('threshold_grant', 'points_redeem', 'manual_grant')),
  CONSTRAINT chk_redemption_status CHECK (status IN ('granted', 'claimed', 'cancelled'))
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_rules_active_priority ON loyalty_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_loyalty_rules_window ON loyalty_rules(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_wallet_guest_user ON customer_points_wallet(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_guest_user_time ON customer_points_ledger(guest_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_guest_user ON reward_redemptions(guest_user_id, created_at DESC);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loyalty_configs_updated_at ON loyalty_configs;
CREATE TRIGGER trg_loyalty_configs_updated_at
BEFORE UPDATE ON loyalty_configs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_loyalty_rules_updated_at ON loyalty_rules;
CREATE TRIGGER trg_loyalty_rules_updated_at
BEFORE UPDATE ON loyalty_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_loyalty_rewards_updated_at ON loyalty_rewards;
CREATE TRIGGER trg_loyalty_rewards_updated_at
BEFORE UPDATE ON loyalty_rewards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_customer_points_wallet_updated_at ON customer_points_wallet;
CREATE TRIGGER trg_customer_points_wallet_updated_at
BEFORE UPDATE ON customer_points_wallet
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
