"use client";

import { useState } from "react";
import { LockKeyhole, Loader2, ShieldCheck } from "lucide-react";

export function AdminLogin() {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password")
      })
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(result.message ?? "Login failed.");
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel">
        <div className="brand-mark" aria-label="RCCG Worship Tabernacle">
          <ShieldCheck size={26} />
          <span>RCCG WORSHIP TABERNACLE</span>
        </div>

        <div className="intro">
          <p>Admin access</p>
          <h1>Sign in to manage members</h1>
          <span>Enter your administrator credentials to open the member manager dashboard.</span>
        </div>

        <form className="member-form" onSubmit={handleSubmit}>
          <label>
            <span><ShieldCheck size={16} />Username</span>
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            <span><LockKeyhole size={16} />Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          <button className="submit-button" disabled={status === "submitting"}>
            {status === "submitting" ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}
            Sign in
          </button>

          {message ? <p className={`form-message ${status}`}>{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
