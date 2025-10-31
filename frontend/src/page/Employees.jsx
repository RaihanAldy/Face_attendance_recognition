import React, { useState, useEffect } from "react";
import axios from "axios";

const Employees = () => {
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch employees dari API
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/employees");
      setEmployeesData(res.data);
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (loading)
    return <div className="text-sky-200 p-6">Loading employees...</div>;

  return (
    <div className="p-6 bg-gray-950 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-200 mb-6">Employees</h1>
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-lg border border-blue-500">
          <table className="min-w-full bg-gray-900">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-blue-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left font-medium text-blue-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left font-medium text-blue-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left font-medium text-blue-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left font-medium text-blue-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left font-medium text-blue-500 uppercase tracking-wider">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {employeesData
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((employee) => (
                  <tr
                    key={employee.employee_id}
                    className="hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                      {employee.employee_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                      {employee.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                      {employee.phone}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg">
          {/* Items per page info */}
          <div className="flex items-center text-sm text-gray-400">
            <span>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, employeesData.length)} to{" "}
              {Math.min(currentPage * itemsPerPage, employeesData.length)} of{" "}
              {employeesData.length} entries
            </span>
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                currentPage === 1
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex items-center space-x-2">
              {[...Array(Math.ceil(employeesData.length / itemsPerPage))].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                    currentPage === index + 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(prev + 1, Math.ceil(employeesData.length / itemsPerPage))
                )
              }
              disabled={currentPage >= Math.ceil(employeesData.length / itemsPerPage)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                currentPage >= Math.ceil(employeesData.length / itemsPerPage)
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Employees;
