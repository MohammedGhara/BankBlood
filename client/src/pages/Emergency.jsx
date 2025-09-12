// client/src/pages/Emergency.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../api";
import "../styles/form.css";

export default function Emergency() {
  const [oNegUnits, setONegUnits] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requireConfirm, setRequireConfirm] = useState(true);

  // robust refresh with loading + errors surfaced
  const refresh = useCallback(async () => {
    try {
      setErr("");
      setRefreshing(true);
      const { data } = await api.get("/inventory");
      const arr = Array.isArray(data) ? data : [];
      const row = arr.find((r) => r.bloodType === "O-");
      setONegUnits(Number(row?.units || 0));
      setLastUpdated(row?.updatedAt || null);
      setOk("המלאי עודכן ✓");
      setTimeout(() => setOk(""), 1200);
    } catch (e) {
      const msg = e.response
        ? e.response.data?.error || `[${e.response.status}] ${e.response.statusText}`
        : "Network error";
      setErr(msg);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const meterPct = useMemo(
    () => Math.min(100, (Number(oNegUnits) || 0) * 10),
    [oNegUnits]
  );

  async function drain() {
    setErr("");
    setOk("");

    if (requireConfirm) {
      const agreed = window.confirm("לאשר ניפוק מיידי של כל מנות O− הזמינות?");
      if (!agreed) return;
    }

    setSending(true);
    try {
      const { data } = await api.post("/emergency");
      setOk(`נופקו ${data.issued} מנות O− בהצלחה ✓`);
      await refresh();
    } catch (e) {
      const msg = e.response
        ? e.response.data?.message ||
          e.response.data?.error ||
          `[${e.response.status}] ${e.response.statusText}`
        : "Network error";
      setErr(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="em-wrap" dir="rtl">
      {/* Header */}
      <header className="em-header">
        <div>
          <div className="eyebrow">מצב חירום (אר״ן)</div>
          <h1 className="title">ניפוק מיידי – O−</h1>
          <p className="sub">
            פעולה זו תנפק את <strong>כל</strong> מנות ה־O− הזמינות. שימוש במקרי חירום בלבד.
          </p>
        </div>

        <div className="stats">
          <div className="stat-card danger">
            <div className="stat-label">O− זמין</div>
            <div className="stat-value">{oNegUnits}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">עודכן לאחרונה</div>
            <div className="stat-value sm">
              {lastUpdated ? new Date(lastUpdated).toLocaleString() : "—"}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={refresh}
            disabled={sending || refreshing}
            aria-busy={refreshing ? "true" : "false"}
          >
            {refreshing ? "מרענן…" : "רענן"}
          </button>
        </div>
      </header>

      {/* Alerts */}
      <div className="em-alert warn">
        ⚠️ ניפוק O− הוא צעד קיצוני. ודא/י שהפרוטוקול מחייב פעולה זו.
      </div>
      {err && <div className="em-alert error">{err}</div>}
      {ok && <div className="em-alert ok">{ok}</div>}

      {/* Card */}
      <section className="card">
        <div className="info-row">
          <div className="meter-wrap">
            <div className="meter">
              <div className="fill" style={{ width: `${meterPct}%` }} />
            </div>
            <div className="meter-caption">
              אמידה חזותית של מלאי O− (10% לכל יחידה)
            </div>
          </div>

          <label className="confirm">
            <input
              type="checkbox"
              checked={requireConfirm}
              onChange={(e) => setRequireConfirm(e.target.checked)}
            />
            דרוש אישור לפני ניפוק
          </label>
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={drain}
            disabled={sending || oNegUnits <= 0}
            title={oNegUnits <= 0 ? "אין מנות O− זמינות" : "ניפוק כל ה־O−"}
          >
            {sending ? "מנפק..." : `ניפוק מיידי של כל ${oNegUnits} מנות O−`}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={refresh}
            disabled={sending || refreshing}
            aria-busy={refreshing ? "true" : "false"}
          >
            {refreshing ? "מרענן…" : "בדיקת מלאי מחדש"}
          </button>
        </div>
      </section>

      {/* Scoped styles */}
      <style>{`
        .em-wrap { max-width: 900px; margin: 24px auto 48px; padding: 0 16px; color:#e5e7eb; }

        .em-header {
          display:grid; grid-template-columns: 1fr auto; gap:16px; align-items:end; margin-bottom:12px;
        }
        .eyebrow { color:#94a3b8; font-weight:600; font-size:.9rem; }
        .title { margin:4px 0 0; font-size:2rem; }
        .sub { margin:6px 0 0; color:#94a3b8; }
        .stats { display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
        .stat-card {
          background:#0b1220; border:1px solid #1f2937; border-radius:12px;
          padding:10px 14px; min-width:140px; text-align:center; box-shadow:0 8px 24px rgba(0,0,0,.25);
        }
        .stat-card.danger { border-color:#7f1d1d; background:linear-gradient(180deg,#1a0f12,#0b1220); }
        .stat-label { color:#9ca3af; font-size:.85rem; }
        .stat-value { font-size:1.8rem; font-weight:800; }
        .stat-value.sm { font-size:1rem; font-weight:700; }

        .em-alert {
          border-radius:12px; padding:.8rem 1rem; margin:8px 0;
          font-weight:600; border:1px solid transparent;
        }
        .em-alert.warn  { background:#111827; border-color:#374151; color:#eab308; }
        .em-alert.ok    { background:#052e1a; border-color:#14532d; color:#86efac; }
        .em-alert.error { background:#2f1111; border-color:#7f1d1d; color:#fca5a5; }

        .card {
          background:#0b1220ee; border:1px solid #1f2937; border-radius:16px;
          padding:16px; box-shadow:0 12px 32px rgba(0,0,0,.35);
        }

        .info-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .meter-wrap { flex: 1 1 420px; }
        .meter { height:10px; background:#0f172a; border:1px solid #1f2937; border-radius:9999px; overflow:hidden; }
        .fill { height:100%; background: linear-gradient(90deg,#f43f5e,#f97316,#fde047); }
        .meter-caption { color:#9ca3af; font-size:.85rem; margin-top:6px; }

        .confirm { color:#cbd5e1; font-size:.95rem; display:flex; align-items:center; gap:8px; white-space:nowrap; }

        .actions { display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }

        .btn {
          display:inline-flex; align-items:center; justify-content:center; gap:.45rem;
          padding:.6rem 1rem; border-radius:12px; border:1px solid transparent;
          font-weight:800; cursor:pointer; transition:transform .15s ease, filter .2s ease, box-shadow .2s ease;
        }
        .btn:disabled { opacity:.6; cursor:not-allowed; }
        .btn[aria-busy="true"] { opacity:.75; cursor:progress; }
        .btn-ghost { background:transparent; color:#cbd5e1; border:1px solid #334155; }
        .btn-ghost:hover { background:#0f172a; }
        .btn-danger {
          background: linear-gradient(180deg,#ef4444 0%,#b91c1c 100%); color:#fff; border-color:#7f1d1d;
          box-shadow:0 6px 16px rgba(239,68,68,.35), inset 0 -2px 0 rgba(0,0,0,.10);
        }
        .btn-danger:hover:not(:disabled) { transform: translateY(-1px); filter:brightness(1.04); }

        @media (max-width: 720px) {
          .em-header { grid-template-columns:1fr; gap:8px; }
          .stats { justify-content:flex-start; }
        }
      `}</style>
    </div>
  );
}
