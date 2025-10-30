import React, { useState } from "react";
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

  // ✅ Pass filter ke hook dan re-fetch ketika filter berubah
  const { attendanceData, loading, error, refetch } =
    useAttendanceData(filter);

  // ✅ Fetch data ketika filter berubah
/*   React.useEffect(() => {
    fetchAttendanceData(filter);
  }, [filter]);
 */
  const handleExportCSV = () => {
    if (attendanceData && attendanceData.length > 0) {
      exportCSV(attendanceData, formatDateTime, calculateWorkingHours);
    } else {
      alert("Tidak ada data untuk di-export");
    }
  };

  // ✅ FIX: Handle data transformation dengan lebih aman
  const filteredData = React.useMemo(() => {
    if (!attendanceData || !Array.isArray(attendanceData)) return [];

    return attendanceData
      .filter((record) => {
        // Filter berdasarkan tanggal
        if (filter === "all") {
          return true; // Tampilkan semua data
        }

        // Filter "today" - handle berbagai format timestamp
        try {
          const today = new Date();
          const recordDate = new Date(record.timestamp || record.check_in || record.checkIn);
          
          return (
            recordDate.getDate() === today.getDate() &&
            recordDate.getMonth() === today.getMonth() &&
            recordDate.getFullYear() === today.getFullYear()
          );
        } catch (err) {
          console.warn("Error parsing date:", record);
          return false;
        }
      })
      .reduce((acc, record) => {
        try {
          const employeeId = record.employee_id || record.employeeId || `emp-${acc.length}`;
          const employeeName = record.employee_name || record.name || "Unknown Employee";
          const timestamp = record.timestamp || record.check_in || record.checkIn;

          // Jika checkin + checkout keduanya aktif, gabungkan records
          if (checkFilters.checkin && checkFilters.checkout) {
            const existing = acc.find((r) => r.employeeId === employeeId);

            if (existing) {
              if (record.attendance_type === 'check_in' || record.status === "check_in" || record.status === "check-in") {
                existing.checkIn = timestamp;
                existing.checkInTime = formatDateTime(timestamp);
              }
              if (record.attendance_type === 'check_out' || record.status === "check_out" || record.status === "check-out") {
                existing.checkOut = timestamp;
                existing.checkOutTime = formatDateTime(timestamp);
              }
            } else {
              const newRecord = {
                id: record.id || record._id || `record-${acc.length}`,
                employeeId: employeeId,
                name: employeeName,
                department: record.department || "General",
                status: record.status || "present",
                confidence: record.confidence || 0,
                checkIn: null,
                checkOut: null,
                checkInTime: "",
                checkOutTime: ""
              };

              if (record.attendance_type === 'check_in' || record.status === "check_in" || record.status === "check-in") {
                newRecord.checkIn = timestamp;
                newRecord.checkInTime = formatDateTime(timestamp);
              }
              if (record.attendance_type === 'check_out' || record.status === "check_out" || record.status === "check-out") {
                newRecord.checkOut = timestamp;
                newRecord.checkOutTime = formatDateTime(timestamp);
              }

              acc.push(newRecord);
            }
            return acc;
          }

          // Jika hanya checkin aktif
          if (checkFilters.checkin && !checkFilters.checkout) {
            if (record.attendance_type === 'check_in' || record.status === "check_in" || record.status === "check-in") {
              acc.push({
                id: record.id || record._id || `record-${acc.length}`,
                employeeId: employeeId,
                name: employeeName,
                department: record.department || "General",
                checkIn: timestamp,
                checkInTime: formatDateTime(timestamp),
                status: record.status || "check_in"
              });
            }
            return acc;
          }

          // Jika hanya checkout aktif
          if (checkFilters.checkout && !checkFilters.checkin) {
            if (record.attendance_type === 'check_out' || record.status === "check_out" || record.status === "check-out") {
              acc.push({
                id: record.id || record._id || `record-${acc.length}`,
                employeeId: employeeId,
                name: employeeName,
                department: record.department || "General",
                checkOut: timestamp,
                checkOutTime: formatDateTime(timestamp),
                status: record.status || "check_out"
              });
            }
            return acc;
          }

          // ✅ Default: tampilkan semua records
          acc.push({
            id: record.id || record._id || `record-${acc.length}`,
            employeeId: employeeId,
            name: employeeName,
            department: record.department || "General",
            status: record.status || "present",
            confidence: record.confidence || 0,
            timestamp: timestamp,
            formattedTime: formatDateTime(timestamp),
            checkIn: record.check_in || record.checkIn,
            checkOut: record.check_out || record.checkOut,
            attendance_type: record.attendance_type
          });

          return acc;
        } catch (err) {
          console.error("Error processing record:", record, err);
          return acc;
        }
      }, []);
  }, [attendanceData, filter, checkFilters]);

  console.group("🧩 Attendance Data Debug");
  console.log("Raw data from backend:", attendanceData);
  console.log("Filtered & reduced data:", filteredData);
  console.log("Active filters:", { filter, checkFilters });
  console.groupEnd();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <AttendanceHeader
          onRefresh={refetch}
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
