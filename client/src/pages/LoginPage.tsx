import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { ApiError } from "../api/client";
import { Logo } from "../components/Logo";
import { SEEDED_USERS, TEST_PASSWORD } from "../testCredentials";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  function quickFill(userEmail: string) {
    setEmail(userEmail);
    setPassword(TEST_PASSWORD);
    setError(null);
  }

  return (
    <div className="center-screen">
      <div
        className="panel"
        style={{ width: 400, maxWidth: "92vw", background: "var(--bg-shell-elevated)", border: "1px solid rgba(255,255,255,.08)" }}
      >
        <div style={{ padding: "30px 30px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Logo size={40} />
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#f3f1e9" }}>SOLTECH Hub</h2>
            <p style={{ color: "#a9b8ae", fontSize: "0.82rem" }}>Cold chain &amp; VET training console</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "10px 30px 26px" }}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ color: "#a9b8ae" }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@soltech.test"
              autoComplete="username"
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ color: "#a9b8ae" }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "18px 30px 26px" }}>
          <p style={{ color: "#a9b8ae", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Quick sign-in (after <code className="mono">npm run seed</code>)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SEEDED_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ borderColor: "rgba(255,255,255,.18)", color: "#f3f1e9" }}
                onClick={() => quickFill(u.email)}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="hint" style={{ color: "#7c8b83" }}>
            Fills the form with the seeded account. Full credential list: <code className="mono">TEST_CREDENTIALS.md</code>{" "}
            in the backend repo root.
          </p>
        </div>
      </div>
    </div>
  );
}
