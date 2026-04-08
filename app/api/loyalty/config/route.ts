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
      .from("loyalty_configs")
      .select("*")
      .eq("name", "default")
      .maybeSingle();

    if (error) {
      if (isMissingLoyaltySchemaError(error.code)) {
        return missingSchemaResponse();
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      return NextResponse.json(data);
    }

    const { data: created, error: createError } = await supabase
      .from("loyalty_configs")
      .insert({ name: "default", is_enabled: true, points_label: "Points" })
      .select("*")
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = await request.json();
    const isEnabled = Boolean(body.is_enabled);
    const pointsLabel = (body.points_label || "Points").toString().trim();

    const { data: existing, error: fetchError } = await supabase
      .from("loyalty_configs")
      .select("id")
      .eq("name", "default")
      .maybeSingle();

    if (fetchError) {
      if (isMissingLoyaltySchemaError(fetchError.code)) {
        return missingSchemaResponse();
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      const { data: created, error: createError } = await supabase
        .from("loyalty_configs")
        .insert({ name: "default", is_enabled: isEnabled, points_label: pointsLabel })
        .select("*")
        .single();

      if (createError) {
        if (isMissingLoyaltySchemaError(createError.code)) {
          return missingSchemaResponse();
        }
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return NextResponse.json(created);
    }

    const { data: updated, error: updateError } = await supabase
      .from("loyalty_configs")
      .update({ is_enabled: isEnabled, points_label: pointsLabel, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) {
      if (isMissingLoyaltySchemaError(updateError.code)) {
        return missingSchemaResponse();
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
