import { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:5000/api";
export default function AIInsightSummary({
  insightData = null,
  refreshTrigger = 0,
}) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(0); // hours until 11 PM refresh

  // Fetch AI insights from backend
  const fetchAIInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🤖 Fetching AI insights...");
      const response = await fetch(
        `${API_BASE_URL}/analytics/ai-insights?days=7`
      );
      const data = await response.json();

      if (data.success && data.insights) {
        const insightObj = {
          summary: data.insights.summary,
          insights: data.insights.key_findings || [],
        };

        setInsight(insightObj);
        setLastUpdate(new Date());

        // Cache the result for today
        localStorage.setItem("ai_insights_cache", JSON.stringify(insightObj));
        localStorage.setItem("ai_insights_cache_time", Date.now().toString());
        localStorage.setItem(
          "ai_insights_cache_date",
          new Date().toDateString()
        );

        console.log(
          "✅ AI insights loaded and cached for today:",
          data.insights
        );
      } else {
        // Use fallback insights if AI failed but returned gracefully
        setInsight({
          summary:
            data.insights?.summary || "AI insights are being generated...",
          insights: data.insights?.key_findings || [
            "Analyzing attendance patterns",
            "Processing employee data",
            "Generating recommendations",
          ],
        });
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("❌ Failed to fetch AI insights:", err);
      setError(err.message);
      // Fallback to basic insights on error
      setInsight({
        summary:
          "Unable to generate AI insights at this time. System is operating normally.",
        insights: [
          "Check internet connection",
          "Verify backend service is running",
          "Review API configuration",
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If insightData is provided, use it
    if (insightData) {
      setInsight(insightData);
      setLastUpdate(new Date());
      return;
    }

    // Check if we have cached data from today
    const cachedInsights = localStorage.getItem("ai_insights_cache");
    const cacheTimestamp = localStorage.getItem("ai_insights_cache_time");
    const cacheDate = localStorage.getItem("ai_insights_cache_date");

    const today = new Date().toDateString();

    if (cachedInsights && cacheTimestamp && cacheDate === today) {
      // Use cached data if it's from today
      const cached = JSON.parse(cachedInsights);
      setInsight(cached);
      setLastUpdate(new Date(parseInt(cacheTimestamp)));
      console.log("✅ Using cached AI insights from today");
    } else {
      // Fetch new insights if no cache or cache is from yesterday
      console.log("🔄 Fetching fresh AI insights (new day or no cache)...");
      fetchAIInsights();
    }

    // Calculate time until 5 AM tomorrow
    const calculateTimeUntil11PM = () => {
      const now = new Date();
      const next11PM = new Date(now);

      // Set to 11 PM (23:00)
      next11PM.setHours(23, 0, 0, 0);

      // If current time is past 11 PM, set to tomorrow's 11 PM
      if (now.getHours() >= 23) {
        next11PM.setDate(next11PM.getDate() + 1);
      }

      return next11PM.getTime() - now.getTime();
    };

    // Schedule refresh at 11 PM (before API key expires at midnight)
    const timeUntil11PM = calculateTimeUntil11PM();
    const refreshTimeout = setTimeout(() => {
      console.log(
        "🌙 11 PM refresh - Fetching AI insights for today (API key valid)..."
      );
      fetchAIInsights();

      // Set up daily interval after first 11 PM refresh
      const dailyInterval = setInterval(() => {
        console.log(
          "🌙 Daily 11 PM refresh - Fetching AI insights for today..."
        );
        fetchAIInsights();
      }, 24 * 60 * 60 * 1000); // 24 hours

      return () => clearInterval(dailyInterval);
    }, timeUntil11PM);

    // Update "hours until refresh" display every minute
    const updateCountdown = () => {
      const hoursUntil11PM = Math.ceil(
        calculateTimeUntil11PM() / (60 * 60 * 1000)
      );
      setNextRefreshIn(hoursUntil11PM);
    };

    updateCountdown(); // Initial update
    const countdownInterval = setInterval(updateCountdown, 60 * 1000); // Update every minute

    return () => {
      clearTimeout(refreshTimeout);
      clearInterval(countdownInterval);
    };
  }, [insightData, refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full">
        <h2 className="text-lg font-semibold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          🤖 AI Attendance Insights
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-center h-24 bg-slate-800 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Generating insights...</p>
            </div>
          </div>
          <div className="h-32 bg-slate-800 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          🤖 AI Attendance Insights
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-gray-500 bg-slate-800 px-2 py-1 rounded-full">
              {lastUpdate.toLocaleDateString()}{" "}
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          {nextRefreshIn > 0 && (
            <span
              className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded-full"
              title="Next refresh at 11 PM (before API key expires)"
            >
              🌙 {nextRefreshIn}h
            </span>
          )}
          {error && (
            <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded-full">
              ⚠️ Limited
            </span>
          )}
        </div>
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
