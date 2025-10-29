import { formatDateTime } from "./timeUtils";

// Fungsi untuk menentukan kolom tabel berdasarkan filter
export const getTableHeaders = (filter, checkFilters) => {
  if (filter === "today" && !checkFilters.checkin && !checkFilters.checkout) {
    return ["ID", "Nama", "Status", "Timestamp"];
  }

  // Today + checkin only
  if (filter === "today" && checkFilters.checkin && !checkFilters.checkout) {
    return ["ID", "Nama", "Check In"];
  }

  // Today + checkout only
  if (filter === "today" && !checkFilters.checkin && checkFilters.checkout) {
    return ["ID", "Nama", "Check Out"];
  }

  // Today + checkin + checkout
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

  // Filter: today only (semua records)
  if (filter === "today" && !checkFilters.checkin && !checkFilters.checkout) {
    switch (header) {
      case "ID":
        return (
          <td key={index} className={`${baseClass} font-mono text-sm`}>
            {record.employeeId}
          </td>
        );
      case "Nama":
        return (
          <td key={index} className={baseClass}>
            {record.name}
          </td>
        );
      case "Status":
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
      case "Timestamp":
        return (
          <td key={index} className={baseClass}>
            {formatDateTime(record.timestamp)} {/* GANTI INI */}
          </td>
        );
      default:
        return null;
    }
  }

  // Filter: today + checkin only
  if (filter === "today" && checkFilters.checkin && !checkFilters.checkout) {
    switch (header) {
      case "ID":
        return (
          <td key={index} className={`${baseClass} font-mono text-sm`}>
            {record.employeeId}
          </td>
        );
      case "Nama":
        return (
          <td key={index} className={baseClass}>
            {record.name}
          </td>
        );
      case "Check In":
        return (
          <td key={index} className={baseClass}>
            {formatDateTime(record.checkIn)}
          </td>
        );
      default:
        return null;
    }
  }

  // Filter: today + checkout only
  if (filter === "today" && !checkFilters.checkin && checkFilters.checkout) {
    switch (header) {
      case "ID":
        return (
          <td key={index} className={`${baseClass} font-mono text-sm`}>
            {record.employeeId}
          </td>
        );
      case "Nama":
        return (
          <td key={index} className={baseClass}>
            {record.name}
          </td>
        );
      case "Check Out":
        return (
          <td key={index} className={baseClass}>
            {formatDateTime(record.checkOut)}
          </td>
        );
      default:
        return null;
    }
  }

  // Filter: today + checkin + checkout
  if (filter === "today" && checkFilters.checkin && checkFilters.checkout) {
    switch (header) {
      case "ID":
        return (
          <td key={index} className={`${baseClass} font-mono text-sm`}>
            {record.employeeId}
          </td>
        );
      case "Nama":
        return (
          <td key={index} className={baseClass}>
            {record.name}
          </td>
        );
      case "Check In":
        return (
          <td key={index} className={baseClass}>
            {formatDateTime(record.checkIn)}
          </td>
        );
      case "Check Out":
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
      default:
        return null;
    }
  }

  // Default fallback
  return null;
};
