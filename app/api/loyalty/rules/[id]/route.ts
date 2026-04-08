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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { id } = await params;
    const body = await request.json();

    const updates = {
      name: body.name != null ? String(body.name).trim() : undefined,
      description: body.description != null ? String(body.description).trim() : undefined,
      rule_type: body.rule_type != null ? String(body.rule_type) : undefined,
      is_active: body.is_active != null ? Boolean(body.is_active) : undefined,
      is_stackable: body.is_stackable != null ? Boolean(body.is_stackable) : undefined,
      priority: body.priority != null ? Number(body.priority) : undefined,
      starts_at: body.starts_at !== undefined ? body.starts_at || null : undefined,
      ends_at: body.ends_at !== undefined ? body.ends_at || null : undefined,
      points_award: body.points_award !== undefined ? (body.points_award != null ? Number(body.points_award) : null) : undefined,
      points_rate: body.points_rate !== undefined ? (body.points_rate != null ? Number(body.points_rate) : null) : undefined,
      amount_unit: body.amount_unit !== undefined ? (body.amount_unit != null ? Number(body.amount_unit) : null) : undefined,
      threshold_amount:
        body.threshold_amount !== undefined
          ? body.threshold_amount != null
            ? Number(body.threshold_amount)
            : null
          : undefined,
      reward_id: body.reward_id !== undefined ? (body.reward_id != null ? Number(body.reward_id) : null) : undefined,
      max_uses_per_customer:
        body.max_uses_per_customer !== undefined
          ? body.max_uses_per_customer != null
            ? Number(body.max_uses_per_customer)
            : null
          : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("loyalty_rules")
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
    const adminCheck = await requireAdmin(_request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { id } = await params;

    const { error } = await supabase.from("loyalty_rules").delete().eq("id", Number(id));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
