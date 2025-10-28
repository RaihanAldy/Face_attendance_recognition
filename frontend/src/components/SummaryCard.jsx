export default function SummaryCard({ title, value, color }) {
  return (
    <div
      className={`bg-white border-l-4 ${color} shadow-sm rounded-lg p-4 flex flex-col`}
    >
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
  );
}
