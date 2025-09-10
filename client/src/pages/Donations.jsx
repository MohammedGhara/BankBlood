// client/src/pages/Donations.jsx
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/form.css"; // אופציונלי (למטה יש CSS קצר)

const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export default function Donations() {
  const [bloodType, setBloodType] = useState("A+");
  const [donatedAt, setDonatedAt] = useState(() => new Date().toISOString().slice(0,16)); // yyyy-MM-ddTHH:mm
  const [donorId, setDonorId] = useState("");
  const [donorName, setDonorName] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);

  // טעינת מלאי להצגת אינדיקציה (לא חובה)
  const [inventory, setInventory] = useState([]);
  useEffect(() => { api.get("/inventory").then(r => setInventory(r.data||[])); }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk("");
    if (!donorId.trim() || !donorName.trim()) {
      setErr("נא למלא ת.ז ושם מלא");
      return;
    }
    setSending(true);
    try {
      // המרת תאריך לשעון UTC ISO אם צריך – ה־backend מקבל Date
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
      // ריענון מלאי בתצוגה
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
    <div className="page-wrap">
      <h1>קליטת מנות דם</h1>
      <p className="sub">הזן סוג דם, תאריך תרומה, מספר ת"ז ושם מלא של התורם.</p>

      {err && <div className="alert error">{err}</div>}
      {ok  && <div className="alert ok">{ok}</div>}

      <form className="form" onSubmit={submit}>
        <div className="row">
          <div className="field">
            <label>סוג דם</label>
            <select value={bloodType} onChange={(e)=>setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="field">
            <label>תאריך התרומה</label>
            <input
              type="datetime-local"
              value={donatedAt}
              onChange={(e)=>setDonatedAt(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label>מס' ת"ז תורם</label>
            <input
              value={donorId}
              onChange={(e)=>setDonorId(e.target.value)}
              placeholder="123456789"
              required
            />
          </div>

          <div className="field">
            <label>שם מלא</label>
            <input
              value={donorName}
              onChange={(e)=>setDonorName(e.target.value)}
              placeholder="ישראל ישראלי"
              required
            />
          </div>
        </div>

        <button className="btn primary" type="submit" disabled={sending}>
          {sending ? "שומר..." : "שמור תרומה"}
        </button>
      </form>

      <h2 style={{marginTop:32}}>מלאי לפי סוג דם</h2>
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
