import { useState, useEffect } from "react";
import WorkingDurationCard from "../components/charts/WorkingDurationCard";
import SummaryCard from "../components/charts/SummaryCard";
import LineChartTrend from "../components/charts/LineChartTrend";
import BarChartTrend from "../components/charts/BarChartTrend";
import DonutChart from "../components/charts/DonutChartTrend";
import Heatmap from "../components/charts/Heatmap";

const API_BASE_URL = "http://localhost:5000/api";
export default function Analytics() {
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

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data
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

      console.log("📊 Fetched Data:", {
        attendance: attendance.length,
        employees: employees.length,
        stats,
      });

      // Transform data
      const transformed = transformAnalyticsData(attendance, employees, stats);
      setAnalyticsData(transformed);
    } catch (err) {
      console.error("❌ Error fetching analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const transformAnalyticsData = (attendance, employees) => {
    // 1. Summary Data
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = attendance.filter((a) => a.date === today);

    const lateArrivals = todayAttendance.filter(
      (a) => a.checkin && a.checkin.status === "late"
    ).length;

    // 2. Working Duration Data
    const durationsInMinutes = attendance
      .filter((a) => a.work_duration_minutes > 0)
      .map((a) => a.work_duration_minutes);

    const avgMinutes =
      durationsInMinutes.length > 0
        ? durationsInMinutes.reduce((a, b) => a + b, 0) /
          durationsInMinutes.length
        : 0;

    const longestMinutes =
      durationsInMinutes.length > 0 ? Math.max(...durationsInMinutes) : 0;
    const shortestMinutes =
      durationsInMinutes.length > 0 ? Math.min(...durationsInMinutes) : 0;

    // 3. Attendance Trend (Last 7 days)
    const last7Days = getLast7Days();
    const attendanceByDate = {};

    attendance.forEach((record) => {
      if (last7Days.includes(record.date)) {
        attendanceByDate[record.date] =
          (attendanceByDate[record.date] || 0) + 1;
      }
    });

    const attendanceTrend = last7Days.map((day) => ({
      day: formatDay(day),
      count: attendanceByDate[day] || 0,
      date: day,
    }));

    // 4. Top Departments
    const deptMap = {};
    const empDeptMap = {};

    employees.forEach((emp) => {
      empDeptMap[emp.employee_id] = emp.department || "General";
    });

    attendance.forEach((record) => {
      const dept = empDeptMap[record.employee_id] || "General";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const topDepartments = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([dept, count]) => ({
        type: dept.length > 10 ? dept.substring(0, 10) + "..." : dept,
        count,
        fullName: dept,
      }));

    // 5. Hourly Check-ins Heatmap
    const hourlyCount = Array(24).fill(0);

    attendance.forEach((record) => {
      if (record.checkin && record.checkin.timestamp) {
        const hour = new Date(record.checkin.timestamp).getHours();
        hourlyCount[hour]++;
      }
    });

    const hourlyCheckIns = hourlyCount.map((count, hour) => ({
      hour: hour.toString().padStart(2, "0"),
      checkIns: count,
    }));

    // 6. Employee Ranking
    const empStats = {};

    employees.forEach((emp) => {
      empStats[emp.employee_id] = {
        name: emp.name,
        onTimeCount: 0,
        lateCount: 0,
        totalRecords: 0,
      };
    });

    attendance.forEach((record) => {
      if (empStats[record.employee_id]) {
        empStats[record.employee_id].totalRecords++;
        if (record.checkin) {
          if (record.checkin.status === "late") {
            empStats[record.employee_id].lateCount++;
          } else {
            empStats[record.employee_id].onTimeCount++;
          }
        }
      }
    });

    // 7. Compliance Rate
    const totalCheckins = attendance.filter((a) => a.checkin).length;
    const onTimeCheckins = attendance.filter(
      (a) => a.checkin && a.checkin.status === "ontime"
    ).length;
    const complianceRate =
      totalCheckins > 0
        ? Math.round((onTimeCheckins / totalCheckins) * 100)
        : 0;

    return {
      summary: {
        total: todayAttendance.length,
        critical: lateArrivals,
      },
      workingDurationData: {
        average: (avgMinutes / 60).toFixed(1),
        longest: (longestMinutes / 60).toFixed(1),
        shortest: (shortestMinutes / 60).toFixed(1),
      },
      attendanceTrend,
      topDepartments,
      hourlyCheckIns,
      complianceRate,
    };
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  const formatDay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  if (error) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-400 font-semibold mb-2">
            Error Loading Analytics
          </h2>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Attendance Analytics
          </h1>
          <p className="text-gray-400">Face Recognition System Dashboard</p>
        </div>
        <button
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm flex items-center gap-2"
        >
          {loading ? "🔄 Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard
          title="Total Attendance Today"
          value={analyticsData.summary.total}
          color="border-blue-400"
          isLoading={loading}
        />
        <SummaryCard
          title="Late Arrivals"
          value={analyticsData.summary.critical}
          color="border-orange-500"
          isLoading={loading}
        />
        <WorkingDurationCard
          data={analyticsData.workingDurationData}
          color="border-green-500"
          isLoading={loading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LineChartTrend
          data={analyticsData.attendanceTrend}
          isLoading={loading}
        />

        <BarChartTrend
          data={analyticsData.topDepartments}
          isLoading={loading}
        />
        <Heatmap data={analyticsData.hourlyCheckIns} isLoading={loading} />
      </div>

      {/* Additional Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart value={analyticsData.complianceRate} isLoading={loading} />

        {/* Stats Summary Card */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">
            Quick Stats
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <span className="text-gray-300 text-sm">Total Records</span>
              <span className="text-blue-400 font-bold">
                {loading
                  ? "..."
                  : analyticsData.attendanceTrend.reduce(
                      (sum, day) => sum + day.count,
                      0
                    )}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <span className="text-gray-300 text-sm">Active Departments</span>
              <span className="text-blue-400 font-bold">
                {loading ? "..." : analyticsData.topDepartments.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
