import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function DonutChart({ value }) {
  const data = [
    { name: "Compliant", value },
    { name: "Violation", value: 100 - value },
  ];
  const COLORS = ["#0ea5e9", "#1e293b"];

  return (
    <div className="bg-navy-900 p-4 rounded-lg shadow-md border border-navy-800">
      <h2 className="text-lg font-semibold mb-3 text-sky-400">Compliance Rate</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie 
            data={data} 
            cx="50%" 
            cy="50%" 
            innerRadius={70} 
            outerRadius={100} 
            dataKey="value"
            stroke="#0f172a"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '0.375rem',
            }}
            itemStyle={{ color: '#7dd3fc' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-3xl font-bold text-sky-400 mt-4">{value}%</p>
      <div className="flex justify-center gap-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-500"></div>
          <span className="text-sky-300 text-sm">Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-navy-800"></div>
          <span className="text-sky-300 text-sm">Violation</span>
        </div>
      </div>
    </div>
  );
}
