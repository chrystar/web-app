"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Plus, Edit2, Trash2, X } from "lucide-react";

type RuleType = "points_per_order" | "points_per_amount" | "spend_threshold_reward";
type RewardType = "discount_coupon" | "free_delivery" | "free_item" | "custom";

interface LoyaltyConfig {
  id: number;
  is_enabled: boolean;
  points_label: string;
}

interface LoyaltyRule {
  id: number;
  name: string;
  description: string | null;
  rule_type: RuleType;
  is_active: boolean;
  is_stackable: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  points_award: number | null;
  points_rate: number | null;
  amount_unit: number | null;
  threshold_amount: number | null;
  reward_id: number | null;
  max_uses_per_customer: number | null;
}

interface LoyaltyReward {
  id: number;
  name: string;
  description: string | null;
  reward_type: RewardType;
  points_cost: number | null;
  reward_value_amount: number | null;
  coupon_code: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions_total: number | null;
  max_redemptions_per_customer: number | null;
}

interface RuleFormState {
  name: string;
  description: string;
  rule_type: RuleType;
  is_active: boolean;
  is_stackable: boolean;
  priority: string;
  starts_at: string;
  ends_at: string;
  points_award: string;
  points_rate: string;
  amount_unit: string;
  threshold_amount: string;
  reward_id: string;
  max_uses_per_customer: string;
}

interface RewardFormState {
  name: string;
  description: string;
  reward_type: RewardType;
  points_cost: string;
  reward_value_amount: string;
  coupon_code: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  max_redemptions_total: string;
  max_redemptions_per_customer: string;
}

const emptyRuleForm: RuleFormState = {
  name: "",
  description: "",
  rule_type: "points_per_order",
  is_active: true,
  is_stackable: true,
  priority: "100",
  starts_at: "",
  ends_at: "",
  points_award: "",
  points_rate: "",
  amount_unit: "",
  threshold_amount: "",
  reward_id: "",
  max_uses_per_customer: "",
};

const emptyRewardForm: RewardFormState = {
  name: "",
  description: "",
  reward_type: "discount_coupon",
  points_cost: "",
  reward_value_amount: "",
  coupon_code: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
  max_redemptions_total: "",
  max_redemptions_per_customer: "",
};

const toInputDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toIsoOrNull = (value: string) => (value ? new Date(value).toISOString() : null);

