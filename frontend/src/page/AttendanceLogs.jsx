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

  const filteredData = attendanceData
    .filter((record) => {
      // Filter berdasarkan tanggal (all atau today)
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

      // ✅ Ambil action dari field 'action' di database
      const recordAction = record.action; // "check_in" atau "check_out"
      const recordStatus = record.status; // "ontime", "late", "early"
      const recordTimestamp = record.timestamp;

      // Normalisasi action format
      const isCheckIn =
        recordAction === "check-in" || recordAction === "check_in";
      const isCheckOut =
        recordAction === "check-out" || recordAction === "check_out";

      console.log("🔍 Processing record:", {
        employeeId,
        action: recordAction,
        status: recordStatus,
        isCheckIn,
        isCheckOut,
      });

      // ✅ Kasus 1: Kedua filter aktif (checkin + checkout)
      if (checkFilters.checkin && checkFilters.checkout) {
        let existing = acc.find((r) => r.employeeId === employeeId);

        if (!existing) {
          existing = {
            employeeId,
            name: employeeName,
            checkIn: null,
            checkInStatus: null,
            checkOut: null,
            checkOutStatus: null,
          };
          acc.push(existing);
        }

        if (isCheckIn) {
          existing.checkIn = recordTimestamp;
          existing.checkInStatus = recordStatus;
        }

        if (isCheckOut) {
          existing.checkOut = recordTimestamp;
          existing.checkOutStatus = recordStatus;
        }

        return acc;
      }

      // ✅ Kasus 2: Hanya filter check-in aktif
      if (checkFilters.checkin && !checkFilters.checkout) {
        if (isCheckIn) {
          acc.push({
            employeeId,
            name: employeeName,
            checkIn: recordTimestamp,
            status: recordStatus,
          });
        }
        return acc;
      }

      // ✅ Kasus 3: Hanya filter check-out aktif
      if (checkFilters.checkout && !checkFilters.checkin) {
        if (isCheckOut) {
          acc.push({
            employeeId,
            name: employeeName,
            checkOut: recordTimestamp,
            status: recordStatus,
          });
        }
        return acc;
      }

      // ✅ Kasus 4: Tidak ada filter checkin/checkout (tampilkan semua raw records)
      acc.push({
        employeeId,
        name: employeeName,
        status: recordStatus,
        action: recordAction, // Tampilkan action asli (check-in/check-out)
        timestamp: recordTimestamp,
      });

      return acc;
    }, []);

  // ✅ Handler export yang menggunakan filteredData dan semua parameter
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
