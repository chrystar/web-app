type EnvScope = "server" | "client";

function requireEnv(name: string, scope: EnvScope): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `[env-validation] Missing required ${scope} environment variable: ${name}`
    );
  }

  return value;
}

export function validateClientEnv(): void {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "client");
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "client");
  requireEnv("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", "client");
  requireEnv("NEXT_PUBLIC_APP_URL", "client");
}

export function validateServerEnv(): void {
  validateClientEnv();
  requireEnv("SUPABASE_SERVICE_ROLE_KEY", "server");
  requireEnv("PAYSTACK_SECRET_KEY", "server");
}
