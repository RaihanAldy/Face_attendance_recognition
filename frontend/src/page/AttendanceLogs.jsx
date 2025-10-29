import React, { useState, useEffect } from "react";
import { useAttendanceData } from "../utils/attendanceData";
import AttendanceFilter from "../components/attendance/AttendanceFilter";
import AttendanceHeader from "../components/attendance/AttendanceHeader";
import { calculateWorkingHours, formatDateTime } from "../utils/timeUtils";
import { exportCSV } from "../utils/cvsExport";
import { getTableHeaders, renderTableCell } from "../utils/tableUtils";

const AttendanceLog = () => {
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

  const handleExportCSV = () =>
    exportCSV(attendanceData, formatDateTime, calculateWorkingHours);

  const filteredData = attendanceData
    .filter((record) => {
      if (filter === "all") return true;

      const today = new Date();
      const recordDate = new Date(record.timestamp);
      return (
        recordDate.getDate() === today.getDate() &&
        recordDate.getMonth() === today.getMonth() &&
        recordDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((acc, record) => {
      const employeeId = record.employeeId;
      const employeeName = record.name;

      const isCheckIn = record.action === "check-in";
      const isCheckOut = record.action === "check-out";

      // Jika checkin + checkout filter aktif, gabungkan records per employee
      if (checkFilters.checkin && checkFilters.checkout) {
        let existing = acc.find((r) => r.employeeId === employeeId);
        if (!existing) {
          existing = {
            employeeId,
            name: employeeName,
            checkIn: null,
            checkOut: null,
          };
          acc.push(existing);
        }
        if (isCheckIn) existing.checkIn = record.timestamp;
        if (isCheckOut) existing.checkOut = record.timestamp;
        return acc;
      }

      // Jika hanya check-in aktif
      if (checkFilters.checkin && !checkFilters.checkout && isCheckIn) {
        acc.push({ employeeId, name: employeeName, checkIn: record.timestamp });
        return acc;
      }

      // Jika hanya check-out aktif
      if (checkFilters.checkout && !checkFilters.checkin && isCheckOut) {
        acc.push({
          employeeId,
          name: employeeName,
          checkOut: record.timestamp,
        });
        return acc;
      }

      // Default: tampilkan semua records (untuk filter "all" atau "today")
      acc.push({
        employeeId,
        name: employeeName,
        status: record.status, // ontime / late / early
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
                        renderTableCell(record, header, cellIndex)
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
