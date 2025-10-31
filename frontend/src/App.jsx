import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import FaceScan from "./page/FaceScan";
import Analytics from "./page/Analytics";
import AttendanceLogs from "./page/AttendanceLogs";
import Employees from "./page/Employees";
import Login from "./page/Login";
import UserLayout from "./components/UserLayout";
import FaceRegistration from "./page/FaceRegistration";

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
      <Routes>
        {/* Public Route - Login (Hanya untuk admin) */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to={userRole === 'admin' ? "/analytics" : "/"} replace /> : 
            <Login onLogin={handleLogin} />
          } 
        />
        
        {/* Admin Routes - Layout dengan sidebar & navbar */}
        {isAuthenticated && userRole === 'admin' && (
          <Route 
            path="/*" 
            element={
              <div className="flex bg-slate-950 min-h-screen">
                <Sidebar userRole={userRole} onLogout={handleLogout} />
                <div className="flex-1 flex flex-col">
                  <Navbar userRole={userRole} onLogout={handleLogout} />
                  <main className="p-6 flex-1">
                    <Routes>
                      <Route path="/" element={<Navigate to="/analytics" replace />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/attendance" element={<AttendanceLogs />} />
                      <Route path="/employees" element={<Employees />} />
                      <Route path="/settings" element={<div className="text-white p-6">Settings Page - Coming Soon</div>} />
                      <Route path="*" element={<Navigate to="/analytics" replace />} />
                    </Routes>
                  </main>
                </div>
              </div>
            } 
          />
        )}
        
        {/* Default Route untuk semua user (non-admin) - FaceScan dengan UserLayout */}
        <Route 
          path="/*" 
          element={
            <UserLayout onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<FaceScan />} />
                <Route path="/face-scan" element={<FaceScan />} />
                <Route path="/face-registration" element={<FaceRegistration />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </UserLayout>
          } 
        />
      </Routes>
    </Router>
  );
}