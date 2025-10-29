import React, { useState, useEffect } from "react";
import axios from "axios";

const Employees = () => {
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);

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
            {employeesData.map((employee) => (
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
    </div>
  );
};

export default Employees;
