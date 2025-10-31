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

  const filteredData = attendanceData
    .filter((record) => {
      if (filter === "all") return true;

      const today = new Date();
      const recordDate = new Date(record.timestamp || record.date);
      return (
        recordDate.getDate() === today.getDate() &&
        recordDate.getMonth() === today.getMonth() &&
        recordDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((acc, record) => {
      // ✅ Ambil data dari struktur MongoDB yang sesuai
      const employeeId = record.employee_id || record.employeeId;
      const nama = record.employees || record.nama;
      const checkInTime = record.check_in_time;
      const checkOutTime = record.check_out_time;
      const checkInStatus = record.check_in_status;
      const checkOutStatus = record.check_out_status;
      const overallStatus = record.status;

      console.log("🔍 Processing record:", {
        employeeId,
        nama,
        checkInTime,
        checkOutTime,
        checkInStatus,
        checkOutStatus,
        overallStatus,
      });

      // ✅ Kasus 1: Kedua filter aktif (checkin + checkout)
      if (checkFilters.checkin && checkFilters.checkout) {
        let existing = acc.find((r) => r.employeeId === employeeId);

        if (!existing) {
          existing = {
            employeeId,
            nama,
            checkIn: checkInTime,
            checkInStatus: checkInStatus,
            checkOut: checkOutTime,
            checkOutStatus: checkOutStatus,
            workingHours: record.work_duration
              ? `${Math.floor(record.work_duration / 60)}h ${
                  record.work_duration % 60
                }m`
              : checkInTime && checkOutTime
              ? calculateWorkingHours(checkInTime, checkOutTime)
              : null,
            status: overallStatus,
          };
          acc.push(existing);
        } else {
          // Update existing record jika ada data baru
          if (checkInTime && !existing.checkIn) {
            existing.checkIn = checkInTime;
            existing.checkInStatus = checkInStatus;
          }
          if (checkOutTime && !existing.checkOut) {
            existing.checkOut = checkOutTime;
            existing.checkOutStatus = checkOutStatus;
            if (existing.checkIn) {
              existing.workingHours = calculateWorkingHours(
                existing.checkIn,
                checkOutTime
              );
            }
          }
        }

        return acc;
      }

      // ✅ Kasus 2: Hanya filter check-in aktif
      if (checkFilters.checkin && !checkFilters.checkout) {
        if (checkInTime) {
          acc.push({
            employeeId,
            nama,
            checkIn: checkInTime,
            status: checkInStatus,
            action: "Check In",
            timestamp: checkInTime,
          });
        }
        return acc;
      }

      // ✅ Kasus 3: Hanya filter check-out aktif
      if (checkFilters.checkout && !checkFilters.checkin) {
        if (checkOutTime) {
          acc.push({
            employeeId,
            nama,
            checkOut: checkOutTime,
            status: checkOutStatus,
            action: "Check Out",
            timestamp: checkOutTime,
          });
        }
        return acc;
      }

      // ✅ Kasus 4: Tidak ada filter checkin/checkout (tampilkan semua records)
      // Tampilkan sebagai record terpisah untuk check-in dan check-out
      if (checkInTime) {
        acc.push({
          employeeId,
          nama,
          status: checkInStatus,
          action: "Check In",
          timestamp: checkInTime,
        });
      }

      if (checkOutTime) {
        acc.push({
          employeeId,
          nama,
          status: checkOutStatus,
          action: "Check Out",
          timestamp: checkOutTime,
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
  console.log("Filtered & reduced data:", filteredData);
  console.log("Active filters:", { filter, checkFilters });
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
            Tidak ada data untuk filter yang dipilih
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
                      className="px-6 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider"
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
                    className="hover:bg-slate-700/30 transition-colors"
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
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
