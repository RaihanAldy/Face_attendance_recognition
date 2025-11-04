import { employeesData } from "../../data/mockData";

export default function EmployeeRanking({ employees = [] }) {
  // Data dummy jika tidak ada data dari props - menggunakan nama dari employeesData
  const defaultEmployees = [
    { id: 1, name: employeesData[0].name, punctualityRate: 98, onTimeCount: 147, lateCount: 3 },
    { id: 2, name: employeesData[5].name, punctualityRate: 96, onTimeCount: 144, lateCount: 6 },
    { id: 3, name: employeesData[10].name, punctualityRate: 94, onTimeCount: 141, lateCount: 9 },
  ];

  const displayData = employees.length > 0 ? employees : defaultEmployees;

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return <span className="text-white">{rank}</span>;
    }
  };

  return (
    <div className="bg-slate-900 p-4 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">
        Top Punctual Rates Employees
      </h2>
      <div className="flex flex-col gap-3">
        {displayData.slice(0, 3).map((employee, index) => (
          <div
            key={employee.id}
            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              index === 0
                ? "bg-linear-to-r from-yellow-600/20 to-yellow-800/20 border border-yellow-600/30"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="text-2xl font-bold w-8 text-center">
                {getMedalIcon(index + 1)}
              </div>
              <div className="flex flex-col">
                <span className="text-gray-200 font-medium">
                  {employee.name}
                </span>
                <div className="flex gap-3 mt-1">
                  <span className="text-green-400 text-xs flex items-center gap-1">
                    <span className="text-green-500">✓</span> {employee.onTimeCount} on time
                  </span>
                  <span className="text-red-400 text-xs flex items-center gap-1">
                    <span className="text-red-500">✗</span> {employee.lateCount} late
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-500/20 px-3 py-1 rounded-lg">
                <span className="text-blue-400 font-bold text-sm">
                  {employee.punctualityRate}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
