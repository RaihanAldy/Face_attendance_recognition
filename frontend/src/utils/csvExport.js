export const exportCSV = (
  filteredData,
  filter,
  checkFilters,
  formatDateTime,
  calculateWorkingHours
) => {
  if (filteredData.length === 0) {
    alert("Tidak ada data untuk di-export");
    return;
  }

  let headers = [];
  let csvData = [];

  // ✅ Case 1: Default view (no check filters)
  if (!checkFilters.checkin && !checkFilters.checkout) {
    headers = [
      "Employee ID",
      "Nama",
      "Action",
      "Status",
      "Timestamp",
      "Tanggal",
    ];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      record.action || "-",
      record.status || "-",
      formatDateTime(record.timestamp) || "-",
      record.timestamp
        ? new Date(record.timestamp).toLocaleDateString("id-ID")
        : "-",
    ]);
  }

  // ✅ Case 2: Check In only
  else if (checkFilters.checkin && !checkFilters.checkout) {
    headers = ["Employee ID", "Nama", "Check In", "Status", "Tanggal"];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      formatDateTime(record.checkIn) || "-",
      record.status || record.checkInStatus || "-",
      record.checkIn
        ? new Date(record.checkIn).toLocaleDateString("id-ID")
        : "-",
    ]);
  }

  // ✅ Case 3: Check Out only
  else if (!checkFilters.checkin && checkFilters.checkout) {
    headers = ["Employee ID", "Nama", "Check Out", "Status", "Tanggal"];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      formatDateTime(record.checkOut) || "-",
      record.status || record.checkOutStatus || "-",
      record.checkOut
        ? new Date(record.checkOut).toLocaleDateString("id-ID")
        : "-",
    ]);
  }

  // ✅ Case 4: Check In + Check Out (paired view)
  else if (checkFilters.checkin && checkFilters.checkout) {
    headers = [
      "Employee ID",
      "Nama",
      "Tanggal",
      "Check In",
      "Status Check In",
      "Check Out",
      "Status Check Out",
      "Jam Kerja",
    ];

    csvData = filteredData.map((record) => [
      record.employeeId || "-",
      record.name || "-",
      record.checkIn || record.checkOut
        ? new Date(record.checkIn || record.checkOut).toLocaleDateString(
            "id-ID"
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
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ].join("\n");

  // Create and download file
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Generate filename
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

  console.log(`✅ CSV exported: ${filteredData.length} records`);
  console.log(`📄 Filename: ${link.download}`);
};
