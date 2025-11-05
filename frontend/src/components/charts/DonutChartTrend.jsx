import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function DonutChart({ value, isLoading }) {
  const data = [
    { name: "Compliant", value },
    { name: "Violation", value: 100 - value },
  ];
  const COLORS = ["#3b82f6", "#e5e7eb"];

  return (
    <div className="bg-slate-900 p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-200">
        Compliance Rate
      </h2>
      {isLoading ? (
        <div className="h-[250px] flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-3xl font-bold text-blue-500">
            {value}%
          </p>
        </>
      )}
    </div>
  );
}
