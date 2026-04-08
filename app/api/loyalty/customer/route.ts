import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

const isMissingLoyaltySchemaError = (code?: string | null) =>
  code === "PGRST205" || code === "42P01";

const missingSchemaResponse = () =>
  NextResponse.json(
    {
      error:
        "Loyalty schema is missing or incomplete. Run scripts/create_loyalty_tables.sql in Supabase SQL editor.",
    },
    { status: 500 }
  );

export async function GET(request: NextRequest) {
  try {
    const guestUserId = request.nextUrl.searchParams.get("guestUserId")?.trim();

    if (!guestUserId) {
      return NextResponse.json({ error: "guestUserId is required" }, { status: 400 });
    }

    const { data: wallet, error: walletError } = await supabase
      .from("customer_points_wallet")
      .select("points_balance,lifetime_points_earned,lifetime_points_redeemed,lifetime_spend,updated_at")
      .eq("guest_user_id", guestUserId)
      .maybeSingle();

    if (walletError) {
      if (isMissingLoyaltySchemaError(walletError.code)) return missingSchemaResponse();
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    const { data: ledger, error: ledgerError } = await supabase
      .from("customer_points_ledger")
      .select("id,rule_id,transaction_type,points_delta,amount_snapshot,reason,created_at")
      .eq("guest_user_id", guestUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (ledgerError) {
      if (isMissingLoyaltySchemaError(ledgerError.code)) return missingSchemaResponse();
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    const ruleIds = Array.from(
      new Set((ledger || []).map((entry) => entry.rule_id).filter((value) => value != null))
    ) as number[];

    let ruleMap: Record<number, { name: string }> = {};

    if (ruleIds.length) {
      const { data: rulesData, error: rulesError } = await supabase
        .from("loyalty_rules")
        .select("id,name")
        .in("id", ruleIds);

      if (rulesError) {
        if (isMissingLoyaltySchemaError(rulesError.code)) return missingSchemaResponse();
        return NextResponse.json({ error: rulesError.message }, { status: 500 });
      }

      ruleMap = Object.fromEntries((rulesData || []).map((rule) => [rule.id, { name: rule.name }]));
    }

    const { data: rewards, error: rewardsError } = await supabase
      .from("loyalty_rewards")
      .select(
        "id,name,description,reward_type,points_cost,reward_value_amount,coupon_code,is_active,starts_at,ends_at"
      )
      .eq("is_active", true)
      .order("points_cost", { ascending: true });

    if (rewardsError) {
      if (isMissingLoyaltySchemaError(rewardsError.code)) return missingSchemaResponse();
      return NextResponse.json({ error: rewardsError.message }, { status: 500 });
    }

    const { data: redemptions, error: redemptionsError } = await supabase
      .from("reward_redemptions")
      .select("id,reward_id,redemption_type,points_spent,status,created_at,notes")
      .eq("guest_user_id", guestUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (redemptionsError) {
      if (isMissingLoyaltySchemaError(redemptionsError.code)) return missingSchemaResponse();
      return NextResponse.json({ error: redemptionsError.message }, { status: 500 });
    }

    return NextResponse.json({
      wallet: wallet || {
        points_balance: 0,
        lifetime_points_earned: 0,
        lifetime_points_redeemed: 0,
        lifetime_spend: 0,
        updated_at: null,
      },
      transactions: (ledger || []).map((entry) => ({
        ...entry,
        rule_name: entry.rule_id ? ruleMap[entry.rule_id]?.name || null : null,
      })),
      rewards: (rewards || []).filter((reward) => {
        const now = new Date();
        const startsAt = reward.starts_at ? new Date(reward.starts_at) : null;
        const endsAt = reward.ends_at ? new Date(reward.ends_at) : null;
        if (startsAt && startsAt > now) return false;
        if (endsAt && endsAt < now) return false;
        return true;
      }),
      redemptions: redemptions || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
