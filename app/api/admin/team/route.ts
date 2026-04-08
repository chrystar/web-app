import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-guard";

const ALLOWED_ROLES = new Set(["admin", "manager", "staff"]);

const normalizeOrigin = (value: string) => {
  const parsed = new URL(value);
  return `${parsed.protocol}//${parsed.host}`;
};

const isLocalOrigin = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const getAppOriginFromRequest = (request: NextRequest) => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (!host) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
};

const getInviteRedirectTo = (request: NextRequest) => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const requestOrigin = getAppOriginFromRequest(request);

  if (requestOrigin && !isLocalOrigin(requestOrigin)) {
    return `${requestOrigin}/admin/login`;
  }

  if (configuredUrl) {
    const configuredOrigin = normalizeOrigin(configuredUrl);
    if (!isLocalOrigin(configuredOrigin)) {
      return `${configuredOrigin}/admin/login`;
    }

    return `${configuredOrigin}/admin/login`;
  }

  if (requestOrigin) {
    return `${requestOrigin}/admin/login`;
  }

  return "http://localhost:3000/admin/login";
};

const supabaseAdmin = createClient(
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
  const adminCheck = await requireAdmin(request);
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data?.users || [])
    .map((user) => ({
      id: user.id,
      email: user.email || "",
      role: String(user.user_metadata?.role || user.app_metadata?.role || "staff"),
      invitedAt: user.created_at || null,
      lastSignInAt: user.last_sign_in_at || null,
      emailConfirmedAt: user.email_confirmed_at || null,
    }))
    .filter((user) => user.email);

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "staff").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const redirectTo = getInviteRedirectTo(request);

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      role,
      invited_by: adminCheck.user?.email || "admin",
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      message: "Invitation sent successfully",
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role,
      },
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (adminCheck.user?.id === userId) {
    return NextResponse.json({ error: "You cannot remove your own account" }, { status: 400 });
  }

  const { data: targetUserData, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(
    userId
  );

  if (targetUserError || !targetUserData.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetRole = String(
    targetUserData.user.user_metadata?.role || targetUserData.user.app_metadata?.role || "staff"
  ).toLowerCase();

  if (targetRole === "admin") {
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const adminCount = (listData?.users || []).filter((user) => {
      const role = String(user.user_metadata?.role || user.app_metadata?.role || "staff").toLowerCase();
      return role === "admin";
    }).length;

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin account" },
        { status: 400 }
      );
    }
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Team member removed successfully" });
}