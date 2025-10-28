import { violationTrend, complianceRate, topViolations, heatmapData, summary } from "../data/mockData";
import LineChart from "../components/charts/LineChartTrend";
import DonutChart from "../components/charts/DonutChartTrend";
import BarChart from "../components/charts/BarChartTrend";
import Heatmap from "../components/charts/Heatmap";
import SummaryCard from "../components/SummaryCard";

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Analytics Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <SummaryCard title="Total Violations" value={summary.total} color="border-yellow-400" />
        <SummaryCard title="Critical Violations" value={summary.critical} color="border-orange-500" />
        <SummaryCard title="Compliance Rate" value={`${summary.compliance}%`} color="border-green-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart data={violationTrend} />
        <DonutChart value={complianceRate} />
        <BarChart data={topViolations} />
        <Heatmap data={heatmapData} />
      </div>
    </div>
  );
}
