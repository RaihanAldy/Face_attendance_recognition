export default function SummaryCard({ title, value, color, subtitle }) {
  return (
    <div
      className={`bg-slate-900 p-6 rounded-2xl border-l-4 ${color} shadow-md`}
    >
      <h3 className="text-gray-400 text-sm font-medium mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
    </div>
  );
}
