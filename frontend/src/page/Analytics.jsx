import WorkingDurationCard from "../components/charts/WorkingDurationCard";
import SummaryCard from "../components/charts/SummaryCard";
import LineChartTrend from "../components/charts/LineChartTrend";
import BarChartTrend from "../components/charts/BarChartTrend";
import Heatmap from "../components/charts/Heatmap";
import AIInsightSummary from "../components/charts/AIInsightSummary";
import { RefreshCw } from "lucide-react";
import { useAIInsights } from "../hooks/useAIInsights";
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import RefreshButton from "../components/RefreshButton";

export default function Analytics() {
  const {
    loading: dataLoading,
    error: dataError,
    analyticsData,
    refetch: refetchData,
  } = useAnalyticsData();

  const {
    insight: aiInsight,
    loading: insightLoading,
    error: insightError,
    refetch: refetchInsights,
  } = useAIInsights();

  // PERBAIKAN: Menggunakan loading state yang benar
  const loading = dataLoading || insightLoading;
  const error = dataError || insightError;

  const handleRefreshAll = () => {
    refetchData();
    refetchInsights();
  };

  // PERBAIKAN: Error handling yang lebih baik
  if (error) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-400 font-semibold mb-2">
            Error Loading Analytics
          </h2>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={handleRefreshAll}
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
        <div className="flex gap-2">
          <RefreshButton
            onClick={handleRefreshAll}
            loading={loading}
            loadingText="Loading..."
            normalText="Refresh All"
          />
        </div>
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
        {/* AI Insight Summary Card */}
        <AIInsightSummary
          insightData={
            aiInsight
              ? {
                  summary: aiInsight.summary,
                  insights: aiInsight.key_findings || [],
                }
              : null
          }
          isLoading={insightLoading}
        />
        <BarChartTrend
          data={analyticsData.topDepartments}
          isLoading={loading}
        />
        <Heatmap data={analyticsData.hourlyCheckIns} isLoading={loading} />
      </div>
    </div>
  );
}
