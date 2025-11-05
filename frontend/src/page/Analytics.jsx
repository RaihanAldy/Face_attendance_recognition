import { useState, useEffect } from "react";
import LineChartTrend from "../components/charts/LineChartTrend";
import SummaryCard from "../components/SummaryCard";
import WorkingDurationCard from "../components/charts/WorkingDurationCard";
import Heatmap from "../components/charts/Heatmap";
import AnalyticsData from "../utils/analyticsData";

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    loadAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AnalyticsData.getComprehensiveAnalytics(selectedDate);
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Loading analytics data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen">
        <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">
          Error loading analytics: {error}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen">
        <div className="text-yellow-400 bg-yellow-900/20 p-4 rounded-lg">
          No analytics data available
        </div>
      </div>
    );
  }

  const {
    summary,
    attendanceTrend,
    topDepartments,
    hourlyCheckIns,
    workingDurationData,
  } = analyticsData;

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      {/* Header dengan Date Picker */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Attendance Analytics
          </h1>
          <p className="text-gray-400">Face Recognition System Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-600"
          />
          <button
            onClick={loadAnalyticsData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard
          title="Total Attendance Today"
          value={summary.total}
          color="border-blue-400"
          subtitle={`${summary.total} employees`}
        />
        <SummaryCard
          title="Late Arrivals"
          value={summary.critical}
          color="border-orange-500"
          subtitle="Check-ins after threshold"
        />
        <WorkingDurationCard
          data={workingDurationData}
          color="border-green-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <LineChartTrend data={attendanceTrend} />

        {/* Department Analysis */}
        <BarChartTrend data={topDepartments} />

        {/* Hourly Heatmap */}
        <Heatmap data={hourlyCheckIns} />
      </div>

      {/* Raw Data Debug (optional - bisa dihapus di production) */}
      <details className="mt-8 bg-slate-800 p-4 rounded-lg">
        <summary className="cursor-pointer text-gray-400">Debug Data</summary>
        <pre className="text-xs text-gray-300 mt-2 overflow-auto">
          {JSON.stringify(analyticsData.rawData, null, 2)}
        </pre>
      </details>
    </div>
  );
}
