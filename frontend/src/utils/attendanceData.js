import { useState, useEffect } from "react";

export const useAttendanceData = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("📡 Fetching attendance data from backend...");
      const response = await fetch("http://localhost:5000/api/attendance");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 🧩 Validasi format data
      if (!Array.isArray(data)) {
        console.error("❌ Invalid response format:", data);
        throw new Error("Response data is not an array");
      }

      // 🧠 Cek struktur key penting
      if (data.length > 0) {
        const sample = data[0];
        if (!("employees" in sample) || !("employee_id" in sample)) {
          console.warn("⚠️ Missing expected keys in response:", sample);
        }
      }

      setAttendanceData(data);
      console.log("✅ Attendance data fetched:", data);
    } catch (err) {
      console.error("🔥 Error fetching attendance data:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data absensi.");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  return { attendanceData, loading, error, fetchAttendanceData };
};
