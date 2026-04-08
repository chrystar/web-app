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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates = {
      name: body.name != null ? String(body.name).trim() : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      reward_type: body.reward_type != null ? String(body.reward_type) : undefined,
      points_cost:
        body.points_cost !== undefined ? (body.points_cost != null ? Number(body.points_cost) : null) : undefined,
      reward_value_amount:
        body.reward_value_amount !== undefined
          ? body.reward_value_amount != null
            ? Number(body.reward_value_amount)
            : null
          : undefined,
      coupon_code:
        body.coupon_code !== undefined ? (body.coupon_code ? String(body.coupon_code).trim() : null) : undefined,
      metadata:
        body.metadata !== undefined
          ? body.metadata && typeof body.metadata === "object"
            ? body.metadata
            : {}
          : undefined,
      is_active: body.is_active != null ? Boolean(body.is_active) : undefined,
      starts_at: body.starts_at !== undefined ? body.starts_at || null : undefined,
      ends_at: body.ends_at !== undefined ? body.ends_at || null : undefined,
      max_redemptions_total:
        body.max_redemptions_total !== undefined
          ? body.max_redemptions_total != null
            ? Number(body.max_redemptions_total)
            : null
          : undefined,
      max_redemptions_per_customer:
        body.max_redemptions_per_customer !== undefined
          ? body.max_redemptions_per_customer != null
            ? Number(body.max_redemptions_per_customer)
            : null
          : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("loyalty_rewards")
      .update(updates)
      .eq("id", Number(id))
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { error } = await supabase.from("loyalty_rewards").delete().eq("id", Number(id));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
