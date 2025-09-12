// client/src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { isLoggedIn, clearToken, getUser } from "../auth";
import "../styles/navbar.css";

export default function Navbar() {
  const [logged, setLogged] = useState(isLoggedIn());
  const [user, setUser] = useState(getUser());
  const nav = useNavigate();
  const loc = useLocation();

  // react to login/logout from anywhere
  useEffect(() => {
    const onChange = () => {
      setLogged(isLoggedIn());
      setUser(getUser());
    };
    window.addEventListener("auth-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("auth-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // role-based Home target
  const homePath = useMemo(() => {
    if (!logged) return "/";
    return user?.role === "customer" ? "/research" : "/main";
  }, [logged, user]);

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
          {/* HOME (role-aware) */}
          <Link
            className={`nb-link ${loc.pathname === homePath ? "active" : ""}`}
            to={homePath}
          >
            Home
          </Link>

          {/* Customer (research student) */}
          {logged && user?.role === "customer" && (
            <Link
              className={`nb-link ${loc.pathname === "/research" ? "active" : ""}`}
              to="/research"
            >
              Research
            </Link>
          )}

          {/* Admin-only links */}
          {logged && user?.role === "admin" && (
            <>
              <Link
                className={`nb-link ${loc.pathname.startsWith("/admin/logs") ? "active" : ""}`}
                to="/admin/logs"
              >
                Logs
              </Link>
              <Link
                className={`nb-link nb-cta ${loc.pathname.startsWith("/admin/users") ? "active" : ""}`}
                to="/admin/users"
              >
                Users
              </Link>
            </>
          )}

          {logged ? (
            <button className="nb-btn" onClick={logout}>Logout</button>
          ) : (
            <>
              <Link className={`nb-link ${loc.pathname === "/login" ? "active" : ""}`} to="/login">
                Login
              </Link>
              <Link className={`nb-link nb-cta ${loc.pathname === "/register" ? "active" : ""}`} to="/register">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
