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
      className={`bg-navy-950 border-r border-navy-800 h-screen transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-navy-800 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-sky-400 text-xs uppercase tracking-wider font-semibold">
            Navigation
          </h2>
        )}
          <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-sky-400 hover:bg-navy-800 transition-colors ml-auto"
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
                  ? "bg-sky-500 text-navy-950 shadow-lg shadow-sky-500/20"
                  : "text-sky-400 hover:bg-navy-800"
              }`}
              title={isCollapsed ? item.label : ""}
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive
                    ? "text-navy-950"
                    : "text-sky-400 group-hover:text-sky-300"
                } ${!isCollapsed && "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && isActive && (
                <div className="w-2 h-2 rounded-full bg-navy-950"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-navy-800">
          <div className="bg-navy-900 rounded-lg p-3 border border-navy-800">
            <p className="text-sky-400 text-xs mb-1">Recognition Status</p>
            <div className="flex items-center justify-between">
              <span className="text-sky-100 text-sm font-medium">
                Face Engine
              </span>
              <span className="flex items-center text-emerald-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5"></span>
                Active
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
