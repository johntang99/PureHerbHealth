"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type AccountMeResponse = {
  user?: { id: string; email: string | null };
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string;
  };
};

type Section = "profile" | "security" | "language" | "delete";

export default function AccountSettingsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isZh = locale === "zh";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("profile");

  // Profile
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Security
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      if (!res.ok) {
        window.location.href = `/${locale}/login?next=${encodeURIComponent(`/${locale}/account/settings`)}`;
        return;
      }
      const payload = (await res.json()) as AccountMeResponse;
      if (!cancelled) {
        setFullName(payload.profile?.full_name ?? "");
        const e = payload.user?.email ?? "";
        setEmail(e);
        setInitialEmail(e);
        setLoading(false);
      }
    }
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    clearFeedback();
    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(payload.error ?? (isZh ? "无法更新资料。" : "Unable to update profile."));
    } else {
      setMessage(isZh ? "资料已更新。" : "Profile updated.");
    }
    setSavingProfile(false);
  }

  async function onSaveSecurity(e: FormEvent) {
    e.preventDefault();
    if (savingSecurity) return;
    const emailChanged =
      email.trim().toLowerCase() !== initialEmail.trim().toLowerCase() &&
      email.trim().length > 0;
    const hasPassword = newPassword.trim().length > 0;
    if (!emailChanged && !hasPassword) {
      setMessage(isZh ? "没有安全设置变更。" : "No security changes detected.");
      return;
    }
    setSavingSecurity(true);
    clearFeedback();
    const res = await fetch("/api/account/security", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailChanged ? email : undefined,
        password: newPassword || undefined,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      requires_email_confirmation?: boolean;
    };
    if (!res.ok) {
      setError(payload.error ?? (isZh ? "无法更新安全设置。" : "Unable to update security settings."));
    } else {
      setNewPassword("");
      setEmailConfirmPending(Boolean(payload.requires_email_confirmation));
      if (!payload.requires_email_confirmation) setInitialEmail(email);
      setMessage(
        payload.requires_email_confirmation
          ? isZh
            ? "请到新邮箱确认后生效。"
            : "Check your new email inbox to confirm the change."
          : isZh
            ? "密码已更新。"
            : "Password updated."
      );
    }
    setSavingSecurity(false);
  }

  async function onSwitchLocale(nextLocale: string) {
    // Set the locale cookie and redirect
    document.cookie = `phh-locale=${nextLocale};path=/;max-age=31536000`;
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${locale}/`, `/${nextLocale}/`);
    router.push(newPath);
    router.refresh();
  }

  async function onDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    clearFeedback();
    const res = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteConfirm }),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(payload.error ?? (isZh ? "无法删除账户。" : "Unable to delete account."));
      setDeleting(false);
      return;
    }
    window.location.href = `/${locale}`;
  }

  const sections: { id: Section; label: string }[] = [
    { id: "profile", label: isZh ? "个人资料" : "Profile" },
    { id: "security", label: isZh ? "安全设置" : "Security" },
    { id: "language", label: isZh ? "语言偏好" : "Language" },
    { id: "delete", label: isZh ? "删除账户" : "Delete account" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-100)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
          {isZh ? "账户" : "Account"}
        </p>
        <h1
          className="text-2xl font-bold text-[var(--neutral-900)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isZh ? "账户设置" : "Settings"}
        </h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--neutral-200)] bg-white p-1">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActiveSection(s.id);
              clearFeedback();
            }}
            className={[
              "flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeSection === s.id
                ? s.id === "delete"
                  ? "bg-red-500 text-white"
                  : "bg-[var(--color-brand-500)] text-white"
                : "text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]",
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* Profile section */}
      {activeSection === "profile" && (
        <form
          onSubmit={(e) => void onSaveProfile(e)}
          className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5 space-y-4"
        >
          <div>
            <h2 className="font-semibold text-[var(--neutral-900)]">
              {isZh ? "个人资料" : "Profile"}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--neutral-500)]">
              {isZh
                ? "更新您的姓名，此名称将显示在订单和账户中。"
                : "Update the name shown on your orders and account."}
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--neutral-700)]">
              {isZh ? "姓名" : "Full name"}
            </span>
            <input
              className="h-10 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 text-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200,#bbf7d0)]"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isZh ? "输入您的姓名" : "Enter your full name"}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--neutral-700)]">
              {isZh ? "邮箱" : "Email"}
            </span>
            <input
              className="h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 text-sm text-[var(--neutral-500)] cursor-not-allowed"
              value={email}
              readOnly
              disabled
            />
            <p className="text-xs text-[var(--neutral-400)]">
              {isZh ? "如需更改邮箱，请前往「安全设置」。" : "To change your email, go to Security."}
            </p>
          </label>
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-brand-500)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60 transition-colors"
          >
            {savingProfile
              ? isZh
                ? "保存中..."
                : "Saving..."
              : isZh
                ? "保存资料"
                : "Save profile"}
          </button>
        </form>
      )}

      {/* Security section */}
      {activeSection === "security" && (
        <form
          onSubmit={(e) => void onSaveSecurity(e)}
          className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5 space-y-4"
        >
          <div>
            <h2 className="font-semibold text-[var(--neutral-900)]">
              {isZh ? "安全设置" : "Security"}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--neutral-500)]">
              {isZh
                ? "更改邮箱或密码。邮箱变更需要验证。"
                : "Change your email or password. Email changes require verification."}
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--neutral-700)]">
              {isZh ? "邮箱地址" : "Email address"}
            </span>
            <input
              type="email"
              className="h-10 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 text-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200,#bbf7d0)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {emailConfirmPending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {isZh
                ? "邮箱变更待确认：请前往新邮箱点击确认链接后生效。"
                : "Email change pending — check your new inbox for the confirmation link."}
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--neutral-700)]">
              {isZh ? "新密码" : "New password"}
            </span>
            <input
              type="password"
              className="h-10 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 text-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200,#bbf7d0)]"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={
                isZh ? "留空则保持当前密码" : "Leave blank to keep current password"
              }
            />
          </label>
          <button
            type="submit"
            disabled={savingSecurity}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-brand-500)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60 transition-colors"
          >
            {savingSecurity
              ? isZh
                ? "更新中..."
                : "Updating..."
              : isZh
                ? "更新安全设置"
                : "Update security"}
          </button>
        </form>
      )}

      {/* Language section */}
      {activeSection === "language" && (
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5 space-y-4">
          <div>
            <h2 className="font-semibold text-[var(--neutral-900)]">
              {isZh ? "语言偏好" : "Language & Region"}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--neutral-500)]">
              {isZh
                ? "选择您偏好的显示语言。"
                : "Choose your preferred display language."}
            </p>
          </div>
          <div className="space-y-2">
            {[
              { code: "en", label: "English", sub: "English (United States)" },
              {
                code: "zh",
                label: "中文",
                sub: "Chinese Simplified (简体中文)",
              },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => void onSwitchLocale(lang.code)}
                className={[
                  "flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors",
                  locale === lang.code
                    ? "border-[var(--color-brand-400,#4ade80)] bg-[var(--color-brand-50,#f0fdf4)]"
                    : "border-[var(--neutral-200)] bg-white hover:bg-[var(--neutral-50)]",
                ].join(" ")}
              >
                <div>
                  <p className="font-semibold text-[var(--neutral-900)]">
                    {lang.label}
                  </p>
                  <p className="text-xs text-[var(--neutral-500)]">{lang.sub}</p>
                </div>
                {locale === lang.code && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-[10px] font-bold text-white">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--neutral-400)]">
            {isZh
              ? "切换语言后页面将自动刷新。"
              : "The page will refresh after switching languages."}
          </p>
        </div>
      )}

      {/* Delete section */}
      {activeSection === "delete" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 space-y-3">
          <div>
            <h2 className="font-semibold text-red-700">
              {isZh ? "删除账户" : "Delete account"}
            </h2>
            <p className="mt-0.5 text-sm text-red-600">
              {isZh
                ? "此操作不可撤销。您的个人信息将被永久删除，订单记录将予以保留。"
                : "This action is permanent. Your personal data will be deleted. Order records are kept for legal compliance."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            {isZh ? "继续删除流程" : "Continue deletion flow"}
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-700">
              {isZh ? "确认永久删除账户" : "Confirm account deletion"}
            </h3>
            <p className="mt-2 text-sm text-[var(--neutral-700)]">
              {isZh
                ? "此操作不可恢复。请输入 DELETE MY ACCOUNT 并点击最终确认按钮。"
                : "This cannot be undone. Type DELETE MY ACCOUNT below to confirm."}
            </p>
            <input
              className="mt-3 h-10 w-full rounded-lg border border-red-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--neutral-300)] px-4 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors"
              >
                {isZh ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={
                  deleting || deleteConfirm.trim() !== "DELETE MY ACCOUNT"
                }
                onClick={() => void onDeleteAccount()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting
                  ? isZh
                    ? "删除中..."
                    : "Deleting..."
                  : isZh
                    ? "最终确认删除"
                    : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
