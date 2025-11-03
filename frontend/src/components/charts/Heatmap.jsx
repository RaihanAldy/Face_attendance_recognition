export default function Heatmap({ data }) {
  // Find max value dan peak hour
  const maxCheckIns = Math.max(...data.map(item => item.checkIns), 1);
  const peakHour = data.reduce((max, item) => 
    item.checkIns > max.checkIns ? item : max, 
    { hour: '00', checkIns: 0 }
  );

  // Color mapping berdasarkan absolute values (untuk perusahaan menengah)
  const getColorClass = (count) => {
    if (count >= 70) {
      return "bg-red-500 text-white shadow-lg shadow-red-500/50"; // 🔴 Very High (≥70)
    } else if (count >= 45) {
      return "bg-orange-500 text-white shadow-md shadow-orange-500/30"; // 🟠 High (≥45)
    } else if (count >= 22) {
      return "bg-yellow-500 text-gray-900 shadow-sm shadow-yellow-500/20"; // 🟡 Medium (≥22)
    } else if (count >= 9) {
      return "bg-blue-500 text-white"; // 🔵 Low (≥9)
    } else if (count > 0) {
      return "bg-slate-600 text-gray-300"; // ⚫ Very Low (>0)
    } else {
      return "bg-slate-800 text-gray-500"; // ⬛ None (0)
    }
  };

  return (
    <div className="bg-slate-900 p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-200">
        Check-in Activity by Hour
      </h2>
      <div className="grid grid-cols-6 gap-2">
        {data.map((item, i) => (
          <div
            key={i}
            className={`p-3 text-center rounded-xl text-xs font-medium transition-all ${getColorClass(item.checkIns)}`}
          >
            {item.hour}:00
            <br />
            <span className="font-bold text-sm">{item.checkIns}</span>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 flex-wrap text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-400">≥70</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span className="text-gray-400">≥45</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-400">≥22</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-400">≥9</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-slate-600 rounded"></div>
          <span className="text-gray-400">&gt;0</span>
        </div>
      </div>

      {peakHour.checkIns > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Peak hour: {peakHour.hour}:00 ({peakHour.checkIns} check-ins)
        </p>
      )}
    </div>
  );
}
