import React, { useState } from "react";
import { employeesData } from "../data/mockData";

const Employees = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    employeeId: "",
    department: "",
    position: "",
    email: "",
    phone: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add API call to save new employee
    setShowAddModal(false);
    setNewEmployee({
      name: "",
      employeeId: "",
      department: "",
      position: "",
      email: "",
      phone: "",
    });
  };

  return (
    <div className="p-6 bg-gray-950 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-200">Employees</h1>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                key={employee.id}
                className="hover:bg-gray-800 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                  {employee.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">
                  {employee.employeeId}
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

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-950/80 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-200 p-6 rounded-lg w-full max-w-md border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sky-300">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={newEmployee.name}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">
                  Employee ID
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={newEmployee.employeeId}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={newEmployee.department}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={newEmployee.position}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newEmployee.email}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={newEmployee.phone}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
