"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Gift } from "lucide-react";

interface Bundle {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  bundle_price: number;
  original_price?: number | null;
  is_active: boolean;
}

export default function BundleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBundle = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/bundles/${params.id}`);

        if (!response.ok) {
          throw new Error("Bundle not found");
        }

        const data = await response.json();
        setBundle(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bundle");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchBundle();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading bundle...</p>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Bundle not available</h1>
          <p className="text-slate-600 mb-6">{error || "This bundle could not be found."}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Bundle Details</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative min-h-[260px] bg-slate-100">
              {bundle.image_url ? (
                <Image src={bundle.image_url} alt={bundle.title} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <Gift className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{bundle.title}</h2>
              <p className="text-slate-600 mb-6">
                {bundle.description || "Specially curated bundle offer for your weekend meals."}
              </p>

              <div className="mb-8">
                <span className="text-3xl font-bold text-slate-900">
                  ₦{Number(bundle.bundle_price).toLocaleString("en-NG")}
                </span>
                {bundle.original_price ? (
                  <span className="ml-3 text-lg text-slate-500 line-through">
                    ₦{Number(bundle.original_price).toLocaleString("en-NG")}
                  </span>
                ) : null}
              </div>

              <button
                onClick={() => router.push(`/checkout?bundleId=${bundle.id}`)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
