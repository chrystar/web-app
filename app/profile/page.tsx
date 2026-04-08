"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  Mail,
  Phone,
  User as UserIcon,
  Calendar,
  Package,
} from "lucide-react";
import { guestAuth, type GuestUser } from "@/lib/guest-auth";

export default function ProfilePage() {
  const router = useRouter();
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedSession = guestAuth.getGuestSession();
      if (!savedSession) {
        router.push("/guest-auth?return=/profile");
        return;
      }
      setGuestUser(savedSession);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    guestAuth.clearGuestSession();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading profile...</p>
      </div>
    );
  }

  if (!guestUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          {/* Profile Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {guestUser.firstName} {guestUser.lastName}
                </h2>
                <p className="text-slate-600 text-sm">Guest User</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-slate-900 font-medium">{guestUser.email}</p>
                  </div>
                </div>
                {guestUser.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
                      <p className="text-slate-900 font-medium">{guestUser.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Auth Method</p>
                    <p className="text-slate-900 font-medium capitalize">{guestUser.authMethod || "email"}</p>
                  </div>
                </div>
                {guestUser.createdAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Member Since</p>
                      <p className="text-slate-900 font-medium">
                        {new Date(guestUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="my-8" />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push("/orders")}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              My Orders
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Continue Shopping
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Guest Checkout Info</h3>
          <p className="text-blue-800 text-sm leading-relaxed">
            Your account is temporary and associated with this browser. Your information is used for order processing only.
            You can use the same email and password to log in on other devices.
          </p>
        </div>
      </main>
    </div>
  );
}
