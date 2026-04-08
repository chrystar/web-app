"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { guestAuth } from "@/lib/guest-auth";

export default function GuestAuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [returnUrl, setReturnUrl] = useState("/checkout");
  const [queryReady, setQueryReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnUrl(params.get("return") || "/checkout");
    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (!queryReady) return;

    const handleCallback = async () => {
      try {
        setLoading(true);

        // Handle Google OAuth callback
        const guestUser = await guestAuth.handleGoogleCallback();

        if (!guestUser) {
          setError("Failed to create account from Google. Please try again.");
          setLoading(false);
          setTimeout(() => {
            router.push("/guest-auth?return=" + encodeURIComponent(returnUrl));
          }, 2000);
          return;
        }

        // Save guest session
        guestAuth.setGuestSession(guestUser);

        // Redirect to return URL
        router.push(returnUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        setError(message);
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, queryReady, returnUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {loading && !error ? (
          <>
            <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing</h1>
            <p className="text-gray-600">Completing your Google authentication...</p>
          </>
        ) : error ? (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-gray-600 text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
            <p className="text-gray-600">Setting up your account...</p>
          </>
        )}
      </div>
    </div>
  );
}
