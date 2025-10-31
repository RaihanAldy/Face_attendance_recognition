const AttendanceFilter = ({
  filter,
  setFilter,
  checkFilters,
  setCheckFilters,
}) => (
  <div className="flex flex-wrap items-center gap-3 mb-6">
    {["all", "today"].map((f) => (
      <button
        key={f}
        onClick={() => setFilter(f)}
        className={`px-4 py-2 rounded-lg border ${
          filter === f
            ? "border-emerald-500 bg-slate-800 text-emerald-400"
            : "border-slate-600 bg-slate-700 text-slate-300 hover:border-emerald-500"
        }`}
      >
        {f === "all" ? "All" : "Today"}
      </button>
    ))}

    {["checkin", "checkout"].map((key) => (
      <button
        key={key}
        onClick={() =>
          setCheckFilters((prev) => ({ ...prev, [key]: !prev[key] }))
        }
        className={`px-4 py-2 rounded-lg border ${
          checkFilters[key]
            ? "border-emerald-500 bg-slate-800 text-emerald-400"
            : "border-slate-600 bg-slate-700 text-slate-300 hover:border-emerald-500"
        }`}
      >
        {key === "checkin" ? "Check In" : "Check Out"}
      </button>
    ))}
  </div>
);

export default AttendanceFilter;
