export default function SummaryCard({ title, value, color, isLoading }) {
  return (
    <div
      className={`bg-slate-900 border-l-4 ${color} shadow-sm rounded-lg p-4 flex flex-col`}
    >
      <h3 className="text-sm font-medium text-gray-200">{title}</h3>
      {isLoading ? (
        <div className="text-2xl font-bold text-gray-300 mt-2 animate-pulse">
          ...
        </div>
      ) : (
        <p className="text-2xl font-bold text-gray-300 mt-2">{value}</p>
      )}
    </div>
  );
}
