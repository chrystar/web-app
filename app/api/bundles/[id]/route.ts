import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

const BUNDLES_TABLE_MISSING_CODE = "PGRST205";

const getBundleTableMissingResponse = () =>
  NextResponse.json(
    {
      error: "Bundles table is missing. Run scripts/create_bundles_table.sql in Supabase SQL editor.",
      code: BUNDLES_TABLE_MISSING_CODE,
    },
    { status: 500 }
  );

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bundleId = Number(id);

    if (!Number.isFinite(bundleId)) {
      return NextResponse.json({ error: "Invalid bundle ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bundles")
      .select("*")
      .eq("id", bundleId)
      .single();

    if (error) {
      console.error("GET /api/bundles/[id] error:", error);
      if (error.code === BUNDLES_TABLE_MISSING_CODE) {
        return getBundleTableMissingResponse();
      }
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/bundles/[id] exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { id } = await params;
    const bundleId = Number(id);

    if (!Number.isFinite(bundleId)) {
      return NextResponse.json({ error: "Invalid bundle ID" }, { status: 400 });
    }

    const body = await request.json();

    if (body.title !== undefined && !String(body.title).trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.image_url !== undefined) updates.image_url = body.image_url ? String(body.image_url).trim() : null;
    if (body.bundle_price !== undefined) updates.bundle_price = Number(body.bundle_price);
    if (body.original_price !== undefined) updates.original_price = body.original_price ? Number(body.original_price) : null;
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
    if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

    const { data, error } = await supabase
      .from("bundles")
      .update(updates)
      .eq("id", bundleId)
      .select()
      .single();

    if (error) {
      console.error("PUT /api/bundles/[id] error:", error);
      if (error.code === BUNDLES_TABLE_MISSING_CODE) {
        return getBundleTableMissingResponse();
      }
      return NextResponse.json({ error: "Failed to update bundle" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/bundles/[id] exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { id } = await params;
    const bundleId = Number(id);

    if (!Number.isFinite(bundleId)) {
      return NextResponse.json({ error: "Invalid bundle ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("bundles")
      .delete()
      .eq("id", bundleId);

    if (error) {
      console.error("DELETE /api/bundles/[id] error:", error);
      if (error.code === BUNDLES_TABLE_MISSING_CODE) {
        return getBundleTableMissingResponse();
      }
      return NextResponse.json({ error: "Failed to delete bundle" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/bundles/[id] exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
