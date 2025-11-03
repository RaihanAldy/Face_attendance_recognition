import { useState, useEffect } from "react";

export default function AIInsightSummary({ insightData = null }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data dummy untuk preview - nanti akan diganti dengan data dari API/AI
  const defaultInsight = {
    summary: "Attendance performance is excellent this week with a 94% on-time rate. Most employees are consistently punctual, showing strong workplace discipline.",
    insights: [
      "Peak attendance hours are between 8:00 - 9:00 AM",
      "Friday shows the highest late arrival rate at 12%",
      "Engineering department has the best punctuality score"
    ]
  };

  useEffect(() => {
    // Simulasi loading AI insight
    // Nanti di sini akan fetch dari backend/API
    setLoading(true);
    setTimeout(() => {
      setInsight(insightData || defaultInsight);
      setLoading(false);
    }, 500);
  }, [insightData]);

  if (loading) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full">
        <h2 className="text-lg font-semibold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          AI Attendance Insights
        </h2>
        <div className="space-y-3 animate-pulse">
          <div className="h-24 bg-slate-800 rounded-lg"></div>
          <div className="h-32 bg-slate-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          AI Attendance Insights
        </h2>
        <span className="text-xs text-gray-500 bg-slate-800 px-2 py-1 rounded-full">
          Updated just now
        </span>
      </div>

      {/* Main Summary */}
      <div className="bg-linear-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-4 rounded-xl mb-4">
        <p className="text-gray-300 text-sm leading-relaxed">
          {insight?.summary}
        </p>
      </div>

      {/* Key Insights */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Key Findings
        </h3>
        <ul className="space-y-2">
          {insight?.insights.map((item, index) => (
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
