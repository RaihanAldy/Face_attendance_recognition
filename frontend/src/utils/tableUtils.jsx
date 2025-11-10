// Helper to get employee name
export const getEmployeeName = (record) => record.name || "Unknown";

// Determine table columns based on filters
export const getTableHeaders = (filter, checkFilters) => {
  const { checkin, checkout } = checkFilters;

  // If both filters active → paired view
  if (checkin && checkout) {
    return [
      "Employee ID",
      "Name",
      "Check In",
      "Check In Status",
      "Check Out",
      "Check Out Status",
      "Working Hours",
    ];
  }

  // Check In only
  if (checkin && !checkout) {
    return ["Employee ID", "Name", "Check In", "Status"];
  }

  // Check Out only
  if (!checkin && checkout) {
    return ["Employee ID", "Name", "Check Out", "Status"];
  }

  // Default: full log view
  return ["Employee ID", "Name", "Action", "Status", "Timestamp"];
};

// Render each table cell
export const renderTableCell = (record, header, index, formatDateTime) => {
  const baseClass = "px-3 py-4 text-slate-300 text-center";

  switch (header) {
    case "Employee ID":
      return (
        <td key={index} className={`${baseClass} font-mono text-sm`}>
          {record.employeeId || "-"}
        </td>
      );

    case "Name":
      return (
        <td key={index} className={`${baseClass} text-left`}>
          {getEmployeeName(record)}
        </td>
      );

    case "Status":
    case "Check In Status":
    case "Check Out Status": {
      let statusValue;

      if (header === "Check In Status") {
        statusValue = record.checkInStatus || "-";
      } else if (header === "Check Out Status") {
        statusValue = record.checkOutStatus || "-";
      } else {
        statusValue = record.status || "-";
      }

      return (
        <td key={index} className={`${baseClass} capitalize`}>
          <span
            className={`px-2 py-1 rounded-full text-sm ${
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
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              displayAction === "Check In"
                ? "bg-green-500/20 text-green-400"
                : displayAction === "Check Out"
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
            <span className="bg-green-600/30 border border-green-500/30 rounded-lg px-3 py-1.5 text-green-300 text-sm font-medium">
              {formatDateTime(record.checkIn)}
            </span>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </td>
      );

    case "Check Out":
      return (
        <td key={index} className={baseClass}>
          {record.checkOut ? (
            <span className="bg-blue-600/30 border border-blue-500/30 rounded-lg px-3 py-1.5 text-blue-300 text-sm font-medium">
              {formatDateTime(record.checkOut)}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-sm border border-amber-500/30">
              Still Working
            </span>
          )}
        </td>
      );

    case "Working Hours":
      return (
        <td key={index} className={baseClass}>
          {record.workingHours ? (
            <span className="px-3 py-1 rounded-lg bg-purple-600/20 text-purple-300 text-sm font-medium border border-purple-500/30">
              {record.workingHours}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-lg bg-purple-600/20 text-purple-300 text-sm font-medium border border-purple-500/30">
              {record.workingHours || "0h 0m"}
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
