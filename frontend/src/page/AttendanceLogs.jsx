import React, { useState, useEffect } from "react";
import { Calendar, Download, RefreshCw, Loader2, Filter } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AttendanceLogs = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("today");
  const [checkFilters, setCheckFilters] = useState({
    checkin: false,
    checkout: false,
  });

  useEffect(() => {
    fetchAttendanceData();
  }, [filter]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance?filter=${filter}`);
      if (!response.ok) throw new Error("Failed to fetch attendance data");
      
      const data = await response.json();
      console.log("📊 Attendance data from API:", data);
      console.log("📊 Sample record structure:", data[0]);
      console.log("📊 Full first record:", JSON.stringify(data[0], null, 2));
      setAttendanceData(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = attendanceData.reduce((acc, record) => {
    const {
      employee_id,
      employee_name,
      checkin,
      checkout,
      date,
    } = record;

    console.log("Processing record:", { employee_id, employee_name, checkin, checkout, date });

    // ✅ PERBAIKAN: Jika tidak ada checkin DAN checkout, skip
    if (!checkin && !checkout) {
      console.log("Skipping record - no checkin/checkout");
      return acc;
    }

    // CASE 1: Both check-in & check-out filter ON (paired view)
    if (checkFilters.checkin && checkFilters.checkout) {
      acc.push({
        employeeId: employee_id,
        name: employee_name || "Unknown Employee",
        checkIn: checkin?.timestamp,
        checkInStatus: checkin?.status || "ontime",
        checkOut: checkout?.timestamp,
        checkOutStatus: checkout?.status || "ontime",
        date: date,
      });
      return acc;
    }

    // CASE 2: Only check-in filter
    if (checkFilters.checkin && !checkFilters.checkout) {
      if (checkin) {
        acc.push({
          employeeId: employee_id,
          name: employee_name || "Unknown Employee",
          status: checkin.status || "ontime",
          action: "Check In",
          timestamp: checkin.timestamp,
          date: date,
        });
      }
      return acc;
    }

    // CASE 3: Only check-out filter
    if (!checkFilters.checkin && checkFilters.checkout) {
      if (checkout) {
        acc.push({
          employeeId: employee_id,
          name: employee_name || "Unknown Employee",
          status: checkout.status || "ontime",
          action: "Check Out",
          timestamp: checkout.timestamp,
          date: date,
        });
      }
      return acc;
    }

    // CASE 4: No filters (show all, expand to 2 rows)
    // ✅ PERBAIKAN: Selalu tampilkan checkin jika ada
    if (checkin) {
      acc.push({
        employeeId: employee_id,
        name: employee_name || "Unknown Employee",
        status: checkin.status || "ontime",
        action: "Check In",
        timestamp: checkin.timestamp,
        date: date,
      });
    }

    // ✅ PERBAIKAN: Selalu tampilkan checkout jika ada
    if (checkout) {
      acc.push({
        employeeId: employee_id,
        name: employee_name || "Unknown Employee",
        status: checkout.status || "ontime",
        action: "Check Out",
        timestamp: checkout.timestamp,
        date: date,
      });
    }

    return acc;
  }, []);

  // ✅ TAMBAHKAN DEBUG LOG
  console.log("📊 Filtered data count:", filteredData.length);
  console.log("📊 Sample filtered record:", filteredData[0]);

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ontime: "bg-green-500/20 text-green-400 border-green-500/30",
      late: "bg-red-500/20 text-red-400 border-red-500/30",
      early: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };

    const labels = {
      ontime: "On Time",
      late: "Late",
      early: "Early Leave",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.ontime}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = checkFilters.checkin && checkFilters.checkout
      ? ["Employee ID", "Name", "Date", "Check In", "Check In Status", "Check Out", "Check Out Status"]
      : ["Employee ID", "Name", "Action", "Timestamp", "Status", "Date"];

    const csvContent = [
      headers.join(","),
      ...filteredData.map((record) => {
        if (checkFilters.checkin && checkFilters.checkout) {
          return [
            record.employeeId,
            record.name,
            record.date,
            formatDateTime(record.checkIn),
            record.checkInStatus,
            formatDateTime(record.checkOut),
            record.checkOutStatus,
          ].join(",");
        } else {
          return [
            record.employeeId,
            record.name,
            record.action,
            formatDateTime(record.timestamp),
            record.status,
            record.date,
          ].join(",");
        }
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${filter}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTableHeaders = () => {
    if (checkFilters.checkin && checkFilters.checkout) {
      return ["Employee ID", "Name", "Date", "Check In", "Check In Status", "Check Out", "Check Out Status"];
    }
    return ["Employee ID", "Name", "Action", "Timestamp", "Status", "Date"];
  };

  const renderTableCell = (record, header) => {
    const cellClass = "px-6 py-4 whitespace-nowrap text-slate-300";

    switch (header) {
      case "Employee ID":
        return <td key={header} className={`${cellClass} text-blue-400 font-medium`}>{record.employeeId}</td>;
      case "Name":
        return <td key={header} className={`${cellClass} text-white font-medium`}>{record.name}</td>;
      case "Date":
        return <td key={header} className={cellClass}>{record.date}</td>;
      case "Action":
        return <td key={header} className={cellClass}>{record.action}</td>;
      case "Check In":
        return <td key={header} className={cellClass}>{formatDateTime(record.checkIn)}</td>;
      case "Check Out":
        return <td key={header} className={cellClass}>{formatDateTime(record.checkOut)}</td>;
      case "Timestamp":
        return <td key={header} className={cellClass}>{formatDateTime(record.timestamp)}</td>;
      case "Status":
        return <td key={header} className={cellClass}>{getStatusBadge(record.status)}</td>;
      case "Check In Status":
        return <td key={header} className={cellClass}>{getStatusBadge(record.checkInStatus)}</td>;
      case "Check Out Status":
        return <td key={header} className={cellClass}>{getStatusBadge(record.checkOutStatus)}</td>;
      default:
        return <td key={header} className={cellClass}>-</td>;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Attendance Logs</h1>
            <p className="text-slate-400">Monitor and manage employee attendance records</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAttendanceData}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:bg-emerald-400 transition-colors"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-white">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Date Range</label>
              <div className="flex gap-2">
                {["today", "week", "month", "all"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilter(option)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === option
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Check Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Check Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkFilters.checkin}
                    onChange={(e) =>
                      setCheckFilters((prev) => ({ ...prev, checkin: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Check In</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkFilters.checkout}
                    onChange={(e) =>
                      setCheckFilters((prev) => ({ ...prev, checkout: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Check Out</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info - Hapus setelah fixed */}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-slate-400">Loading attendance data...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No attendance records found</p>
            <p className="text-slate-500 text-sm">
              {attendanceData.length > 0
                ? "Try changing your filter settings"
                : "No data available for the selected period"}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && filteredData.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden border border-slate-700/50 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    {getTableHeaders().map((header, i) => (
                      <th
                        key={i}
                        className="px-6 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-sm"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredData.map((record, rowIndex) => (
                    <tr
                      key={`${record.employeeId}-${record.timestamp || record.checkIn}-${rowIndex}`}
                      className="hover:bg-slate-700/30 transition-colors duration-150"
                    >
                      {getTableHeaders().map((header) => renderTableCell(record, header))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && filteredData.length > 0 && (
          <div className="mt-4 flex justify-between items-center text-slate-400 text-sm">
            <span>
              Showing {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}{" "}
              {filter === "today" ? "today" : `(${filter})`}
            </span>
            <span>Last updated: {new Date().toLocaleTimeString("id-ID")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;