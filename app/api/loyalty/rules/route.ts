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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("loyalty_rules")
      .select("*")
      .order("priority", { ascending: true })
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
    const body = await request.json();

    if (!body.name || !body.rule_type) {
      return NextResponse.json({ error: "name and rule_type are required" }, { status: 400 });
    }

    const payload = {
      name: String(body.name).trim(),
      description: body.description ? String(body.description).trim() : null,
      rule_type: String(body.rule_type),
      is_active: body.is_active !== false,
      is_stackable: body.is_stackable !== false,
      priority: Number(body.priority ?? 100),
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      points_award: body.points_award != null ? Number(body.points_award) : null,
      points_rate: body.points_rate != null ? Number(body.points_rate) : null,
      amount_unit: body.amount_unit != null ? Number(body.amount_unit) : null,
      threshold_amount: body.threshold_amount != null ? Number(body.threshold_amount) : null,
      reward_id: body.reward_id != null ? Number(body.reward_id) : null,
      max_uses_per_customer:
        body.max_uses_per_customer != null ? Number(body.max_uses_per_customer) : null,
    };

    const { data, error } = await supabase.from("loyalty_rules").insert(payload).select("*").single();

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
