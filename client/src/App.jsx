import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";     // ✅ import it
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import Main from "./pages/Main";
import Donations from "./pages/Donations";
import Dispense from "./pages/Dispense";
import Emergency from "./pages/Emergency";
import AdminLogs from "./pages/AdminLogs";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* 🔓 Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🔒 Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/main" element={<Main />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/dispense" element={<Dispense />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
        </Route>

        {/* 404 → Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
