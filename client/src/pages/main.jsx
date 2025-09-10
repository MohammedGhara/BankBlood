// client/src/pages/main.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { getUser, clearToken } from "../auth";

export default function Main() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const user = getUser();

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .get("/inventory")
      .then((res) => { if (live) setInventory(res.data || []); })
      .catch((e) => {
        const msg = e.response
          ? `[${e.response.status}] ${e.response.data?.error || e.response.statusText}`
          : "Network error";
        setErr(msg);
      })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

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
    <div style={{ maxWidth: 1100, margin: "32px auto", padding: "0 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <h2 style={{ margin:0 }}>Welcome{user?.fullName ? `, ${user.fullName}` : ""}</h2>
          <div style={{ opacity:.75 }}>Role: {user?.role || "—"}</div>
        </div>
        <button onClick={logout}>Logout</button>
      </div>

      {loading && <p>Loading inventory…</p>}
      {err && <p style={{ color:"salmon" }}>{err}</p>}

      {!loading && !err && (
        <>
          <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", marginBottom:24 }}>
            <StatCard label="Total Units" value={totalUnits} />
            <StatCard label="Rare Units (AB-, B-, A-, O-)" value={rareUnits} />
            <StatCard label="Blood Types Tracked" value={inventory.length} />
          </div>

          <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", marginBottom:24 }}>
            <DashLink to="/donations">Intake Donations</DashLink>
            <DashLink to="/dispense">Routine Dispense</DashLink>
            <DashLink to="/emergency">Emergency O-</DashLink>
          </div>

          <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid #2b2f36" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr><Th>Type</Th><Th>Units</Th></tr>
              </thead>
              <tbody>
                {inventory.map(r => (
                  <tr key={r.bloodType} style={{ borderTop:"1px solid #2b2f36" }}>
                    <Td>{r.bloodType}</Td>
                    <Td>{r.units}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ border:"1px solid #2b2f36", borderRadius:12, padding:16, background:"rgba(20,25,35,0.6)", boxShadow:"0 6px 18px rgba(0,0,0,.25)" }}>
      <div style={{ opacity:.8, fontSize:14, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700 }}>{value}</div>
    </div>
  );
}
const Th = (p) => <th style={{ textAlign:"left", padding:"10px 8px", fontWeight:600 }}>{p.children}</th>;
const Td = (p) => <td style={{ padding:"10px 8px" }}>{p.children}</td>;
function DashLink({ to, children }) {
  return (
    <Link to={to} style={{
      border:"1px solid #2b2f36",
      padding:16, borderRadius:12,
      textDecoration:"none",
      background:"rgba(20,25,35,0.6)",
      display:"block", textAlign:"center",
      fontWeight:600
    }}>
      {children}
    </Link>
  );
}