export default function AdminLoyaltyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  const [rules, setRules] = useState<LoyaltyRule[]>([]);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [rewardForm, setRewardForm] = useState<RewardFormState>(emptyRewardForm);
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [rewardSubmitting, setRewardSubmitting] = useState(false);

  const stats = useMemo(() => {
    const activeRules = rules.filter((rule) => rule.is_active).length;
    const activeRewards = rewards.filter((reward) => reward.is_active).length;
    return {
      rules: { total: rules.length, active: activeRules },
      rewards: { total: rewards.length, active: activeRewards },
    };
  }, [rules, rewards]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [configResponse, rulesResponse, rewardsResponse] = await Promise.all([
        fetch("/api/loyalty/config"),
        fetch("/api/loyalty/rules"),
        fetch("/api/loyalty/rewards"),
      ]);

      if (!configResponse.ok) throw new Error("Failed to load loyalty config");
      if (!rulesResponse.ok) throw new Error("Failed to load loyalty rules");
      if (!rewardsResponse.ok) throw new Error("Failed to load loyalty rewards");

      const [configData, rulesData, rewardsData] = await Promise.all([
        configResponse.json(),
        rulesResponse.json(),
        rewardsResponse.json(),
      ]);

      setConfig(configData || null);
      setRules(Array.isArray(rulesData) ? rulesData : []);
      setRewards(Array.isArray(rewardsData) ? rewardsData : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loyalty data");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setConfigSaving(true);
      const response = await fetch("/api/loyalty/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: config.is_enabled, points_label: config.points_label }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save config");
      }

      const updated = await response.json();
      setConfig(updated);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setConfigSaving(false);
    }
  };

  const resetRuleForm = () => {
    setRuleForm(emptyRuleForm);
    setEditingRuleId(null);
  };

  const startEditRule = (rule: LoyaltyRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name,
      description: rule.description || "",
      rule_type: rule.rule_type,
      is_active: rule.is_active,
      is_stackable: rule.is_stackable,
      priority: String(rule.priority ?? 100),
      starts_at: toInputDateTime(rule.starts_at),
      ends_at: toInputDateTime(rule.ends_at),
      points_award: rule.points_award != null ? String(rule.points_award) : "",
      points_rate: rule.points_rate != null ? String(rule.points_rate) : "",
      amount_unit: rule.amount_unit != null ? String(rule.amount_unit) : "",
      threshold_amount: rule.threshold_amount != null ? String(rule.threshold_amount) : "",
      reward_id: rule.reward_id != null ? String(rule.reward_id) : "",
      max_uses_per_customer:
        rule.max_uses_per_customer != null ? String(rule.max_uses_per_customer) : "",
    });
    setError("");
  };

  const submitRule = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!ruleForm.name.trim()) {
      setError("Rule name is required");
      return;
    }

    try {
      setRuleSubmitting(true);
      const payload = {
        name: ruleForm.name.trim(),
        description: ruleForm.description.trim() || null,
        rule_type: ruleForm.rule_type,
        is_active: ruleForm.is_active,
        is_stackable: ruleForm.is_stackable,
        priority: Number(ruleForm.priority || 100),
        starts_at: toIsoOrNull(ruleForm.starts_at),
        ends_at: toIsoOrNull(ruleForm.ends_at),
        points_award: ruleForm.points_award ? Number(ruleForm.points_award) : null,
        points_rate: ruleForm.points_rate ? Number(ruleForm.points_rate) : null,
        amount_unit: ruleForm.amount_unit ? Number(ruleForm.amount_unit) : null,
        threshold_amount: ruleForm.threshold_amount ? Number(ruleForm.threshold_amount) : null,
        reward_id: ruleForm.reward_id ? Number(ruleForm.reward_id) : null,
        max_uses_per_customer: ruleForm.max_uses_per_customer
          ? Number(ruleForm.max_uses_per_customer)
          : null,
      };

      const response = await fetch(
        editingRuleId ? `/api/loyalty/rules/${editingRuleId}` : "/api/loyalty/rules",
        {
          method: editingRuleId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save rule");
      }

      resetRuleForm();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setRuleSubmitting(false);
    }
  };

  const deleteRule = async (ruleId: number) => {
    if (!confirm("Delete this rule?")) return;

    try {
      const response = await fetch(`/api/loyalty/rules/${ruleId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete rule");
      await loadAll();
      if (editingRuleId === ruleId) resetRuleForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const resetRewardForm = () => {
    setRewardForm(emptyRewardForm);
    setEditingRewardId(null);
  };

  const startEditReward = (reward: LoyaltyReward) => {
    setEditingRewardId(reward.id);
    setRewardForm({
      name: reward.name,
      description: reward.description || "",
      reward_type: reward.reward_type,
      points_cost: reward.points_cost != null ? String(reward.points_cost) : "",
      reward_value_amount:
        reward.reward_value_amount != null ? String(reward.reward_value_amount) : "",
      coupon_code: reward.coupon_code || "",
      is_active: reward.is_active,
      starts_at: toInputDateTime(reward.starts_at),
      ends_at: toInputDateTime(reward.ends_at),
      max_redemptions_total:
        reward.max_redemptions_total != null ? String(reward.max_redemptions_total) : "",
      max_redemptions_per_customer:
        reward.max_redemptions_per_customer != null
          ? String(reward.max_redemptions_per_customer)
          : "",
    });
    setError("");
  };

  const submitReward = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!rewardForm.name.trim()) {
      setError("Reward name is required");
      return;
    }

    try {
      setRewardSubmitting(true);
      const payload = {
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim() || null,
        reward_type: rewardForm.reward_type,
        points_cost: rewardForm.points_cost ? Number(rewardForm.points_cost) : null,
        reward_value_amount: rewardForm.reward_value_amount
          ? Number(rewardForm.reward_value_amount)
          : null,
        coupon_code: rewardForm.coupon_code.trim() || null,
        is_active: rewardForm.is_active,
        starts_at: toIsoOrNull(rewardForm.starts_at),
        ends_at: toIsoOrNull(rewardForm.ends_at),
        max_redemptions_total: rewardForm.max_redemptions_total
          ? Number(rewardForm.max_redemptions_total)
          : null,
        max_redemptions_per_customer: rewardForm.max_redemptions_per_customer
          ? Number(rewardForm.max_redemptions_per_customer)
          : null,
      };

      const response = await fetch(
        editingRewardId ? `/api/loyalty/rewards/${editingRewardId}` : "/api/loyalty/rewards",
        {
          method: editingRewardId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save reward");
      }

      resetRewardForm();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reward");
    } finally {
      setRewardSubmitting(false);
    }
  };

  const deleteReward = async (rewardId: number) => {
    if (!confirm("Delete this reward?")) return;

    try {
      const response = await fetch(`/api/loyalty/rewards/${rewardId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete reward");
      await loadAll();
      if (editingRewardId === rewardId) resetRewardForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete reward");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Loyalty</h1>
        <p className="text-slate-600 mt-1">Manage loyalty settings, earning rules, and redeemable rewards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
          <p className="text-sm text-slate-600">Rules</p>
          <p className="text-2xl font-bold text-slate-900">{stats.rules.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-600">
          <p className="text-sm text-slate-600">Active Rules</p>
          <p className="text-2xl font-bold text-green-700">{stats.rules.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-violet-600">
          <p className="text-sm text-slate-600">Rewards</p>
          <p className="text-2xl font-bold text-slate-900">{stats.rewards.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-600">
          <p className="text-sm text-slate-600">Active Rewards</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.rewards.active}</p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Program Configuration</h2>
        {config ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Points Label</label>
              <input
                type="text"
                value={config.points_label}
                onChange={(e) => setConfig((prev) => (prev ? { ...prev, points_label: e.target.value } : prev))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Points"
              />
            </div>
            <div className="flex items-center justify-between md:justify-start gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.is_enabled}
                  onChange={(e) =>
                    setConfig((prev) => (prev ? { ...prev, is_enabled: e.target.checked } : prev))
                  }
                  className="w-4 h-4"
                />
                Loyalty Enabled
              </label>
              <button
                type="button"
                onClick={saveConfig}
                disabled={configSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {configSaving ? "Saving..." : "Save Config"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{loading ? "Loading config..." : "No config found"}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingRuleId ? "Edit Rule" : "Create Rule"}
          </h2>
          {editingRuleId && (
            <button
              type="button"
              onClick={resetRuleForm}
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <X className="w-4 h-4" /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={submitRule} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
            <input
              type="text"
              value={ruleForm.name}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rule Type</label>
            <select
              value={ruleForm.rule_type}
              onChange={(e) =>
                setRuleForm((prev) => ({ ...prev, rule_type: e.target.value as RuleType }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="points_per_order">Points Per Order</option>
              <option value="points_per_amount">Points Per Amount</option>
              <option value="spend_threshold_reward">Spend Threshold Reward</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority (lower first)</label>
            <input
              type="number"
              value={ruleForm.priority}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={ruleForm.description}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Points Award</label>
            <input
              type="number"
              value={ruleForm.points_award}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, points_award: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Used for points_per_order"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Points Rate</label>
            <input
              type="number"
              step="0.01"
              value={ruleForm.points_rate}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, points_rate: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Used for points_per_amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount Unit</label>
            <input
              type="number"
              step="0.01"
              value={ruleForm.amount_unit}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, amount_unit: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="e.g. 100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Threshold Amount</label>
            <input
              type="number"
              step="0.01"
              value={ruleForm.threshold_amount}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, threshold_amount: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Used for threshold rule"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reward ID</label>
            <select
              value={ruleForm.reward_id}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, reward_id: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="">None</option>
              {rewards.map((reward) => (
                <option key={reward.id} value={reward.id}>
                  #{reward.id} - {reward.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses Per Customer</label>
            <input
              type="number"
              value={ruleForm.max_uses_per_customer}
              onChange={(e) =>
                setRuleForm((prev) => ({ ...prev, max_uses_per_customer: e.target.value }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Starts At</label>
            <input
              type="datetime-local"
              value={ruleForm.starts_at}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, starts_at: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ends At</label>
            <input
              type="datetime-local"
              value={ruleForm.ends_at}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, ends_at: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="md:col-span-3 flex items-center justify-between">
            <div className="flex gap-6">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={ruleForm.is_active}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                Active
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={ruleForm.is_stackable}
                  onChange={(e) =>
                    setRuleForm((prev) => ({ ...prev, is_stackable: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                Stackable
              </label>
            </div>

            <button
              type="submit"
              disabled={ruleSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {editingRuleId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {ruleSubmitting ? "Saving..." : editingRuleId ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b border-slate-200">
                <th className="py-2">Rule</th>
                <th className="py-2">Type</th>
                <th className="py-2">Priority</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-slate-100">
                  <td className="py-2">{rule.name}</td>
                  <td className="py-2">{rule.rule_type}</td>
                  <td className="py-2">{rule.priority}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        rule.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {rule.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditRule(rule)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRule(rule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rules.length && !loading && (
            <p className="text-sm text-slate-500 py-4">No loyalty rules yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingRewardId ? "Edit Reward" : "Create Reward"}
          </h2>
          {editingRewardId && (
            <button
              type="button"
              onClick={resetRewardForm}
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <X className="w-4 h-4" /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={submitReward} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reward Name</label>
            <input
              type="text"
              value={rewardForm.name}
              onChange={(e) => setRewardForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reward Type</label>
            <select
              value={rewardForm.reward_type}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, reward_type: e.target.value as RewardType }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="discount_coupon">Discount Coupon</option>
              <option value="free_delivery">Free Delivery</option>
              <option value="free_item">Free Item</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Points Cost</label>
            <input
              type="number"
              value={rewardForm.points_cost}
              onChange={(e) => setRewardForm((prev) => ({ ...prev, points_cost: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={rewardForm.description}
              onChange={(e) => setRewardForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reward Value Amount</label>
            <input
              type="number"
              step="0.01"
              value={rewardForm.reward_value_amount}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, reward_value_amount: e.target.value }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code</label>
            <input
              type="text"
              value={rewardForm.coupon_code}
              onChange={(e) => setRewardForm((prev) => ({ ...prev, coupon_code: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max Redemptions Total</label>
            <input
              type="number"
              value={rewardForm.max_redemptions_total}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, max_redemptions_total: e.target.value }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max Redemptions Per Customer
            </label>
            <input
              type="number"
              value={rewardForm.max_redemptions_per_customer}
              onChange={(e) =>
                setRewardForm((prev) => ({ ...prev, max_redemptions_per_customer: e.target.value }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Starts At</label>
            <input
              type="datetime-local"
              value={rewardForm.starts_at}
              onChange={(e) => setRewardForm((prev) => ({ ...prev, starts_at: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ends At</label>
            <input
              type="datetime-local"
              value={rewardForm.ends_at}
              onChange={(e) => setRewardForm((prev) => ({ ...prev, ends_at: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="md:col-span-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rewardForm.is_active}
                onChange={(e) =>
                  setRewardForm((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="w-4 h-4"
              />
              Active
            </label>

            <button
              type="submit"
              disabled={rewardSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {editingRewardId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {rewardSubmitting ? "Saving..." : editingRewardId ? "Update Reward" : "Create Reward"}
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b border-slate-200">
                <th className="py-2">Reward</th>
                <th className="py-2">Type</th>
                <th className="py-2">Points Cost</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward) => (
                <tr key={reward.id} className="border-b border-slate-100">
                  <td className="py-2">{reward.name}</td>
                  <td className="py-2">{reward.reward_type}</td>
                  <td className="py-2">{reward.points_cost ?? "-"}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        reward.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {reward.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditReward(reward)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReward(reward.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rewards.length && !loading && (
            <p className="text-sm text-slate-500 py-4">No loyalty rewards yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
