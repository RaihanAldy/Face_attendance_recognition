import React, { useState } from "react";
import { User, Settings, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserLayout = ({ children, onLogout }) => {
  const [showLogout, setShowLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showHiddenMenu, setShowHiddenMenu] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    navigate('/login');
    setShowHiddenMenu(false);
  };

  const handleRegistration = () => {
    navigate('/face-registration');
    setShowHiddenMenu(false);
  };

  const closeRegistrationModal = () => {
    setShowRegistrationModal(false);
  };

  const userName = localStorage.getItem("userName") || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 relative">
      {/* Floating Action Buttons */}
      <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3">
        
        {/* Hidden Menu Trigger Button (Secret Double Click) */}
        <button
          onDoubleClick={() => setShowHiddenMenu(!showHiddenMenu)}
          className="w-10 h-10 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 flex items-center justify-center text-xs transition-all"
          title="Double click for admin menu"
        >
          ⚙️
        </button>

        {/* Hidden Admin Menu */}
        {showHiddenMenu && (
          <div className="bg-slate-800 rounded-xl p-3 shadow-2xl border border-slate-700 animate-scale-in">
            <div className="space-y-2">
              <button
                onClick={handleAdminLogin}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
              >
                <User className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
              
              <button
                onClick={handleRegistration}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Registrasi Karyawan</span>
              </button>
            </div>
          </div>
        )} 
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-700 shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 p-2 rounded-full">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Registrasi Karyawan Baru</h2>
                  <p className="text-slate-400 text-sm">Tambahkan data karyawan baru</p>
                </div>
              </div>
              <button
                onClick={closeRegistrationModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Registration Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="email@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Departemen
                  </label>
                  <select className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all">
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Posisi
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Posisi/jabatan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="+62 812-3456-7890"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeRegistrationModal}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  alert('Registrasi karyawan berhasil! (Simulasi)');
                  closeRegistrationModal();
                }}
                className="flex-1 px-4 py-3 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium transition-all transform hover:scale-105"
              >
                Simpan Data
              </button>
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <p className="text-blue-400 text-sm text-center">
                💡 ID Karyawan akan dibuat otomatis oleh sistem
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-linear-to-r from-blue-500 to-purple-500"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {children}
      </div>

      {/* Footer Info dengan Hidden Hint */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-slate-400 text-sm text-center">
        <div>Sistem Absensi Karyawan - {new Date().getFullYear()}</div>
        <div className="text-xs text-slate-500 mt-1">
          💡 Tips: Double klik icon ⚙️ untuk menu admin
        </div>
      </div>

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UserLayout;