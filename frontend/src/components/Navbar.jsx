import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  Bell,
  LogOut,
  CheckCircle,
  Clock,
  BellRing,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = ({ onLogout, userRole }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("authToken");

      // Fetch pending verifications
      const pendingResponse = await fetch(
        "http://localhost:5000/api/attendance/pending?status=pending",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();

        // Handle direct array
        const pendingArray = Array.isArray(pendingData)
          ? pendingData
          : pendingData.requests || [];

        const pendingNotifications = pendingArray
          .filter((req) => req.status === "pending")
          .map((req) => {
            // Get employee name with fallback
            const employeeName =
              req.employee_name || req.employees || "Unknown Employee";

            // Determine valid timestamp
            const timestampValue =
              req.submitted_at || req.timestamp || req.created_at;
            const timestampDate = timestampValue
              ? new Date(timestampValue)
              : new Date();

            // Ensure timestamp is valid
            const isValidDate = !isNaN(timestampDate.getTime());

            return {
              id: req._id,
              type: "pending_verification",
              message: `${employeeName} submitted a manual check-out request`,
              time: isValidDate ? formatTimeAgo(timestampDate) : "Just now",
              timestamp: isValidDate ? timestampDate : new Date(),
              read: false,
              data: req,
            };
          });

        // Fetch AI Insights
        const insightsResponse = await fetch(
          "http://localhost:5000/api/insights/latest",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let insightNotifications = [];
        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          if (insightsData.insights) {
            insightNotifications = [
              {
                id: insightsData.insights.record_id,
                type: "ai_insight",
                message: `New AI Insight: ${
                  insightsData.insights.summary?.substring(0, 50) ||
                  "Analysis completed"
                }...`,
                time: formatTimeAgo(
                  new Date(insightsData.insights.generated_at)
                ),
                timestamp: new Date(insightsData.insights.generated_at),
                read: false,
                data: insightsData.insights,
              },
            ];
          }
        }

        // Combine and sort notifications
        const allNotifications = [
          ...pendingNotifications,
          ...insightNotifications,
        ].sort((a, b) => b.timestamp - a.timestamp);

        setNotifications(allNotifications);
        setUnreadCount(allNotifications.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Get user data from localStorage
    const storedUser = localStorage.getItem("userData");
    const userName = localStorage.getItem("userName") || "User";
    const userEmail = localStorage.getItem("userEmail") || "user@example.com";

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      const defaultUser = {
        name: userName,
        email: userEmail,
        role: userRole || "employee",
      };
      setUser(defaultUser);
      localStorage.setItem("userData", JSON.stringify(defaultUser));
    }

    // Fetch notifications initially
    if (userRole === "admin") {
      fetchNotifications();

      // Poll every 30 seconds
      const notificationInterval = setInterval(fetchNotifications, 30000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        clearInterval(timer);
        clearInterval(notificationInterval);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      navigate("/login", { replace: true });
    }
    setShowDropdown(false);
  };

  const handleNotificationClick = (notification) => {
    if (notification.type === "pending_verification") {
      navigate("/pending");
    } else if (notification.type === "ai_insight") {
      navigate("/admin/insights");
    }
    setShowNotifications(false);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const getUserRoleText = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "employee":
        return "Employee";
      default:
        return "User";
    }
  };

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo / Brand (placeholder) */}
            <div className="flex items-center space-x-2">
              {/* Put your logo/brand here */}
              <div className="text-white font-semibold">MyApp</div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {userRole === "admin" && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-96 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
                      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                          <BellRing className="h-4 w-4" />
                          Notifications
                        </h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-slate-400">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No notifications</p>
                          </div>
                        ) : (
                          notifications.map((notification, index) => (
                            <div
                              key={notification.id || index}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              className={`px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0 transition-colors ${
                                !notification.read ? "bg-slate-750" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-1 p-1.5 rounded-lg ${
                                    notification.type === "pending_verification"
                                      ? "bg-amber-500/20"
                                      : "bg-blue-500/20"
                                  }`}
                                >
                                  {notification.type ===
                                  "pending_verification" ? (
                                    <Clock className="h-4 w-4 text-amber-400" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-blue-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm ${
                                      !notification.read
                                        ? "text-slate-100 font-medium"
                                        : "text-slate-200"
                                    }`}
                                  >
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800">
                {isOnline ? (
                  <>
                    <Wifi className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 text-sm font-medium">
                      Online
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-5 w-5 text-red-500" />
                    <span className="text-red-500 text-sm font-medium">
                      Offline
                    </span>
                  </>
                )}
              </div>

              {/* Current Time */}
              <div className="text-slate-300 text-sm font-mono bg-slate-800 px-3 py-1.5 rounded-lg">
                {currentTime.toLocaleTimeString("en-US")}
              </div>

              {/* User Profile with Dropdown */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                      {initials}
                    </div>
                    <div className="text-left">
                      <span className="text-slate-300 text-sm font-medium block">
                        {user.name}
                      </span>
                      <span className="text-slate-400 text-xs block">
                        {getUserRoleText(user.role || userRole)}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 top-12 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-slate-700">
                        <p className="text-slate-300 text-sm font-medium">
                          {user.name}
                        </p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                        <p className="text-blue-400 text-xs mt-1">
                          {getUserRoleText(user.role || userRole)}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-sm"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-6 py-2.5 text-sm">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span className="font-medium">Offline Mode Active</span>
            <span className="opacity-90">
              Attendance data is stored locally and will sync automatically when
              online
            </span>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {(showDropdown || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false);
            setShowNotifications(false);
          }}
        />
      )}
    </>
  );
};

export default Navbar;
