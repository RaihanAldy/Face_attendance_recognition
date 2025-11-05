import { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:5000/api";

export const useAIInsights = () => {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLatestInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/insights/latest`);
      const data = await response.json();

      if (data.success && data.insight) {
        console.log("🤖 AI Insight loaded:", data.insight);
        setInsight(data.insight);
      } else {
        console.log("⚠️ No AI insights available");
      }
    } catch (err) {
      console.error("❌ Error fetching AI insights:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestInsights();
  }, []);

  return {
    insight,
    loading,
    error,
    refetch: fetchLatestInsights,
  };
};
