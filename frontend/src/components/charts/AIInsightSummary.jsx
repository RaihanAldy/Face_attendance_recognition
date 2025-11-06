import { Brain, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function AIInsightSummary({
  insightData = null,
  isLoading = false,
}) {
  const [insight, setInsight] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (insightData) {
      setInsight(insightData);
      setLastUpdate(new Date());
    }
  }, [insightData]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full">
        <h2 className="text-lg font-semibold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          AI Insights
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-center h-24 bg-slate-800 rounded-lg">
            <div className="text-center">
              <RefreshCw className="animate-spin rounded-full h-8 w-8  text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Generating insights...</p>
            </div>
          </div>
          <div className="h-32 bg-slate-800 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full">
        {/* PERBAIKAN: Mengganti typo "A Insights" menjadi "AI Insights" */}
        <h2 className="text-lg font-semibold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          AI Insights
        </h2>
        <div className="text-center text-gray-400 py-8">
          <p>No AI insights available</p>
          <p className="text-sm mt-2">Check backend service</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex flex-row space-x-3 items-center justify-center">
          <Brain className="text-purple-500" />
          <p className="text-lg font-semibold text-purple-400">AI Insights</p>
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-gray-200 bg-blue-400/15 px-2 py-1 rounded-full">
              {lastUpdate.toLocaleDateString()}{" "}
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Main Summary */}
      {/* PERBAIKAN: Mengganti bg-linear-to-br menjadi bg-gradient-to-br */}
      <div className="bg-linear-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-4 rounded-xl mb-4">
        <p className="text-gray-300 text-sm leading-relaxed">
          {insight.summary}
        </p>
      </div>

      {/* Key Insights */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Key Findings
        </h3>
        <ul className="space-y-2">
          {insight.insights.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-gray-400"
            >
              <span className="text-blue-400 mt-0.5">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
