"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      if (!data.user) {
        setErrorMessage("Unable to sign in. Please try again.");
        return;
      }

      // Verify admin role before redirecting
      const meRes = await fetch("/api/account/me");
      if (meRes.ok) {
        const { profile } = (await meRes.json()) as { profile?: { role?: string } };
        const isAdmin = profile?.role === "platform_admin" || profile?.role === "platform_super_admin";
        if (!isAdmin) {
          await supabase.auth.signOut();
          setErrorMessage("Access denied. This portal is for admin users only.");
          return;
        }
      }

      window.location.href = "/admin";
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0c0f16",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#2D8C54",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "white",
              fontWeight: "bold",
              boxShadow: "0 8px 24px rgba(45,140,84,0.35)",
            }}
          >
            ✦
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "white", margin: 0 }}>pureHerbHealth</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0 }}>Admin Platform</p>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "24px",
          }}
        >
          <h1
            style={{
              textAlign: "center",
              fontSize: "20px",
              fontWeight: "600",
              color: "white",
              marginBottom: "20px",
              marginTop: 0,
            }}
          >
            Sign in to Admin
          </h1>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "rgba(255,255,255,0.6)", marginBottom: "6px" }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                style={{
                  height: "40px",
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontSize: "14px",
                  padding: "0 12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "rgba(255,255,255,0.6)", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  height: "40px",
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontSize: "14px",
                  padding: "0 12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {errorMessage && (
              <p
                style={{
                  borderRadius: "8px",
                  backgroundColor: "rgba(239,68,68,0.15)",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#f87171",
                  margin: 0,
                }}
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: "44px",
                width: "100%",
                borderRadius: "8px",
                backgroundColor: isSubmitting ? "#226b40" : "#2D8C54",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                marginTop: "4px",
              }}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.25)", marginTop: "20px" }}>
          Not an admin?{" "}
          <a href="/en/login" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline" }}>
            Customer sign in
          </a>
        </p>
      </div>
    </div>
  );
}
