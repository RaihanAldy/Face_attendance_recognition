import React, { useState } from "react";
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
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "face-scan", label: "Face Scan", icon: ScanFace },
    { id: "attendance", label: "Attendance Log", icon: Clock },
    { id: "employees", label: "Employees", icon: Users },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 h-screen transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Navigation
          </h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ml-auto"
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
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center" : "justify-start"
              } px-3 py-3 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Recognition Status</p>
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">
                Face Engine
              </span>
              <span className="flex items-center text-green-500 text-xs">
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
