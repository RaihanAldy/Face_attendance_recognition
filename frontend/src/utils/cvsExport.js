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
      "Action",
      "Status",
      "Timestamp",
      "Tanggal",
      "Confidence",
    ];

    csvData = filteredData.map((record) => {
      // Normalisasi action untuk display
      const displayAction = record.action
        ? record.action.replace(/_/g, "-")
        : "-";

      return [
        record.name || "-",
        record.employeeId || "-",
        displayAction, // "check-in" atau "check-out"
        record.status || "-", // "ontime", "late", "early"
        formatDateTime(record.timestamp) || "-",
        record.timestamp
          ? new Date(record.timestamp).toLocaleDateString("id-ID")
          : "-",
        record.confidence ? `${Math.round(record.confidence * 100)}%` : "-",
      ];
    });
  }

  // Case 2: Check In only
  else if (checkFilters.checkin && !checkFilters.checkout) {
    headers = ["Nama", "ID Karyawan", "Check In", "Status", "Tanggal"];

    csvData = filteredData.map((record) => [
      record.name || "-",
      record.employeeId || "-",
      formatDateTime(record.checkIn) || "-",
      record.status || "-", // Status dari check-in
      record.checkIn
        ? new Date(record.checkIn).toLocaleDateString("id-ID")
        : "-",
    ]);
  }

  // Case 3: Check Out only
  else if (!checkFilters.checkin && checkFilters.checkout) {
    headers = ["Nama", "ID Karyawan", "Check Out", "Status", "Tanggal"];

    csvData = filteredData.map((record) => [
      record.name || "-",
      record.employeeId || "-",
      formatDateTime(record.checkOut) || "-",
      record.status || "-", // Status dari check-out
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
      "Status Check In",
      "Check Out",
      "Status Check Out",
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
      record.checkInStatus || "-", // Status saat check-in (ontime/late)
      formatDateTime(record.checkOut) || "-",
      record.checkOutStatus || "-", // Status saat check-out (ontime/early)
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
