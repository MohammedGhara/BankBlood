// client/src/pages/Dispense.jsx
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/form.css";

const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function Dispense() {
  const [bloodType, setBloodType] = useState("A+");
  const [units, setUnits] = useState(1);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);

  // inventory preview
  const [inventory, setInventory] = useState([]);
  async function refreshInv() {
    const r = await api.get("/inventory");
    setInventory(r.data || []);
  }
  useEffect(() => { refreshInv(); }, []);

  // alternatives returned from server (if 409)
  const [alternatives, setAlternatives] = useState([]);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk(""); setAlternatives([]);
    setSending(true);
    try {
      const { data } = await api.post("/issue", { bloodType, units: Number(units) });
      setOk(`Issued ${data.used.units} unit(s) of ${data.used.type} ✓`);
      await refreshInv();
    } catch (e) {
      if (e.response && e.response.status === 409 && e.response.data?.needAlternative) {
        // show best alternatives
        setAlternatives(e.response.data.alternatives || []);
        setErr(e.response.data.message || "Insufficient stock.");
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
          bloodType: type,               // the chosen alternative
          units: Number(units),
          originalRequested: bloodType   // <— keep what the user first asked for
        });
         setOk(`Issued ${data.used.units} unit(s) of ${data.used.type} ✓`);
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
    <div className="page-wrap">
      <h1>ניפוק מנות דם – שגרה</h1>
      <p className="sub">בחר סוג דם ומספר מנות. אם אין מלאי מספיק – נציע חלופה בטוחה ומועדפת לפי שכיחות.</p>

      {err && <div className="alert error">{err}</div>}
      {ok  && <div className="alert ok">{ok}</div>}

      <form className="form" onSubmit={submit}>
        <div className="row">
          <div className="field">
            <label>סוג דם מבוקש</label>
            <select value={bloodType} onChange={(e)=>setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="field">
            <label>מס' מנות</label>
            <input
              type="number"
              min={1}
              value={units}
              onChange={(e)=>setUnits(e.target.value)}
              required
            />
          </div>
        </div>

        <button className="btn primary" type="submit" disabled={sending}>
          {sending ? "מנפק..." : "נפק מנות"}
        </button>
      </form>

      {alternatives.length > 0 && (
        <>
          <h2 style={{marginTop:24}}>המלצות אלטרנטיביות</h2>
          <p className="sub">מסודר לפי שכיחות באוכלוסייה ולאחר מכן לפי זמינות במלאי.</p>
          <div className="grid">
            {alternatives.slice(0,4).map(alt => (
              <div key={alt.type} className="card">
                <div className="bt">{alt.type}</div>
                <div className="units">זמין: {alt.available}</div>
                <button className="btn" disabled={alt.available < Number(units)} onClick={()=>acceptAlternative(alt.type)}>
                  נפק {units} × {alt.type}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{marginTop:32}}>מלאי נוכחי</h2>
      <div className="grid">
        {inventory.map(row => (
          <div key={row.bloodType} className="card">
            <div className="bt">{row.bloodType}</div>
            <div className="units">{row.units}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
