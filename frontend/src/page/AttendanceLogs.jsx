import React, { useState , useEffect} from "react";

const AttendanceLog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mock data - replace with actual API call
  const fetchAttendanceData = async (date = "") => {
    try {
      setLoading(true);
      setError("");
      
      // ✅ PERUBAHAN: API call ke backend untuk get attendance data
      const response = await fetch(`http://localhost:5000/api/attendance/log?date=${date}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAttendanceData(data);
    } catch (err) {
      console.error("Error fetching data absensi:", err);
      setError("Gagal memuat data Absensi. Periksa koneksi server.");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(dateFilter);
  }, [dateFilter]);

  // ✅ PERUBAHAN: Format date untuk display
  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return "-";
    }
  };

  // ✅ PERUBAHAN: Calculate working hours dari timestamp
  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "-";
    
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      
      // Jika checkOut sebelum checkIn (invalid), return 0
      if (end <= start) return "0h";
      
      const diffMs = end - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return "-";
    }
  };

  // ✅ PERUBAHAN: Filter data berdasarkan search query
  const filteredData = attendanceData.filter(record => {
    const matchesSearch = 
      record.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // ✅ PERUBAHAN: Handle refresh data
  const handleRefresh = () => {
    fetchAttendanceData(dateFilter);
  };

  // ✅ PERUBAHAN: Handle export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ["Nama", "ID Karyawan", "Check In", "Check Out", "Status", "Jam Kerja", "Confidence"];
      
      const csvData = filteredData.map(record => [
        record.name || "-",
        record.employeeId || "-",
        formatDateTime(record.timestamp) || "-",
        "-", // Check out - perlu implementasi terpisah
        "Present",
        calculateWorkingHours(record.timestamp, new Date().toISOString()), // Asumsi masih bekerja
        record.confidence ? `${Math.round(record.confidence * 100)}%` : "-"
      ]);
      
      const csvContent = [
        headers.join(","),
        ...csvData.map(row => row.join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Gagal mengexport data CSV");
    }
  };

  return (
    <div className="p-6 bg-navy-950 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-200">Attendance Log</h1>

      <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-100 placeholder-blue-200"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-100"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-blue-400">
          Memuat data absensi...
        </div>
      )}

      {!loading && filteredData.length === 0 && (
        <div className="text-center py-8 text-blue-400">
          {attendanceData.length === 0 
            ? "Belum ada data absensi hari ini" 
            : "Tidak ada data yang sesuai dengan pencarian"}
        </div>
      )}
    {!loading && filteredData.length > 0 && (
      <div className="overflow-x-auto rounded-lg border border-navy-800">
        <table className="min-w-full bg-navy-900">
          <thead className="bg-navy-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                Karyawan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                Check In
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                Check Out
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                Jam Kerja
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {filteredData.map((record, index) => {
              const checkIn = record.checkIn ? new Date(record.checkIn) : null;
              const checkOut = record.checkOut ? new Date(record.checkOut) : null;
              
              const status = checkIn && checkOut ? "Selesai" : 
                            checkIn ? "Sedang Bekerja" : "Belum Check-In";

              const statusColor = checkIn && checkOut ? "bg-emerald-900 text-emerald-300 border-emerald-700" :
                                  checkIn ? "bg-blue-900 text-blue-300 border-blue-700" :
                                  "bg-gray-900 text-gray-300 border-gray-700";

              return (
                <tr key={record._id || index} className="hover:bg-navy-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {record.name || `Employee ${record.employeeId}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {record.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {checkIn ? checkIn.toLocaleTimeString('id-ID') : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {checkOut ? checkOut.toLocaleTimeString('id-ID') : "Masih Bekerja"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-sm rounded-full border ${statusColor}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {record.workingHours || "0h"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
    </div>
  );
};

export default AttendanceLog;
