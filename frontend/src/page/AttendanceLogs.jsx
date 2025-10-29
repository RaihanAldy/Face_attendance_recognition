import React, { useState } from "react";
import { useAttendanceData } from "../utils/attendanceData";
import AttendanceFilter from "../components/attendance/AttendanceFilter";
import AttendanceHeader from "../components/attendance/AttendanceHeader";
import { calculateWorkingHours, formatDateTime } from "../utils/timeUtils";
import { exportCSV } from "../utils/cvsExport";
import { getTableHeaders, renderTableCell } from "../utils/tableUtils";

const AttendanceLog = () => {
  const { attendanceData, loading, error, fetchAttendanceData } =
    useAttendanceData();
  const [filter, setFilter] = useState("today");
  const [checkFilters, setCheckFilters] = useState({
    checkin: false,
    checkout: false,
  });

  const handleExportCSV = () =>
    exportCSV(attendanceData, formatDateTime, calculateWorkingHours);

  // Filtered data
  const filteredData = attendanceData
    .filter((record) => {
      const today = new Date();
      const recordDate = new Date(record.timestamp);
      const isToday =
        recordDate.getDate() === today.getDate() &&
        recordDate.getMonth() === today.getMonth() &&
        recordDate.getFullYear() === today.getFullYear();

      if (filter === "today") return isToday;
      return true;
    })

    .reduce((acc, record) => {
      const employeeId = record.employeeId || record.employee_id;

      // Jika checkin + checkout keduanya aktif, gabungkan records
      if (checkFilters.checkin && checkFilters.checkout) {
        const existing = acc.find((r) => r.employeeId === employeeId);

        if (existing) {
          // Update existing record
          if (record.status === "check_in" || record.status === "check-in") {
            existing.checkIn = record.timestamp;
          }
          if (record.status === "check_out" || record.status === "check-out") {
            existing.checkOut = record.timestamp;
          }
        } else {
          // Create new grouped record
          acc.push({
            employeeId: employeeId,
            name: record.employees,
            checkIn:
              record.status === "check_in" || record.status === "check-in"
                ? record.timestamp
                : null,
            checkOut:
              record.status === "check_out" || record.status === "check-out"
                ? record.timestamp
                : null,
          });
        }
        return acc;
      }

      // Jika hanya checkin aktif
      if (checkFilters.checkin && !checkFilters.checkout) {
        if (record.status === "check_in" || record.status === "check-in") {
          acc.push({
            employeeId: employeeId,
            name: record.employees || record.name,
            checkIn: record.timestamp,
          });
        }
        return acc;
      }

      // Jika hanya checkout aktif
      if (checkFilters.checkout && !checkFilters.checkin) {
        if (record.status === "check_out" || record.status === "check-out") {
          acc.push({
            employeeId: employeeId,
            name: record.employees || record.name,
            checkOut: record.timestamp,
          });
        }
        return acc;
      }

      // Default: today only (tampilkan semua records)
      acc.push({
        employeeId: employeeId,
        name: record.employees || record.name,
        status: record.status,
        timestamp: record.timestamp,
      });

      return acc;
    }, []);
  console.group("🧩 Attendance Data Debug");
  console.log("Raw data from backend:", attendanceData);
  console.log("Filtered & reduced data:", filteredData);
  console.log("Active filters:", { filter, checkFilters });
  console.groupEnd();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <AttendanceHeader
          onRefresh={fetchAttendanceData}
          onExport={handleExportCSV}
          loading={loading}
          dataLength={attendanceData.length}
        />
        <AttendanceFilter
          filter={filter}
          setFilter={setFilter}
          checkFilters={checkFilters}
          setCheckFilters={setCheckFilters}
        />

        {error && (
          <div className="text-red-400 p-4 bg-red-500/10 rounded-xl">
            {error}
          </div>
        )}
        {loading && (
          <div className="text-blue-400 text-center py-6">
            Memuat data absensi...
          </div>
        )}
        {!loading && !error && filteredData.length === 0 && (
          <p className="text-slate-300 text-center py-6">
            Tidak ada data untuk filter "{filter}"
          </p>
        )}

        {!loading && filteredData.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  {getTableHeaders(filter, checkFilters).map((header, i) => (
                    <th
                      key={i}
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredData.map((record, rowIndex) => (
                  <tr
                    key={record._id || rowIndex}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    {getTableHeaders(filter, checkFilters).map(
                      (header, cellIndex) =>
                        renderTableCell(
                          record,
                          header,
                          cellIndex,
                          filter,
                          checkFilters
                        )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLog;
