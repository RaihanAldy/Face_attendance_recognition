export const exportCSV = (
  attendanceData,
  formatDateTime,
  calculateWorkingHours
) => {
  if (attendanceData.length === 0) {
    alert("Tidak ada data untuk di-export");
    return;
  }

  const headers = [
    "Nama",
    "ID Karyawan",
    "Tanggal",
    "Check In",
    "Check Out",
    "Status",
    "Jam Kerja",
    "Confidence",
  ];

  const csvData = attendanceData.map((record) => [
    record.name || "-",
    record.employeeId || "-",
    record.checkIn ? new Date(record.checkIn).toLocaleDateString("id-ID") : "-",
    formatDateTime(record.checkIn),
    formatDateTime(record.checkOut),
    record.checkOut
      ? "Selesai"
      : record.checkIn
      ? "Sedang Bekerja"
      : "Belum Check-In",
    calculateWorkingHours(record.checkIn, record.checkOut),
    record.confidence ? `${Math.round(record.confidence * 100)}%` : "-",
  ]);

  const csvContent = [
    headers.join(","),
    ...csvData.map((r) =>
      r.map((f) => `"${f.toString().replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-export-${
    new Date().toISOString().split("T")[0]
  }.csv`;
  link.click();
};
