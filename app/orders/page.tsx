"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock, Package, Truck, CheckCircle2 } from "lucide-react";
import { guestAuth, type GuestUser } from "@/lib/guest-auth";

interface OrderHistoryItem {
  id: string | number;
  customer_email: string;
  payment_reference: string;
  total: number;
  order_status: string;
  created_at: string;
  order_items?: Array<{
    id: number | string;
  }>;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    className: string;
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="w-4 h-4" />,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  processing: {
    label: "Processing",
    className: "bg-indigo-100 text-indigo-800",
    icon: <Package className="w-4 h-4" />,
  },
  shipped: {
    label: "Shipped",
    className: "bg-purple-100 text-purple-800",
    icon: <Truck className="w-4 h-4" />,
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
};

export default function OrdersHistoryPage() {
  const router = useRouter();
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const session = guestAuth.getGuestSession();
        if (!session) {
          router.push("/guest-auth?return=/orders");
          return;
        }

        setGuestUser(session);
        setLoading(true);
        setError("");

        const response = await fetch(`/api/orders?email=${encodeURIComponent(session.email)}`);

        if (!response.ok) {
          throw new Error("Failed to fetch your orders");
        }

        const data = await response.json();
        const list = Array.isArray(data) ? (data as OrderHistoryItem[]) : [];

        list.sort(
          (firstOrder, secondOrder) =>
            new Date(secondOrder.created_at).getTime() - new Date(firstOrder.created_at).getTime()
        );

        setOrders(list);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to fetch your orders");
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [router]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }),
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-700">Loading your order history...</p>
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
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Orders</h1>
            <p className="text-xs text-slate-500">Track your current and past orders</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {guestUser && (
          <div className="mb-5 p-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-600">
            Showing orders for <span className="font-medium text-slate-900">{guestUser.email}</span>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!error && orders.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Package className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-900 mb-1">No orders yet</h2>
            <p className="text-slate-600 mb-4">Once you place an order, it will appear here.</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        )}

        {orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
              const itemCount = Array.isArray(order.order_items) ? order.order_items.length : 0;
              const orderCode = String(order.id).slice(0, 8).toUpperCase();

              return (
                <button
                  key={String(order.id)}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Order ID</p>
                      <p className="font-semibold text-slate-900">#{orderCode}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(order.created_at).toLocaleString("en-NG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-900">{itemCount}</span>{" "}
                      {itemCount === 1 ? "item" : "items"}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-blue-700">{formatter.format(Number(order.total || 0))}</p>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
