import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "../styles/form.css";

export default function Landing() {
  // optional: show live stats from the API
  const [inv, setInv] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    api.get("/inventory")
      .then(r => { if (live) setInv(Array.isArray(r.data) ? r.data : (r.data.inventory || [])); })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);
  const { totalUnits, rareUnits } = useMemo(() => {
    const total = inv.reduce((s, r) => s + Number(r.units || 0), 0);
    const rareTypes = ["AB-","B-","A-","O-"];
    const rare = inv.filter(r => rareTypes.includes(r.bloodType))
                    .reduce((s, r) => s + Number(r.units || 0), 0);
    return { totalUnits: total, rareUnits: rare };
  }, [inv]);

  return (
    <div style={{ minHeight:"calc(100vh - 64px)", position:"relative" }}>
      {/* soft gradient background */}
      <div style={{
        position:"absolute", inset:0, zIndex:-1,
        background:"radial-gradient(1200px 600px at 20% -10%, rgba(239,68,68,.15), transparent), radial-gradient(1200px 600px at 90% 0%, rgba(59,130,246,.12), transparent), linear-gradient(180deg, #0b1220 0%, #0e1422 100%)"
      }} />

      <section style={{ maxWidth:1100, margin:"0 auto", padding:"48px 16px 24px" }}>
        <div style={{
          display:"grid", gap:24,
          gridTemplateColumns:"1.2fr .8fr", alignItems:"center"
        }}>
          {/* Hero left */}
          <div>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"6px 10px", borderRadius:999,
              background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)",
              fontSize:13, letterSpacing:.2
            }}>
              <span>BECS • BankBlood</span>
            </div>

            <h1 style={{
              margin:"14px 0 10px",
              fontSize:42, lineHeight:1.1, fontWeight:800
            }}>
              Safe blood, when minutes matter.
            </h1>

            <p style={{ opacity:.85, fontSize:18, maxWidth:620 }}>
              A streamlined <b>Blood Establishment Computer Software</b> for hospitals and trauma units:
              record donations, monitor live inventory, and issue units routinely or in emergencies.
            </p>

            <div style={{ display:"flex", gap:12, marginTop:24, flexWrap:"wrap" }}>
              <Link to="/login" className="btn primary">Login</Link>
              <Link to="/register" className="btn btn-ghost">Create account</Link>
              <a className="btn btn-ghost" href="/api-docs">API Docs</a>
            </div>

            {/* Live stats (hidden while loading) */}
            {!loading && (
              <div style={{
                display:"grid", gap:12, marginTop:28,
                gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))"
              }}>
                <Stat label="Units in stock" value={totalUnits} sub="All blood types" />
                <Stat label="Rare units" value={rareUnits} sub="AB-, B-, A-, O-" />
                <Stat label="Tracked types" value={inv.length || 8} sub="A/B/AB/O ±" />
              </div>
            )}
          </div>

          {/* Hero right */}
          <div>
            <div style={{
              border:"1px solid #2b2f36",
              background:"rgba(255,255,255,.03)",
              borderRadius:16, padding:18, boxShadow:"0 12px 32px rgba(0,0,0,.25)"
            }}>
              <div style={{ display:"grid", gap:12 }}>
                <Feature icon="🩸" title="Record donations"
                  text="Validated donor intake with clear audit logs and inventory sync." />
                <Feature icon="📦" title="Live inventory"
                  text="At-a-glance stock levels by blood type—no spreadsheets needed." />
                <Feature icon="🚑" title="Emergency mode (O−)"
                  text="Issue universal O− safely at maximum available units in a click." />
              </div>
            </div>

            <SmallNote />
          </div>
        </div>
      </section>

      {/* Compatibility banner */}
      <section style={{ maxWidth:1100, margin:"8px auto 48px", padding:"0 16px" }}>
        <div style={{
          border:"1px solid #2b2f36",
          background:"rgba(59,130,246,.06)",
          borderRadius:14, padding:"14px 16px", fontSize:14
        }}>
          <b>Compatibility reminder:</b> when the requested type is unavailable, the system suggests a safe
          alternative based on ABO/Rh rules and local rarity distribution. Universal emergency type: <b>O−</b>.
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{
      border:"1px solid #2b2f36", borderRadius:12,
      background:"rgba(255,255,255,.03)", padding:"14px 16px"
    }}>
      <div style={{ fontSize:26, fontWeight:800 }}>{value}</div>
      <div style={{ opacity:.8, fontSize:13 }}>{label}</div>
      {sub && <div style={{ opacity:.6, fontSize:12, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"40px 1fr", gap:12, alignItems:"start" }}>
      <div style={{
        width:40, height:40, borderRadius:12,
        display:"grid", placeItems:"center",
        background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", fontSize:20
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight:700, marginBottom:4 }}>{title}</div>
        <div style={{ opacity:.85 }}>{text}</div>
      </div>
    </div>
  );
}

function SmallNote() {
  return (
    <p style={{ opacity:.65, fontSize:12, marginTop:12 }}>
      * This educational demo focuses on whole blood. Rarest phenotypes and component processing are
      out of scope. Data is simulated for the dashboard; do not use in clinical settings.
    </p>
  );
}
