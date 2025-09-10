import { useEffect, useState } from "react";
import api from "../api";

const ROLES = ["admin","doctor","customer"];

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName:"", email:"", password:"", role:"customer" });

  async function load() {
    setErr("");
    try {
      const params = new URLSearchParams({
        page: "1", pageSize: "100",
        ...(q ? { q } : {}),
        ...(role ? { role } : {}),
      }).toString();
      const { data } = await api.get(`/admin/users?${params}`);
      setItems(data.items || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    try {
      await api.post("/admin/users", form);
      setForm({ fullName:"", email:"", password:"", role:"customer" });
      setCreating(false);
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
    const pw = prompt("New password:");
    if (!pw) return;
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
    <div className="wrap">
      <h1>Users</h1>

      <div className="toolbar">
        <input placeholder="Search name/email" value={q} onChange={e=>setQ(e.target.value)} />
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="btn" onClick={load}>Apply</button>
        <button className="btn btn-ghost" onClick={()=>{ setQ(""); setRole(""); load(); }}>Reset</button>
        <button className="btn" onClick={()=>setCreating(v=>!v)}>{creating?"Close":"New user"}</button>
      </div>

      {creating && (
        <form className="card form" onSubmit={createUser}>
          <input required placeholder="Full name" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})}/>
          <input required type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          <input required type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/>
          <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn" type="submit">Create</button>
        </form>
      )}

      {err && <div className="alert error">{err}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Created</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={e=>changeRole(u.id, e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td>{new Date(u.createdAt).toLocaleString()}</td>
                <td className="actions">
                  <button className="btn btn-ghost" onClick={()=>resetPassword(u.id)}>Reset PW</button>
                  <button className="btn btn-ghost" onClick={()=>remove(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} style={{opacity:.7, textAlign:'center'}}>No users</td></tr>}
          </tbody>
        </table>
      </div>

      <style>{`
        .wrap { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }
        .toolbar { display: flex; gap: .5rem; flex-wrap: wrap; margin: .75rem 0 1rem; }
        .card { background:#111827; border:1px solid #1f2937; border-radius:12px; padding: 12px; }
        .form { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:.5rem; margin-bottom:1rem; }
        .form input, .form select { padding:.55rem .7rem; border-radius:8px; border:1px solid #1f2937; background:#0b1220; color:#e5e7eb; }
        .table { width:100%; border-collapse: collapse; }
        th, td { padding:.7rem .8rem; border-bottom:1px solid #1f2937; }
        th { text-align:left; color:#93c5fd; background:#0b1220; }
        td { color:#e2e8f0; }
        .actions { display:flex; gap:.4rem; }
        .btn { display:inline-flex; align-items:center; gap:.4rem; padding:.45rem .8rem; border-radius:10px; border:1px solid #ef4444; background:#ef4444; color:#fff; font-weight:700; }
        .btn-ghost { background:transparent; color:#fca5a5; }
      `}</style>
    </div>
  );
}
