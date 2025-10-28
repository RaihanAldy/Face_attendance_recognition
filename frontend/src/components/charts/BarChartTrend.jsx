import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function BarChartTrend({ data }) {
  return (
    <div className="bg-navy-900 p-4 rounded-lg shadow-md border border-navy-800">
      <h2 className="text-lg font-semibold mb-3 text-sky-400">Top Violations by PPE Type</h2>
      <div className="p-2">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="type" 
              stroke="#7dd3fc"
              tick={{ fill: '#7dd3fc' }}
              tickLine={{ stroke: '#7dd3fc' }}
            />
            <YAxis 
              stroke="#7dd3fc"
              tick={{ fill: '#7dd3fc' }}
              tickLine={{ stroke: '#7dd3fc' }}
            />
            <Tooltip
              cursor={{ fill: '#1e293b' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '0.375rem',
              }}
              labelStyle={{ color: '#7dd3fc' }}
              itemStyle={{ color: '#7dd3fc' }}
            />
            <Bar 
              dataKey="count" 
              fill="#0ea5e9"
              radius={[6, 6, 0, 0]}
              style={{ filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
