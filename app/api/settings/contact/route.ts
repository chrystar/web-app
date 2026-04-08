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

interface ContactSettings {
  call_number: string;
  whatsapp_number: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  updated_by?: string;
}

const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  call_number: process.env.NEXT_PUBLIC_STORE_PHONE || "",
  whatsapp_number: process.env.NEXT_PUBLIC_STORE_WHATSAPP || "",
  instagram: process.env.NEXT_PUBLIC_STORE_INSTAGRAM || "",
  facebook: process.env.NEXT_PUBLIC_STORE_FACEBOOK || "",
  tiktok: process.env.NEXT_PUBLIC_STORE_TIKTOK || "",
  updated_by: "default",
};

const isMissingSettingsTableError = (code?: string | null) => code === "PGRST205" || code === "42P01";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "contact")
      .maybeSingle();

    if (error) {
      if (isMissingSettingsTableError(error.code)) {
        return NextResponse.json({
          ...DEFAULT_CONTACT_SETTINGS,
          warning: "store_settings table missing. Run scripts/create_store_settings_table.sql",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const value = (data?.value || {}) as Partial<ContactSettings>;

    return NextResponse.json({
      call_number: value.call_number || DEFAULT_CONTACT_SETTINGS.call_number,
      whatsapp_number: value.whatsapp_number || DEFAULT_CONTACT_SETTINGS.whatsapp_number,
      instagram: value.instagram || DEFAULT_CONTACT_SETTINGS.instagram,
      facebook: value.facebook || DEFAULT_CONTACT_SETTINGS.facebook,
      tiktok: value.tiktok || DEFAULT_CONTACT_SETTINGS.tiktok,
      updated_by: value.updated_by || "admin",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const payload: ContactSettings = {
      call_number: String(body.call_number || "").trim(),
      whatsapp_number: String(body.whatsapp_number || "").trim(),
      instagram: String(body.instagram || "").trim(),
      facebook: String(body.facebook || "").trim(),
      tiktok: String(body.tiktok || "").trim(),
      updated_by: String(body.updated_by || "admin").trim(),
    };

    const { data, error } = await supabase
      .from("store_settings")
      .upsert(
        {
          key: "contact",
          value: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
      .select("value")
      .single();

    if (error) {
      if (isMissingSettingsTableError(error.code)) {
        return NextResponse.json(
          { error: "Settings table missing. Run scripts/create_store_settings_table.sql first." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const value = (data?.value || payload) as ContactSettings;
    return NextResponse.json(value);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
