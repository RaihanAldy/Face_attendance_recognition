import { violationTrend, complianceRate, topViolations, heatmapData, summary } from "../data/mockData";
import LineChart from "../components/charts/LineChartTrend";
import DonutChart from "../components/charts/DonutChartTrend";
import BarChart from "../components/charts/BarChartTrend";
import Heatmap from "../components/charts/Heatmap";
import SummaryCard from "../components/SummaryCard";

export default function Dashboard() {
  return (
    <div className="bg-navy-950 min-h-screen p-6">
      <h1 className="text-2xl font-bold text-sky-400 mb-6">Analytics Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard title="Total Violations" value={summary.total} color="border-yellow-400" bgColor="bg-navy-900" textColor="text-sky-100" />
        <SummaryCard title="Critical Violations" value={summary.critical} color="border-red-500" bgColor="bg-navy-900" textColor="text-sky-100" />
        <SummaryCard title="Compliance Rate" value={`${summary.compliance}%`} color="border-emerald-500" bgColor="bg-navy-900" textColor="text-sky-100" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-navy-900 p-4 rounded-lg border border-navy-800">
          <LineChart data={violationTrend} />
        </div>
        <div className="bg-navy-900 p-4 rounded-lg border border-navy-800">
          <DonutChart value={complianceRate} />
        </div>
        <div className="bg-navy-900 p-4 rounded-lg border border-navy-800">
          <BarChart data={topViolations} />
        </div>
        <div className="bg-navy-900 p-4 rounded-lg border border-navy-800">
          <Heatmap data={heatmapData} />
        </div>
      </div>
    </div>
  );
}
