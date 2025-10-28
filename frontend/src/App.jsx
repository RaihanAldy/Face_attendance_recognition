import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import FaceScan from "./pages/FaceScan";
import AttendanceLog from "./pages/AttendanceLog";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/auth/Login";

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken') !== null;
  return isAuthenticated ? children : <Navigate to="/auth/login" />;
};

export default function App() {
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/auth/login';
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/auth/login" element={<Login />} />

        {/* Protected App Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
                <div className="flex min-h-screen bg-navy-950">
                {/* Sidebar */}
                <Sidebar />

                {/* Main content area */}
                <div className="flex-1 flex flex-col bg-navy-950">
                  <Navbar />

                  <main className="p-6 flex-1 overflow-y-auto bg-navy-950">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/face-scan" element={<FaceScan />} />
                      <Route path="/attendance" element={<AttendanceLog />} />
                      <Route path="/employees" element={<Employees />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
