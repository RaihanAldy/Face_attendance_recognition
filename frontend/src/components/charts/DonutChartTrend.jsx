import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function DonutChart({ value }) {
  const data = [
    { name: "Compliant", value },
    { name: "Violation", value: 100 - value },
  ];
  const COLORS = ["#f59e0b", "#e5e7eb"];

  return (
    <div className="bg-white p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-700">Compliance Rate</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-3xl font-bold text-yellow-500">{value}%</p>
    </div>
  );
}
