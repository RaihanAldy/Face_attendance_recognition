import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import FaceScan from "./page/FaceScan";
import Analytics from "./page/Analytics";
import AttendanceLogs from "./page/AttendanceLogs";
import Employees from "./page/Employees";
import Login from "./page/Login";
import Settings from "./page/Settings";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    
    if (token) {
      setIsAuthenticated(true);
      setUserRole(role);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (token, role, userData) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', role);
    if (userData) {
      localStorage.setItem('userName', userData.name);
      localStorage.setItem('userEmail', userData.email);
    }
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex bg-slate-950">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Analytics />} />
              <Route path="/attendance" element={<AttendanceLog />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/face-scan" element={<FaceScan />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}