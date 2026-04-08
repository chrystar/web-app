import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-guard";

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
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { data, error } = await supabase
      .from("loyalty_rewards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingLoyaltySchemaError(error.code)) {
        return missingSchemaResponse();
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = await request.json();

    if (!body.name || !body.reward_type) {
      return NextResponse.json({ error: "name and reward_type are required" }, { status: 400 });
    }

    const pointsCost = body.points_cost != null ? Number(body.points_cost) : null;
    const maxRedemptionsTotal =
      body.max_redemptions_total != null ? Number(body.max_redemptions_total) : null;
    const maxRedemptionsPerCustomer =
      body.max_redemptions_per_customer != null ? Number(body.max_redemptions_per_customer) : null;

    const payload = {
      name: String(body.name).trim(),
      description: body.description ? String(body.description).trim() : null,
      reward_type: String(body.reward_type),
      points_cost: pointsCost,
      reward_value_amount: body.reward_value_amount != null ? Number(body.reward_value_amount) : null,
      coupon_code: body.coupon_code ? String(body.coupon_code).trim() : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      is_active: body.is_active !== false,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      max_redemptions_total: maxRedemptionsTotal,
      max_redemptions_per_customer: maxRedemptionsPerCustomer,
    };

    const { data, error } = await supabase
      .from("loyalty_rewards")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingLoyaltySchemaError(error.code)) {
        return missingSchemaResponse();
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
