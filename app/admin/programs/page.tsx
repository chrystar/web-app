"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Save, X, Upload } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";

interface Program {
  id: number;
  title: string;
  description: string | null;
  program_type: string;
  image_url: string | null;
  benefits: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ProgramFormState {
  title: string;
  description: string;
  program_type: string;
  image_url: string;
  benefits: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: ProgramFormState = {
  title: "",
  description: "",
  program_type: "customer-loyalty",
  image_url: "",
  benefits: "",
  is_active: true,
  sort_order: "0",
};

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState<ProgramFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const stats = useMemo(() => {
    const active = programs.filter((program) => program.is_active).length;
    return { total: programs.length, active, inactive: programs.length - active };
  }, [programs]);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const response = await adminFetch("/api/programs");
      if (!response.ok) throw new Error("Failed to load programs");
      const data = await response.json();
      setPrograms(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError("Failed to load programs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (program: Program) => {
    setEditingId(program.id);
    setForm({
      title: program.title,
      description: program.description || "",
      program_type: program.program_type,
      image_url: program.image_url || "",
      benefits: program.benefits || "",
      is_active: program.is_active,
      sort_order: String(program.sort_order),
    });
    setError("");
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");

      const uploadPayload = new FormData();
      uploadPayload.append("file", file);

      const response = await adminFetch("/api/upload", {
        method: "POST",
        body: uploadPayload,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setForm((prev) => ({ ...prev, image_url: data.url || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Program title is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        program_type: form.program_type.trim() || "general",
        image_url: form.image_url.trim() || null,
        benefits: form.benefits.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
      };

      const response = await adminFetch(editingId ? `/api/programs/${editingId}` : "/api/programs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save program");
      }

      resetForm();
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save program");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this program?")) return;

    try {
      const response = await adminFetch(`/api/programs/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete program");
      setPrograms((prev) => prev.filter((program) => program.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError("Failed to delete program");
      console.error(err);
    }
  };

  const toggleActive = async (program: Program) => {
    try {
      const response = await adminFetch(`/api/programs/${program.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !program.is_active }),
      });

      if (!response.ok) throw new Error("Failed to update program status");
      const updated = await response.json();
      setPrograms((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError("Failed to update program status");
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Programs</h1>
        <p className="text-slate-600 mt-1">Create and manage initiatives like Customer Loyalty programs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
          <p className="text-sm text-slate-600">Total Programs</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-600">
          <p className="text-sm text-slate-600">Active</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-slate-500">
          <p className="text-sm text-slate-600">Inactive</p>
          <p className="text-2xl font-bold text-slate-700">{stats.inactive}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          {editingId ? "Edit Program" : "Create Program"}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Customer Loyalty"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Type</label>
            <input
              type="text"
              value={form.program_type}
              onChange={(e) => setForm((prev) => ({ ...prev, program_type: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="customer-loyalty"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe how this program works"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Image</label>
            <label className="w-full border border-dashed border-slate-300 rounded-lg px-3 py-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-700">
                {uploadingImage ? "Uploading image..." : "Choose image from gallery"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={uploadingImage}
              />
            </label>
            {form.image_url && (
              <div className="mt-3">
                <img
                  src={form.image_url}
                  alt="Program preview"
                  className="w-24 h-24 object-cover rounded border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, image_url: "" }))}
                  className="mt-2 text-xs text-red-600 hover:text-red-700"
                >
                  Remove image
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
            <input
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Benefits</label>
            <textarea
              value={form.benefits}
              onChange={(e) => setForm((prev) => ({ ...prev, benefits: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="List benefits users get from this program"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between mt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Active (visible to users)
            </label>

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {submitting ? "Saving..." : editingId ? "Update Program" : "Create Program"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Existing Programs</h2>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Loading programs...</div>
        ) : programs.length === 0 ? (
          <div className="p-6 text-slate-600">No programs yet. Create your first program above.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {programs.map((program) => (
              <div key={program.id} className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{program.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${program.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                      {program.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                      {program.program_type}
                    </span>
                  </div>
                  {program.description && <p className="text-sm text-slate-600 line-clamp-2">{program.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(program)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    {program.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => startEdit(program)}
                    className="p-2 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                    title="Edit program"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(program.id)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                    title="Delete program"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
