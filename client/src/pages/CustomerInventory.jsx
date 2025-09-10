// client/src/pages/CustomerInventory.jsx
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../api";

export default function CustomerInventory() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/inventory/summary");
        setRows(data || []);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message);
      }
    })();
  }, []);

  // ---- derived stats for the cards ----
  const stats = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + (Number(r.units) || 0), 0);
    const rareSet = new Set(["AB-", "B-", "A-", "O-"]);
    const rare = rows
      .filter((r) => rareSet.has(r.bloodType))
      .reduce((s, r) => s + (Number(r.units) || 0), 0);
    const tracked = rows.length;
    return { total, rare, tracked };
  }, [rows]);

  // ---- inventory summary PDF (your existing one) ----
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
      new Date(r.updatedAt).toLocaleString(),
    ]);
    autoTable(doc, {
      head: [["Blood Type", "Units", "Last Update"]],
      body,
      startY: 58,
    });

    doc.save("inventory_summary.pdf");
  };

  // ---- RBC compatibility mapping (preferred first, then alternatives) ----
  const ALL_TYPES = ["O-","O+","A-","A+","B-","B+","AB-","AB+"];
  const RBC_COMPATIBILITY = {
    "O-":  ["O-"],
    "O+":  ["O+","O-"],
    "A-":  ["A-","O-"],
    "A+":  ["A+","A-","O+","O-"],
    "B-":  ["B-","O-"],
    "B+":  ["B+","B-","O+","O-"],
    "AB-": ["AB-","A-","B-","O-"],
    "AB+": ["AB+","AB-","A+","A-","B+","B-","O+","O-"], // universal recipient
  };

  // ---- compatibility PDF (what each type can take instead) ----
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
        units[t] || 0,                                   // exact units available
        availableMatches.length
          ? availableMatches.join(", ")
          : "No compatible units currently in stock",
      ];
    });
    autoTable(doc, {
      head: [["Recipient Type", "Exact Units Available", "Compatible Donor Units Available"]],
      body: invBody,
      startY: doc.lastAutoTable.finalY + 8,
      styles: { fontSize: 10 },
    });

    doc.save("blood_compatibility.pdf");
  };

  return (
    <div className="wrap">
      <div className="header">
        <div>
          <h1>Inventory (Read-only)</h1>
          <p>Totals by blood type. No personal data shown.</p>
        </div>

        {/* small buttons on the right */}
        <div className="header-actions">
          <button onClick={downloadSummaryPDF} className="btn">Summary PDF</button>
          <button onClick={downloadCompatibilityPDF} className="btn">Compatibility PDF</button>
        </div>
      </div>

      {/* metric cards */}
      <div className="metrics">
        <div className="card">
          <div className="label">Total Units</div>
          <div className="value">{stats.total}</div>
        </div>
        <div className="card">
          <div className="label">Rare Units (AB-, B-, A-, O-)</div>
          <div className="value">{stats.rare}</div>
        </div>
        <div className="card">
          <div className="label">Blood Types Tracked</div>
          <div className="value">{stats.tracked}</div>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* table */}
      <div className="card tableCard">
        <table className="table">
          <thead>
            <tr>
              <th>Blood Type</th>
              <th>Units</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.bloodType}>
                <td>{r.bloodType}</td>
                <td>{r.units}</td>
                <td>{new Date(r.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .wrap { max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }
        .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 1rem; gap: 1rem; }
        h1 { margin: 0; font-size: 1.8rem; }
        p { margin: .25rem 0 0; color: #8892a6; }

        /* small buttons that don't stretch full width */
        .header-actions { display:flex; gap:.5rem; }
        .header-actions .btn {
          display: inline-flex !important;
          width: auto !important;
          padding: .35rem .7rem;
          font-size: .85rem;
          line-height: 1.1;
          border-radius: 8px;
          border: none;
          background: #ef4444;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }
        .header-actions .btn:hover { filter: brightness(1.05); }

        .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0 1.25rem; }
        .card { background: #111827; border-radius: 14px; padding: 1rem 1.2rem; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
        .label { color: #cbd5e1; font-size: .95rem; margin-bottom: .4rem; }
        .value { font-size: 2rem; font-weight: 800; letter-spacing: .3px; color: #e5f1ff; }
        .tableCard { padding: 0; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        th, td { padding: .9rem 1rem; border-bottom: 1px solid #1f2937; }
        th { text-align: left; color: #93c5fd; background:#0b1220; }
        td { color: #e2e8f0; }
        .error { background: #fee2e2; color: #991b1b; padding: .75rem; border-radius: 10px; margin: 1rem 0; }
        @media (max-width: 900px) {
          .metrics { grid-template-columns: 1fr; }
          .header { flex-direction: column; align-items: flex-start; gap: .75rem; }
        }
      `}</style>
    </div>
  );
}
