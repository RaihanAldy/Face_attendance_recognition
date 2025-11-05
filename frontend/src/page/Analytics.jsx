import { useState, useEffect } from "react";
import LineChart from "../components/charts/LineChartTrend";
import AIInsightSummary from "../components/charts/AIInsightSummary";
import BarChart from "../components/charts/BarChartTrend";
import SummaryCard from "../components/SummaryCard";
import WorkingDurationCard from "../components/WorkingDurationCard";
import Heatmap from "../components/charts/Heatmap";

const API_BASE_URL = "http://localhost:5000/api";

export default function Analytics() {
  const [summary, setSummary] = useState({ total: 0, critical: 0, compliance: 0, total_employees: 0 });
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [workingDurationData, setWorkingDurationData] = useState({ average: 0, longest: 0, shortest: 0 });
  const [topDepartments, setTopDepartments] = useState([]);
  const [hourlyCheckIns, setHourlyCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllAnalytics();
    
    // Auto refresh setiap 5 MENIT (bukan 30 detik) - lebih reasonable
    const interval = setInterval(() => {
      fetchAllAnalytics();
    }, 300000); // 5 menit

    return () => clearInterval(interval);
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch semua data secara parallel
      const [summaryRes, trendRes, durationRes, departmentsRes, hourlyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/summary`),
        fetch(`${API_BASE_URL}/analytics/attendance-trend`),
        fetch(`${API_BASE_URL}/analytics/working-duration`),
        fetch(`${API_BASE_URL}/analytics/departments`),
        fetch(`${API_BASE_URL}/analytics/hourly-checkins`)
      ]);

      const summaryData = await summaryRes.json();
      const trendData = await trendRes.json();
      const durationData = await durationRes.json();
      const departmentsData = await departmentsRes.json();
      const hourlyData = await hourlyRes.json();

      setSummary(summaryData);
      setAttendanceTrend(trendData);
      setWorkingDurationData(durationData);
      setTopDepartments(departmentsData);
      setHourlyCheckIns(hourlyData);

      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">
          Attendance Analytics
        </h1>
        <p className="text-gray-400 mb-6">Face Recognition System Dashboard</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900 p-6 rounded-2xl animate-pulse">
              <div className="h-20 bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900 p-6 rounded-2xl animate-pulse">
              <div className="h-64 bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-100 mb-2">
        Attendance Analytics
      </h1>
      <p className="text-gray-400 mb-6">Face Recognition System Dashboard • Auto-refresh every 5 min</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard
          title="Total Attendance Today"
          value={summary.total}
          color="border-blue-400"
        />
        <SummaryCard
          title="Late Arrivals"
          value={summary.critical}
          color="border-orange-500"
        />
        <WorkingDurationCard
          data={workingDurationData}
          color="border-green-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart data={attendanceTrend} totalEmployees={summary.total_employees} />
        <AIInsightSummary />
        <BarChart data={topDepartments} />
        <Heatmap data={hourlyCheckIns} />
      </div>
    </div>
  );
}
