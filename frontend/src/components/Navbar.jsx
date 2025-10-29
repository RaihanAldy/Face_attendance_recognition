import React, { useState, useEffect } from "react";
import { ScanFace, Wifi, WifiOff, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userData');
    
    // Close the profile menu
    setShowProfileMenu(false);
    
    // Use React Router navigation
    navigate('/login');
  };

  const [notifications] = useState([
    {
      message: "Your attendance has been recorded",
      time: "Just now"
    },
    {
      message: "System update scheduled for tomorrow",
      time: "2 hours ago"
    },
    {
      message: "Welcome to Face Attendance System",
      time: "1 day ago"
    }
  ]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(timer);
    };
  }, []);

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
                      <h3 className="text-sm font-semibold text-slate-200">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0"
                        >
                          <p className="text-sm text-slate-200">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
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

              {/* User Profile */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                    AD
                  </div>
                  <span className="text-slate-300 text-sm font-medium">
                    Admin
                  </span>
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg py-2 z-50">
                    <a
                      href="/settings"
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                    >
                      Settings
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
              - Data absensi tersimpan lokal dan akan disinkronkan otomatis saat
              online
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
