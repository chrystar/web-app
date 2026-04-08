"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";

interface Product {
  id: number;
}

interface Order {
  id: number | string;
  total: number;
  customer_email: string;
}

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-8 h-8" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");

        const [productsResponse, ordersResponse] = await Promise.all([
          adminFetch("/api/products"),
          adminFetch("/api/orders"),
        ]);

        if (!productsResponse.ok) {
          throw new Error("Failed to load product stats");
        }

        if (!ordersResponse.ok) {
          throw new Error("Failed to load order stats");
        }

        const productsData = (await productsResponse.json()) as Product[];
        const ordersData = (await ordersResponse.json()) as Order[];

        const orders = Array.isArray(ordersData) ? ordersData : [];
        const products = Array.isArray(productsData) ? productsData : [];

        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

        const uniqueCustomers = new Set(
          orders
            .map((order) => (order.customer_email || "").trim().toLowerCase())
            .filter((email) => email.length > 0)
        );

        setStats({
          totalProducts: products.length,
          totalOrders: orders.length,
          totalRevenue,
          totalCustomers: uniqueCustomers.size,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formattedRevenue = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(stats.totalRevenue);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Package}
          label="Total Products"
          value={loading ? "..." : stats.totalProducts}
          color="#3b82f6"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={loading ? "..." : stats.totalOrders}
          color="#10b981"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={loading ? "..." : formattedRevenue}
          color="#f59e0b"
        />
        <StatCard
          icon={Users}
          label="Total Customers"
          value={loading ? "..." : stats.totalCustomers}
          color="#8b5cf6"
        />
      </div>

      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome to Frost Admin</h2>
        <p className="text-slate-600 mb-6">
          Use the sidebar to navigate to different sections of the admin panel. You can manage
          products, banners, orders, and store settings.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/products"
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-semibold text-slate-900 mb-2">Manage Products</h3>
            <p className="text-sm text-slate-600">Add, edit, or delete products</p>
          </a>
          <a
            href="/admin/carousel"
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-semibold text-slate-900 mb-2">Manage Banners</h3>
            <p className="text-sm text-slate-600">Upload and manage carousel banners</p>
          </a>
          <a
            href="/admin/orders"
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-semibold text-slate-900 mb-2">View Orders</h3>
            <p className="text-sm text-slate-600">Check customer orders and status</p>
          </a>
          <a
            href="/admin/settings"
            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <h3 className="font-semibold text-slate-900 mb-2">Settings</h3>
            <p className="text-sm text-slate-600">Store and account settings</p>
          </a>
        </div>
      </div>
    </div>
  );
}
