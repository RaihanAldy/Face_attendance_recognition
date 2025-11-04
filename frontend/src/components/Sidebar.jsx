import React, { useState } from "react";
import {
  LayoutDashboard,
  ScanFace,
  Users,
  Clock,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
    {
      id: "attendance",
      label: "Attendance Log",
      icon: Clock,
      path: "/attendance",
    },
    { id: "employees", label: "Employees", icon: Users, path: "/employees" },
    { id: "pending", label: "pending", icon: FileText, path: "/pending" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 min-h-screen transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      <div className="border-b border-slate-800 flex items-center h-16 px-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-12 w-12 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {isCollapsed ? (
            <ScanFace className="h-8 w-8 text-blue-500" />
          ) : (
            <ScanFace className="h-8 w-8 text-blue-500" />
          )}
        </button>

        {!isCollapsed && (
          <h2 className="text-slate-400 text-xl uppercase tracking-wider font-semibold">
            Recca
          </h2>
        )}
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
                  ? "bg-blue-600 text-white"
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
    </aside>
  );
}
