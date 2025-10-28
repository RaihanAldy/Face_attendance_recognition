import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function LineChartTrend({data}) {
  return (
    <div className="bg-navy-900 p-4 rounded-lg shadow-md border border-navy-800">
      <h2 className="text-lg font-semibold mb-3 text-sky-400">Violations Trend (7 Days)</h2>
      <div className="p-2">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="day" 
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
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '0.375rem',
              }}
              labelStyle={{ color: '#7dd3fc' }}
              itemStyle={{ color: '#7dd3fc' }}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#0ea5e9" 
              strokeWidth={2}
              dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#bae6fd' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
