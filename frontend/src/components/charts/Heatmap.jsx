export default function Heatmap({ data }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-700">Violations by Hour of Day</h2>
      <div className="grid grid-cols-7 gap-3">
        {data.map((item, i) => (
          <div
            key={i}
            className={`p-3 text-center rounded-xl text-sm font-medium ${
              item.violations > 7
                ? "bg-orange-500 text-white"
                : item.violations > 4
                ? "bg-yellow-400 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {item.hour}:00<br />
            <span className="font-bold">{item.violations}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
