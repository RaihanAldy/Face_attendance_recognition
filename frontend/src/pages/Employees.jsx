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
    <div className="p-6 bg-navy-950 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-sky-400">Employees</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          Add New Employee
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-navy-800">
        <table className="min-w-full bg-navy-900">
          <thead className="bg-navy-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-sky-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {employeesData.map((employee) => (
              <tr key={employee.id} className="hover:bg-navy-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">{employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">{employee.employeeId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">{employee.department}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">{employee.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">{employee.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sky-100">{employee.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap space-x-3">
                  <button className="text-sky-400 hover:text-sky-300 transition-colors">Edit</button>
                  <button className="text-red-400 hover:text-red-300 transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-navy-950/80 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-navy-900 p-6 rounded-lg w-full max-w-md border border-navy-800">
            <h2 className="text-2xl font-bold mb-4 text-sky-400">Add New Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sky-300">Name</label>
                <input
                  type="text"
                  name="name"
                  value={newEmployee.name}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={newEmployee.employeeId}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">Department</label>
                <input
                  type="text"
                  name="department"
                  value={newEmployee.department}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">Position</label>
                <input
                  type="text"
                  name="position"
                  value={newEmployee.position}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newEmployee.email}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-300">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newEmployee.phone}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sky-100 placeholder-sky-600"
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