import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  Settings,
  LogOut,
  ScanFace,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ userRole, onLogout }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { 
      id: "analytics", 
      label: "Analytics", 
      icon: LayoutDashboard, 
      path: "/analytics", 
    },
    { 
      id: "attendance", 
      label: "Attendance Log", 
      icon: Clock, 
      path: "/attendance", 
    },
    { 
      id: "employees", 
      label: "Employees", 
      icon: Users, 
      path: "/employees", 
    },
    { 
      id: "settings", 
      label: "Settings", 
      icon: Settings, 
      path: "/settings", 
    },
  ];

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

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
          <ScanFace className="h-8 w-8 text-blue-500" />
        </button>

        {!isCollapsed && (
          <div className="ml-3">
            <h2 className="text-gray-200 text-xl uppercase tracking-wider font-semibold">
              Admin Panel
            </h2>
            <div className="text-slate-400 text-xs mt-1">
              Administrator System
            </div>
          </div>
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

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center" : "justify-start"
          } px-3 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600 hover:text-white transition-all group`}
          title={isCollapsed ? "Logout" : ""}
        >
          <LogOut className={`h-5 w-5 ${!isCollapsed && "mr-3"}`} />
          {!isCollapsed && <span>Logout</span>}
        </button>
        
        {/* User Info */}
        {!isCollapsed && (
          <div className="mt-4 p-3 bg-slate-800 rounded-lg">
            <p className="text-slate-300 text-sm font-medium">
              {localStorage.getItem("userName") || "Administrator"}
            </p>
            <p className="text-blue-400 text-xs mt-1 font-medium">
              ADMIN
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}