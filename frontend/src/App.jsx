import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import FaceScan from "./page/FaceScan";
import Analytics from "./page/Analytics";
import AttendanceLog from "./page/AttendanceLogs";
import Employees from "./page/Employees";

export default function App() {
  return (
    <Router>
      <div className="flex bg-slate-950">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="">
            <Routes>
              <Route path="/" element={<Analytics />} />
              <Route path="/attendance" element={<AttendanceLog />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/face-scan" element={<FaceScan />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
