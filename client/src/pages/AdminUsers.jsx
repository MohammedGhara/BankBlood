// client/src/pages/AdminUsers.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../api";

const ROLES = ["admin","doctor","customer"];

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ fullName:"", email:"", password:"", role:"customer" });

  const canCreate = useMemo(() =>
    form.fullName.trim() && /^\S+@\S+\.\S+$/.test(form.email) && form.password.length >= 3,
    [form]
  );

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
        ...(q ? { q } : {}),
        ...(role ? { role } : {}),
      }).toString();
      const { data } = await api.get(`/admin/users?${params}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [q, role]);

  useEffect(() => { load(); }, [load]);

  async function createUser(e) {
    e.preventDefault();
    if (!canCreate) return;
    try {
      await api.post("/admin/users", form);
      setForm({ fullName:"", email:"", password:"", role:"customer" });
      setCreating(false);
      setShowPw(false);
      load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  async function changeRole(id, newRole) {
    try {
      await api.patch(`/admin/users/${id}`, { role: newRole });
      load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  async function resetPassword(id) {
    const pw = prompt("New password (min 3 chars):");
    if (!pw || pw.length < 3) return;
    try {
      await api.patch(`/admin/users/${id}`, { password: pw });
      alert("Password updated");
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  return (
    <div className="users-wrap">
      {/* Header */}
      <header className="users-header">
        <div>
          <div className="eyebrow">BECS • Admin</div>
          <h1 className="title">Users</h1>
          <p className="sub">Create, search and manage user roles.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={load}
            disabled={loading}
            aria-busy={loading ? "true" : "false"}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setCreating(v => !v)}
          >
            {creating ? "Close" : "New user"}
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <section className="card toolbar">
        <div className="row">
          <div className="field grow">
            <label htmlFor="q">Search</label>
            <input
              id="q"
              placeholder="Name or email"
              value={q}
              onChange={e=>setQ(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" value={role} onChange={e=>setRole(e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="toolbar-buttons">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-pill"
            onClick={load}
            disabled={loading}
            aria-busy={loading ? "true" : "false"}
          >
            {loading ? "Loading…" : "Apply"}
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm btn-pill"
            onClick={() => { setQ(""); setRole(""); load(); }}
          >
            Reset
          </button>
        </div>
      </section>

      {/* Create user */}
      {creating && (
        <form className="card form" onSubmit={createUser}>
          <div className="grid">
            <div className="field">
              <label>Full name</label>
              <input
                required
                placeholder="Jane Doe"
                value={form.fullName}
                onChange={e=>setForm({...form, fullName:e.target.value})}
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                required
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={e=>setForm({...form, email:e.target.value})}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <div className="pw">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  placeholder="•••"
                  value={form.password}
                  onChange={e=>setForm({...form, password:e.target.value})}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(s => !s)}
                  title={showPw ? "Hide" : "Show"}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <div className="hint">Min 3 characters</div>
            </div>

            <div className="field">
              <label>Role</label>
              <select
                value={form.role}
                onChange={e=>setForm({...form, role:e.target.value})}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={!canCreate}>
              Create user
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Errors */}
      {err && <div className="alert error">{err}</div>}

      {/* Table */}
      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Created</Th>
                <Th className="num">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map(u => (
                <tr key={u.id}>
                  <Td>{u.fullName}</Td>
                  <Td className="muted">{u.email}</Td>
                  <Td>
                    <select value={u.role} onChange={e=>changeRole(u.id, e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Td>
                  <Td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}</Td>
                  <Td className="num actions">
                    <button type="button" className="btn btn-ghost" onClick={()=>resetPassword(u.id)}>
                      Reset PW
                    </button>
                    <button type="button" className="btn btn-outline danger" onClick={()=>remove(u.id)}>
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <Td colSpan={5} style={{opacity:.7, textAlign:'center', padding:14}}>
                    No users found
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Scoped styles */}
      <style>{`
        .users-wrap { max-width: 1100px; margin: 28px auto 48px; padding: 0 16px; color:#e5e7eb; }

        .users-header { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:end; margin-bottom:12px; }
        .eyebrow { color:#94a3b8; font-weight:600; font-size:.9rem; }
        .title { margin: 4px 0 0; font-size:2rem; }
        .sub { margin: 6px 0 0; color:#94a3b8; }
        .header-actions { display:flex; gap:10px; }

        .card { background:#0b1220; border:1px solid #1f2937; border-radius:16px; padding:14px; box-shadow:0 10px 28px rgba(0,0,0,.25); }
        .toolbar .row { display:flex; gap:10px; align-items:end; flex-wrap:wrap; }
        .field { display:flex; flex-direction:column; gap:6px; min-width:200px; }
        .field.grow { flex:1 1 auto; min-width:260px; }
        label { color:#cbd5e1; font-size:.9rem; }
        input, select {
          padding:.55rem .7rem; border-radius:10px; border:1px solid #1f2937; background:#0b1220; color:#e5e7eb;
        }
        .muted { color:#9ca3af; }

        .toolbar-buttons { display:flex; gap:10px; margin-top:12px; }

        .btn {
          display:inline-flex; align-items:center; justify-content:center; gap:.45rem;
          padding:.55rem 1rem; border-radius:12px; border:1px solid #ef4444;
          background:#ef4444; color:#fff; font-weight:800; cursor:pointer;
          transition:transform .12s ease, filter .12s ease;
        }
        .btn:hover { transform: translateY(-1px); filter: brightness(1.03); }
        .btn-ghost { background:transparent; border-color:#334155; color:#cbd5e1; }
        .btn-ghost:hover { background:#0f172a; }
        .btn-outline { background:transparent; color:#fda4af; border-color:#7f1d1d; }
        .btn-outline.danger { color:#fca5a5; border-color:#ef4444; }
        .btn-primary { background:#ef4444; border-color:#ef4444; color:#fff; }
        .btn-pill { border-radius:999px; }
        .btn-sm { padding:.45rem .8rem; font-size:.9rem; }
        .btn[aria-busy="true"] { opacity:.75; cursor:progress; }

        .form .grid {
          display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px;
        }
        .form .pw { display:flex; align-items:stretch; gap:8px; }
        .form .pw input { flex: 1 1 auto; }
        .pw-toggle {
          padding:.55rem .7rem; border-radius:10px; border:1px solid #334155; background:#111827; color:#cbd5e1; cursor:pointer;
        }
        .hint { font-size:.8rem; color:#9ca3af; margin-top:4px; }

        .form-actions { display:flex; gap:10px; margin-top:12px; }

        .table-wrap { overflow-x:auto; }
        .table { width:100%; border-collapse: collapse; }
        th, td { padding:.8rem .9rem; border-bottom:1px solid #1f2937; }
        thead th { text-align:left; color:#93c5fd; background:#0b1220; position:sticky; top:0; z-index:1; }
        .num { text-align:right; }
        .actions { display:flex; gap:.4rem; justify-content:flex-end; }

        @media (max-width: 900px) {
          .users-header { grid-template-columns: 1fr; }
          .form .grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

/* tiny helpers */
const Th = (p) => <th className={p.className || ""}>{p.children}</th>;
const Td = (p) => <td className={p.className || ""} {...(p.colSpan ? { colSpan: p.colSpan } : {})}>{p.children}</td>;
