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

      // 🔄 Normalisasi data berdasarkan struktur database sebenarnya
      const normalizedData = data.map((item) => {
        // Field 'action' dari database adalah check_in/check_out
        // Field 'status' adalah ontime/late/early
        const normalized = {
          _id: item._id,
          employeeId: item.employeeId || item.employee_id || "-",
          name: item.name || item.employees || "-",

          // ✅ PENTING: Gunakan field yang benar dari backend
          // Dari JSON sample: "action": "check_in" atau "check_out"
          action: item.action || "-", // Ini adalah "check_in"/"check_out"

          // Status adalah "ontime", "late", "early"
          status: item.status || "-",

          timestamp: item.timestamp || null,
          confidence: item.confidence ?? 0,
        };

        return normalized;
      });

      if (normalizedData.length > 0) {
        console.log("🔍 First normalized record:", normalizedData[0]);
        console.log(
          "🔍 Sample actions:",
          normalizedData.map((r) => r.action)
        );
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