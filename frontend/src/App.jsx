import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import FaceScan from "./page/FaceScan";
import FaceRegistration from "./page/FaceRegistration";
import Analytics from "./page/Analytics";
import AttendanceLog from "./page/AttendanceLogs";
import Employees from "./page/Employees";
import Settings from "./page/Settings";
import AdminPendingVerification from "./page/AdminPendingVerification";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");

    if (token && role === "admin") {
      setIsAuthenticated(true);
      setUserRole(role);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (token, role, userData) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userRole", role);
    if (userData) {
      localStorage.setItem("userName", userData.name);
      localStorage.setItem("userEmail", userData.email);
    }
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
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

  // ============================================
  // PUBLIC ROUTES (Face Scan - No Auth Required)
  // ============================================
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          {/* Public Face Scan Page */}
          <Route path="/" element={<FaceScanWrapper onLogin={handleLogin} />} />

          {/* Public Face Registration Page */}
          <Route path="/register" element={<FaceRegistrationWrapper />} />

          {/* Redirect all other routes to Face Scan */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  // ============================================
  // ADMIN ROUTES (Dashboard with Sidebar)
  // ============================================
  return (
    <Router>
      <div className="flex bg-slate-950">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          {/* Top Navigation Bar */}
          <Navbar
            onLogout={handleLogout}
            userName={localStorage.getItem("userName")}
            userRole={userRole}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/dashboard" element={<Analytics />} />
              <Route path="/attendance" element={<AttendanceLog />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/pending" element={<AdminPendingVerification />} />
              <Route path="/settings" element={<Settings />} />

              {/* Admin can also access registration */}
              <Route path="/register" element={<FaceRegistrationWrapper />} />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

// Wrapper component for FaceScan to use navigation
function FaceScanWrapper({ onLogin }) {
  const navigate = useNavigate();

  const handleNavigateToRegistration = () => {
    navigate("/register");
  };

  return (
    <FaceScan
      onLogin={onLogin}
      onNavigateToRegistration={handleNavigateToRegistration}
    />
  );
}

// Wrapper component for FaceRegistration to use navigation
function FaceRegistrationWrapper() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  return <FaceRegistration onBack={handleBack} />;
}
