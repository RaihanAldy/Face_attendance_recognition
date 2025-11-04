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

      console.log(` Fetching attendance data with filter: ${filter}`);
      console.log(` Request URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log(" Raw response from backend:", data);

      if (!Array.isArray(data)) {
        console.error(" Invalid response format:", data);
        throw new Error("Response data is not an array");
      }

      // Di dalam fetchAttendanceData function, perbaiki field mapping:
      const normalizedData = data.map((item) => {
        const employeeName = item.employee_name || "Unknown Employee";

        return {
          _id: item._id,
          employeeId: item.employee_id,
          name: employeeName,
          date: item.date,
          checkIn: item.checkin?.timestamp || null,
          checkInStatus: item.checkin?.status || null,
          checkOut: item.checkout?.timestamp || null,
          checkOutStatus: item.checkout?.status || null,
          workDuration: item.work_duration_minutes || 0,
          workingHours: item.work_duration_minutes
            ? `${Math.floor(item.work_duration_minutes / 60)}h ${
                item.work_duration_minutes % 60
              }m`
            : null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

      console.log(" Normalized data sample:", normalizedData[0]);
      console.log(` Total records: ${normalizedData.length}`);
      console.log(
        " Status distribution:",
        normalizedData.reduce((acc, r) => {
          const hasCheckIn = r.checkIn ? "has-checkin" : "no-checkin";
          const hasCheckOut = r.checkOut ? "has-checkout" : "no-checkout";
          const key = `${hasCheckIn}, ${hasCheckOut}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      );

      setAttendanceData(normalizedData);
    } catch (err) {
      console.error(" Error fetching attendance data:", err);
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
