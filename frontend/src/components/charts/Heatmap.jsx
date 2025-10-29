export default function Heatmap({ data }) {
  return (
    <div className="bg-slate-900 p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-200">
        Check-in Activity by Hour
      </h2>
      <div className="grid grid-cols-6 gap-2">
        {data.map((item, i) => (
          <div
            key={i}
            className={`p-3 text-center rounded-xl text-xs font-medium transition-all ${
              item.checkIns > 200
                ? "bg-green-500 text-white shadow-lg"
                : item.checkIns > 50
                ? "bg-blue-500 text-white"
                : item.checkIns > 20
                ? "bg-cyan-400 text-gray-900"
                : item.checkIns > 5
                ? "bg-slate-600 text-gray-300"
                : "bg-slate-800 text-gray-500"
            }`}
          >
            {item.hour}:00
            <br />
            <span className="font-bold text-sm">{item.checkIns}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">
        Peak hours: 08:00 (245 check-ins)
      </p>
    </div>
  );
}
