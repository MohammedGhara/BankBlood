import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/auth.css";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Customer"); // Customer | Doctor | admin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      await api.post("/auth/register", { fullName, email, password, role });
      setOk("Registered! Redirecting to login…");
      setTimeout(() => nav("/login"), 800);
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Join the BECS dashboard</p>

        {err && <div className="err">{err}</div>}
        {ok  && <div className="err" style={{borderColor:"#22c55e", color:"#d7ffe3", background:"rgba(34,197,94,.08)"}}>{ok}</div>}

        <form className="form" onSubmit={submit}>
          <div className="input-row">
            <label>Full name</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name..."
              required
            />
          </div>

          <div className="row-split">
            <div className="input-row">
              <label>Role</label>
              <select className="select" value={role} onChange={(e)=>setRole(e.target.value)}>
                <option value="Customer">Customer</option>
                <option value="Doctor">Doctor</option>
                <option value="admin">admin</option>
              </select>
            </div>

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
          </div>

          <div className="input-row">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a strong password"
              required
            />
          </div>

          <button className="btn" type="submit">Create account</button>
          <Link className="btn btn-ghost" to="/login" style={{display:"inline-block", marginLeft:8}}>
            Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}
