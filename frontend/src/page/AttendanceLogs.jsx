import React, { useState, useEffect } from "react";
import { useAttendanceData } from "../utils/attendanceData";
import AttendanceFilter from "../components/attendance/AttendanceFilter";
import AttendanceHeader from "../components/attendance/AttendanceHeader";
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

  const filteredData = attendanceData.reduce((acc, record) => {
    const { employeeId, name, action, timestamp, status, workDuration } =
      record;

    // ---- CASE: Pair mode (check-in & check-out ON) ----
    if (checkFilters.checkin && checkFilters.checkout) {
      let existing = acc.find((r) => r.employeeId === employeeId);

      if (!existing) {
        existing = {
          employeeId,
          name,
          checkIn: null,
          checkInStatus: null,
          checkOut: null,
          checkOutStatus: null,
          workingHours: null,
        };
        acc.push(existing);
      }

      if (action === "check-in") {
        existing.checkIn = timestamp;
        existing.checkInStatus = status;
      }

      if (action === "check-out") {
        existing.checkOut = timestamp;
        existing.checkOutStatus = status;
        existing.workingHours = workDuration
          ? `${Math.floor(workDuration / 60)}h ${workDuration % 60}m`
          : "-";
      }

      return acc;
    }

    // ---- CASE: only check-in (HANYA tampilkan check-in) ----
    if (checkFilters.checkin && !checkFilters.checkout) {
      if (action === "check-in") {
        acc.push({
          employeeId,
          name,
          checkIn: timestamp,
          status,
          action: "Check In",
          timestamp,
        });
      }
      return acc;
    }

    // ---- CASE: only check-out (HANYA tampilkan check-out) ----
    if (!checkFilters.checkin && checkFilters.checkout) {
      if (action === "check-out") {
        acc.push({
          employeeId,
          name,
          checkOut: timestamp,
          status,
          action: "Check Out",
          timestamp,
        });
      }
      return acc;
    }

    // ---- DEFAULT — show all individual logs (jika tidak ada filter aktif) ----
    if (!checkFilters.checkin && !checkFilters.checkout) {
      acc.push({
        employeeId,
        name,
        status,
        action: action === "check-in" ? "Check In" : "Check Out",
        timestamp,
      });
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
  console.log("Active filters:", { filter, checkFilters });

  // Debug: Show action values
  if (attendanceData.length > 0) {
    console.log(
      "🔍 Action values in raw data:",
      attendanceData.map((r) => ({
        id: r.employeeId,
        action: r.action,
        type: typeof r.action,
      }))
    );
  }

  console.log("Filtered & processed data:", filteredData);
  console.groupEnd();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <AttendanceHeader
          onRefresh={() => fetchAttendanceData(filter)}
          onExport={handleExportCSV}
          loading={loading}
          dataLength={filteredData.length}
        />
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
            <p className="text-slate-400 text-lg">
              📭 Tidak ada data untuk filter yang dipilih
            </p>
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
                        `${record.employeeId}-${record.timestamp}-${rowIndex}`
                      }
                      className="hover:bg-slate-700/30 transition-colors duration-150"
                    >
                      {getTableHeaders(filter, checkFilters).map(
                        (header, cellIndex) =>
                          renderTableCell(
                            record,
                            header,
                            cellIndex,
                            formatDateTime,
                            calculateWorkingHours
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
