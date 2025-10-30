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

  // ✅ Export berdasarkan filter aktif

  // Case 1: Default view (All atau Today tanpa check filters)
  if (!checkFilters.checkin && !checkFilters.checkout) {
    headers = [
      "Nama",
      "ID Karyawan",
      "Status",
      "Timestamp",
      "Tanggal",
      "Confidence",
    ];

    csvData = filteredData.map((record) => [
      record.name || "-",
      record.employeeId || "-",
      record.status === "check_in" || record.status === "check-in"
        ? "Check In"
        : "Check Out",
      formatDateTime(record.timestamp) || "-",
      record.timestamp
        ? new Date(record.timestamp).toLocaleDateString("id-ID")
        : "-",
      record.confidence ? `${Math.round(record.confidence * 100)}%` : "-",
    ]);
  }

  // Case 2: Check In only
  else if (checkFilters.checkin && !checkFilters.checkout) {
    headers = ["Nama", "ID Karyawan", "Check In", "Tanggal"];

    csvData = filteredData.map((record) => [
      record.name || "-",
      record.employeeId || "-",
      formatDateTime(record.checkIn) || "-",
      record.checkIn
        ? new Date(record.checkIn).toLocaleDateString("id-ID")
        : "-",
    ]);
  }

  // Case 3: Check Out only
  else if (!checkFilters.checkin && checkFilters.checkout) {
    headers = ["Nama", "ID Karyawan", "Check Out", "Tanggal"];

    csvData = filteredData.map((record) => [
      record.name || "-",
      record.employeeId || "-",
      formatDateTime(record.checkOut) || "-",
      record.checkOut
        ? new Date(record.checkOut).toLocaleDateString("id-ID")
        : "-",
    ]);
  }

  // Case 4: Check In + Check Out
  else if (checkFilters.checkin && checkFilters.checkout) {
    headers = [
      "Nama",
      "ID Karyawan",
      "Tanggal",
      "Check In",
      "Check Out",
      "Status",
      "Jam Kerja",
    ];

    csvData = filteredData.map((record) => [
      record.name || "-",
      record.employeeId || "-",
      record.checkIn || record.checkOut
        ? new Date(record.checkIn || record.checkOut).toLocaleDateString(
            "id-ID"
          )
        : "-",
      formatDateTime(record.checkIn) || "-",
      formatDateTime(record.checkOut) || "-",
      record.checkOut
        ? "Selesai"
        : record.checkIn
        ? "Sedang Bekerja"
        : "Belum Check-In",
      calculateWorkingHours(record.checkIn, record.checkOut) || "-",
    ]);
  }

  // Generate CSV content
  const csvContent = [
    headers.join(","),
    ...csvData.map((row) =>
      row.map((field) => `"${field.toString().replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Create and download file
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // ✅ Filename dengan info filter
  const filterSuffix = filter === "all" ? "all-time" : "today";
  const checkFilterSuffix =
    checkFilters.checkin && checkFilters.checkout
      ? "-checkin-checkout"
      : checkFilters.checkin
      ? "-checkin"
      : checkFilters.checkout
      ? "-checkout"
      : "";

  link.download = `attendance-${filterSuffix}${checkFilterSuffix}-${
    new Date().toISOString().split("T")[0]
  }.csv`;

  link.click();
  URL.revokeObjectURL(url); // ✅ Cleanup

  console.log(`✅ CSV exported: ${filteredData.length} records`);
};
