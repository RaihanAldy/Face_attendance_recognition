import React, { useState } from 'react';

const AttendanceLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Mock data - replace with actual API call
  const attendanceData = [
    {
      id: 1,
      employeeName: 'John Doe',
      employeeId: 'EMP001',
      checkIn: '2025-10-28T09:00:00',
      checkOut: '2025-10-28T17:00:00',
      status: 'Present'
    },
    // Add more mock data as needed
  ];

  return (
    <div className="p-6 bg-navy-950 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-sky-400">Attendance Log</h1>
      
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-navy-800">
        <table className="min-w-full bg-navy-900">
          <thead className="bg-navy-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Check In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Check Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Working Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {attendanceData.map((record) => {
              const checkIn = new Date(record.checkIn);
              const checkOut = new Date(record.checkOut);
              const workingHours = ((checkOut - checkIn) / 3600000).toFixed(2);

              return (
                <tr key={record.id} className="hover:bg-navy-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sky-100">{record.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sky-100">{record.employeeId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                    {checkIn.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                    {checkOut.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-sm rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700">
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sky-100">{workingHours}h</td>
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