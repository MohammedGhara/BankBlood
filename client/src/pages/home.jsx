import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "../styles/home.css"; // <- uses the styles folder

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/inventory")
      .then((res) => setInventory(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  const { totalUnits, rareUnits } = useMemo(() => {
    const total = inventory.reduce((s, r) => s + Number(r.units || 0), 0);
    const rareTypes = ["AB-", "B-", "A-", "O-"]; // demo “rarer” types
    const rare = inventory
      .filter((r) => rareTypes.includes(r.bloodType))
      .reduce((s, r) => s + Number(r.units || 0), 0);
    return { totalUnits: total, rareUnits: rare };
  }, [inventory]);

  return (
    <div className="home">
      <div className="bg" />

      <header className="hero">
        <div className="pill">BECS • Blood Bank</div>
        <h1>Safe blood, at the right time.</h1>
        <p className="lead">
          A simplified Blood Establishment Computer Software (BECS): record
          donations, track live stock, and issue units in both routine and
          emergency scenarios.
        </p>
        <div className="cta-row">
          <a className="btn primary" href="/register">Create account</a>
          <a className="btn ghost" href="/login">Login</a>
        </div>

        {!loading && (
          <div className="stats-row">
            <StatCard label="Units in stock" value={totalUnits} sub="All blood types" />
            <StatCard label="Rare units" value={rareUnits} sub="AB-, B-, A-, O-" />
            <StatCard label="Docs" value="API" sub="See /api-docs" />
          </div>
        )}
      </header>

      <section className="features">
        <div className="feature">
          <div className="icon">🩸</div>
          <h3>Record Donations</h3>
          <p>Capture donor information with input validation and clear audit trail.</p>
        </div>
        <div className="feature">
          <div className="icon">📦</div>
          <h3>Live Inventory</h3>
          <p>At-a-glance stock levels by blood type—no spreadsheets needed.</p>
        </div>
        <div className="feature">
          <div className="icon">🚑</div>
          <h3>Emergency Mode</h3>
          <p>Issue O− quickly when minutes matter (coming next in your app!).</p>
        </div>
      </section>

     
    </div>
  );
}
