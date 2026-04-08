"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Banner } from "@/lib/banner-service";
import { adminFetch } from "@/lib/admin-fetch";

export default function CarouselPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await adminFetch("/api/banners");
      if (!response.ok) throw new Error("Failed to fetch banners");
      const data = await response.json();
      setBanners(data);
    } catch (err) {
      setError("Failed to load banners");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (deleteId === id) {
      try {
        const response = await adminFetch(`/api/banners/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Failed to delete");
        setBanners(banners.filter((b) => b.id !== id));
        setDeleteId(null);
      } catch (err) {
        setError("Failed to delete banner");
        console.error(err);
      }
    } else {
      setDeleteId(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 mt-4">Loading banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Carousel & Banners</h1>
          <p className="text-slate-600 mt-2">Manage promotional banners displayed on your homepage</p>
        </div>
        <button
          onClick={() => router.push("/admin/banners/add")}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Banner
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {banners.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="inline-block p-3 bg-blue-50 rounded-full mb-4">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No banners yet</h3>
          <p className="text-slate-600 mb-6">Start by creating your first promotional banner</p>
          <button
            onClick={() => router.push("/admin/banners/add")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Banner
          </button>
        </div>
      )}

      {/* Banners Grid */}
      {banners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Image */}
              <div className="relative h-40 overflow-hidden bg-slate-100">
                <img
                  src={banner.image_url}
                  alt={banner.title || "Carousel banner"}
                  className="w-full h-full object-cover"
                />
                {!banner.is_active && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="px-3 py-1 bg-slate-900 text-white text-sm rounded-full">Inactive</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-slate-900 mb-1 line-clamp-2">{banner.title}</h3>
                {banner.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{banner.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span>Order: {banner.sort_order}</span>
                  {banner.link_url && <span className="text-blue-600 font-medium">Has link</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/banners/${banner.id}/edit`)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium flex items-center justify-center gap-1 ${
                      deleteId === banner.id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleteId === banner.id ? "Confirm" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
