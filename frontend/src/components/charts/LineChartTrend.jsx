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

export default function LineChartTrend({
  data,
  title = "Attendance Trend (7 Days)",
}) {
  // Jika data kosong atau tidak valid, tampilkan placeholder
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">{title}</h2>
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-400">No attendance data available</p>
        </div>
      </div>
    );
  }

  // Hitung statistics untuk display
  const totalAttendance = data.reduce(
    (sum, item) => sum + (item.count || 0),
    0
  );
  const averageAttendance = Math.round(totalAttendance / data.length);
  const maxAttendance = Math.max(...data.map((item) => item.count || 0));
  const minAttendance = Math.min(...data.map((item) => item.count || 0));

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
        <div className="text-right">
          <p className="text-sm text-gray-400">
            Avg:{" "}
            <span className="text-blue-400 font-medium">
              {averageAttendance}
            </span>
          </p>
          <p className="text-xs text-gray-500">Total: {totalAttendance}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="day"
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#4b5563" }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#4b5563" }}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{
              fill: "#3b82f6",
              r: 5,
              strokeWidth: 2,
              stroke: "#1e40af",
            }}
            activeDot={{
              r: 7,
              fill: "#1e40af",
              stroke: "#3b82f6",
              strokeWidth: 2,
            }}
            name="Attendance"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Statistics Summary */}
      <div className="flex justify-between mt-4 text-xs text-gray-400">
        <span>Max: {maxAttendance}</span>
        <span>Min: {minAttendance}</span>
        <span>Range: {maxAttendance - minAttendance}</span>
      </div>
    </div>
  );
}
