export default function DailyCheckinsHeatmap({ data, totalEmployees = 0 }) {
  // Find max value dan peak day
  const maxCheckIns = Math.max(...data.map(item => item.checkIns), 1);
  const peakDay = data.reduce((max, item) => 
    item.checkIns > max.checkIns ? item : max, 
    { day: '1', dayName: 'Mon', checkIns: 0 }
  );

  // Get month name from first date
  const monthName = data.length > 0 
    ? new Date(data[0].date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'This Month';
  
  // Days in this month (dynamic: 28-31)
  const daysInMonth = data.length;

  // Calculate padding cells to start from Sunday
  // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  const firstDayOfMonth = data.length > 0 ? new Date(data[0].date).getDay() : 0;
  const paddingCells = Array(firstDayOfMonth).fill(null);

  // Dynamic color thresholds berdasarkan total employees
  // Adjusted ranges: Red = 80%+, Orange = 55%+, Yellow = 35%+, Blue = 15%+, Slate = >0%
  const thresholds = {
    red: Math.max(Math.ceil(totalEmployees * 0.8), 1),    // 80% attendance
    orange: Math.max(Math.ceil(totalEmployees * 0.55), 1), // 55% attendance
    yellow: Math.max(Math.ceil(totalEmployees * 0.35), 1), // 35% attendance
    blue: Math.max(Math.ceil(totalEmployees * 0.15), 1),  // 15% attendance
  };

  // Color mapping berdasarkan dynamic thresholds
  const getColorClass = (count) => {
    if (count >= thresholds.red) {
      return "bg-red-500 text-white shadow-lg shadow-red-500/50"; // 🔴 Very High (≥90%)
    } else if (count >= thresholds.orange) {
      return "bg-orange-500 text-white shadow-md shadow-orange-500/30"; // 🟠 High (≥60%)
    } else if (count >= thresholds.yellow) {
      return "bg-yellow-500 text-gray-900 shadow-sm shadow-yellow-500/20"; // 🟡 Medium (≥30%)
    } else if (count >= thresholds.blue) {
      return "bg-blue-500 text-white"; // 🔵 Low (≥12%)
    } else if (count > 0) {
      return "bg-slate-600 text-gray-300"; // ⚫ Very Low (>0)
    } else {
      return "bg-slate-800 text-gray-500"; // ⬛ None (0)
    }
  };

  // Highlight Sunday only
  const isSunday = (dayName) => {
    return dayName === 'Sun';
  };

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-200">
          Daily Check-in Activity
        </h2>
        <span className="text-xs text-gray-400 bg-slate-800 px-2 py-1 rounded">
          {monthName}
        </span>
      </div>
      
      {/* Day headers: Sun - Sat */}
      <div className="grid grid-cols-7 gap-2 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-semibold text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* Grid untuk 28-31 hari (dinamis), 7 kolom (1 minggu), mulai dari Minggu */}
      <div className="grid grid-cols-7 gap-2">
        {/* Padding cells untuk align ke hari pertama bulan */}
        {paddingCells.map((_, i) => (
          <div key={`padding-${i}`} className="invisible"></div>
        ))}
        
        {/* Actual day cells */}
        {data.map((item, i) => (
          <div
            key={i}
            className={`p-2 text-center rounded-xl text-xs font-medium transition-all ${getColorClass(item.checkIns)} ${
              isSunday(item.dayName) ? 'ring-2 ring-purple-500/50' : ''
            }`}
            title={`${item.date} (${item.dayName}): ${item.checkIns} check-ins`}
          >
            <div className="text-[10px] opacity-70">{item.dayName}</div>
            <div className="font-bold text-sm">{item.day}</div>
            <div className="text-[10px] font-semibold mt-1">{item.checkIns}</div>
          </div>
        ))}
      </div>
      
      {/* Legend - Dynamic based on total employees */}
      <div className="flex items-center justify-center gap-3 mt-3 flex-wrap text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-400">≥{thresholds.red}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span className="text-gray-400">≥{thresholds.orange}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-400">≥{thresholds.yellow}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-400">≥{thresholds.blue}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-slate-600 rounded"></div>
          <span className="text-gray-400">&gt;0</span>
        </div>
      </div>

      {peakDay.checkIns > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Peak day: {peakDay.date?.split('-')[2] || peakDay.day} {peakDay.dayName} ({peakDay.checkIns} check-ins)
        </p>
      )}
    </div>
  );
}
