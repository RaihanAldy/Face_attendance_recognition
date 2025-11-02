// Helper untuk nama employee - DIPERBAIKI sesuai struktur MongoDB
export const getEmployeeName = (record) => record.name || "Unknown";

// Fungsi menentukan kolom tabel berdasarkan filter
export const getTableHeaders = (filter, checkFilters) => {
  const { checkin, checkout } = checkFilters;

  // Jika kedua filter aktif: tampilkan Check In & Check Out
  if (checkin && checkout) {
    return [
      "Employee ID",
      "Nama",
      "Check In",
      "Status",
      "Check Out",
      "Status",
      "Working Hours",
    ];
  }

  // Jika hanya checkin aktif
  if (checkin && !checkout) {
    return ["Employee ID", "Nama", "Check In", "Status", "Action"];
  }

  // Jika hanya checkout aktif
  if (!checkin && checkout) {
    return ["Employee ID", "Nama", "Check Out", "Status", "Action"];
  }

  // Default: tampilkan semua kolom
  return ["Employee ID", "Nama", "Status", "Action", "Timestamp"];
};

// Fungsi untuk render isi setiap sel tabel - DIPERBAIKI
export const renderTableCell = (record, header, index, formatDateTime) => {
  const baseClass = "px-6 py-4 text-slate-300";

  switch (header) {
    case "Employee ID":
      return (
        <td key={index} className={`${baseClass} font-mono text-sm`}>
          {record.employee_id || record.employeeId || "-"}
        </td>
      );

    case "Nama":
      return (
        <td key={index} className={baseClass}>
          {getEmployeeName(record)}
        </td>
      );

    case "Status": {
      const statusValue =
        record.status || record.checkInStatus || record.checkOutStatus || "-";

      return (
        <td key={index} className={`${baseClass} capitalize`}>
          <span
            className={`px-2 py-1 rounded-full ${
              statusValue === "ontime"
                ? "bg-green-500/20 text-green-400"
                : statusValue === "late"
                ? "bg-red-500/20 text-red-400"
                : statusValue === "early"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {statusValue}
          </span>
        </td>
      );
    }

    case "Action": {
      const displayAction = record.action || "-";
      return (
        <td key={index} className={`${baseClass} capitalize`}>
          <span
            className={`px-2 py-1 rounded-full ${
              displayAction.includes("Check In")
                ? "bg-green-500/20 text-green-400"
                : displayAction.includes("Check Out")
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
          {record.timestamp ? formatDateTime(record.timestamp) : "-"}
        </td>
      );

    case "Check In":
      return (
        <td key={index} className={baseClass}>
          {record.checkIn ? (
            <div className="flex flex-col space-y-1">
              <span className="bg-blue-600 rounded-full px-2 py-1 text-slate-200 text-sm w-fit">
                {formatDateTime(record.checkIn)}
              </span>
              {record.checkInStatus && (
                <span
                  className={`px-2 py-0.5 rounded-full capitalize text-xs w-fit ${
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
            <span className="text-gray-500">-</span>
          )}
        </td>
      );

    case "Check Out":
      return (
        <td key={index} className={baseClass}>
          {record.checkOut ? (
            <div className="flex flex-col space-y-1">
              <span className="bg-purple-600 rounded-full px-2 py-1 text-slate-200 text-sm w-fit">
                {formatDateTime(record.checkOut)}
              </span>
              {record.checkOutStatus && (
                <span
                  className={`px-2 py-0.5 rounded-full capitalize text-xs w-fit ${
                    record.checkOutStatus === "ontime"
                      ? "bg-green-500/20 text-green-400"
                      : record.checkOutStatus === "early"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : record.checkOutStatus === "late"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-500/20 text-gray-400"
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
      return (
        <td key={index} className={baseClass}>
          -
        </td>
      );
  }
};
