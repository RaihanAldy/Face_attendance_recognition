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

      // 🧩 Debug: Cek data mentah
      console.log("📦 Raw response from backend:", data);

      if (data.length > 0) {
        console.log("🔍 First record structure:", data[0]);
        console.log("👤 First record name:", data[0].name || data[0].employees);
      }

      if (!Array.isArray(data)) {
        console.error("❌ Invalid response format:", data);
        throw new Error("Response data is not an array");
      }

      setAttendanceData(data);
      console.log("✅ Attendance data set to state");
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
