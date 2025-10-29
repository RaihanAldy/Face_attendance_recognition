import { useState, useEffect } from "react";

export const useAttendanceData = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5000/api/attendance");
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid data format");

      setAttendanceData(data);
    } catch (err) {
      setError(err.message);
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
