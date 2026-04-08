import { createClient } from "@supabase/supabase-js";

type RuleType = "points_per_order" | "points_per_amount" | "spend_threshold_reward";

interface LoyaltyConfig {
  id: number;
  name: string;
  is_enabled: boolean;
  points_label: string;
}

interface LoyaltyRule {
  id: number;
  name: string;
  rule_type: RuleType;
  is_active: boolean;
  is_stackable: boolean;
  priority: number;
  points_award: number | null;
  points_rate: number | null;
  amount_unit: number | null;
  threshold_amount: number | null;
  reward_id: number | null;
  starts_at: string | null;
  ends_at: string | null;
  max_uses_per_customer: number | null;
}

interface Wallet {
  id: number;
  guest_user_id: string;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  lifetime_spend: number;
}

export interface AwardLoyaltyInput {
  guestUserId?: string | null;
  orderId: number;
  orderTotal: number;
}

export interface AwardLoyaltyResult {
  awardedPoints: number;
  grantedRewards: number;
  skipped: boolean;
  reason?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const nowIso = () => new Date().toISOString();

const isRuleInActiveWindow = (rule: LoyaltyRule): boolean => {
  const now = new Date();
  if (rule.starts_at && new Date(rule.starts_at) > now) return false;
  if (rule.ends_at && new Date(rule.ends_at) < now) return false;
  return true;
};

const getOrCreateWallet = async (guestUserId: string): Promise<Wallet> => {
  const { data: existingWallet, error: fetchError } = await supabase
    .from("customer_points_wallet")
    .select("*")
    .eq("guest_user_id", guestUserId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch wallet: ${fetchError.message}`);
  }

  if (existingWallet) {
    return existingWallet as Wallet;
  }

  const { data: newWallet, error: createError } = await supabase
    .from("customer_points_wallet")
    .insert({
      guest_user_id: guestUserId,
      points_balance: 0,
      lifetime_points_earned: 0,
      lifetime_points_redeemed: 0,
      lifetime_spend: 0,
      updated_at: nowIso(),
    })
    .select("*")
    .single();

  if (createError || !newWallet) {
    throw new Error(`Failed to create wallet: ${createError?.message || "Unknown error"}`);
  }

  return newWallet as Wallet;
};

const hasEarnLedgerForOrderRule = async (
  guestUserId: string,
  orderId: number,
  ruleId: number
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("customer_points_ledger")
    .select("id")
    .eq("guest_user_id", guestUserId)
    .eq("order_id", orderId)
    .eq("rule_id", ruleId)
    .eq("transaction_type", "earn")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check ledger idempotency: ${error.message}`);
  }

  return Boolean(data);
};

const getRuleUsageCount = async (guestUserId: string, ruleId: number): Promise<number> => {
  const { count, error } = await supabase
    .from("customer_points_ledger")
    .select("id", { count: "exact", head: true })
    .eq("guest_user_id", guestUserId)
    .eq("rule_id", ruleId)
    .eq("transaction_type", "earn");

  if (error) {
    throw new Error(`Failed to get rule usage count: ${error.message}`);
  }

  return count || 0;
};

const insertEarnLedger = async (
  guestUserId: string,
  orderId: number,
  ruleId: number,
  points: number,
  orderTotal: number,
  reason: string
) => {
  const { error } = await supabase
    .from("customer_points_ledger")
    .insert({
      guest_user_id: guestUserId,
      order_id: orderId,
      rule_id: ruleId,
      transaction_type: "earn",
      points_delta: points,
      amount_snapshot: orderTotal,
      reason,
      metadata: { source: "orders_api" },
      created_at: nowIso(),
    });

  if (error) {
    if (error.code === "23505") {
      return;
    }
    throw new Error(`Failed to insert earn ledger: ${error.message}`);
  }
};

