import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function BarChartTrend({ data, totalEmployees = 0 }) {
  // Calculate dynamic range based on total employees (sama seperti LineChartTrend)
  const maxRange = Math.max(totalEmployees * 1.2, 10);
  const roundedMax = Math.ceil(maxRange / 10) * 10;
  
  // Generate ticks dynamically (5 ticks)
  const tickInterval = Math.ceil(roundedMax / 4);
  const ticks = [0, tickInterval, tickInterval * 2, tickInterval * 3, roundedMax];
  
  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">
        Top Departments by Attendance
      </h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="type" stroke="#9ca3af" />
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
          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
