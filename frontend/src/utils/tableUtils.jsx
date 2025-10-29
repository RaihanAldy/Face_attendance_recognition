import { formatDateTime } from "./timeUtils";

// Helper function untuk mendapatkan nama employee
const getEmployeeName = (record) => {
  return (
    record.name || record.employees || record.employeeName || "Unknown Employee"
  );
};

// Fungsi untuk menentukan kolom tabel berdasarkan filter
export const getTableHeaders = (filter, checkFilters) => {
  if (filter === "today" && !checkFilters.checkin && !checkFilters.checkout) {
    return ["ID", "Nama", "Status", "Timestamp"];
  }

  if (filter === "today" && checkFilters.checkin && !checkFilters.checkout) {
    return ["ID", "Nama", "Check In"];
  }

  if (filter === "today" && !checkFilters.checkin && checkFilters.checkout) {
    return ["ID", "Nama", "Check Out"];
  }

  if (filter === "today" && checkFilters.checkin && checkFilters.checkout) {
    return ["ID", "Nama", "Check In", "Check Out"];
  }

  return ["ID", "Nama", "Status", "Timestamp"];
};

// Fungsi untuk render isi setiap sel tabel
export const renderTableCell = (
  record,
  header,
  index,
  filter,
  checkFilters
) => {
  const baseClass = "px-6 py-4 text-slate-300";

  // Common cells yang dipakai di semua filter
  if (header === "ID") {
    return (
      <td key={index} className={`${baseClass} font-mono text-sm`}>
        {record.employeeId}
      </td>
    );
  }

  if (header === "Nama") {
    return (
      <td key={index} className={baseClass}>
        {getEmployeeName(record)}
      </td>
    );
  }

  // Filter: today only (semua records)
  if (filter === "today" && !checkFilters.checkin && !checkFilters.checkout) {
    if (header === "Status") {
      return (
        <td key={index} className={`${baseClass} capitalize`}>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              record.status === "check_in" || record.status === "check-in"
                ? "bg-green-500/20 text-green-400"
                : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {record.status === "check_in" || record.status === "check-in"
              ? "Check In"
              : "Check Out"}
          </span>
        </td>
      );
    }
    if (header === "Timestamp") {
      return (
        <td key={index} className={baseClass}>
          {formatDateTime(record.timestamp)}
        </td>
      );
    }
  }

  // Filter: today + checkin only
  if (filter === "today" && checkFilters.checkin && !checkFilters.checkout) {
    if (header === "Check In") {
      return (
        <td key={index} className={baseClass}>
          {formatDateTime(record.checkIn)}
        </td>
      );
    }
  }

  // Filter: today + checkout only
  if (filter === "today" && !checkFilters.checkin && checkFilters.checkout) {
    if (header === "Check Out") {
      return (
        <td key={index} className={baseClass}>
          {formatDateTime(record.checkOut)}
        </td>
      );
    }
  }

  // Filter: today + checkin + checkout
  if (filter === "today" && checkFilters.checkin && checkFilters.checkout) {
    if (header === "Check In") {
      return (
        <td key={index} className={baseClass}>
          {formatDateTime(record.checkIn)}
        </td>
      );
    }
    if (header === "Check Out") {
      return (
        <td key={index} className={baseClass}>
          {record.checkOut ? (
            formatDateTime(record.checkOut)
          ) : (
            <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
              Working
            </span>
          )}
        </td>
      );
    }
  }

  return null;
};
