const API_BASE_URL = "http://localhost:5000/api";

class AnalyticsData {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === "object") {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw new Error(
        `Failed to fetch data from ${endpoint}: ${error.message}`
      );
    }
  }

  // Get attendance statistics
  async getAttendanceStats(date = null) {
    const params = date ? `?date=${date}` : "";
    return this.request(`/attendance/stats${params}`);
  }

  // Get attendance by date untuk trend analysis
  async getAttendanceByDate(date) {
    return this.request(`/attendance?date=${date}`);
  }

  // Get all employees untuk department analysis
  async getEmployees() {
    return this.request("/employees");
  }

  // Get recent attendance untuk hourly heatmap
  async getRecentAttendance(limit = 100) {
    const attendance = await this.request("/attendance?date=all");
    return attendance.slice(0, limit);
  }

  // Get comprehensive analytics data

  // Transform raw data ke format yang dibutuhkan komponen
  transformAnalyticsData(attendanceData, stats, employees, recentAttendance) {
    // 1. Summary Data
    const summary = {
      total: stats.present_today || attendanceData.length,
      critical: this.calculateLateArrivals(attendanceData),
      averageHours: this.calculateAverageWorkingHours(attendanceData),
    };

    // 2. Attendance Trend (7 hari terakhir)
    const attendanceTrend = this.generateAttendanceTrend(recentAttendance);

    // 3. Department Analysis
    const topDepartments = this.analyzeDepartments(attendanceData, employees);

    // 4. Hourly Check-ins Heatmap
    const hourlyCheckIns = this.generateHourlyHeatmap(recentAttendance);

    // 5. Working Duration Distribution
    const workingDurationData = this.analyzeWorkingDuration(attendanceData);

    // 6. Employee Ranking
    const employeeRanking = this.generateEmployeeRanking(
      attendanceData,
      employees
    );

    return {
      summary,
      attendanceTrend,
      topDepartments,
      hourlyCheckIns,
      workingDurationData,
      employeeRanking,
      rawData: {
        attendance: attendanceData,
        stats,
        employees,
      },
    };
  }

  calculateLateArrivals(attendanceData) {
    return attendanceData.filter(
      (record) => record.checkin && record.checkin.status === "late"
    ).length;
  }

  calculateAverageWorkingHours(attendanceData) {
    const validRecords = attendanceData.filter(
      (record) =>
        record.work_duration_minutes && record.work_duration_minutes > 0
    );

    if (validRecords.length === 0) return 0;

    const totalMinutes = validRecords.reduce(
      (sum, record) => sum + record.work_duration_minutes,
      0
    );

    return Math.round((totalMinutes / validRecords.length / 60) * 10) / 10;
  }

  generateAttendanceTrend(attendanceData) {
    // Group by date untuk trend 7 hari terakhir
    const last7Days = this.getLast7Days();
    const attendanceByDate = {};

    attendanceData.forEach((record) => {
      const date = record.date;
      if (last7Days.includes(date)) {
        if (!attendanceByDate[date]) {
          attendanceByDate[date] = 0;
        }
        attendanceByDate[date]++;
      }
    });

    return last7Days.map((day) => ({
      day: this.formatDay(day),
      count: attendanceByDate[day] || 0,
      date: day,
    }));
  }

  analyzeDepartments(attendanceData, employees) {
    const departmentMap = {};

    // Map employee_id ke department
    const employeeDepartment = {};
    employees.forEach((emp) => {
      employeeDepartment[emp.employee_id] = emp.department || "General";
    });

    // Hitung attendance per department
    attendanceData.forEach((record) => {
      const dept = employeeDepartment[record.employee_id] || "General";
      if (!departmentMap[dept]) {
        departmentMap[dept] = 0;
      }
      departmentMap[dept]++;
    });

    // Convert ke format yang dibutuhkan BarChart
    return Object.entries(departmentMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([department, count]) => ({
        type:
          department.length > 10
            ? department.substring(0, 10) + "..."
            : department,
        count,
        fullName: department,
      }));
  }

  generateHourlyHeatmap(attendanceData) {
    const hourlyCount = Array(24).fill(0);

    attendanceData.forEach((record) => {
      if (record.checkin && record.checkin.timestamp) {
        const hour = new Date(record.checkin.timestamp).getHours();
        hourlyCount[hour]++;
      }
    });

    return hourlyCount.map((count, hour) => ({
      hour: hour.toString().padStart(2, "0"),
      checkIns: count,
    }));
  }

  analyzeWorkingDuration(attendanceData) {
    const durations = attendanceData
      .filter(
        (record) =>
          record.work_duration_minutes && record.work_duration_minutes > 0
      )
      .map((record) => record.work_duration_minutes);

    if (durations.length === 0) {
      return { average: 0, distribution: [] };
    }

    const average = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Group into duration ranges
    const distribution = [
      { range: "<4h", count: durations.filter((d) => d < 240).length },
      {
        range: "4-6h",
        count: durations.filter((d) => d >= 240 && d < 360).length,
      },
      {
        range: "6-8h",
        count: durations.filter((d) => d >= 360 && d < 480).length,
      },
      { range: "8h+", count: durations.filter((d) => d >= 480).length },
    ];

    return {
      average: Math.round((average / 60) * 10) / 10,
      distribution,
    };
  }

  generateEmployeeRanking(attendanceData, employees) {
    const employeeStats = {};

    // Initialize stats
    employees.forEach((emp) => {
      employeeStats[emp.employee_id] = {
        name: emp.name,
        onTimeCount: 0,
        lateCount: 0,
        totalRecords: 0,
      };
    });

    // Count attendance records
    attendanceData.forEach((record) => {
      if (employeeStats[record.employee_id]) {
        employeeStats[record.employee_id].totalRecords++;
        if (record.checkin && record.checkin.status === "late") {
          employeeStats[record.employee_id].lateCount++;
        } else if (record.checkin) {
          employeeStats[record.employee_id].onTimeCount++;
        }
      }
    });

    // Calculate punctuality rate dan filter yang punya data
    const rankedEmployees = Object.values(employeeStats)
      .filter((stat) => stat.totalRecords > 0)
      .map((stat) => ({
        id: stat.name, // menggunakan name sebagai ID sementara
        name: stat.name,
        punctualityRate: Math.round(
          (stat.onTimeCount / stat.totalRecords) * 100
        ),
        onTimeCount: stat.onTimeCount,
        lateCount: stat.lateCount,
        totalRecords: stat.totalRecords,
      }))
      .sort((a, b) => b.punctualityRate - a.punctualityRate)
      .slice(0, 5);

    return rankedEmployees;
  }

  getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  }

  formatDay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
}

export default new AnalyticsData();
