"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, Package, Image as ImageIcon, ShoppingBag, Settings, LayoutDashboard, Gift, Handshake, Trophy } from "lucide-react";
import { useAuth } from "@/app/providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <div className="flex min-h-screen bg-slate-100">
      {mobileMenuOpen && (
        <button
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-slate-900 text-white flex flex-col
          w-72 transform transition-transform duration-300
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:z-auto md:transition-all
          ${sidebarOpen ? "md:w-64" : "md:w-20"}
        `}
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg">❄️</div>
            <span className={`font-bold text-lg ${sidebarOpen ? "" : "md:hidden"}`}>Frost Admin</span>
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
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarOpen ? "" : "md:hidden"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className={`mb-4 px-4 py-2 bg-slate-800 rounded-lg text-sm ${sidebarOpen ? "" : "md:hidden"}`}>
            <p className="text-slate-400">Logged in as</p>
            <p className="text-white font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={sidebarOpen ? "" : "md:hidden"}>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors md:hidden"
              aria-label="Open admin menu"
            >
              <Menu className="w-6 h-6 text-slate-900" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(!sidebarOpen)}
              className="hidden md:inline-flex p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
            </button>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 truncate">Welcome, {user?.email?.split("@")[0]}</div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
