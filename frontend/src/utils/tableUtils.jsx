import { formatDateTime } from "./timeUtils";

// Helper untuk nama employee
export const getEmployeeName = (record) =>
  record.name || record.employees || "Unknown Employee";

// Fungsi menentukan kolom tabel berdasarkan filter
export const getTableHeaders = (filter, checkFilters) => {
  const { checkin, checkout } = checkFilters;

  // Jika kedua filter aktif: tampilkan Check In & Check Out
  if (checkin && checkout) {
    return ["Employee ID", "Nama", "Check In", "Check Out"];
  }

  // Jika hanya checkin aktif
  if (checkin && !checkout) {
    return ["Employee ID", "Nama", "Check In", "Status"];
  }

  // Jika hanya checkout aktif
  if (!checkin && checkout) {
    return ["Employee ID", "Nama", "Check Out", "Status"];
  }

  // Default: tampilkan semua kolom
  return ["Employee ID", "Nama", "Status", "Action", "Timestamp"];
};

// Fungsi untuk render isi setiap sel tabel
export const renderTableCell = (record, header, index) => {
  const baseClass = "px-6 py-4 text-slate-300";

  switch (header) {
    case "Employee ID":
      return (
        <td key={index} className={`${baseClass} font-mono text-sm`}>
          {record.employeeId}
        </td>
      );

    case "Nama":
      return (
        <td key={index} className={baseClass}>
          {getEmployeeName(record)}
        </td>
      );

    case "Status":
      return (
        <td key={index} className={`${baseClass} capitalize`}>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              record.status === "ontime"
                ? "bg-green-500/20 text-green-400"
                : record.status === "late"
                ? "bg-red-500/20 text-red-400"
                : record.status === "early"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {record.status || "Working"}
          </span>
        </td>
      );

    case "Action": {
      // Normalisasi action untuk display (ganti underscore dengan dash)
      const displayAction = record.action
        ? record.action.replace(/_/g, "-")
        : "-";

      return (
        <td key={index} className={`${baseClass} capitalize`}>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              displayAction === "check-in"
                ? "bg-green-500/20 text-green-400"
                : displayAction === "check-out"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {displayAction}
          </span>
        </td>
      );
    }
    case "Timestamp":
      return (
        <td key={index} className={baseClass}>
          {formatDateTime(record.timestamp)}
        </td>
      );

    case "Check In":
      return (
        <td key={index} className={baseClass}>
          {record.checkIn ? (
            <div className="flex flex-row items-center justify-baseline space-x-1">
              <span className="bg-blue-600 rounded-full px-2 py-0.5 text-slate-200">
                {formatDateTime(record.checkIn)}
              </span>
              {record.checkInStatus && (
                <span
                  className={`px-2 py-0.5 rounded-full capitalize ${
                    record.checkInStatus === "ontime"
                      ? "bg-green-500/20 text-green-400"
                      : record.checkInStatus === "late"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {record.checkInStatus}
                </span>
              )}
            </div>
          ) : (
            "-"
          )}
        </td>
      );

    case "Check Out":
      return (
        <td key={index} className={baseClass}>
          {record.checkOut ? (
            <div className="flex flex-row items-center justify-baseline space-x-1">
              <span className="bg-blue-600 rounded-full px-2 py-0.5 text-slate-200">
                {formatDateTime(record.checkOut)}
              </span>
              {record.checkOutStatus && (
                <span
                  className={`px-2 py-0.5 rounded-full capitalize ${
                    record.checkOutStatus === "ontime"
                      ? "bg-green-500/20 text-green-400"
                      : record.checkOutStatus === "early"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {record.checkOutStatus}
                </span>
              )}
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400  capitalize">
              Working
            </span>
          )}
        </td>
      );

    default:
      return null;
  }
};