const maybeGrantThresholdReward = async (
  guestUserId: string,
  orderId: number,
  rule: LoyaltyRule,
  previousLifetimeSpend: number,
  newLifetimeSpend: number
): Promise<boolean> => {
  if (!rule.threshold_amount || !rule.reward_id) return false;

  if (!(previousLifetimeSpend < rule.threshold_amount && newLifetimeSpend >= rule.threshold_amount)) {
    return false;
  }

  const { data: existing, error: existingError } = await supabase
    .from("reward_redemptions")
    .select("id")
    .eq("guest_user_id", guestUserId)
    .eq("order_id", orderId)
    .eq("source_rule_id", rule.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check reward idempotency: ${existingError.message}`);
  }

  if (existing) return false;

  const { error: grantError } = await supabase
    .from("reward_redemptions")
    .insert({
      guest_user_id: guestUserId,
      reward_id: rule.reward_id,
      order_id: orderId,
      source_rule_id: rule.id,
      redemption_type: "threshold_grant",
      status: "granted",
      created_at: nowIso(),
      notes: `Auto granted by rule: ${rule.name}`,
    });

  if (grantError) {
    throw new Error(`Failed to grant threshold reward: ${grantError.message}`);
  }

  return true;
};

export const loyaltyService = {
  async awardForSuccessfulOrder(input: AwardLoyaltyInput): Promise<AwardLoyaltyResult> {
    if (!input.guestUserId) {
      return { awardedPoints: 0, grantedRewards: 0, skipped: true, reason: "No guest user id" };
    }

    const { data: config, error: configError } = await supabase
      .from("loyalty_configs")
      .select("*")
      .eq("name", "default")
      .maybeSingle();

    if (configError) {
      if (configError.code === "PGRST205") {
        return { awardedPoints: 0, grantedRewards: 0, skipped: true, reason: "Loyalty tables missing" };
      }
      throw new Error(`Failed to fetch loyalty config: ${configError.message}`);
    }

    if (!config || !(config as LoyaltyConfig).is_enabled) {
      return { awardedPoints: 0, grantedRewards: 0, skipped: true, reason: "Loyalty disabled" };
    }

    const wallet = await getOrCreateWallet(input.guestUserId);

    const { data: rules, error: rulesError } = await supabase
      .from("loyalty_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (rulesError) {
      throw new Error(`Failed to fetch loyalty rules: ${rulesError.message}`);
    }

    const activeRules = ((rules || []) as LoyaltyRule[]).filter(isRuleInActiveWindow);

    let awardedPoints = 0;
    let grantedRewards = 0;

    for (const rule of activeRules) {
      if (rule.max_uses_per_customer && rule.max_uses_per_customer > 0) {
        const usageCount = await getRuleUsageCount(input.guestUserId, rule.id);
        if (usageCount >= rule.max_uses_per_customer) continue;
      }

      if (rule.rule_type === "points_per_order") {
        const points = Math.max(0, Math.floor(rule.points_award || 0));
        if (points <= 0) continue;

        const alreadyAwarded = await hasEarnLedgerForOrderRule(input.guestUserId, input.orderId, rule.id);
        if (alreadyAwarded) continue;

        await insertEarnLedger(
          input.guestUserId,
          input.orderId,
          rule.id,
          points,
          input.orderTotal,
          `Awarded via rule: ${rule.name}`
        );

        awardedPoints += points;
      }

      if (rule.rule_type === "points_per_amount") {
        if (!rule.points_rate || !rule.amount_unit || rule.amount_unit <= 0) continue;

        const points = Math.max(
          0,
          Math.floor((input.orderTotal / Number(rule.amount_unit)) * Number(rule.points_rate))
        );
        if (points <= 0) continue;

        const alreadyAwarded = await hasEarnLedgerForOrderRule(input.guestUserId, input.orderId, rule.id);
        if (alreadyAwarded) continue;

        await insertEarnLedger(
          input.guestUserId,
          input.orderId,
          rule.id,
          points,
          input.orderTotal,
          `Awarded via spend rule: ${rule.name}`
        );

        awardedPoints += points;
      }

      if (rule.rule_type === "spend_threshold_reward") {
        const granted = await maybeGrantThresholdReward(
          input.guestUserId,
          input.orderId,
          rule,
          Number(wallet.lifetime_spend || 0),
          Number(wallet.lifetime_spend || 0) + input.orderTotal
        );
        if (granted) grantedRewards += 1;
      }
    }

    const { error: walletUpdateError } = await supabase
      .from("customer_points_wallet")
      .update({
        points_balance: Number(wallet.points_balance || 0) + awardedPoints,
        lifetime_points_earned: Number(wallet.lifetime_points_earned || 0) + awardedPoints,
        lifetime_spend: Number(wallet.lifetime_spend || 0) + input.orderTotal,
        updated_at: nowIso(),
      })
      .eq("id", wallet.id);

    if (walletUpdateError) {
      throw new Error(`Failed to update wallet: ${walletUpdateError.message}`);
    }

    return { awardedPoints, grantedRewards, skipped: false };
  },
};
