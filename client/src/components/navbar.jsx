import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { isLoggedIn, clearToken } from "../auth";
import "../styles/navbar.css";

export default function Navbar() {
  const [logged, setLogged] = useState(isLoggedIn());
  const nav = useNavigate();
  const loc = useLocation();

  // react to login/logout from anywhere
  useEffect(() => {
    const onChange = () => setLogged(isLoggedIn());
    window.addEventListener("auth-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("auth-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function logout() {
    clearToken();
    nav("/");
  }

  return (
    <header className="nb">
      <div className="nb-inner">
        {/* Brand left */}
        <Link to="/" className="nb-brand">BankBlood</Link>

        {/* Links right */}
        <nav className="nb-links">
          <Link
            className={`nb-link ${
              loc.pathname === (logged ? "/main" : "/") ? "active" : ""
            }`}
            to={logged ? "/main" : "/"}
          >
            Home
          </Link>
          {logged ? (
            <>
              <button className="nb-btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link className={`nb-link ${loc.pathname === "/login" ? "active" : ""}`} to="/login">Login</Link>
              <Link className={`nb-link nb-cta ${loc.pathname === "/register" ? "active" : ""}`} to="/register">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
