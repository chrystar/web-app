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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") === "true";

    let query = supabase
      .from("bundles")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/bundles error:", error);
      if (error.code === BUNDLES_TABLE_MISSING_CODE) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: "Failed to fetch bundles" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("GET /api/bundles exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const body = await request.json();

    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (body.bundle_price === undefined || Number(body.bundle_price) <= 0) {
      return NextResponse.json({ error: "Bundle price must be greater than 0" }, { status: 400 });
    }

    const payload = {
      title: String(body.title).trim(),
      description: body.description ? String(body.description).trim() : null,
      image_url: body.image_url ? String(body.image_url).trim() : null,
      bundle_price: Number(body.bundle_price),
      original_price: body.original_price ? Number(body.original_price) : null,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      sort_order: body.sort_order ? Number(body.sort_order) : 0,
    };

    const { data, error } = await supabase
      .from("bundles")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("POST /api/bundles error:", error);
      if (error.code === BUNDLES_TABLE_MISSING_CODE) {
        return getBundleTableMissingResponse();
      }
      return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/bundles exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
