import {
  attendanceTrend,
  workingDurationData,
  topDepartments,
  hourlyCheckIns,
  summary,
} from "../data/mockData";
import LineChart from "../components/charts/LineChartTrend";
import EmployeeRanking from "../components/charts/EmployeeRanking";
import BarChart from "../components/charts/BarChartTrend";
import SummaryCard from "../components/SummaryCard";
import WorkingDurationCard from "../components/WorkingDurationCard";
import Heatmap from "../components/charts/Heatmap";

export default function Analytics() {
  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-100 mb-2">
        Attendance Analytics
      </h1>
      <p className="text-gray-400 mb-6">Face Recognition System Dashboard</p>

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
        <LineChart data={attendanceTrend} />
        <EmployeeRanking />
        <BarChart data={topDepartments} />
        <Heatmap data={hourlyCheckIns} />
      </div>
    </div>
  );
}
