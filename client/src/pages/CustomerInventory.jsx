// client/src/pages/CustomerInventory.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../api";

// Natural ordering for display
const ALL_TYPES = ["O-","O+","A-","A+","B-","B+","AB-","AB+"];
const RBC_COMPATIBILITY = {
  "O-":  ["O-"],
  "O+":  ["O+","O-"],
  "A-":  ["A-","O-"],
  "A+":  ["A+","A-","O+","O-"],
  "B-":  ["B-","O-"],
  "B+":  ["B+","B-","O+","O-"],
  "AB-": ["AB-","A-","B-","O-"],
  "AB+": ["AB+","AB-","A+","A-","B+","B-","O+","O-"],
};

export default function CustomerInventory() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      const { data } = await api.get("/inventory/summary");
      const arr = Array.isArray(data) ? data : [];
      // sort by natural type order
      arr.sort((a,b) => ALL_TYPES.indexOf(a.bloodType) - ALL_TYPES.indexOf(b.bloodType));
      setRows(arr);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- derived stats for the cards ----
  const stats = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + (Number(r.units) || 0), 0);
    const rareSet = new Set(["AB-", "B-", "A-", "O-"]);
    const rare = rows.filter(r => rareSet.has(r.bloodType))
                     .reduce((s, r) => s + (Number(r.units) || 0), 0);
    const tracked = rows.length;
    return { total, rare, tracked };
  }, [rows]);

  // ---- inventory summary PDF ----
  const downloadSummaryPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Inventory Summary", 14, 16);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

    doc.text(`Total Units: ${stats.total}`, 14, 34);
    doc.text(`Rare Units (AB-, B-, A-, O-): ${stats.rare}`, 14, 42);
    doc.text(`Blood Types Tracked: ${stats.tracked}`, 14, 50);

    const body = rows.map((r) => [
      r.bloodType,
      String(r.units ?? 0),
      r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—",
    ]);
    autoTable(doc, {
      head: [["Blood Type", "Units", "Last Update"]],
      body,
      startY: 58,
    });

    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    doc.save(`inventory-${stamp}.pdf`);
  };

  // ---- compatibility PDF ----
  const downloadCompatibilityPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Blood Type Compatibility (RBC)", 14, 16);
    doc.setFontSize(10);
    doc.text("General guidance only — follow clinical protocols.", 14, 22);

    // General compatibility (preferred + alternatives)
    const generalBody = ALL_TYPES.map((t) => [
      t,
      RBC_COMPATIBILITY[t][0],
      RBC_COMPATIBILITY[t].slice(1).join(", ") || "—",
    ]);
    autoTable(doc, {
      head: [["Recipient Type", "Preferred (Exact)", "Safe Alternatives"]],
      body: generalBody,
      startY: 28,
      styles: { fontSize: 10 },
      columnStyles: { 2: { cellWidth: 120 } },
    });

    // Inventory-aware suggestions (uses current stock)
    const units = Object.fromEntries(rows.map(r => [r.bloodType, Number(r.units)||0]));
    const invBody = ALL_TYPES.map((t) => {
      const availableMatches = RBC_COMPATIBILITY[t]
        .filter(d => (units[d] || 0) > 0)
        .map(d => `${d} (${units[d]})`);
      return [
        t,
        units[t] || 0,
        availableMatches.length
          ? availableMatches.join(", ")
          : "No compatible units currently in stock",
      ];
    });
    autoTable(doc, {
      head: [["Recipient Type", "Exact Units Available", "Compatible Donor Units Available"]],
      body: invBody,
      startY: (doc.lastAutoTable?.finalY || 60) + 8,
      styles: { fontSize: 10 },
    });

    doc.save("blood_compatibility.pdf");
  };

  return (
    <div className="ci-wrap">
      {/* Header */}
      <header className="ci-header">
        <div>
          <div className="eyebrow">BECS • Research</div>
          <h1 className="title">Inventory (Read-only)</h1>
          <p className="sub">Totals by blood type. No personal donor data displayed.</p>
        </div>
        
      </header>

      {/* Metrics */}
      <section className="metrics">
        <div className="card kpi">
          <div className="kpi-label">Total Units</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Rare Units (AB−, B−, A−, O−)</div>
          <div className="kpi-value">{stats.rare}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Blood Types Tracked</div>
          <div className="kpi-value">{stats.tracked}</div>
        </div>
      </section>

      {err && <div className="alert error">{err}</div>}

      {/* Table */}
      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <Th>Blood Type</Th>
                <Th className="num">Units</Th>
                <Th>Last Update</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.bloodType}>
                  <Td>
                    <span className={`bt bt-${r.bloodType.replace("+","p").replace("-","n")}`}>
                      {r.bloodType}
                    </span>
                  </Td>
                  <Td className="num">{r.units}</Td>
                  <Td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</Td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <Td colSpan={3} style={{ opacity:.7, textAlign:"center", padding:14 }}>
                    No data
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Export cards (optional; nice CTA area) */}
      <section className="export-cards">
        <div className="export-card">
          <div className="export-title">Inventory PDF</div>
          <p className="export-desc">Units in stock by blood type with last update time, sorted by type.</p>
          <div className="export-cta">
            <button type="button" className="card-btn" onClick={downloadSummaryPDF}>Download</button>
          </div>
        </div>

        <div className="export-card">
          <div className="export-title">Compatibility PDF</div>
          <p className="export-desc">Preferred and safe alternative RBC types, plus what’s available right now.</p>
          <div className="export-cta">
            <button type="button" className="card-btn" onClick={downloadCompatibilityPDF}>Download</button>
          </div>
        </div>
      </section>

      {/* Scoped styles */}
      <style>{`
        .ci-wrap { max-width:1100px; margin:28px auto 48px; padding:0 16px; color:#e5e7eb; }

        .ci-header { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:end; }
        .eyebrow { color:#94a3b8; font-weight:600; font-size:.9rem; }
        .title { margin:4px 0 0; font-size:2rem; }
        .sub { margin:6px 0 0; color:#94a3b8; }
        .header-actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

        .btn {
          display:inline-flex; align-items:center; justify-content:center; gap:.45rem;
          padding:.55rem 1rem; border-radius:12px; border:1px solid #ef4444;
          background:#ef4444; color:#fff; font-weight:800; cursor:pointer;
          transition:transform .12s ease, filter .12s ease;
        }
        .btn:hover { transform: translateY(-1px); filter: brightness(1.03); }
        .btn-sm { padding:.4rem .75rem; font-size:.88rem; }
        .btn-primary { background:#ef4444; border-color:#ef4444; }
        .btn-outline { background:transparent; border-color:#334155; color:#cbd5e1; }
        .btn-outline:hover { background:#0f172a; }
        .btn-ghost { background:transparent; border-color:#334155; color:#cbd5e1; }
        .btn-ghost:hover { background:#0f172a; }
        .btn[aria-busy="true"] { opacity:.75; cursor:progress; }

        .metrics { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; margin:14px 0 16px; }
        .card { background:#0b1220; border:1px solid #1f2937; border-radius:16px; padding:14px; box-shadow:0 10px 28px rgba(0,0,0,.25); }
        .kpi-label { color:#9ca3af; font-size:.92rem; }
        .kpi-value { font-size:2rem; font-weight:800; letter-spacing:.2px; margin-top:2px; }

        .alert.error { background:#2f1111; border:1px solid #7f1d1d; color:#fca5a5; padding:.8rem 1rem; border-radius:12px; margin:.5rem 0 1rem; }

        .table-wrap { overflow-x:auto; }
        .table { width:100%; border-collapse:collapse; }
        thead th { text-align:left; color:#93c5fd; background:#0b1220; position:sticky; top:0; z-index:1; }
        th, td { padding:.8rem .9rem; border-bottom:1px solid #1f2937; }
        .num { text-align:right; }

        /* Type badge */
        .bt {
          display:inline-flex; align-items:center; justify-content:center;
          min-width:46px; padding:.2rem .5rem; border-radius:999px; font-weight:800;
          background:#0f172a; border:1px solid #243041;
        }
        .bt-On { /* O- */ background:linear-gradient(180deg,#111827,#0b1220); border-color:#374151; }
        .bt-Op { /* O+ */ background:linear-gradient(180deg,#141b2a,#0b1220); }
        .bt-An { /* A- */ background:linear-gradient(180deg,#151a2a,#0b1220); }
        .bt-Ap { /* A+ */ background:linear-gradient(180deg,#162035,#0b1220); }
        .bt-Bn { /* B- */ background:linear-gradient(180deg,#1a1731,#0b1220); }
        .bt-Bp { /* B+ */ background:linear-gradient(180deg,#1e1936,#0b1220); }
        .bt-ABn { /* AB- */ background:linear-gradient(180deg,#231a3a,#0b1220); }
        .bt-ABp { /* AB+ */ background:linear-gradient(180deg,#291c43,#0b1220); }

        .export-cards {
          display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; margin-top:16px;
        }
        .export-card { background:#0b1220; border:1px solid #1f2937; border-radius:14px; padding:14px; box-shadow:0 8px 24px rgba(0,0,0,.25); display:flex; flex-direction:column; gap:8px; }
        .export-title { font-weight:800; }
        .export-desc { color:#94a3b8; font-size:.92rem; line-height:1.3; }
        .card-btn { padding:.5rem .9rem; border-radius:10px; border:1px solid #334155; background:transparent; color:#e5e7eb; cursor:pointer; }
        .card-btn:hover { background:#0f172a; }

        @media (max-width: 980px) {
          .ci-header { grid-template-columns:1fr; }
          .metrics { grid-template-columns: 1fr; }
          .export-cards { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}

const Th = (p) => <th className={p.className || ""}>{p.children}</th>;
const Td = (p) => <td className={p.className || ""} {...(p.colSpan ? { colSpan: p.colSpan } : {})}>{p.children}</td>;
