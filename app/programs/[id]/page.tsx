"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Handshake } from "lucide-react";
import { guestAuth } from "@/lib/guest-auth";

interface Program {
  id: number;
  title: string;
  description: string | null;
  program_type: string;
  image_url: string | null;
  benefits: string | null;
  is_active: boolean;
}

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isLoyaltyProgram =
    program?.program_type?.toLowerCase().replace(/_/g, "-") === "customer-loyalty";

  const handleViewPoints = () => {
    const session = guestAuth.getGuestSession();
    if (session) {
      router.push("/profile");
      return;
    }
    router.push("/guest-auth?return=/profile");
  };

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/programs/${params.id}`);

        if (!response.ok) {
          throw new Error("Program not found");
        }

        const data = (await response.json()) as Program;
        setProgram(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load program");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProgram();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading program...</p>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Program not available</h1>
          <p className="text-slate-600 mb-6">{error || "This program could not be found."}</p>
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
          <h1 className="text-xl font-bold text-slate-900">Program Details</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative min-h-[260px] bg-slate-100">
              {program.image_url ? (
                <Image src={program.image_url} alt={program.title} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <Handshake className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="p-6 md:p-8">
              <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 mb-3">
                {program.program_type}
              </span>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">{program.title}</h2>
              <p className="text-slate-600 mb-6">
                {program.description || "No description available for this program yet."}
              </p>

              {program.benefits && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-slate-900 mb-1">Benefits</p>
                  <p className="text-sm text-slate-700">{program.benefits}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => router.push("/checkout")}
                  className="px-4 py-3 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Place Order
                </button>
                {isLoyaltyProgram && (
                  <button
                    onClick={handleViewPoints}
                    className="px-4 py-3 border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-50 transition-colors font-medium"
                  >
                    View My Loyalty Points
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
