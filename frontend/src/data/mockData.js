export const summary = {
  total: 450,
  critical: 28,
  compliance: 94,
};

// Data absensi 7 hari terakhir
export const attendanceTrend = [
  { day: "Mon", count: 445 },
  { day: "Tue", count: 438 },
  { day: "Wed", count: 450 },
  { day: "Thu", count: 442 },
  { day: "Fri", count: 448 },
  { day: "Sat", count: 125 },
  { day: "Sun", count: 89 },
];

// Average Working Duration (in hours)
export const workingDurationData = {
  average: 8.3,
  longest: 10.2,
  shortest: 6.8,
};

// Top departemen dengan attendance tertinggi
export const topDepartments = [
  { type: "Engineering", count: 145 },
  { type: "Marketing", count: 98 },
  { type: "Sales", count: 87 },
  { type: "HR", count: 65 },
  { type: "Finance", count: 55 },
];

// Attendance berdasarkan jam dalam sehari (jam berapa paling banyak check-in)
export const hourlyCheckIns = [
  { hour: "00", checkIns: 0 },
  { hour: "01", checkIns: 0 },
  { hour: "02", checkIns: 0 },
  { hour: "03", checkIns: 0 },
  { hour: "04", checkIns: 1 },
  { hour: "05", checkIns: 3 },
  { hour: "06", checkIns: 12 },
  { hour: "07", checkIns: 85 },
  { hour: "08", checkIns: 245 },
  { hour: "09", checkIns: 78 },
  { hour: "10", checkIns: 15 },
  { hour: "11", checkIns: 8 },
  { hour: "12", checkIns: 5 },
  { hour: "13", checkIns: 25 },
  { hour: "14", checkIns: 12 },
  { hour: "15", checkIns: 8 },
  { hour: "16", checkIns: 6 },
  { hour: "17", checkIns: 42 },
  { hour: "18", checkIns: 18 },
  { hour: "19", checkIns: 5 },
  { hour: "20", checkIns: 2 },
  { hour: "21", checkIns: 1 },
  { hour: "22", checkIns: 0 },
  { hour: "23", checkIns: 0 },
];

// Data employees
export const employeesData = [
  {
    id: 1,
    name: "John Doe",
    employeeId: "EMP001",
    department: "IT",
    position: "Software Engineer",
    email: "john.doe@company.com",
    phone: "123-456-7890",
  },
  {
    id: 2,
    name: "Jane Smith",
    employeeId: "EMP002",
    department: "HR",
    position: "HR Manager",
    email: "jane.smith@company.com",
    phone: "234-567-8901",
  },
  {
    id: 3,
    name: "Michael Johnson",
    employeeId: "EMP003",
    department: "Finance",
    position: "Accountant",
    email: "michael.johnson@company.com",
    phone: "345-678-9012",
  },
  {
    id: 4,
    name: "Emily Davis",
    employeeId: "EMP004",
    department: "Marketing",
    position: "Marketing Specialist",
    email: "emily.davis@company.com",
    phone: "456-789-0123",
  },
  {
    id: 5,
    name: "William Brown",
    employeeId: "EMP005",
    department: "IT",
    position: "Frontend Developer",
    email: "william.brown@company.com",
    phone: "567-890-1234",
  },
  {
    id: 6,
    name: "Olivia Wilson",
    employeeId: "EMP006",
    department: "IT",
    position: "Backend Developer",
    email: "olivia.wilson@company.com",
    phone: "678-901-2345",
  },
  {
    id: 7,
    name: "James Taylor",
    employeeId: "EMP007",
    department: "Sales",
    position: "Sales Executive",
    email: "james.taylor@company.com",
    phone: "789-012-3456",
  },
  {
    id: 8,
    name: "Sophia Martinez",
    employeeId: "EMP008",
    department: "Customer Support",
    position: "Support Agent",
    email: "sophia.martinez@company.com",
    phone: "890-123-4567",
  },
  {
    id: 9,
    name: "Benjamin Anderson",
    employeeId: "EMP009",
    department: "Finance",
    position: "Financial Analyst",
    email: "benjamin.anderson@company.com",
    phone: "901-234-5678",
  },
  {
    id: 10,
    name: "Isabella Thomas",
    employeeId: "EMP010",
    department: "Marketing",
    position: "Content Writer",
    email: "isabella.thomas@company.com",
    phone: "012-345-6789",
  },
  {
    id: 11,
    name: "Lucas White",
    employeeId: "EMP011",
    department: "IT",
    position: "DevOps Engineer",
    email: "lucas.white@company.com",
    phone: "123-456-7891",
  },
];
