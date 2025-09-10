// client/src/pages/AdminLogs.jsx
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "../styles/form.css";
import "../styles/admin-logs.css"; // ⬅️ add this line

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

  async function load(p = 1) {
    setLoading(true);
    setErr("");
    try {
      const q = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
        ...(action ? { action } : {}),
        ...(actor ? { actor } : {}),
        ...(entityType ? { entityType } : {}),
        ...(since ? { since: new Date(since).toISOString() } : {}),
        ...(until ? { until: new Date(until).toISOString() } : {}),
      });
      const { data } = await api.get(`/admin/logs?${q.toString()}`);
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

  const totalPages = useMemo(
    () => Math.max(Math.ceil((total || 1) / pageSize), 1),
    [total, pageSize]
  );

  /* ---------- EXPORTS ---------- */
  function currentQueryParams() {
    const q = new URLSearchParams({
      page: "1",
      pageSize: "10000", // export "all"
      ...(action ? { action } : {}),
      ...(actor ? { actor } : {}),
      ...(entityType ? { entityType } : {}),
      ...(since ? { since: new Date(since).toISOString() } : {}),
      ...(until ? { until: new Date(until).toISOString() } : {}),
    });
    return q.toString();
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
    // simple, dependency-free CSV
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

  /* ---------- RENDER ---------- */
  return (
    <div className="logs-wrap">
      <header className="logs-header">
        <div>
          <div className="logs-eyebrow">BECS • Admin</div>
          <h1 className="logs-title">Activity Logs</h1>
        </div>

        <div className="logs-actions">
          <button className="btn" onClick={downloadPdf}>Download PDF</button>
          <button className="btn" onClick={downloadCsv}>Download CSV</button>
        </div>
      </header>

      {/* Toolbar */}
      <section className="logs-toolbar card">
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
          <button className="btn primary" disabled={loading} onClick={() => load(1)}>
            {loading ? "Loading…" : "Apply filters"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setAction(""); setActor(""); setEntityType(""); setSince(""); setUntil(""); load(1);
            }}
          >
            Reset
          </button>

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
          <button className="btn" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</button>
          <div>Page {page} / {totalPages}</div>
          <button className="btn" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</button>
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
