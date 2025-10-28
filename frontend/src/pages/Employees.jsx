import React, { useState } from 'react';

const Employees = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    employeeId: '',
    department: '',
    position: '',
    email: '',
    phone: ''
  });

  // Mock data - replace with actual API call
  const employeesData = [
    {
      id: 1,
      name: 'John Doe',
      employeeId: 'EMP001',
      department: 'IT',
      position: 'Software Engineer',
      email: 'john.doe@company.com',
      phone: '123-456-7890'
    },
    // Add more mock data as needed
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add API call to save new employee
    setShowAddModal(false);
    setNewEmployee({
      name: '',
      employeeId: '',
      department: '',
      position: '',
      email: '',
      phone: ''
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-orange-500">Employees</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Add New Employee
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-orange-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employeesData.map((employee) => (
              <tr key={employee.id} className="hover:bg-orange-50">
                <td className="px-6 py-4 whitespace-nowrap">{employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.employeeId}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.department}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.position}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{employee.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-orange-600 hover:text-orange-800 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-orange-500">Add New Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={newEmployee.name}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={newEmployee.employeeId}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  name="department"
                  value={newEmployee.department}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <input
                  type="text"
                  name="position"
                  value={newEmployee.position}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newEmployee.email}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newEmployee.phone}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
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