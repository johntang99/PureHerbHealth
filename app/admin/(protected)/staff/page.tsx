"use client";

import { useCallback, useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type StaffMember = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: "platform_admin" | "platform_super_admin";
  created_at: string;
};

const ROLE_LABELS: Record<string, { label: string; badge: string }> = {
  platform_super_admin: { label: "Super Admin", badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  platform_admin:       { label: "Admin",        badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function StaffPage() {
  const [staff, setStaff]     = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [msg, setMsg]         = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  // Create form
  const [showCreate, setShowCreate]     = useState(false);
  const [createEmail, setCreateEmail]   = useState("");
  const [createName, setCreateName]     = useState("");
  const [createRole, setCreateRole]     = useState<"platform_admin" | "platform_super_admin">("platform_admin");
  const [createPw, setCreatePw]         = useState("");
  const [showCreatePw, setShowCreatePw] = useState(false);

  // Reset password modal
  const [resetId, setResetId]     = useState<string | null>(null);
  const [resetName, setResetName] = useState("");
  const [resetPw, setResetPw]     = useState("");
  const [showResetPw, setShowResetPw] = useState(false);

  // Remove confirmation
  const [removeId, setRemoveId]     = useState<string | null>(null);
  const [removeName, setRemoveName] = useState("");

  // Role change inline
  const [editId, setEditId]     = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"platform_admin" | "platform_super_admin">("platform_admin");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const data = (await res.json()) as { staff?: StaffMember[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load staff");
      setStaff(data.staff ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3500); }

  function openCreate() {
    setCreateEmail(""); setCreateName(""); setCreateRole("platform_admin");
    setCreatePw(generatePassword()); setShowCreatePw(true);
    setError(null); setShowCreate(true);
  }

  async function handleCreate() {
    if (!createEmail.trim() || !createPw) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: createEmail, full_name: createName || undefined, role: createRole, password: createPw }),
      });
      const data = (await res.json()) as { error?: string; promoted?: boolean; created?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      flash(data.promoted ? `${createEmail} promoted to ${ROLE_LABELS[createRole].label}` : `Account created for ${createEmail}`);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!resetPw || !resetId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff/${resetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: resetPw }),
      });
      if (!res.ok) throw new Error("Password reset failed");
      flash(`Password reset for ${resetName}`);
      setResetId(null); setResetPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(id: string, role: "platform_admin" | "platform_super_admin") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Role update failed");
      flash("Role updated");
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      flash("Staff member removed");
      setRemoveId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Staff & Access</h1>
          <p className={`text-[13px] ${t.muted}`}>Manage admin accounts and access levels</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-[12px] text-green-600">{msg}</span>}
          <button onClick={openCreate} className={t.btnPrimary}>+ Add Staff</button>
        </div>
      </div>

      {error && <div className={t.alertError}>{error}</div>}
      {loading && <div className={t.alertLoading}>Loading staff…</div>}

      {/* Role guide */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_LABELS.platform_super_admin.badge}`}>Super Admin</span>
          <p className="mt-1 text-[12px] text-gray-600">Full platform access. Can manage all stores, staff, billing, and settings.</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_LABELS.platform_admin.badge}`}>Admin</span>
          <p className="mt-1 text-[12px] text-gray-600">Access to orders, products, customers, content, and inventory.</p>
        </div>
      </div>

      {/* Staff table */}
      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Email", "Role", "Added", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className={t.tableRow}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {member.full_name ?? <span className="italic text-gray-400">No name</span>}
                    </p>
                    <p className="font-mono text-[11px] text-gray-400">{member.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{member.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {editId === member.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as typeof editRole)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-[#2D8C54] focus:outline-none"
                        >
                          <option value="platform_admin">Admin</option>
                          <option value="platform_super_admin">Super Admin</option>
                        </select>
                        <button onClick={() => void handleRoleChange(member.id, editRole)} disabled={busy}
                          className="rounded border border-[#2D8C54] px-2 py-0.5 text-[11px] text-[#2D8C54] hover:bg-[#2D8C54] hover:text-white">
                          Save
                        </button>
                        <button onClick={() => setEditId(null)} className="text-[11px] text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_LABELS[member.role]?.badge ?? "bg-gray-100 text-gray-500"}`}>
                        {ROLE_LABELS[member.role]?.label ?? member.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(member.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => { setEditId(member.id); setEditRole(member.role); }} className={t.btnOutline}>
                        Role
                      </button>
                      <button
                        onClick={() => { setResetId(member.id); setResetName(member.full_name ?? member.email ?? ""); setResetPw(generatePassword()); setShowResetPw(true); }}
                        className={t.btnOutline}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => { setRemoveId(member.id); setRemoveName(member.full_name ?? member.email ?? "this user"); }}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No staff members yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CREATE MODAL ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Add Staff Member</h2>
              <p className="mt-0.5 text-[13px] text-gray-500">
                Create an account with a temporary password. Share the password with them — they can change it after logging in.
              </p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email *</label>
                <input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="staff@example.com" className={t.input} autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Full Name</label>
                <input value={createName} onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Jane Smith" className={t.input} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Role</label>
                <select value={createRole} onChange={(e) => setCreateRole(e.target.value as typeof createRole)} className={t.input}>
                  <option value="platform_admin">Admin — orders, products, content</option>
                  <option value="platform_super_admin">Super Admin — full platform access</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Temporary Password *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showCreatePw ? "text" : "password"}
                      value={createPw}
                      onChange={(e) => setCreatePw(e.target.value)}
                      className={`${t.input} pr-10 font-mono`}
                    />
                    <button type="button" onClick={() => setShowCreatePw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-gray-600">
                      {showCreatePw ? "Hide" : "Show"}
                    </button>
                  </div>
                  <button type="button" onClick={() => setCreatePw(generatePassword())}
                    className={t.btnOutline}>
                    Regenerate
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">Share this password with the staff member. They should change it after first login via Account → Security.</p>
              </div>
              {error && <p className="text-[12px] text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => { setShowCreate(false); setError(null); }} className={t.btnOutline}>Cancel</button>
              <button onClick={() => void handleCreate()} disabled={busy || !createEmail.trim() || createPw.length < 8} className={t.btnPrimary}>
                {busy ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ──────────────────────────────────────────────── */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Reset Password</h2>
              <p className="mt-0.5 text-[13px] text-gray-500">
                Set a new password for <span className="font-semibold">{resetName}</span>. Share it with them — they can update it at Account → Security.
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">New Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showResetPw ? "text" : "password"}
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    className={`${t.input} pr-10 font-mono`}
                  />
                  <button type="button" onClick={() => setShowResetPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-gray-600">
                    {showResetPw ? "Hide" : "Show"}
                  </button>
                </div>
                <button type="button" onClick={() => setResetPw(generatePassword())} className={t.btnOutline}>
                  Regenerate
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => { setResetId(null); setResetPw(""); }} className={t.btnOutline}>Cancel</button>
              <button onClick={() => void handleResetPassword()} disabled={busy || resetPw.length < 8} className={t.btnPrimary}>
                {busy ? "Saving…" : "Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE MODAL ──────────────────────────────────────────────────────── */}
      {removeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Remove Staff Access</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-gray-600">
                Remove admin access for <span className="font-semibold">{removeName}</span>? Their account is kept but they will no longer be able to access the admin panel.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setRemoveId(null)} className={t.btnOutline}>Cancel</button>
              <button onClick={() => void handleRemove(removeId)} disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? "Removing…" : "Remove Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
