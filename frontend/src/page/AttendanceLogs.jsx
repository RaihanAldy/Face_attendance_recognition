import React, { useState, useEffect } from "react";
import { Calendar, Download, RefreshCw, Loader2, Filter } from "lucide-react";


const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  // ... (setelah useEffect)

  // ✅ Filter logic (SUDAH DIPERBAIKI)
  const filteredData = attendanceData.reduce((acc, record) => {
    // Variabel ini berasal dari record (menggunakan underscore dan huruf kecil)
    const { employee_id, employee_name, checkin, checkout, date } = record;

    // Gunakan 'checkin' dan 'checkout' (huruf kecil)
    if (!checkin && !checkout) return acc;

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

    // Bagian ini juga diperbaiki (sebelumnya menggunakan variabel yang salah)
    if (!checkFilters.checkin && !checkFilters.checkout) {
      if (checkin) {
        acc.push({
          employeeId: employee_id, // <-- Diperbaiki
          name: employee_name || "Unknown Employee", // <-- Diperbaiki
          status: checkin.status || "ontime", // <-- Diperbaiki
          action: "Check In",
          timestamp: checkin.timestamp, // <-- Diperbaiki
          date: date, // <-- Ditambahkan
        });
      }

      if (checkout) {
        acc.push({
          employeeId: employee_id, // <-- Diperbaiki
          name: employee_name || "Unknown Employee", // <-- Diperbaiki
          status: checkout.status || "ontime", // <-- Diperbaiki
          action: "Check Out",
          timestamp: checkout.timestamp, // <-- Diperbaiki
          date: date, // <-- Ditambahkan
        });
      }
    }

    return acc;
  }, []);

  // ... (sisa kode Anda)

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
              Attendance Logs
            </h1>
            <p className="text-slate-400">
              Monitor and manage employee attendance records
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAttendanceData}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400 transition-colors"
            >
              <RefreshCw
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
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

        {/* Filter */}
        <AttendanceFilter
          filter={filter}
          setFilter={setFilter}
          checkFilters={checkFilters}
          setCheckFilters={setCheckFilters}
        />

        {/* Error & Loading */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            ⚠️ {error}
          </div>
        )}
        {loading && (
          <div className="flex justify-center items-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-slate-400">
              Loading attendance data...
            </span>
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
