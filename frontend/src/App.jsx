import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import FaceScan from "./pages/FaceScan";
import AttendanceLog from "./pages/AttendanceLog";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          <Navbar />

          <main className="p-6 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/face-scan" element={<FaceScan />} />
              <Route path="/attendance" element={<AttendanceLog />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
