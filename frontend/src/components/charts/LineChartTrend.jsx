import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function LineChartTrend({ data, totalEmployees = 0 }) {
  // Calculate dynamic range based on total employees
  // Add 20% padding for better visualization
  const maxRange = Math.max(totalEmployees * 1.2, 10); // Minimum 10 untuk visibility
  const roundedMax = Math.ceil(maxRange / 10) * 10; // Round up to nearest 10
  
  // Generate ticks dynamically (5 ticks)
  const tickInterval = Math.ceil(roundedMax / 4);
  const ticks = [0, tickInterval, tickInterval * 2, tickInterval * 3, roundedMax];
  
  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">
        Attendance Trend (7 Days)
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 1, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="day" 
            stroke="#9ca3af"
          />
          <YAxis 
            stroke="#9ca3af"
            domain={[0, roundedMax]}
            ticks={ticks}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#e5e7eb" }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: "#3b82f6", r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
