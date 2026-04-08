"use client";

import { useAuth } from "@/app/providers";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/admin/login", "/admin/reset-password"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Only apply protection to /admin routes
    if (!pathname.startsWith("/admin")) {
      return;
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      router.push("/admin/login");
    } else if (isAuthenticated && isPublicRoute) {
      router.push("/admin/dashboard");
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Show loading state only for admin routes
  if (pathname.startsWith("/admin") && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
