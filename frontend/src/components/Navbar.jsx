import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScanFace, Wifi, WifiOff, Bell, Search, LogOut, X } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    {
      id: 1,
      title: "New Attendance",
      message: "John Doe clocked in at 09:00 AM",
      time: "5 minutes ago"
    },
    {
      id: 2,
      title: "System Update",
      message: "Face recognition system updated to v2.1",
      time: "1 hour ago"
    },
    {
      id: 3,
      title: "Late Arrival",
      message: "Jane Smith arrived 15 minutes late",
      time: "2 hours ago"
    }
  ]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/auth/login');
  };

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
      <nav className="bg-navy-950 border-b border-navy-800 shadow-lg w-full">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-2">
              <ScanFace className="h-8 w-8 text-sky-400" />
              <span className="text-sky-100 text-xl font-bold">
                Face Recognition Attendance
              </span>
            </div>

            {/* Right Side - Search, Status & User */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <button className="p-2 rounded-lg text-sky-400 hover:bg-navy-800 transition-colors">
                <Search className="h-5 w-5" />
              </button>

              {/* Notifications */}
              <button 
                className="relative p-2 rounded-lg text-sky-400 hover:bg-navy-800 transition-colors"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-navy-900">
                {isOnline ? (
                  <>
                    <Wifi className="h-5 w-5 text-sky-400" />
                    <span className="text-sky-100 text-sm font-medium">
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
              <div className="text-sky-100 text-sm font-mono bg-navy-900 px-3 py-1.5 rounded-lg">
                {currentTime.toLocaleTimeString("id-ID")}
              </div>

              {/* User Profile & Logout */}
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-navy-800 flex items-center justify-center text-navy-950 text-sm font-bold">
                  AD
                </div>
                <span className="text-sky-100 text-sm font-medium">
                  Admin
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-sky-400 hover:bg-navy-800 transition-colors flex items-center space-x-1"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowNotifications(false)}
          />
          
          {/* Modal */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md">
            <div className="h-full bg-navy-900 shadow-xl border-l border-navy-800">
              <div className="p-4 border-b border-navy-800 flex justify-between items-center bg-navy-800/50">
                <h3 className="text-lg font-medium text-sky-400">Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 rounded-lg text-sky-400 hover:bg-navy-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-4rem)]">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="p-4 hover:bg-navy-800 transition-colors border-b border-navy-800/50"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-sky-100 font-medium">{notification.title}</h4>
                      <span className="text-sky-500 text-xs bg-navy-800 px-2 py-1 rounded-full">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-sky-300 text-sm mt-1">{notification.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-navy-900 text-sky-100 px-6 py-2.5 text-sm">
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
