import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Custom Tooltip untuk tampilan yang lebih baik
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 p-3 rounded-lg shadow-lg">
        <p className="text-gray-300 font-medium">{`${label}`}</p>
        <p className="text-blue-400">
          {`Attendance: ${payload[0].value} employees`}
        </p>
        {payload[0].payload.date && (
          <p className="text-gray-400 text-sm">
            Date: {payload[0].payload.date}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function LineChartTrend({ data, isLoading }) {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">
        Attendance Trend (7 Days)
      </h2>
      {isLoading ? (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">
            Loading chart data...
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 1, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
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
      )}
    </div>
  );
}
