"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Coins, Gift, Clock3, Handshake } from "lucide-react";
import { guestAuth, type GuestUser } from "@/lib/guest-auth";

interface LoyaltyWallet {
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  lifetime_spend: number;
  updated_at: string | null;
}

interface LoyaltyTransaction {
  id: number;
  rule_id: number | null;
  rule_name: string | null;
  transaction_type: "earn" | "redeem" | "adjustment" | "reversal";
  points_delta: number;
  amount_snapshot: number | null;
  reason: string | null;
  created_at: string;
}

interface LoyaltyReward {
  id: number;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number | null;
  reward_value_amount: number | null;
  coupon_code: string | null;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState("");
  const [wallet, setWallet] = useState<LoyaltyWallet | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loyaltyProgramId, setLoyaltyProgramId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const savedSession = guestAuth.getGuestSession();
      if (!savedSession) {
        router.push("/guest-auth?return=/loyalty");
        return;
      }
      setGuestUser(savedSession);
      void loadLoyalty(savedSession.id);
    } catch (error) {
      console.error("Error loading loyalty screen:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadLoyalty = async (guestUserId: string) => {
    try {
      setLoyaltyLoading(true);
      setLoyaltyError("");

      const response = await fetch(`/api/loyalty/customer?guestUserId=${encodeURIComponent(guestUserId)}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load loyalty information");
      }

      const data = await response.json();
      setWallet(data.wallet || null);
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      setRewards(Array.isArray(data.rewards) ? data.rewards : []);

      const programsResponse = await fetch("/api/programs?active=true");
      if (programsResponse.ok) {
        const programs = await programsResponse.json();
        if (Array.isArray(programs)) {
          const loyaltyProgram = programs.find((program: { id: number; program_type?: string }) =>
            String(program.program_type || "")
              .toLowerCase()
              .replace(/_/g, "-")
              .includes("customer-loyalty")
          );
          setLoyaltyProgramId(loyaltyProgram?.id ?? null);
        }
      }
    } catch (error) {
      console.error("Error loading loyalty data:", error);
      setLoyaltyError(error instanceof Error ? error.message : "Failed to load loyalty information");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading loyalty...</p>
      </div>
    );
  }

  if (!guestUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">My Loyalty</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Coins className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-semibold text-slate-900">Loyalty Wallet</h2>
            {loyaltyProgramId && (
              <button
                onClick={() => router.push(`/programs/${loyaltyProgramId}`)}
                className="ml-auto inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Handshake className="w-4 h-4" /> Loyalty Program Details
              </button>
            )}
          </div>

          {loyaltyError && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {loyaltyError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-amber-700 uppercase tracking-wide">Available Points</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{wallet?.points_balance ?? 0}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs text-green-700 uppercase tracking-wide">Earned</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{wallet?.lifetime_points_earned ?? 0}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-700 uppercase tracking-wide">Redeemed</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{wallet?.lifetime_points_redeemed ?? 0}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-600 uppercase tracking-wide">Lifetime Spend</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₦{Number(wallet?.lifetime_spend ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-slate-500" /> Recent Points Activity
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {loyaltyLoading ? (
                  <p className="text-sm text-slate-500">Loading loyalty activity...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-slate-500">No points activity yet.</p>
                ) : (
                  transactions.map((entry) => (
                    <div key={entry.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {entry.reason || entry.rule_name || "Loyalty transaction"}
                        </p>
                        <span className={`text-sm font-bold ${entry.points_delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {entry.points_delta >= 0 ? "+" : ""}
                          {entry.points_delta}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                        <span className="capitalize">{entry.transaction_type.replace("_", " ")}</span>
                        <span>{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5 text-violet-500" /> Available Rewards
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {loyaltyLoading ? (
                  <p className="text-sm text-slate-500">Loading rewards...</p>
                ) : rewards.length === 0 ? (
                  <p className="text-sm text-slate-500">No rewards available right now.</p>
                ) : (
                  rewards.map((reward) => {
                    const canRedeem =
                      reward.points_cost == null || (wallet?.points_balance ?? 0) >= reward.points_cost;
                    return (
                      <div key={reward.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{reward.name}</p>
                            {reward.description && (
                              <p className="text-xs text-slate-500 mt-1">{reward.description}</p>
                            )}
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 capitalize">
                            {reward.reward_type.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            Cost: <strong>{reward.points_cost ?? 0}</strong> points
                          </span>
                          <span className={canRedeem ? "text-green-600" : "text-amber-600"}>
                            {canRedeem ? "Eligible" : "More points needed"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
