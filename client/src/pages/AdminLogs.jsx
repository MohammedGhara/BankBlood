import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "../styles/form.css";
import "../styles/admin-logs.css";

/* ---- RBC compatibility constants ---- */
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

const ACTIONS = [
  "auth.register",
  "auth.login",
  "donation.create",
  "issue.ok",
  "issue.suggest",
  "emergency.ok",
  "emergency.empty",
];
const ENTITY_TYPES = ["User", "Donation", "Inventory"];

export default function AdminLogs() {
  // data
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [entityType, setEntityType] = useState("");
  const [since, setSince] = useState(""); // yyyy-mm-dd
  const [until, setUntil] = useState("");

  // inventory (for Inventory/Compatibility PDFs)
  const [invRows, setInvRows] = useState([]);

  async function load(p = 1) {
      setLoading(true);
      setErr("");
      try {
        const qs = buildQueryString({
          page: p,
          pageSize,
          action,
          actor,
          entityType,
          since,
          until,
        });

        // For debugging in DevTools, you can uncomment:
        // console.log("GET /admin/logs?" + qs);

        const { data } = await api.get(`/admin/logs?${qs}`);
        const arr = Array.isArray(data) ? data : data.items || [];
        setItems(arr);
        setTotal(Array.isArray(data) ? arr.length : data.total || arr.length);
        setPage(Array.isArray(data) ? p : data.page || p);
      } catch (e) {
        const msg = e.response
          ? `[${e.response.status}] ${e.response.data?.error || e.response.statusText}`
          : "Network error";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, []);

  // prefetch inventory once for PDFs
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/inventory/summary");
        setInvRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn("Failed to load inventory summary:", e?.message || e);
      }
    })();
  }, []);

  const totalPages = useMemo(
    () => Math.max(Math.ceil((total || 1) / pageSize), 1),
    [total, pageSize]
  );

  /* ---------- EXPORTS (functions) ---------- */
  function currentQueryParams() {
  return buildQueryString({
    page: 1,
    pageSize: 10000, // export "all"
    action,
    actor,
    entityType,
    since,
    until,
  });
}

  async function downloadPdf() {
    try {
      const { data } = await api.get(`/admin/logs?${currentQueryParams()}`);
      const rows = Array.isArray(data) ? data : (data.items || []);
      const body = rows.map((row) => {
        const d = row?.details || {};
        const requested  = d.requested || d.bloodType || row.entityId || "—";
        const issuedType = d.issuedType || "—";
        const units      = d.units ?? d.usedUnits ?? d.issued ?? "—";
        return [
          row.createdAt ? new Date(row.createdAt).toLocaleString() : "—",
          row.action || "—",
          row.actorEmail || "—",
          row.actorRole || "—",
          requested,
          issuedType,
          units,
        ];
      });

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(16);
      doc.text("BECS – Activity Logs", 40, 40);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleString(), 40, 58);

      autoTable(doc, {
        head: [["Time", "Action", "Email", "Role", "Requested", "Issued Type", "Units"]],
        body,
        startY: 80,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [30, 41, 59] },
        theme: "grid",
      });

      const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
      doc.save(`logs-${stamp}.pdf`);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || e.message || "Failed to export PDF");
    }
  }

  function downloadCsv() {
    const header = ["Time","Action","Email","Role","Requested","Issued Type","Units"];
    const lines = [header.join(",")];
    items.forEach(row => {
      const d = row?.details || {};
      const requested  = d.requested || d.bloodType || row.entityId || "—";
      const issuedType = d.issuedType || "—";
      const units      = d.units ?? d.usedUnits ?? d.issued ?? "—";
      const values = [
        row.createdAt ? new Date(row.createdAt).toLocaleString() : "—",
        row.action || "—",
        row.actorEmail || "—",
        row.actorRole || "—",
        requested,
        issuedType,
        units,
      ].map(v => String(v).replace(/"/g,'""'));
      lines.push(`"${values.join('","')}"`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const downloadInventorySummaryPDF = async () => {
    try {
      const data = invRows.length ? invRows : (await api.get("/inventory/summary")).data || [];
      const rows = Array.isArray(data) ? data : [];
      const sorted = [...rows].sort(
        (a, b) => ALL_TYPES.indexOf(a.bloodType) - ALL_TYPES.indexOf(b.bloodType)
      );

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Inventory Summary", 14, 16);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

      const body = sorted.map((r) => [
        r.bloodType,
        String(r.units ?? 0),
        new Date(r.updatedAt).toLocaleString(),
      ]);

      autoTable(doc, {
        head: [["Blood Type", "Units", "Last Update"]],
        body,
        startY: 32,
      });

      const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
      doc.save(`inventory-${stamp}.pdf`);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to export Inventory PDF");
    }
  };

  const downloadCompatibilityPDF = async () => {
    try {
      const data = invRows.length ? invRows : (await api.get("/inventory/summary")).data || [];
      const rows = Array.isArray(data) ? data : [];
      const units = Object.fromEntries(rows.map(r => [r.bloodType, Number(r.units)||0]));

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Blood Type Compatibility (RBC)", 14, 16);
      doc.setFontSize(10);
      doc.text("General guidance only — follow clinical protocols.", 14, 22);

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
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to export Compatibility PDF");
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="logs-wrap">
      <header className="logs-header">
        <div>
          <div className="logs-eyebrow">BECS • Admin</div>
          <h1 className="logs-title">Activity Logs</h1>
        </div>
        {/* moved buttons out of the header */}
      </header>

      {/* Toolbar */}
      <section className="logs-toolbar card">
        {/* ... toolbar content unchanged ... */}
        <div className="row">
          <div className="field">
            <label>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Entity Type</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="field grow">
            <label>Actor email</label>
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="field">
            <label>Since</label>
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>

          <div className="field">
            <label>Until</label>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
        </div>

        <div className="toolbar-buttons">

          <div className="chips">
            <Chip onClick={() => { setAction("donation.create"); setEntityType("Donation"); setActor(""); load(1); }}>
              Donations
            </Chip>
            <Chip onClick={() => { setAction("auth.login"); setEntityType("User"); setActor(""); load(1); }}>
              Logins
            </Chip>
            <Chip onClick={() => { setAction("issue.ok"); setEntityType("Inventory"); setActor(""); load(1); }}>
              Routine Issue
            </Chip>
            <Chip onClick={() => { setAction("emergency.ok"); setEntityType("Inventory"); setActor(""); load(1); }}>
              Emergency O−
            </Chip>
          </div>
          
        </div>
       <div className="toolbar-buttons">
        <button
          className="btn btn-primary btn-sm btn-pill"
          disabled={loading}
          onClick={() => load(1)}
        >
          Apply filters
        </button>

        <button
          className="btn btn-outline btn-sm btn-pill"
          onClick={() => {
            setAction(""); setActor(""); setEntityType(""); setSince(""); setUntil("");
            load(1);
          }}
        >
          Reset
        </button>
      </div>

      </section>

      {err && <div className="alert error" style={{ marginTop: 12 }}>{err}</div>}

      {/* Table */}
      <section className="card">
        <div className="table-wrap">
          <table className="logs-table">
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Action</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Requested</Th>
                <Th>Issued Type</Th>
                <Th className="num">Units</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const d = row?.details || {};
                const requested  = d.requested || d.bloodType || row.entityId || "—";
                const issuedType = d.issuedType || "—";
                const units      = d.units ?? d.usedUnits ?? d.issued ?? "—";
                return (
                  <tr key={row.id}>
                    <Td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</Td>
                    <Td><ActionBadge value={row.action} /></Td>
                    <Td>{row.actorEmail || "—"}</Td>
                    <Td>{row.actorRole || "—"}</Td>
                    <Td>{requested}</Td>
                    <Td>{issuedType}</Td>
                    <Td className="num">{units}</Td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <Td colSpan={7} style={{ opacity:.7, textAlign:"center", padding:16 }}>
                    No results
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paging */}
       <div className="pager">
          <button
            className="btn btn-outline btn-sm btn-pill prev"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
          >
            <span className="ico">←</span> Prev
          </button>

          <div className="count">
            Page <strong>{page}</strong> / {totalPages}
          </div>

          <button
            className="btn btn-primary btn-sm btn-pill next"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
          >
            Next <span className="ico">→</span>
          </button>
        </div>

      </section>

      {/* ---- EXPORT CARDS (below the table) ---- */}
      <section className="export-cards">
        <div className="export-card">
          <div className="export-title">Logs PDF</div>
          <p className="export-desc">Export the current filtered activity logs as a printable A4 PDF table.</p>
          <div className="export-cta">
            <button className="card-btn" onClick={downloadPdf}>Download PDF</button>
          </div>
        </div>

        <div className="export-card">
          <div className="export-title">Logs CSV</div>
          <p className="export-desc">Download the current filtered logs as CSV for spreadsheets or analysis.</p>
          <div className="export-cta">
            <button className="card-btn" onClick={downloadCsv}>Download CSV</button>
          </div>
        </div>

        <div className="export-card">
          <div className="export-title">Inventory PDF</div>
          <p className="export-desc">Units in stock by blood type with last update time, sorted by type.</p>
          <div className="export-cta">
            <button className="card-btn" onClick={downloadInventorySummaryPDF}>Inventory PDF</button>
          </div>
        </div>

        <div className="export-card">
          <div className="export-title">Compatibility PDF</div>
          <p className="export-desc">RBC compatibility matrix plus which compatible units you have right now.</p>
          <div className="export-cta">
            <button className="card-btn" onClick={downloadCompatibilityPDF}>Compatibility PDF</button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------- tiny presentational helpers ------- */
const Th = (p) => <th className={`th ${p.className || ""}`}>{p.children}</th>;
const Td = (p) => <td className="td" {...(p.colSpan ? { colSpan: p.colSpan } : {})}>{p.children}</td>;

function Chip({ onClick, children }) {
  return <button className="chip" onClick={onClick}>{children}</button>;
}
function ActionBadge({ value }) {
  const map = {
    "auth.login": "blue",
    "auth.register": "blue",
    "donation.create": "rose",
    "issue.ok": "emerald",
    "issue.suggest": "amber",
    "emergency.ok": "red",
    "emergency.empty": "slate",
  };
  const tone = map[value] || "slate";
  return <span className={`badge badge-${tone}`}>{value}</span>;
}
// ---- date & query helpers (robust parsing) ----
function parseDateInput(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {            // yyyy-mm-dd
    const [y,m,d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {           // dd/mm/yyyy (typed by hand)
    const [d,m,y] = s.split("/").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const dt = new Date(s);
  return isNaN(+dt) ? null : dt;
}

function toISOStartOfDay(s) {
  const dt = parseDateInput(s);
  if (!dt) return null;
  // already UTC; set to 00:00:00.000
  dt.setUTCHours(0, 0, 0, 0);
  return dt.toISOString();
}

function toISOEndOfDay(s) {
  const dt = parseDateInput(s);
  if (!dt) return null;
  // set to 23:59:59.999 UTC
  dt.setUTCHours(23, 59, 59, 999);
  return dt.toISOString();
}

function buildQueryString({ page, pageSize, action, actor, entityType, since, until }) {
  const q = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (action) q.set("action", action);
  if (entityType) q.set("entityType", entityType);

  const actorClean = (actor || "").trim();
  if (actorClean) {
    q.set("actor", actorClean);        // frontend name
    q.set("actorEmail", actorClean);   // backend alt, if used
  }

  const sinceISO = toISOStartOfDay(since);
  const untilISO = toISOEndOfDay(until);
  if (sinceISO) q.set("since", sinceISO);
  if (untilISO) q.set("until", untilISO);

  return q.toString();
}

