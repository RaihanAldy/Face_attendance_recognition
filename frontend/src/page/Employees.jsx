import React, { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Employees = () => {
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch employees dari API
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees`);
      if (!response.ok) throw new Error("Failed to fetch employees");

      const data = await response.json();
      setEmployeesData(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(employeesData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = employeesData.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  if (loading)
    return <div className="text-sky-200 p-6">Loading employees...</div>;
  if (error)
    return <div className="text-red-400 p-6">Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-950 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-200 mb-6">Employees</h1>
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
            {currentData.map((employee) => (
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
      <div className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg mt-4">
        <div className="flex items-center text-sm text-gray-400">
          <span>
            Showing{" "}
            {Math.min((currentPage - 1) * itemsPerPage + 1, employeesData.length)}{" "}
            to{" "}
            {Math.min(currentPage * itemsPerPage, employeesData.length)} of{" "}
            {employeesData.length} entries
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              currentPage === 1
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => goToPage(index + 1)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                currentPage === index + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              {index + 1}
            </button>
          ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              currentPage === totalPages
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Employees;
