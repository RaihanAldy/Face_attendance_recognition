export const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split("T")[0]);
  }
  return days;
};

export const formatDay = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", { weekday: "short" });

// PERBAIKAN: Menambahkan parameter stats dan error handling
export const transformAnalyticsData = (attendance, employees) => {
  try {
    // Pastikan data adalah array
    const attendanceData = Array.isArray(attendance) ? attendance : [];
    const employeesData = Array.isArray(employees) ? employees : [];

    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = attendanceData.filter((a) => a.date === today);

    const lateArrivals = todayAttendance.filter(
      (a) => a.checkin?.status === "late"
    ).length;

    const durationsInMinutes = attendanceData
      .filter((a) => a.work_duration_minutes > 0)
      .map((a) => a.work_duration_minutes);

    const avgMinutes =
      durationsInMinutes.length > 0
        ? durationsInMinutes.reduce((a, b) => a + b, 0) /
          durationsInMinutes.length
        : 0;

    const longestMinutes =
      durationsInMinutes.length > 0 ? Math.max(...durationsInMinutes) : 0;
    const shortestMinutes =
      durationsInMinutes.length > 0 ? Math.min(...durationsInMinutes) : 0;

    const last7Days = getLast7Days();
    const attendanceByDate = {};
    attendanceData.forEach((record) => {
      if (last7Days.includes(record.date)) {
        attendanceByDate[record.date] =
          (attendanceByDate[record.date] || 0) + 1;
      }
    });

    const attendanceTrend = last7Days.map((day) => ({
      day: formatDay(day),
      count: attendanceByDate[day] || 0,
      date: day,
    }));

    const deptMap = {};
    const empDeptMap = {};
    employeesData.forEach((emp) => {
      empDeptMap[emp.employee_id] = emp.department || "General";
    });

    attendanceData.forEach((record) => {
      const dept = empDeptMap[record.employee_id] || "General";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const topDepartments = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([dept, count]) => ({
        type: dept.length > 10 ? dept.substring(0, 10) + "..." : dept,
        count,
        fullName: dept,
      }));

    const hourlyCount = Array(24).fill(0);
    attendanceData.forEach((record) => {
      if (record.checkin?.timestamp) {
        const hour = new Date(record.checkin.timestamp).getHours();
        hourlyCount[hour]++;
      }
    });

    const hourlyCheckIns = hourlyCount.map((count, hour) => ({
      hour: hour.toString().padStart(2, "0"),
      checkIns: count,
    }));

    const totalCheckins = attendanceData.filter((a) => a.checkin).length;
    const onTimeCheckins = attendanceData.filter(
      (a) => a.checkin?.status === "ontime"
    ).length;

    const complianceRate =
      totalCheckins > 0
        ? Math.round((onTimeCheckins / totalCheckins) * 100)
        : 0;

    return {
      summary: {
        total: todayAttendance.length,
        critical: lateArrivals,
      },
      workingDurationData: {
        average: Number((avgMinutes / 60).toFixed(1)),
        longest: Number((longestMinutes / 60).toFixed(1)),
        shortest: Number((shortestMinutes / 60).toFixed(1)),
      },
      attendanceTrend,
      topDepartments,
      hourlyCheckIns,
      complianceRate,
    };
  } catch (error) {
    console.error("Error in transformAnalyticsData:", error);
    // Return data default jika terjadi error
    return {
      summary: { total: 0, critical: 0 },
      workingDurationData: { average: 0, longest: 0, shortest: 0 },
      attendanceTrend: [],
      topDepartments: [],
      hourlyCheckIns: [],
      complianceRate: 0,
    };
  }
};
