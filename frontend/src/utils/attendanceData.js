import { useState, useEffect } from "react";

export const useAttendanceData = (dateFilter = "today") => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendanceData = async (filter = dateFilter) => {
    try {
      setLoading(true);
      setError("");

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

      // ✅ DATA SUDAH DALAM FORMAT YANG BENAR DARI BACKEND
      // Backend mengirim array of objects dengan struktur:
      // {
      //   employee_id, employees, department, date, day_of_week,
      //   timestamp, action, status, lateness_minutes, work_duration, confidence
      // }

      // Normalisasi hanya untuk konsistensi naming (camelCase)
      const normalizedData = data.map((item) => ({
        _id: item._id,
        employeeId: item.employee_id,
        name: item.employees,
        timestamp: item.timestamp,
        action: item.action, // ✅ langsung pakai backend
        status: item.status, // ✅ langsung pakai backend
        workDuration: item.work_duration,
        latenessMinutes: item.lateness_minutes,
        department: item.department,
        dayOfWeek: item.day_of_week,
        confidence: item.confidence,
      }));

      // Debug: Log untuk mengecek action field
      console.log(
        "🔍 Sample data dengan action:",
        normalizedData.slice(0, 3).map((r) => ({
          name: r.name,
          action: r.action,
          status: r.status,
        }))
      );

      console.log("✅ Normalized data sample:", normalizedData[0]);
      console.log(`✅ Total records: ${normalizedData.length}`);
      console.log(
        "📊 Action distribution:",
        normalizedData.reduce((acc, r) => {
          const actionKey = r.action || "undefined";
          acc[actionKey] = (acc[actionKey] || 0) + 1;
          return acc;
        }, {})
      );

      setAttendanceData(normalizedData);
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
