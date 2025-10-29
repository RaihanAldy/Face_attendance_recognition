import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import FaceScan from "./page/FaceScan";
import Analytics from "./page/Analytics";
import AttendanceLog from "./page/AttendanceLogs";
import Employees from "./page/Employees";
import Settings from "./page/Settings";
import Login from "./page/Login";


const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes wrapped in Layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <div className="flex bg-slate-950">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                  <Navbar />
                  <main className="">
                    <Outlet />
                  </main>
                </div>
              </div>
            </PrivateRoute>
          }
        >
          <Route index element={<Analytics />} />
          <Route path="attendance" element={<AttendanceLog />} />
          <Route path="employees" element={<Employees />} />
          <Route path="face-scan" element={<FaceScan />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
