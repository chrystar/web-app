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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const programId = Number(id);

    if (!Number.isFinite(programId)) {
      return NextResponse.json({ error: "Invalid program ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .single();

    if (error) {
      console.error("GET /api/programs/[id] error:", error);
      if (error.code === PROGRAMS_TABLE_MISSING_CODE) {
        return getProgramsTableMissingResponse();
      }
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/programs/[id] exception:", error);
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
    const programId = Number(id);

    if (!Number.isFinite(programId)) {
      return NextResponse.json({ error: "Invalid program ID" }, { status: 400 });
    }

    const body = await request.json();

    if (body.title !== undefined && !String(body.title).trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.program_type !== undefined) updates.program_type = body.program_type ? String(body.program_type).trim() : "general";
    if (body.image_url !== undefined) updates.image_url = body.image_url ? String(body.image_url).trim() : null;
    if (body.benefits !== undefined) updates.benefits = body.benefits ? String(body.benefits).trim() : null;
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
    if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

    const { data, error } = await supabase
      .from("programs")
      .update(updates)
      .eq("id", programId)
      .select()
      .single();

    if (error) {
      console.error("PUT /api/programs/[id] error:", error);
      if (error.code === PROGRAMS_TABLE_MISSING_CODE) {
        return getProgramsTableMissingResponse();
      }
      return NextResponse.json({ error: "Failed to update program" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/programs/[id] exception:", error);
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
    const programId = Number(id);

    if (!Number.isFinite(programId)) {
      return NextResponse.json({ error: "Invalid program ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("programs")
      .delete()
      .eq("id", programId);

    if (error) {
      console.error("DELETE /api/programs/[id] error:", error);
      if (error.code === PROGRAMS_TABLE_MISSING_CODE) {
        return getProgramsTableMissingResponse();
      }
      return NextResponse.json({ error: "Failed to delete program" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/programs/[id] exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
