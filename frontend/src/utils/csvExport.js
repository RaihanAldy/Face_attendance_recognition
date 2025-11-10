export const exportCSV = (
  filteredData,
  filter,
  checkFilters,
  formatDateTime,
  calculateWorkingHours
) => {
  if (filteredData.length === 0) {
    alert("No data available to export");
    return;
  }

  let headers = [];
  let csvData = [];

  // Case 1: Default view (no check filters)
  if (!checkFilters.checkin && !checkFilters.checkout) {
    headers = ["Employee ID", "Name", "Action", "Status", "Timestamp", "Date"];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      record.action || "-",
      record.status || "-",
      formatDateTime(record.timestamp) || "-",
      record.timestamp
        ? new Date(record.timestamp).toLocaleDateString("en-US")
        : "-",
    ]);
  }

  // Case 2: Check In only
  else if (checkFilters.checkin && !checkFilters.checkout) {
    headers = ["Employee ID", "Name", "Check In", "Status", "Date"];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      formatDateTime(record.checkIn) || "-",
      record.status || record.checkInStatus || "-",
      record.checkIn
        ? new Date(record.checkIn).toLocaleDateString("en-US")
        : "-",
    ]);
  }

  // Case 3: Check Out only
  else if (!checkFilters.checkin && checkFilters.checkout) {
    headers = ["Employee ID", "Name", "Check Out", "Status", "Date"];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      formatDateTime(record.checkOut) || "-",
      record.status || record.checkOutStatus || "-",
      record.checkOut
        ? new Date(record.checkOut).toLocaleDateString("en-US")
        : "-",
    ]);
  }

  // Case 4: Check In + Check Out paired
  else if (checkFilters.checkin && checkFilters.checkout) {
    headers = [
      "Employee ID",
      "Name",
      "Date",
      "Check In",
      "Check In Status",
      "Check Out",
      "Check Out Status",
      "Working Hours",
    ];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      record.checkIn || record.checkOut
        ? new Date(record.checkIn || record.checkOut).toLocaleDateString(
            "en-US"
          )
        : "-",
      formatDateTime(record.checkIn) || "-",
      record.checkInStatus || "-",
      formatDateTime(record.checkOut) || "-",
      record.checkOutStatus || "-",
      record.workingHours ||
        (record.checkIn && record.checkOut
          ? calculateWorkingHours(record.checkIn, record.checkOut)
          : "-"),
    ]);
  }

  // Generate CSV content with proper escaping
  const csvContent = [
    headers.join(","),
    ...csvData.map((row) =>
      row
        .map((field) => {
          const str = String(field);
          // Escape quotes and wrap in quotes if necessary
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ].join("\n");

  // Create and download the CSV file
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Filename generator
  const filterSuffix = filter === "all" ? "all-time" : "today";
  const checkFilterSuffix =
    checkFilters.checkin && checkFilters.checkout
      ? "-paired"
      : checkFilters.checkin
      ? "-checkin"
      : checkFilters.checkout
      ? "-checkout"
      : "";

  const timestamp = new Date().toISOString().split("T")[0];
  link.download = `attendance-${filterSuffix}${checkFilterSuffix}-${timestamp}.csv`;

  link.click();
  URL.revokeObjectURL(url);

  console.log(` CSV exported: ${filteredData.length} records`);
  console.log(` Filename: ${link.download}`);
};
