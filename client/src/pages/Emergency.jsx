// client/src/pages/Emergency.jsx
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/form.css";

export default function Emergency() {
  const [oNegUnits, setONegUnits] = useState(0);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);

  async function refresh() {
    const { data } = await api.get("/inventory");
    const row = (data || []).find(r => r.bloodType === "O-");
    setONegUnits(Number(row?.units || 0));
  }

  useEffect(() => { refresh(); }, []);

  async function drain() {
    setErr(""); setOk(""); setSending(true);
    try {
      const { data } = await api.post("/emergency");
      setOk(`נופקו ${data.issued} מנות O- בהצלחה ✓`);
      await refresh();
    } catch (e) {
      const msg = e.response
        ? e.response.data?.message || `[${e.response.status}] ${e.response.statusText}`
        : "Network error";
      setErr(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-wrap">
      <h1>מצב חירום (אר״ן) – ניפוק O−</h1>
      <p className="sub">
        כפתור יחיד לניפוק **כל** מנות ה־O− הקיימות. אם אין—תקבל הודעת שגיאה.
      </p>

      <div className="form" style={{ display:"grid", gap:12 }}>
        <div className="row">
          <div className="field">
            <label>O− זמין במלאי</label>
            <input value={oNegUnits} readOnly />
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}
        {ok  && <div className="alert ok">{ok}</div>}

        <button
          className="btn primary"
          onClick={drain}
          disabled={sending || oNegUnits <= 0}
          title={oNegUnits <= 0 ? "אין מנות O− זמינות" : "ניפוק כל ה־O−"}
        >
          {sending ? "מנפק..." : `ניפוק מיידי של כל ${oNegUnits} מנות O−`}
        </button>
      </div>
    </div>
  );
}
