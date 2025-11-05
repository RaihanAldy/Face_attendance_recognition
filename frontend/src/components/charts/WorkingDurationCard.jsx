export default function WorkingDurationCard({ data, color }) {
  const { average, distribution } = data;

  return (
    <div
      className={`bg-slate-900 p-6 rounded-2xl border-l-4 ${color} shadow-md`}
    >
      <h3 className="text-gray-400 text-sm font-medium mb-2">
        Average Working Hours
      </h3>
      <p className="text-3xl font-bold text-white mb-4">{average}h</p>

      <div className="space-y-2">
        {distribution.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">{item.range}</span>
            <span className="text-white font-medium">
              {item.count} employees
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
