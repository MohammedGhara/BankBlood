// client/src/pages/Donations.jsx
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/form.css"; // you can keep it—our styles are scoped below

const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function Donations() {
  const [bloodType, setBloodType] = useState("A+");
  const [donatedAt, setDonatedAt] = useState(() =>
    new Date().toISOString().slice(0,16) // yyyy-MM-ddTHH:mm
  );
  const [donorId, setDonorId] = useState("");
  const [donorName, setDonorName] = useState("");

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);

  // Inventory preview
  const [inventory, setInventory] = useState([]);
  useEffect(() => { api.get("/inventory").then(r => setInventory(r.data||[])); }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk("");

    // nice custom check for 9 digits
    if (!/^\d{9}$/.test(donorId.trim())) {
      setErr("מספר ת״ז חייב להיות בדיוק 9 ספרות.");
      return;
    }
    if (!donorName.trim()) {
      setErr("נא למלא שם מלא.");
      return;
    }

    setSending(true);
    try {
      const body = {
        donorId: donorId.trim(),
        donorName: donorName.trim(),
        bloodType,
        donatedAt: new Date(donatedAt).toISOString(),
      };
      await api.post("/donations", body);
      setOk("התרומה נשמרה והמלאי עודכן ✓");

      setDonorId("");
      setDonorName("");

      const inv = await api.get("/inventory");
      setInventory(inv.data || []);
    } catch (e) {
      const msg = e.response
        ? `[${e.response.status}] ${e.response.data?.error || e.response.statusText}`
        : "Network error";
      setErr(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="don-wrap" dir="rtl">
      {/* Header */}
      <header className="don-header">
        <div>
          <div className="don-eyebrow">מערכת ניהול מנות דם</div>
          <h1 className="don-title">קליטת מנות דם</h1>
          <p className="don-sub">בחר סוג דם, הזן תאריך, מספר ת״ז ושם מלא של התורם.</p>
        </div>

        {/* Quick glance stats (optional) */}
        <div className="don-stats">
          <div className="stat-card">
            <div className="stat-label">סוגים מנוטרים</div>
            <div className="stat-value">{inventory.length || 8}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">סה״כ מנות</div>
            <div className="stat-value">
              {inventory.reduce((s, r)=> s + (Number(r.units)||0), 0)}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      {err && <div className="don-alert error">{err}</div>}
      {ok  && <div className="don-alert ok">{ok}</div>}

      {/* Form card */}
      <section className="don-card">
        <form className="don-form" onSubmit={submit} noValidate>
          <div className="don-row">
            <div className="don-field">
              <label>סוג דם</label>
              <div className="input-wrap">
                <select value={bloodType} onChange={(e)=>setBloodType(e.target.value)}>
                  {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="don-field">
              <label>תאריך התרומה</label>
              <div className="input-wrap">
                <input
                  type="datetime-local"
                  value={donatedAt}
                  onChange={(e)=>setDonatedAt(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="don-row">
            <div className="don-field">
              <label>מס' ת"ז תורם</label>
              <div className="input-wrap">
                <input
                  type="text"
                  value={donorId}
                  onChange={(e) => setDonorId(e.target.value.replace(/\D/g,"").slice(0,9))}
                  placeholder="123456789"
                  required
                  pattern="\d{9}"
                  maxLength={9}
                  inputMode="numeric"
                  title="מספר ת״ז חייב להיות 9 ספרות"
                />
                <span className={`hint ${donorId.length === 9 ? "ok" : ""}`}>
                  {donorId.length}/9
                </span>
              </div>
            </div>

            <div className="don-field">
              <label>שם מלא</label>
              <div className="input-wrap">
                <input
                  value={donorName}
                  onChange={(e)=>setDonorName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  required
                />
              </div>
            </div>
          </div>

          <div className="don-actions">
            <button className="btn btn-primary" type="submit" disabled={sending}>
              {sending ? "שומר..." : "שמור תרומה"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={()=>{
                setErr(""); setOk("");
                setBloodType("A+");
                setDonatedAt(new Date().toISOString().slice(0,16));
                setDonorId(""); setDonorName("");
              }}
            >
              נקה טופס
            </button>
          </div>
        </form>
      </section>

      {/* Inventory */}
      <h2 className="don-section-title">מלאי לפי סוג דם</h2>
      <section className="don-grid">
        {inventory.map(row => (
          <div key={row.bloodType} className="inv-card">
            <div className="inv-row">
              <div className={`badge bt-${row.bloodType.replace('+','p').replace('-','n')}`}>
                {row.bloodType}
              </div>
              <div className="inv-updated">
                {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}
              </div>
            </div>
            <div className="inv-units">{row.units}</div>
            <div className="inv-meter">
              <div
                className="inv-fill"
                style={{ width: `${Math.min(100, (Number(row.units)||0) * 10)}%` }}
              />
            </div>
          </div>
        ))}
        {inventory.length === 0 && (
          <div className="inv-empty">אין רשומות כרגע</div>
        )}
      </section>

      {/* Scoped styles */}
      <style>{`
        .don-wrap { max-width: 1100px; margin: 24px auto 48px; padding: 0 16px; color: #e5e7eb; }

        /* Header */
        .don-header {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: end;
          margin-bottom: 16px;
        }
        .don-eyebrow { color: #94a3b8; font-weight: 600; font-size: .9rem; }
        .don-title { margin: 4px 0 0; font-size: 2rem; }
        .don-sub   { margin: 6px 0 0; color: #94a3b8; }
        .don-stats { display: grid; grid-auto-flow: column; gap: 10px; }
        .stat-card {
          background: #0b1220; border: 1px solid #1f2937;
          border-radius: 12px; padding: 10px 14px; min-width: 130px;
          text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,.25);
        }
        .stat-label { color: #9ca3af; font-size: .85rem; }
        .stat-value { font-size: 1.6rem; font-weight: 800; }

        /* Alerts */
        .don-alert {
          border-radius: 12px; padding: .8rem 1rem; margin: 8px 0 14px;
          font-weight: 600;
        }
        .don-alert.ok {
          background: #052e1a; color: #86efac; border: 1px solid #14532d;
        }
        .don-alert.error {
          background: #2f1111; color: #fca5a5; border: 1px solid #7f1d1d;
        }

        /* Card + form */
        .don-card {
          background: #0b1220ee;
          border: 1px solid #1f2937;
          border-radius: 16px;
          padding: 16px 16px 12px;
          box-shadow: 0 12px 32px rgba(0,0,0,.35);
        }

        .don-form { display: grid; gap: 12px; }
        .don-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .don-field label {
          display: inline-block;
          margin-bottom: 6px;
          color: #cbd5e1;
          font-size: .95rem;
          font-weight: 700;
        }
        .input-wrap {
          position: relative;
          background: #0a0f1b;
          border: 1px solid #1f2937;
          border-radius: 12px;
          display: flex; align-items: center;
          padding: 2px 2px 2px 10px;
        }
        .input-wrap:focus-within { border-color: #334155; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
        input, select {
          width: 100%;
          padding: .6rem .75rem;
          border: none; outline: none; background: transparent;
          color: #e5e7eb; font-size: 1rem; border-radius: 10px;
          direction: rtl;
        }
        .hint {
          position: absolute;
          left: 10px; /* because dir=rtl, "left" is visually end */
          top: 50%; transform: translateY(-50%);
          font-size: .8rem; color: #94a3b8; opacity: .8;
        }
        .hint.ok { color: #86efac; opacity: 1; }

        .don-actions { display: flex; gap: 8px; justify-content: flex-start; margin-top: 6px; }

        /* Buttons */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: .45rem;
          padding: .55rem 1rem; border-radius: 12px; border: 1px solid transparent;
          font-weight: 800; cursor: pointer; transition: transform .15s ease, filter .2s ease, box-shadow .2s ease;
        }
        .btn:disabled { opacity: .6; cursor: not-allowed; }
        .btn-primary {
          background: linear-gradient(180deg, #f87171 0%, #ef4444 100%);
          color: #fff; border-color: #b91c1c;
          box-shadow: 0 6px 16px rgba(239,68,68,.35), inset 0 -2px 0 rgba(0,0,0,.10);
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
        .btn-ghost {
          background: transparent; color: #fca5a5; border-color: #ef4444;
          border: 1px solid #ef4444;
        }
        .btn-ghost:hover { background: rgba(239,68,68,.10); }

        /* Inventory grid */
        .don-section-title { margin: 22px 0 10px; font-size: 1.25rem; color: #cbd5e1; }
        .don-grid {
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 12px;
        }
        .inv-card {
          background: #0b1220; border: 1px solid #1f2937; border-radius: 14px;
          padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
        }
        .inv-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .badge {
          font-weight: 800; padding: .25rem .5rem; border-radius: 9999px; font-size: .9rem;
          background: #111827; border: 1px solid #1f2937; color: #e5e7eb;
        }
        .inv-updated { font-size: .8rem; color: #9ca3af; opacity: .9; }
        .inv-units { font-size: 2rem; font-weight: 900; color: #e5f1ff; margin-bottom: 8px; }
        .inv-meter { height: 8px; background: #0f172a; border-radius: 9999px; overflow: hidden; border:1px solid #1f2937; }
        .inv-fill { height: 100%; background: linear-gradient(90deg, #60a5fa, #34d399); }

        .inv-empty {
          grid-column: 1 / -1; text-align: center; opacity: .7; padding: 16px;
          background: #0b1220; border: 1px dashed #1f2937; border-radius: 12px;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .don-header { grid-template-columns: 1fr; gap: 8px; }
          .don-stats { grid-auto-flow: row; grid-template-columns: repeat(2,1fr); }
          .don-row { grid-template-columns: 1fr; }
          .don-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 520px) {
          .don-grid { grid-template-columns: 1fr; }
        }

        /* Blood-type color accents (optional subtle borders) */
        .bt-Op, .bt-On, .bt-Ap, .bt-An, .bt-Bp, .bt-Bn, .bt-ABp, .bt-ABn { border: 1px solid #243244; }
      `}</style>
    </div>
  );
}
