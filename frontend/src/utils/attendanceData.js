import { useState, useEffect } from "react";

export const useAttendanceData = (dateFilter = "today") => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendanceData = async (filter = dateFilter) => {
    try {
      setLoading(true);
      setError("");

      // ✅ FIX: Gunakan endpoint yang benar - /api/attendance (bukan /api/attendance/log)
      const dateParam = filter === "all" 
        ? "" 
        : new Date().toISOString().split("T")[0];
      
      // ✅ FIX: URL yang benar sesuai endpoint di Flask
      const url = dateParam 
        ? `http://localhost:5000/api/attendance?date=${dateParam}`
        : `http://localhost:5000/api/attendance`;

      console.log(`📡 Fetching attendance data with filter: ${filter}`);
      console.log(`🔗 Request URL: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log("📦 Raw response from backend:", data);
      console.log(`📊 Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      console.log(`📈 Number of records: ${data.length}`);

      // ✅ Debug: Check structure of first record
      if (data.length > 0) {
        console.log("🔍 First record structure:", data[0]);
        console.log("👤 Employee name field:", {
          'employee_name': data[0].employee_name,
          'name': data[0].name,
          'employeeName': data[0].employeeName
        });
        console.log("⏰ Check-in field:", {
          'check_in': data[0].check_in,
          'checkIn': data[0].checkIn,
          'timestamp': data[0].timestamp
        });
      }

      if (!Array.isArray(data)) {
        console.error("❌ Invalid response format:", data);
        throw new Error("Response data is not an array");
      }

      // ✅ FIX: Transform data untuk memastikan konsistensi
      const transformedData = data.map((item, index) => ({
        id: item.id || item._id || `temp-${index}`,
        employee_id: item.employee_id || item.employeeId || 'Unknown',
        employee_name: item.employee_name || item.name || item.employeeName || 'Unknown Employee',
        check_in: item.check_in || item.checkIn || item.timestamp || '',
        check_out: item.check_out || item.checkOut || '',
        status: item.status || 'present',
        department: item.department || 'General',
        confidence: item.confidence || 0.0,
        // Backup fields untuk debugging
        _raw: item
      }));

      console.log("🔄 Transformed data sample:", transformedData[0]);
      setAttendanceData(transformedData);
      console.log(`✅ Successfully processed ${transformedData.length} attendance records`);
      
    } catch (err) {
      console.error("🔥 Error fetching attendance data:", err);
      
      // Better error messages
      let errorMessage = "Terjadi kesalahan saat mengambil data absensi.";
      
      if (err.message === 'Failed to fetch') {
        errorMessage = "Tidak dapat terhubung ke server. Pastikan backend running di http://localhost:5000";
      } else if (err.message.includes('HTTP error')) {
        errorMessage = `Server error: ${err.message}`;
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setAttendanceData([]);
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(dateFilter);
  }, [dateFilter]);

  return { 
    attendanceData, 
    loading, 
    error, 
    refetch: fetchAttendanceData 
  };
};