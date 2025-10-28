import React, { useState } from "react";

const AttendanceLog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Mock data - replace with actual API call
  const attendanceData = [
    {
      id: 1,
      employeeName: "John Doe",
      employeeId: "EMP001",
      checkIn: "2025-10-28T09:00:00",
      checkOut: "2025-10-28T17:00:00",
      status: "Present",
    },
    {
      id: 2,
      employeeName: "Jane Smith",
      employeeId: "EMP002",
      checkIn: "2025-10-28T09:15:00",
      checkOut: "2025-10-28T17:10:00",
      status: "Present",
    },
    {
      id: 3,
      employeeName: "Michael Johnson",
      employeeId: "EMP003",
      checkIn: "2025-10-28T08:50:00",
      checkOut: "2025-10-28T17:00:00",
      status: "Present",
    },
    {
      id: 4,
      employeeName: "Emily Davis",
      employeeId: "EMP004",
      checkIn: "2025-10-28T09:05:00",
      checkOut: "2025-10-28T17:05:00",
      status: "Present",
    },
    {
      id: 5,
      employeeName: "William Brown",
      employeeId: "EMP005",
      checkIn: "2025-10-28T09:20:00",
      checkOut: "2025-10-28T17:15:00",
      status: "Present",
    },
    {
      id: 6,
      employeeName: "Olivia Wilson",
      employeeId: "EMP006",
      checkIn: "2025-10-28T09:00:00",
      checkOut: "2025-10-28T17:00:00",
      status: "Present",
    },
    {
      id: 7,
      employeeName: "James Taylor",
      employeeId: "EMP007",
      checkIn: "2025-10-28T09:10:00",
      checkOut: "2025-10-28T17:05:00",
      status: "Present",
    },
    {
      id: 8,
      employeeName: "Sophia Martinez",
      employeeId: "EMP008",
      checkIn: "2025-10-28T09:00:00",
      checkOut: "2025-10-28T17:00:00",
      status: "Present",
    },
    {
      id: 9,
      employeeName: "Benjamin Anderson",
      employeeId: "EMP009",
      checkIn: "2025-10-28T08:55:00",
      checkOut: "2025-10-28T17:00:00",
      status: "Present",
    },
    {
      id: 10,
      employeeName: "Isabella Thomas",
      employeeId: "EMP010",
      checkIn: "2025-10-28T09:05:00",
      checkOut: "2025-10-28T17:10:00",
      status: "Present",
    },
    {
      id: 11,
      employeeName: "Lucas White",
      employeeId: "EMP011",
      checkIn: "2025-10-28T09:00:00",
      checkOut: "2025-10-28T17:00:00",
      status: "Present",
    },
  ];

  return (
    <div className="p-6 bg-navy-950 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-gray-200">Attendance Log</h1>

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

      <div className="overflow-x-auto rounded-lg border border-navy-800">
        <table className="min-w-full bg-navy-900">
          <thead className="bg-navy-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-400 uppercase tracking-wider">
                Employee
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
                Working Hours
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {attendanceData.map((record) => {
              const checkIn = new Date(record.checkIn);
              const checkOut = new Date(record.checkOut);
              const workingHours = ((checkOut - checkIn) / 3600000).toFixed(2);

              return (
                <tr
                  key={record.id}
                  className="hover:bg-navy-800 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {record.employeeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {record.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {checkIn.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {checkOut.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-sm rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700">
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-100">
                    {workingHours}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceLog;
