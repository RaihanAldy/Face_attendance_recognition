import React, { useState, useEffect } from "react";
import { ScanFace, Wifi, WifiOff, Bell, Search } from "lucide-react";

const Navbar = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());

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
      <nav className="bg-orange-500 border-b border-orange-400 shadow-lg">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-2">
              <ScanFace className="h-8 w-8 text-white" />
              <span className="text-white text-xl font-bold">
                Face Recognition Attendance
              </span>
            </div>

            {/* Right Side - Search, Status & User */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <button className="p-2 rounded-lg text-white hover:bg-orange-600 transition-colors">
                <Search className="h-5 w-5" />
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-lg text-white hover:bg-orange-600 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-orange-600">
                {isOnline ? (
                  <>
                    <Wifi className="h-5 w-5 text-white" />
                    <span className="text-white text-sm font-medium">
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
              <div className="text-white text-sm font-mono bg-orange-600 px-3 py-1.5 rounded-lg">
                {currentTime.toLocaleTimeString("id-ID")}
              </div>

              {/* User Profile */}
              <a href="/login" className="flex items-center space-x-2 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                  AD
                </div>
                <span className="text-white text-sm font-medium">
                  Admin Login
                </span>
              </a>
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
