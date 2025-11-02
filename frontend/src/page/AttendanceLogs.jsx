import React, { useState, useEffect } from "react";
import { useAttendanceData } from "../utils/attendanceData";
import AttendanceFilter from "../components/attendance/AttendanceFilter";
import { calculateWorkingHours, formatDateTime } from "../utils/timeUtils";
import { exportCSV } from "../utils/csvExport";
import { getTableHeaders, renderTableCell } from "../utils/tableUtils";

const AttendanceLogs = () => {
  const [filter, setFilter] = useState("today");
  const [checkFilters, setCheckFilters] = useState({
    checkin: false,
    checkout: false,
  });

  const { attendanceData, loading, error, fetchAttendanceData } =
    useAttendanceData(filter);

  useEffect(() => {
    fetchAttendanceData(filter);
  }, [filter]);

  // ✅ Filter logic berdasarkan struktur baru (1 doc per employee per day)
  const filteredData = attendanceData.reduce((acc, record) => {
    const {
      employeeId,
      name,
      checkIn,
      checkInStatus,
      checkOut,
      checkOutStatus,
      workingHours,
    } = record;

    // Skip jika tidak ada data sama sekali
    if (!checkIn && !checkOut) {
      console.log("⚠️ Skipping record - no checkin/checkout data:", employeeId);
      return acc;
    }

    // ---- CASE 1: Pair mode (check-in & check-out ON) ----
    if (checkFilters.checkin && checkFilters.checkout) {
      // Tampilkan dalam format paired (1 row per employee)
      acc.push({
        employeeId,
        name: name || "Unknown Employee",
        checkIn,
        checkInStatus,
        checkOut,
        checkOutStatus,
        workingHours,
      });
      return acc;
    }

    // ---- CASE 2: Only check-in filter ----
    if (checkFilters.checkin && !checkFilters.checkout) {
      if (checkIn) {
        acc.push({
          employeeId,
          name: name || "Unknown Employee",
          checkIn,
          status: checkInStatus || "ontime",
          action: "Check In",
          timestamp: checkIn,
        });
      }
      return acc;
    }

    // ---- CASE 3: Only check-out filter ----
    if (!checkFilters.checkin && checkFilters.checkout) {
      if (checkOut) {
        acc.push({
          employeeId,
          name: name || "Unknown Employee",
          checkOut,
          status: checkOutStatus || "ontime",
          action: "Check Out",
          timestamp: checkOut,
        });
      }
      return acc;
    }

    // ---- CASE 4: DEFAULT — show all (expand ke 2 rows jika ada check-in dan check-out) ----
    if (!checkFilters.checkin && !checkFilters.checkout) {
      // Buat row untuk check-in jika ada
      if (checkIn) {
        acc.push({
          employeeId,
          name: name || "Unknown Employee",
          status: checkInStatus || "ontime",
          action: "Check In",
          timestamp: checkIn,
        });
      }

      // Buat row untuk check-out jika ada
      if (checkOut) {
        acc.push({
          employeeId,
          name: name || "Unknown Employee",
          status: checkOutStatus || "ontime",
          action: "Check Out",
          timestamp: checkOut,
        });
      }
    }

    return acc;
  }, []);

  const handleExportCSV = () => {
    exportCSV(
      filteredData,
      filter,
      checkFilters,
      formatDateTime,
      calculateWorkingHours
    );
  };

  console.group("🧩 Attendance Data Debug");
  console.log("Raw data from backend:", attendanceData);
  console.log("Filtered & processed data:", filteredData);
  console.log("Active filters:", { filter, checkFilters });
  console.groupEnd();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header dengan Refresh dan Export Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Attendance Log
            </h1>
            <p className="text-slate-400">
              Monitor and manage employee attendance
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fetchAttendanceData(filter)}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400"
            >
              🔄 {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:bg-emerald-400"
            >
              📁 Export CSV
            </button>
          </div>
        </div>

        <AttendanceFilter
          filter={filter}
          setFilter={setFilter}
          checkFilters={checkFilters}
          setCheckFilters={setCheckFilters}
        />

        {error && (
          <div className="text-red-400 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="text-blue-400 text-center py-12">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3"></div>
            <p>Memuat data absensi...</p>
          </div>
        )}

        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-lg mb-4">
              📭 Tidak ada data untuk filter yang dipilih
            </p>
            {attendanceData.length > 0 && (
              <p className="text-slate-500 text-sm">
                Found {attendanceData.length} records in database, but no
                check-in/check-out data.
                <br />
                Try changing your filter settings.
              </p>
            )}
          </div>
        )}

        {!loading && filteredData.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden border border-slate-700/50 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    {getTableHeaders(filter, checkFilters).map((header, i) => (
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
                      key={
                        record._id ||
                        `${record.employeeId}-${
                          record.timestamp || record.checkIn || record.checkOut
                        }-${rowIndex}`
                      }
                      className="hover:bg-slate-700/30 transition-colors duration-150"
                    >
                      {getTableHeaders(filter, checkFilters).map(
                        (header, cellIndex) =>
                          renderTableCell(
                            record,
                            header,
                            cellIndex,
                            formatDateTime
                          )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && filteredData.length > 0 && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            Menampilkan {filteredData.length} record{" "}
            {filter === "today" ? "hari ini" : "total"}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
