import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { saveToken, saveUser } from "../auth";   // ✅ now saving user too
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/auth/login", { email, password });

      // backend responds with { token, user }
      saveToken(res.data.token);
      saveUser(res.data.user);

     if (res.data.user.role === "admin") {
      nav("/admin/logs", { replace: true });
    } else if (res.data.user.role === "doctor") {
      nav("/main", { replace: true });
    }else if (res.data.user.role === "customer") {
      nav("/research", { replace: true });
    }
    } catch (e) {
      const msg = e.response
        ? `[${e.response.status}] ${e.response.data?.error || e.response.statusText}`
        : "Network error";
      setErr(msg);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to manage donations and inventory</p>

        {err && <div className="err">{err}</div>}

        <form className="form" onSubmit={submit}>
          <div className="input-row">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="input-row">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn" type="submit">Sign in</button>
        </form>

        <p className="note">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
