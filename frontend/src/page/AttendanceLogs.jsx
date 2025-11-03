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

  // ✅ Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { attendanceData, loading, error, fetchAttendanceData } =
    useAttendanceData(filter);

  useEffect(() => {
    fetchAttendanceData(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ✅ Filter logic (dari code pertama)
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

    if (!checkIn && !checkOut) return acc;

    if (checkFilters.checkin && checkFilters.checkout) {
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

    if (!checkFilters.checkin && !checkFilters.checkout) {
      if (checkIn) {
        acc.push({
          employeeId,
          name: name || "Unknown Employee",
          status: checkInStatus || "ontime",
          action: "Check In",
          timestamp: checkIn,
        });
      }

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

  // ✅ Reset pagination saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, checkFilters]);

  // ✅ Pagination slice
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

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
  console.log("Raw data:", attendanceData);
  console.log("Filtered:", filteredData);
  console.groupEnd();

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

        {/* Filter */}
        <AttendanceFilter
          filter={filter}
          setFilter={setFilter}
          checkFilters={checkFilters}
          setCheckFilters={setCheckFilters}
        />

        {/* Error & Loading */}
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
          </div>
        )}

        {/* Table */}
        {!loading && filteredData.length > 0 && (
          <>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden border border-slate-700/50 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      {getTableHeaders(filter, checkFilters).map(
                        (header, i) => (
                          <th
                            key={i}
                            className="px-6 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-sm"
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {currentData.map((record, rowIndex) => (
                      <tr
                        key={`${record.employeeId}-${rowIndex}`}
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

            {/* ✅ Pagination */}
            <div className="mt-6 flex items-center justify-between px-4 py-3 bg-slate-800/50 rounded-xl">
              <div className="text-sm text-slate-400">
                Showing {Math.min(startIndex + 1, filteredData.length)}–
                {Math.min(startIndex + itemsPerPage, filteredData.length)} of{" "}
                {filteredData.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    currentPage === 1
                      ? "bg-slate-700/30 text-slate-500 cursor-not-allowed"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  }`}
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? "bg-slate-700/30 text-slate-500 cursor-not-allowed"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
