export default function SummaryCard({ title, value, color, bgColor = "bg-navy-900", textColor = "text-sky-100" }) {
  return (
    <div
      className={`${bgColor} border-l-4 ${color} shadow-lg rounded-lg p-4 flex flex-col border-t border-r border-b border-navy-800`}
    >
      <h3 className="text-sm font-medium text-sky-400">{title}</h3>
      <p className={`text-2xl font-bold ${textColor} mt-2`}>{value}</p>
    </div>
  );
}
