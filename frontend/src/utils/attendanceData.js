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

      // 🔄 NORMALISASI DATA BARU - SESUAI STRUKTUR MONGODB
      const normalizedData = data.flatMap((item) => {
        const records = [];
        
        const baseRecord = {
          _id: item._id,
          employeeId: item.employee_id || item.employeeId || "-",
          nama: item.employees || item.name || "-", // ✅ Gunakan 'nama'
          department: item.department || "-",
          date: item.date || "-",
          day_of_week: item.day_of_week || "-",
          lateness_minutes: item.lateness_minutes || 0,
          confidence: item.confidence || 0,
          work_duration: item.work_duration || 0
        };

        // ✅ BUAT RECORD UNTUK CHECK-IN (jika ada)
        if (item.check_in_time) {
          records.push({
            ...baseRecord,
            _id: `${item._id}_checkin`, // ID unik untuk check-in
            action: "check_in", // ✅ Tambahkan field action
            status: item.check_in_status || item.status || "-",
            timestamp: item.check_in_time,
            checkIn: item.check_in_time,
            checkInStatus: item.check_in_status,
            checkInConfidence: item.check_in_confidence
          });
        }

        // ✅ BUAT RECORD UNTUK CHECK-OUT (jika ada)
        if (item.check_out_time) {
          records.push({
            ...baseRecord,
            _id: `${item._id}_checkout`, // ID unik untuk check-out
            action: "check_out", // ✅ Tambahkan field action
            status: item.check_out_status || item.status || "-",
            timestamp: item.check_out_time,
            checkOut: item.check_out_time,
            checkOutStatus: item.check_out_status,
            checkOutConfidence: item.check_out_confidence
          });
        }

        // ✅ JIKA TIDAK ADA CHECK-IN/CHECK-OUT, GUNAKAN TIMESTAMP UMUM
        if (records.length === 0 && item.timestamp) {
          records.push({
            ...baseRecord,
            action: "unknown",
            status: item.status || "-",
            timestamp: item.timestamp
          });
        }

        return records;
      });

      if (normalizedData.length > 0) {
        console.log("🔍 First normalized record:", normalizedData[0]);
        console.log(
          "🔍 Sample actions:",
          normalizedData.map((r) => ({ 
            action: r.action, 
            status: r.status,
            timestamp: r.timestamp 
          }))
        );
        console.log(
          "🔍 Check-in/Check-out distribution:",
          normalizedData.reduce((acc, r) => {
            acc[r.action] = (acc[r.action] || 0) + 1;
            return acc;
          }, {})
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