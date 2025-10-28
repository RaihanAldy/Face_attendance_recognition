import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ScanFace,
  Users,
  Clock,
  FileText,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { id: "face-scan", label: "Face Scan", icon: ScanFace, path: "/face-scan" },
    { id: "attendance", label: "Attendance Log", icon: Clock, path: "/attendance" },
    { id: "employees", label: "Employees", icon: Users, path: "/employees" },
    { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <aside
      className={`bg-white border-r border-orange-100 h-screen transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-orange-100 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-orange-600 text-xs uppercase tracking-wider font-semibold">
            Navigation
          </h2>
        )}
          <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center" : "justify-start"
              } px-3 py-3 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                  : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
              title={isCollapsed ? item.label : ""}
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-white"
                } ${!isCollapsed && "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && isActive && (
                <div className="w-2 h-2 rounded-full bg-white"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-orange-100">
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-orange-600 text-xs mb-1">Recognition Status</p>
            <div className="flex items-center justify-between">
              <span className="text-gray-800 text-sm font-medium">
                Face Engine
              </span>
              <span className="flex items-center text-green-600 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                Active
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
