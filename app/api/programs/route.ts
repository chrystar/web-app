import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-guard";
import { NextRequest, NextResponse } from "next/server";

const PROGRAMS_TABLE_MISSING_CODE = "PGRST205";

const getProgramsTableMissingResponse = () =>
  NextResponse.json(
    {
      error: "Programs table is missing. Run scripts/create_programs_table.sql in Supabase SQL editor.",
      code: PROGRAMS_TABLE_MISSING_CODE,
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
      .from("programs")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/programs error:", error);
      if (error.code === PROGRAMS_TABLE_MISSING_CODE) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("GET /api/programs exception:", error);
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

    const payload = {
      title: String(body.title).trim(),
      description: body.description ? String(body.description).trim() : null,
      program_type: body.program_type ? String(body.program_type).trim() : "general",
      image_url: body.image_url ? String(body.image_url).trim() : null,
      benefits: body.benefits ? String(body.benefits).trim() : null,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      sort_order: body.sort_order ? Number(body.sort_order) : 0,
    };

    const { data, error } = await supabase
      .from("programs")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("POST /api/programs error:", error);
      if (error.code === PROGRAMS_TABLE_MISSING_CODE) {
        return getProgramsTableMissingResponse();
      }
      return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/programs exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
