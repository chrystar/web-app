"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, UserPlus, Users } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { useAuth } from "@/app/providers";

interface StoreSettings {
  storeName: string;
  storeEmail: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  taxRate: number;
  shippingCost: number;
  callNumber: string;
  whatsappNumber: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: string;
  invitedAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: "Frost Chicken",
    storeEmail: "admin@frostchicken.com",
    phone: "(555) 123-4567",
    address: "123 Main Street",
    city: "New York",
    postalCode: "10001",
    taxRate: 8.5,
    shippingCost: 5.99,
    callNumber: "",
    whatsappNumber: "",
    instagram: "",
    facebook: "",
    tiktok: "",
  });

  const [saved, setSaved] = useState(false);
  const [loadingContact, setLoadingContact] = useState(true);
  const [savingContact, setSavingContact] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [invitingTeam, setInvitingTeam] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [teamMessage, setTeamMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadContactSettings = async () => {
      try {
        setLoadingContact(true);
        const response = await adminFetch("/api/settings/contact");
        if (!response.ok) throw new Error("Failed to load contact settings");

        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          callNumber: data.call_number || "",
          whatsappNumber: data.whatsapp_number || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          tiktok: data.tiktok || "",
        }));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contact settings");
      } finally {
        setLoadingContact(false);
      }
    };

    loadContactSettings();
  }, []);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      const response = await adminFetch("/api/admin/team");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load team members");
      }

      const data = await response.json();
      setTeamMembers(Array.isArray(data) ? data : []);
      setTeamMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members");
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleInviteTeamMember = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!inviteEmail.trim()) {
      setError("Invite email is required");
      return;
    }

    try {
      setInvitingTeam(true);
      setTeamMessage("");

      const response = await adminFetch("/api/admin/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setTeamMessage(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      await loadTeamMembers();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInvitingTeam(false);
    }
  };

  const handleRemoveTeamMember = async (member: TeamMember) => {
    if (member.id === user?.id) {
      setError("You cannot remove your own account");
      return;
    }

    const confirmed = confirm(`Remove ${member.email} from team? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setRemovingUserId(member.id);
      const response = await adminFetch("/api/admin/team", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: member.id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove team member");
      }

      setTeamMessage(`${member.email} removed from team`);
      setTeamMembers((prev) => prev.filter((item) => item.id !== member.id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove team member");
    } finally {
      setRemovingUserId(null);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("en-NG");
  };

  const handleSave = async () => {
    try {
      setSavingContact(true);
      const response = await adminFetch("/api/settings/contact", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          call_number: settings.callNumber,
          whatsapp_number: settings.whatsappNumber,
          instagram: settings.instagram,
          facebook: settings.facebook,
          tiktok: settings.tiktok,
          updated_by: "admin",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save contact settings");
      }

      setSaved(true);
      setError("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact settings");
    } finally {
      setSavingContact(false);
    }
  };

  const handleChange = (field: keyof StoreSettings, value: string | number) => {
    setSettings({ ...settings, [field]: value });
  };

  return (
    <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8">Settings</h1>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-medium">Settings saved successfully!</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Store Information */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Store Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => handleChange("storeName", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Store Email
                </label>
                <input
                  type="email"
                  value={settings.storeEmail}
                  onChange={(e) => handleChange("storeEmail", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Store Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Call to Order Number
                </label>
                <input
                  type="tel"
                  value={settings.callNumber}
                  onChange={(e) => handleChange("callNumber", e.target.value)}
                  placeholder="e.g. +2348012345678"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingContact}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={settings.whatsappNumber}
                  onChange={(e) => handleChange("whatsappNumber", e.target.value)}
                  placeholder="e.g. +2348012345678"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingContact}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Used on product detail page for direct ordering actions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Instagram Name
                </label>
                <input
                  type="text"
                  value={settings.instagram}
                  onChange={(e) => handleChange("instagram", e.target.value)}
                  placeholder="e.g. frostchicken"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingContact}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Facebook Name
                </label>
                <input
                  type="text"
                  value={settings.facebook}
                  onChange={(e) => handleChange("facebook", e.target.value)}
                  placeholder="e.g. frostchicken"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingContact}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  TikTok Name
                </label>
                <input
                  type="text"
                  value={settings.tiktok}
                  onChange={(e) => handleChange("tiktok", e.target.value)}
                  placeholder="e.g. frostchicken"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingContact}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">City</label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={settings.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Billing Settings */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Billing Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.taxRate}
                  onChange={(e) => handleChange("taxRate", parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Shipping Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.shippingCost}
                  onChange={(e) => handleChange("shippingCost", parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg mt-8">
                <h3 className="font-semibold text-slate-900 mb-3">Billing Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Example Subtotal:</span>
                    <span>$100.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({settings.taxRate}%):</span>
                    <span>${(100 * (settings.taxRate / 100)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping:</span>
                    <span>${settings.shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between font-semibold text-slate-900">
                    <span>Total:</span>
                    <span>
                      ${(100 + 100 * (settings.taxRate / 100) + settings.shippingCost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Account Settings</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Change Password</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium">
                  Update Password
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Danger Zone</h3>
              <p className="text-sm text-slate-600 mb-4">
                Irreversible and destructive actions
              </p>
              <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                Delete Store Data
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mt-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Team Access</h2>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">Admin</p>
              <p className="text-slate-600 mt-1">Full control: team, settings, products, orders, and all admin actions.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">Manager</p>
              <p className="text-slate-600 mt-1">Operational control for day-to-day tasks like orders and catalog updates.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">Staff</p>
              <p className="text-slate-600 mt-1">Basic team access for routine workflows with limited responsibility.</p>
            </div>
          </div>

          {teamMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {teamMessage}
            </div>
          )}

          <form onSubmit={handleInviteTeamMember} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="md:col-span-2 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              disabled={invitingTeam}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              {invitingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {invitingTeam ? "Inviting..." : "Invite"}
            </button>
          </form>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Invited</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Last Sign In</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingTeam ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      Loading team members...
                    </td>
                  </tr>
                ) : teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-slate-800">{member.email}</td>
                      <td className="px-4 py-3 text-slate-800 capitalize">{member.role || "staff"}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(member.invitedAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(member.lastSignInAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            member.emailConfirmedAt
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {member.emailConfirmedAt ? "Active" : "Invited"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {member.id === user?.id ? (
                          <span className="text-xs text-slate-500">Current account</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamMember(member)}
                            disabled={removingUserId === member.id}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-60"
                          >
                            {removingUserId === member.id ? "Removing..." : "Remove"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8">
          <button className="w-full sm:w-auto px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={savingContact}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Save className="w-5 h-5" />
            {savingContact ? "Saving..." : "Save Changes"}
          </button>
        </div>
    </div>
  );
}
