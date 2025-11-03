// API Configuration
export const API_BASE_URL = "http://localhost:5000/api";

// API Endpoints
export const API_ENDPOINTS = {
  // Employees
  employees: `${API_BASE_URL}/employees`,
  
  // Attendance
  attendance: `${API_BASE_URL}/attendance`,
  attendanceLog: `${API_BASE_URL}/attendance/log`,
  checkIn: `${API_BASE_URL}/attendance/checkin`,
  checkOut: `${API_BASE_URL}/attendance/checkout`,
  
  // Analytics
  analyticsSummary: `${API_BASE_URL}/analytics/summary`,
  attendanceTrend: `${API_BASE_URL}/analytics/attendance-trend`,
  workingDuration: `${API_BASE_URL}/analytics/working-duration`,
  departments: `${API_BASE_URL}/analytics/departments`,
  hourlyCheckins: `${API_BASE_URL}/analytics/hourly-checkins`,
  dashboard: `${API_BASE_URL}/analytics/dashboard`,
  
  // Face Recognition
  recognize: `${API_BASE_URL}/recognize`,
  
  // System
  health: `${API_BASE_URL}/health`,
};

// Helper function untuk fetch dengan error handling
export const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`API Error (${url}):`, error);
    return { success: false, error: error.message };
  }
};

// Specific API functions
export const analyticsAPI = {
  getSummary: () => apiRequest(API_ENDPOINTS.analyticsSummary),
  getTrend: () => apiRequest(API_ENDPOINTS.attendanceTrend),
  getWorkingDuration: () => apiRequest(API_ENDPOINTS.workingDuration),
  getDepartments: () => apiRequest(API_ENDPOINTS.departments),
  getHourlyCheckins: (date) => apiRequest(`${API_ENDPOINTS.hourlyCheckins}?date=${date || ''}`),
};

export const employeeAPI = {
  getAll: () => apiRequest(API_ENDPOINTS.employees),
  create: (data) => apiRequest(API_ENDPOINTS.employees, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export const attendanceAPI = {
  getLog: (date) => apiRequest(`${API_ENDPOINTS.attendanceLog}?date=${date || ''}`),
  checkIn: (employeeId, confidence = 0.95) => apiRequest(API_ENDPOINTS.checkIn, {
    method: 'POST',
    body: JSON.stringify({ employeeId, confidence }),
  }),
  checkOut: (employeeId, confidence = 0.95) => apiRequest(API_ENDPOINTS.checkOut, {
    method: 'POST',
    body: JSON.stringify({ employeeId, confidence }),
  }),
};
