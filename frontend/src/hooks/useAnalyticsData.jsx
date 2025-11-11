import { useState, useEffect } from "react";
import { transformAnalyticsData } from "../utils/analyticsData";

const API_BASE_URL = "http://localhost:5000/api";

export const useAnalyticsData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    summary: { total: 0, critical: 0 },
    workingDurationData: { average: 0, longest: 0, shortest: 0 },
    attendanceTrend: [],
    topDepartments: [],
    hourlyCheckIns: [],
    complianceRate: 0,
  });

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [attendanceRes, employeesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/attendance?date=all`),
        fetch(`${API_BASE_URL}/employees`),
        fetch(`${API_BASE_URL}/attendance/stats`),
      ]);

      if (!attendanceRes.ok || !employeesRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch data from API");
      }

      const attendance = await attendanceRes.json();
      const employees = await employeesRes.json();
      const stats = await statsRes.json();

      const transformed = transformAnalyticsData(attendance, employees, stats);
      setAnalyticsData(transformed);
    } catch (err) {
      console.error("❌ Error fetching analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  return {
    loading,
    error,
    analyticsData,
    refetch: fetchAnalyticsData,
  };
};
