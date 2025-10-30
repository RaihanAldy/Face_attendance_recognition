const AttendanceHeader = ({ onRefresh, onExport, loading, dataLength }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Attendance Log</h1>
      <p className="text-slate-400">Monitor and manage employee attendance</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400"
      >
        🔄 {loading ? "Loading..." : "Refresh"}
      </button>
      <button
        onClick={onExport}
        disabled={dataLength === 0}
        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:bg-emerald-400"
      >
        📁 Export CSV
      </button>
    </div>
  </div>
);

export default AttendanceHeader;
