// client/src/pages/Main.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { getUser, clearToken } from "../auth";

export default function Main() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const user = getUser();

  const load = useCallback(async () => {
    setErr("");
    setRefreshing(true);
    try {
      const res = await api.get("/inventory");
      setInventory(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const msg = e.response
        ? `[${e.response.status}] ${e.response.data?.error || e.response.statusText}`
        : "Network error";
      setErr(msg);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { totalUnits, rareUnits } = useMemo(() => {
    const total = inventory.reduce((s, r) => s + Number(r.units || 0), 0);
    const rareTypes = ["AB-","B-","A-","O-"];
    const rare = inventory
      .filter(r => rareTypes.includes(r.bloodType))
      .reduce((s, r) => s + Number(r.units || 0), 0);
    return { totalUnits: total, rareUnits: rare };
  }, [inventory]);

  const logout = () => { clearToken(); nav("/login", { replace: true }); };

  return (
    <div className="main-wrap">
      {/* Header */}
      <header className="header">
        <div>
          <div className="eyebrow">Blood Bank • Dashboard</div>
          <h1 className="title">
            Welcome{user?.fullName ? `, ${user.fullName}` : ""}
            {user?.role && <RoleBadge role={user.role} />}
          </h1>
          <p className="sub">Quick overview and actions.</p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={load}
            disabled={refreshing}
            aria-busy={refreshing ? "true" : "false"}
            title="Refresh inventory"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn btn-outline" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Alerts */}
      {err && <div className="alert error">{err}</div>}

      {/* Stats */}
      <section className="stats">
        <StatCard label="Total Units" value={totalUnits} accent="blue" />
        <StatCard label="Rare Units (AB-, B-, A-, O-)" value={rareUnits} accent="violet" />
        <StatCard label="Blood Types Tracked" value={inventory.length || 8} accent="teal" />
      </section>

      {/* Quick actions */}
      <section className="actions-grid">
        <ActionTile to="/donations" title="Intake Donations" desc="Record a new donation and auto-update stock." />
        <ActionTile to="/dispense"  title="Routine Dispense" desc="Issue RBC units with safe alternatives." />
        <ActionTile to="/emergency" title="Emergency O−"   desc="Immediate O− issue – emergency protocol." danger />
      </section>

      {/* Inventory table */}
      <section className="table-card">
        <div className="table-head">
          <h2>Inventory by Blood Type</h2>
          <div className="muted">Live view of current stock</div>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><Th>Type</Th><Th className="num">Units</Th><Th>Level</Th></tr>
              </thead>
              <tbody>
                {inventory.map(r => {
                  const units = Number(r.units) || 0;
                  const pct = Math.min(100, units * 10); // simple 0–10 units scale
                  return (
                    <tr key={r.bloodType}>
                      <Td><span className="badge">{r.bloodType}</span></Td>
                      <Td className="num">{units}</Td>
                      <Td>
                        <div className="meter"><div className="fill" style={{ width: `${pct}%` }} /></div>
                      </Td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && (
                  <tr>
                    <Td colSpan={3} style={{ textAlign:"center", opacity:.7, padding:"14px 8px" }}>
                      No records
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Styles */}
      <style>{`
        .main-wrap { max-width: 1100px; margin: 28px auto 48px; padding: 0 16px; color: #e5e7eb; }
        .eyebrow { color:#94a3b8; font-weight:600; font-size:.9rem; }
        .title { margin: 6px 0 0; font-size: 2rem; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .sub { margin: 6px 0 0; color:#94a3b8; }

        .header { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: end; margin-bottom: 16px; }
        .header-actions { display:flex; gap:10px; align-items:center; }

        .btn {
          display:inline-flex; align-items:center; justify-content:center; gap:.45rem;
          padding:.55rem 1rem; border-radius:12px; border:1px solid transparent;
          font-weight:800; cursor:pointer; transition:transform .15s ease, filter .2s ease, box-shadow .2s ease;
        }
        .btn[aria-busy="true"] { opacity:.75; cursor:progress; }
        .btn-ghost { background:transparent; color:#cbd5e1; border:1px solid #334155; }
        .btn-ghost:hover { background:#0f172a; }
        .btn-outline { background:transparent; color:#fca5a5; border:1px solid #ef4444; }
        .btn-outline:hover { background:rgba(239,68,68,.10); }

        .role-badge {
          padding:.2rem .5rem; border-radius:999px; font-size:.85rem; font-weight:800;
          border:1px solid #334155; color:#cbd5e1; background:#0b1220;
        }
        .role-badge.admin { color:#fca5a5; border-color:#ef4444; }
        .role-badge.doctor { color:#a7f3d0; border-color:#10b981; }
        .role-badge.customer { color:#93c5fd; border-color:#3b82f6; }

        .stats {
          display:grid; gap:12px; grid-template-columns: repeat(3, minmax(0,1fr));
          margin: 8px 0 18px;
        }
        .stat {
          border:1px solid #1f2937; border-radius:14px; padding:14px 16px;
          background:#0b1220; box-shadow:0 8px 24px rgba(0,0,0,.25);
        }
        .stat .label { color:#9ca3af; font-size:.9rem; margin-bottom:6px; }
        .stat .value { font-size:1.8rem; font-weight:900; letter-spacing:.2px; }
        .stat.blue .value { text-shadow: 0 0 16px rgba(59,130,246,.25); }
        .stat.violet .value { text-shadow: 0 0 16px rgba(139,92,246,.25); }
        .stat.teal .value { text-shadow: 0 0 16px rgba(45,212,191,.25); }

        .actions-grid {
          display:grid; gap:12px; grid-template-columns: repeat(3, minmax(0,1fr));
          margin-bottom: 22px;
        }
        .tile {
          display:flex; flex-direction:column; justify-content:space-between; gap:8px;
          border:1px solid #1f2937; border-radius:14px; padding:14px 16px;
          background:linear-gradient(180deg, #0b1220 0%, #0a0f1b 100%);
          text-decoration:none; color:#e5e7eb; box-shadow:0 8px 24px rgba(0,0,0,.25);
          transition: transform .12s ease, border-color .12s ease;
        }
        .tile:hover { transform: translateY(-2px); border-color:#334155; }
        .tile .t-title { font-weight:800; font-size:1.05rem; }
        .tile .t-desc  { color:#94a3b8; font-size:.92rem; line-height:1.25; }
        .tile.danger { border-color:#7f1d1d; background:linear-gradient(180deg, #160d0f, #0b1220); }
        .tile.danger .t-title { color:#fca5a5; }

        .table-card {
          background:#0b1220ee; border:1px solid #1f2937; border-radius:16px;
          box-shadow:0 12px 32px rgba(0,0,0,.35);
        }
        .table-head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:14px 16px; border-bottom:1px solid #1f2937; }
        .table-head h2 { margin:0; font-size:1.25rem; }
        .muted { color:#94a3b8; font-size:.9rem; }

        .table-wrap { overflow-x:auto; }
        .table { width:100%; border-collapse:collapse; }
        th, td { padding: .85rem .9rem; border-bottom:1px solid #1f2937; }
        thead th { text-align:left; color:#93c5fd; background:#0b1220; position:sticky; top:0; }
        .num { text-align:right; }
        .badge { font-weight:800; padding:.25rem .55rem; border-radius:9999px; background:#111827; border:1px solid #1f2937; }

        .meter { height:10px; background:#0f172a; border:1px solid #1f2937; border-radius:9999px; overflow:hidden; }
        .fill { height:100%; background: linear-gradient(90deg, #60a5fa, #34d399); }

        /* Skeleton loading */
        .skel { animation: pulse 1.2s ease-in-out infinite; background:#0f172a; border-radius:10px; }
        @keyframes pulse { 0%{opacity:.55} 50%{opacity:.85} 100%{opacity:.55} }

        @media (max-width: 900px) {
          .header { grid-template-columns: 1fr; gap: 8px; }
          .stats { grid-template-columns: 1fr; }
          .actions-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

/* ---------- tiny presentational helpers ---------- */
function RoleBadge({ role }) {
  return <span className={`role-badge ${role}`}>{role}</span>;
}

function StatCard({ label, value, accent = "" }) {
  return (
    <div className={`stat ${accent}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function ActionTile({ to, title, desc, danger }) {
  return (
    <Link to={to} className={`tile ${danger ? "danger" : ""}`}>
      <div className="t-title">{title}</div>
      <div className="t-desc">{desc}</div>
    </Link>
  );
}

const Th = (p) => <th className={p.className || ""}>{p.children}</th>;
const Td = (p) => <td className={p.className || ""} {...(p.colSpan ? { colSpan: p.colSpan } : {})}>{p.children}</td>;

function SkeletonTable() {
  return (
    <div style={{ padding: 16 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"120px 120px 1fr", gap:12, alignItems:"center", marginBottom:10 }}>
          <div className="skel" style={{ height: 18 }} />
          <div className="skel" style={{ height: 18 }} />
          <div className="skel" style={{ height: 10 }} />
        </div>
      ))}
    </div>
  );
}
