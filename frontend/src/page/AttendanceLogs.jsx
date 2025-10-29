import React, { useState, useEffect } from "react";

const AttendanceLog = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("toda");
  const [checkFilters, setCheckFilters] = useState({
    checkin: true,
    checkout: true,
  });

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`http://localhost:5000/api/attendance/log`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setAttendanceData(data);
    } catch (err) {
      console.error("Error fetching data absensi:", err);
      setError("Gagal memuat data Absensi. Periksa koneksi server.");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const filteredData = attendanceData.filter((record) => {
    const today = new Date();
    const recordDate = new Date(record.checkIn || record.timestamp);
    const isToday =
      recordDate.getDate() === today.getDate() &&
      recordDate.getMonth() === today.getMonth() &&
      recordDate.getFullYear() === today.getFullYear();

    const baseCondition =
      filter === "all" ? true : filter === "today" ? isToday : true;

    const checkCondition =
      (checkFilters.checkin && record.checkIn && !record.checkOut) ||
      (checkFilters.checkout && record.checkOut);

    return baseCondition && checkCondition;
  });

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "-";
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (end <= start) return "0h";
      const diffMs = end - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch {
      return "-";
    }
  };

  const handleRefresh = () => fetchAttendanceData();

  const handleExportCSV = () => {
    try {
      const headers = [
        "Nama",
        "ID Karyawan",
        "Check In",
        "Check Out",
        "Status",
        "Jam Kerja",
        "Confidence",
      ];

      const csvData = attendanceData.map((record) => [
        record.name || "-",
        record.employeeId || "-",
        formatDateTime(record.checkIn) || "-",
        formatDateTime(record.checkOut) || "-",
        record.checkOut
          ? "Selesai"
          : record.checkIn
          ? "Sedang Bekerja"
          : "Belum Check-In",
        calculateWorkingHours(record.checkIn, record.checkOut),
        record.confidence ? `${Math.round(record.confidence * 100)}%` : "-",
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Gagal mengexport data CSV");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Attendance Log
            </h1>
            <p className="text-slate-400">
              Monitor and manage employee attendance records
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed flex items-center gap-2"
            >
              🔄 {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={attendanceData.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed flex items-center gap-2"
            >
              📁 Export CSV
            </button>
          </div>
        </div>

        {/* ✅ Filter Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {["all", "today"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border ${
                filter === f
                  ? "border-emerald-500 bg-slate-800 text-emerald-400 shadow-md"
                  : "border-slate-600 bg-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
              }`}
            >
              {f === "all" ? "All" : "Today"}
            </button>
          ))}

          {/* ✅ Tombol Check In & Check Out tanpa checkbox */}
          {["checkin", "checkout"].map((key) => (
            <button
              key={key}
              onClick={() =>
                setCheckFilters((prev) => {
                  const newState = { ...prev, [key]: !prev[key] };
                  // Cegah agar keduanya tidak false
                  if (!newState.checkin && !newState.checkout) {
                    return prev; // batal toggle kalau dua-duanya jadi false
                  }
                  return newState;
                })
              }
              className={`px-4 py-2 rounded-lg font-medium text-sm border transition-all duration-200 ${
                checkFilters[key]
                  ? "border-emerald-500 bg-slate-800 text-emerald-400 shadow-md"
                  : "border-slate-600 bg-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
              }`}
            >
              {key === "checkin" ? "Check In" : "Check Out"}
            </button>
          ))}
        </div>

        {/* Status */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-blue-400 animate-pulse">
            Memuat data absensi...
          </div>
        )}

        {!loading && filteredData.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              Tidak ada data untuk filter "{filter}"
            </h3>
          </div>
        )}

        {/* Table */}
        {!loading && filteredData.length > 0 && (
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Karyawan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Jam Kerja
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredData.map((record, index) => {
                    const checkIn = record.checkIn
                      ? new Date(record.checkIn)
                      : null;
                    const checkOut = record.checkOut
                      ? new Date(record.checkOut)
                      : null;
                    const status =
                      checkIn && checkOut
                        ? "Selesai"
                        : checkIn
                        ? "Sedang Bekerja"
                        : "Belum Check-In";

                    const statusStyle = {
                      Selesai:
                        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                      "Sedang Bekerja":
                        "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                      "Belum Check-In":
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20",
                    }[status];

                    return (
                      <tr
                        key={record._id || index}
                        className="hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-medium">
                              {record.name?.charAt(0) ||
                                record.employeeId?.charAt(0) ||
                                "E"}
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                {record.name || `Employee ${record.employeeId}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-mono text-sm">
                          {record.employeeId}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {checkIn ? checkIn.toLocaleTimeString("id-ID") : "-"}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {checkOut
                            ? checkOut.toLocaleTimeString("id-ID")
                            : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1.5 text-xs font-medium rounded-full ${statusStyle}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {calculateWorkingHours(
                            record.checkIn,
                            record.checkOut
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLog;
