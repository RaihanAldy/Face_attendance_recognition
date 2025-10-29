import { useState, useEffect } from "react";

export const useAttendanceData = (dateFilter = "today") => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendanceData = async (filter = dateFilter) => {
    try {
      setLoading(true);
      setError("");

      // Kirim parameter date berdasarkan filter
      const dateParam =
        filter === "all" ? "all" : new Date().toISOString().split("T")[0];
      const url = `http://localhost:5000/api/attendance?date=${dateParam}`;

      console.log(`📡 Fetching attendance data with filter: ${filter}`);
      console.log(`🔗 Request URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log("📦 Raw response from backend:", data);

      if (!Array.isArray(data)) {
        console.error("❌ Invalid response format:", data);
        throw new Error("Response data is not an array");
      }

      // 🔄 Normalisasi data agar field sesuai backend baru
      const normalizedData = data.map((item) => ({
        _id: item._id,
        employeeId: item.employeeId || item.employee_id || "-",
        name: item.name || item.employees || "-",
        status: item.status || "unknown", // "ontime", "late", "early", etc
        action: item.action || item.status || "-",
        timestamp: item.timestamp || null,
        confidence: item.confidence ?? 0,
      }));

      if (normalizedData.length > 0) {
        console.log("🔍 First normalized record:", normalizedData[0]);
      }

      setAttendanceData(normalizedData);
      console.log(`✅ Fetched ${normalizedData.length} attendance records`);
    } catch (err) {
      console.error("🔥 Error fetching attendance data:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data absensi.");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(dateFilter);
  }, [dateFilter]);

  return { attendanceData, loading, error, fetchAttendanceData };
};
