"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, Package, Image as ImageIcon, ShoppingBag, Settings, LayoutDashboard, Gift, Handshake, Trophy } from "lucide-react";
import { useAuth } from "@/app/providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/bundles", label: "Bundles", icon: Gift },
    { href: "/admin/programs", label: "Programs", icon: Handshake },
    { href: "/admin/loyalty", label: "Loyalty", icon: Trophy },
    { href: "/admin/carousel", label: "Banners", icon: ImageIcon },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg">❄️</div>
            {sidebarOpen && <span className="font-bold text-lg">Frost Admin</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="mb-4 px-4 py-2 bg-slate-800 rounded-lg text-sm">
            <p className="text-slate-400">Logged in as</p>
            <p className="text-white font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
          </button>
          <div className="text-sm text-slate-600">Welcome, {user?.email?.split("@")[0]}</div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
