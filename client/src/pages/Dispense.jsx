// client/src/pages/Dispense.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "../styles/form.css";

const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function Dispense() {
  const [bloodType, setBloodType] = useState("A+");
  const [units, setUnits] = useState(1);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);
  const [alternatives, setAlternatives] = useState([]);

  // inventory preview
  const [inventory, setInventory] = useState([]);
  async function refreshInv() {
    const r = await api.get("/inventory");
    setInventory(Array.isArray(r.data) ? r.data : []);
  }
  useEffect(() => { refreshInv(); }, []);

  // quick stats for header
  const stats = useMemo(() => {
    const total = inventory.reduce((s, r)=> s + (Number(r.units)||0), 0);
    const tracked = inventory.length || 8;
    const selectedUnits = inventory.find(r=>r.bloodType===bloodType)?.units ?? 0;
    return { total, tracked, selectedUnits: Number(selectedUnits)||0 };
  }, [inventory, bloodType]);

  // sanitize units: integer 1..999
  function onUnitsChange(v) {
    const n = String(v).replace(/[^\d]/g, "").slice(0,3);
    setUnits(Math.max(1, Number(n || 1)));
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk(""); setAlternatives([]);

    if (!bloodType) {
      setErr("נא לבחור סוג דם.");
      return;
    }
    if (!Number.isFinite(units) || units < 1) {
      setErr("מספר המנות חייב להיות מספר שלם חיובי.");
      return;
    }

    setSending(true);
    try {
      const { data } = await api.post("/issue", { bloodType, units: Number(units) });
      setOk(`נופקו ${data.used.units} מנות מסוג ${data.used.type} ✓`);
      await refreshInv();
    } catch (e) {
      if (e.response && e.response.status === 409 && e.response.data?.needAlternative) {
        setAlternatives(e.response.data.alternatives || []);
        setErr(e.response.data.message || "אין מלאי מספיק.");
      } else {
        const msg = e.response
          ? `[${e.response.status}] ${e.response.data?.error || e.response.statusText}`
          : "Network error";
        setErr(msg);
      }
    } finally {
      setSending(false);
    }
  }

  async function acceptAlternative(type) {
    setErr(""); setOk("");
    setSending(true);
    try {
      const { data } = await api.post("/issue", {
        bloodType: type,
        units: Number(units),
        originalRequested: bloodType,
      });
      setOk(`נופקו ${data.used.units} מנות מסוג ${data.used.type} ✓`);
      setAlternatives([]);
      await refreshInv();
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
    <div className="disp-wrap" dir="rtl">
      {/* Header */}
      <header className="disp-header">
        <div>
          <div className="eyebrow">מערכת ניהול מנות דם</div>
          <h1 className="title">ניפוק מנות דם</h1>
          <p className="sub">בחר סוג דם ומספר מנות. אם אין מלאי – נציע חלופות בטוחות לפי פרוטוקול.</p>
        </div>

        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">סה״כ מלאי</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">סוגים מנוטרים</div>
            <div className="stat-value">{stats.tracked}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">זמין מסוג נבחר</div>
            <div className="stat-value">{stats.selectedUnits}</div>
          </div>
        </div>
      </header>

      {/* Messages */}
      {err && <div className="alert error">{err}</div>}
      {ok  && <div className="alert ok">{ok}</div>}

      {/* Form card */}
      <section className="card">
        <form className="disp-form" onSubmit={submit} noValidate>
          <div className="row">
            <div className="field">
              <label>סוג דם מבוקש</label>
              <div className="input-wrap">
                <select value={bloodType} onChange={(e)=>setBloodType(e.target.value)}>
                  {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>מס' מנות</label>
              <div className="input-wrap">
                <input
                  type="text"
                  inputMode="numeric"
                  value={units}
                  onChange={(e)=>onUnitsChange(e.target.value)}
                  placeholder="1"
                  aria-label="מספר מנות"
                />
                <span className="adorn">יח׳</span>
              </div>
              <small className="note">ערך שלם בין 1 ל־999</small>
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={sending}>
              {sending ? "מנפק..." : "נפק מנות"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={()=>{
                setErr(""); setOk(""); setAlternatives([]);
                setBloodType("A+"); setUnits(1);
              }}
            >
              נקה טופס
            </button>
          </div>
        </form>
      </section>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <>
          <h2 className="section-title">הצעות חלופיות</h2>
          <p className="sub">מסודר לפי התאמה ושכיחות, ולאחר מכן לפי זמינות במלאי.</p>
          <section className="alt-grid">
            {alternatives.map((alt) => {
              const insufficient = (alt.available ?? 0) < Number(units);
              return (
                <div key={alt.type} className="alt-card">
                  <div className="alt-head">
                    <div className="badge">{alt.type}</div>
                    <div className="muted">זמין: {alt.available ?? 0}</div>
                  </div>
                  <div className="alt-units">{alt.available ?? 0}</div>
                  <div className="meter"><div className="fill" style={{width: `${Math.min(100, (Number(alt.available)||0) * 10)}%`}}/></div>

                  <button
                    className={`btn ${insufficient ? "btn-disabled" : "btn-outline"}`}
                    disabled={insufficient || sending}
                    onClick={() => acceptAlternative(alt.type)}
                  >
                    {insufficient ? "אין מספיק מלאי" : `נפק ${units} × ${alt.type}`}
                  </button>
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* Inventory */}
      <h2 className="section-title">מלאי נוכחי</h2>
      <section className="inv-grid">
        {inventory.map(row => (
          <div key={row.bloodType} className="inv-card">
            <div className="inv-head">
              <div className="badge">{row.bloodType}</div>
              <div className="muted">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</div>
            </div>
            <div className="inv-units">{row.units}</div>
            <div className="meter">
              <div className="fill" style={{ width: `${Math.min(100, (Number(row.units)||0) * 10)}%` }} />
            </div>
          </div>
        ))}
        {inventory.length === 0 && (
          <div className="inv-empty">אין רשומות כרגע</div>
        )}
      </section>

      {/* Scoped styles */}
      <style>{`
        .disp-wrap { max-width: 1100px; margin: 24px auto 48px; padding: 0 16px; color:#e5e7eb; }

        /* Header */
        .disp-header {
          display:grid; grid-template-columns: 1fr auto; gap:16px; align-items:end; margin-bottom:16px;
        }
        .eyebrow { color:#94a3b8; font-weight:600; font-size:.9rem; }
        .title { margin:4px 0 0; font-size:2rem; }
        .sub { margin:6px 0 0; color:#94a3b8; }
        .stats { display:grid; grid-auto-flow:column; gap:10px; }
        .stat-card {
          background:#0b1220; border:1px solid #1f2937; border-radius:12px;
          padding:10px 14px; min-width:130px; text-align:center; box-shadow:0 8px 24px rgba(0,0,0,.25);
        }
        .stat-label { color:#9ca3af; font-size:.85rem; }
        .stat-value { font-size:1.6rem; font-weight:800; }

        /* Alerts */
        .alert { border-radius:12px; padding:.8rem 1rem; margin:8px 0 14px; font-weight:600; }
        .alert.ok { background:#052e1a; color:#86efac; border:1px solid #14532d; }
        .alert.error { background:#2f1111; color:#fca5a5; border:1px solid #7f1d1d; }

        /* Card + form */
        .card {
          background:#0b1220ee; border:1px solid #1f2937; border-radius:16px;
          padding:16px 16px 12px; box-shadow:0 12px 32px rgba(0,0,0,.35);
        }
        .disp-form { display:grid; gap:12px; }
        .row { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
        .field label { display:inline-block; margin-bottom:6px; color:#cbd5e1; font-size:.95rem; font-weight:700; }
        .input-wrap {
          position:relative; background:#0a0f1b; border:1px solid #1f2937; border-radius:12px;
          display:flex; align-items:center; padding:2px 2px 2px 10px;
        }
        .input-wrap:focus-within { border-color:#334155; box-shadow:0 0 0 3px rgba(59,130,246,.15); }
        input, select {
          width:100%; padding:.6rem .75rem; border:none; outline:none; background:transparent;
          color:#e5e7eb; font-size:1rem; border-radius:10px; direction:rtl;
        }
        .adorn {
          position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#9ca3af; font-size:.9rem;
        }
        .note { color:#94a3b8; margin-top:4px; font-size:.85rem; }

        .actions { display:flex; gap:8px; justify-content:flex-start; margin-top:6px; }

        /* Buttons */
        .btn {
          display:inline-flex; align-items:center; justify-content:center; gap:.45rem;
          padding:.55rem 1rem; border-radius:12px; border:1px solid transparent;
          font-weight:800; cursor:pointer; transition:transform .15s ease, filter .2s ease, box-shadow .2s ease;
        }
        .btn:disabled, .btn.btn-disabled { opacity:.6; cursor:not-allowed; }
        .btn-primary {
          background:linear-gradient(180deg, #f87171 0%, #ef4444 100%); color:#fff; border-color:#b91c1c;
          box-shadow:0 6px 16px rgba(239,68,68,.35), inset 0 -2px 0 rgba(0,0,0,.10);
        }
        .btn-primary:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.04); }
        .btn-ghost { background:transparent; color:#fca5a5; border:1px solid #ef4444; }
        .btn-ghost:hover { background:rgba(239,68,68,.10); }
        .btn-outline { background:transparent; color:#e5e7eb; border:1px solid #334155; }
        .btn-outline:hover { background:#0f172a; }

        /* Alternatives */
        .section-title { margin:22px 0 10px; font-size:1.25rem; color:#cbd5e1; }
        .alt-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:12px; }
        .alt-card {
          background:#0b1220; border:1px solid #1f2937; border-radius:14px; padding:12px;
          box-shadow:0 8px 24px rgba(0,0,0,.25);
        }
        .alt-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:8px; }
        .badge { font-weight:800; padding:.25rem .5rem; border-radius:9999px; font-size:.9rem; background:#111827; border:1px solid #1f2937; color:#e5e7eb; }
        .muted { font-size:.8rem; color:#9ca3af; opacity:.9; }
        .alt-units { font-size:1.6rem; font-weight:900; color:#e5f1ff; margin-bottom:8px; }
        .meter { height:8px; background:#0f172a; border-radius:9999px; overflow:hidden; border:1px solid #1f2937; }
        .fill { height:100%; background: linear-gradient(90deg, #60a5fa, #34d399); }

        /* Inventory */
        .inv-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:12px; margin-top:8px; }
        .inv-card { background:#0b1220; border:1px solid #1f2937; border-radius:14px; padding:12px; box-shadow:0 8px 24px rgba(0,0,0,.25); }
        .inv-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
        .inv-units { font-size:2rem; font-weight:900; color:#e5f1ff; margin-bottom:8px; }
        .inv-empty { grid-column:1/-1; text-align:center; opacity:.7; padding:16px; background:#0b1220; border:1px dashed #1f2937; border-radius:12px; }

        /* Responsive */
        @media (max-width: 900px) {
          .disp-header { grid-template-columns:1fr; gap:8px; }
          .stats { grid-auto-flow:row; grid-template-columns:repeat(3,1fr); }
          .row { grid-template-columns:1fr; }
          .alt-grid, .inv-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 520px) {
          .stats { grid-template-columns: repeat(2,1fr); }
          .alt-grid, .inv-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
