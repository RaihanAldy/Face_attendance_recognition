import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = ({ onLogout, userRole }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

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
    setNotifications([
      { message: "Sistem berhasil disinkronkan", time: "Baru saja" },
      { message: "Koneksi jaringan stabil", time: "1 menit lalu" },
    ]);

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Create default user data if not exists
      const defaultUser = {
        name: userName,
        email: userEmail,
        role: userRole || "employee",
      };
      setUser(defaultUser);
      localStorage.setItem("userData", JSON.stringify(defaultUser));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(timer);
    };
  }, [userRole]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      navigate("/login", { replace: true });
    }
    setShowDropdown(false);
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
            {/* Logo & Brand */}
            <div className="flex items-center space-x-2"></div>

            {/* Right Side - Search, Status & User */}
            <div className="flex items-center space-x-4">
              {/* Search */}

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Notifications
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0"
                        >
                          <p className="text-sm text-slate-200">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                {currentTime.toLocaleTimeString("id-ID")}
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
            <span className="font-medium">Mode Offline Aktif</span>
            <span className="opacity-90">
              Data absensi tersimpan lokal dan akan disinkronkan otomatis saat
              online
            </span>
          </div>
        </div>
      )}

      {/* Overlay untuk menutup dropdown ketika klik di luar */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </>
  );
};

export default Navbar;
