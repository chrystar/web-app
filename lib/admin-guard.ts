import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const getAdminEmails = () => {
  const combined = [
    process.env.ADMIN_EMAILS || "",
    process.env.ADMIN_EMAIL || "",
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
  ]
    .filter(Boolean)
    .join(",");

  return combined
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const getAccessTokenFromHeader = (request: Request) => {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
};

const isUserAdmin = (user: User) => {
  const role = String(user.app_metadata?.role || user.user_metadata?.role || "").toLowerCase();
  if (role === "admin") {
    return true;
  }

  const adminEmails = getAdminEmails();
  const email = String(user.email || "").toLowerCase();
  return adminEmails.includes(email);
};

export async function requireAdmin(request: Request) {
  const accessToken = getAccessTokenFromHeader(request);

  if (!accessToken) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isUserAdmin(data.user)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: data.user };
}