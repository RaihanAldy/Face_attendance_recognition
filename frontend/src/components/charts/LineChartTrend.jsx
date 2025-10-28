import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function LineChartTrend({data}) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-700">Violations Trend (7 Days)</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
