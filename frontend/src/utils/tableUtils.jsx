import { formatDateTime } from "./timeUtils";

// Helper untuk nama employee
export const getEmployeeName = (record) =>
  record.name || record.employees || "Unknown Employee";

// Fungsi menentukan kolom tabel berdasarkan filter
export const getTableHeaders = (filter, checkFilters) => {
  const { checkin, checkout } = checkFilters;

  if (!checkin && !checkout) {
    return ["Employee ID", "Nama", "Status", "Action", "Timestamp"];
  }

  if (checkin && checkout) {
    // Gabungkan checkin & checkout
    return ["Employee ID", "Nama", "Check In", "Check Out"];
  }

  if (checkin && !checkout)
    return ["Employee ID", "Nama", "Check In", "Status"];
  if (!checkin && checkout)
    return ["Employee ID", "Nama", "Check Out", "Status"];

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
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {record.status}
          </span>
        </td>
      );

    case "Action":
      return (
        <td key={index} className={`${baseClass} capitalize`}>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              record.action === "check-in"
                ? "bg-green-500/20 text-green-400"
                : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {record.action}
          </span>
        </td>
      );

    case "Timestamp":
      return (
        <td key={index} className={baseClass}>
          {formatDateTime(record.timestamp)}
        </td>
      );

    case "Check In":
      return (
        <td key={index} className={baseClass}>
          {record.checkIn ? formatDateTime(record.checkIn) : "-"}
        </td>
      );

    case "Check Out":
      return (
        <td key={index} className={baseClass}>
          {record.checkOut ? formatDateTime(record.checkOut) : "-"}
        </td>
      );

    default:
      return null;
  }
};
