import { Settings as SettingIcons } from "lucide-react";
import { useState, useEffect } from "react";

const Settings = () => {
  const [settings, setSettings] = useState({
    startTime: "08:00",
    endTime: "17:00",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // ✅ State baru untuk sync
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("http://localhost:5000/api/settings");

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setSettings({
          startTime: data.startTime || "08:00",
          endTime: data.endTime || "17:00",
        });
      } catch (error) {
        console.error("Failed to load settings:", error);
        setMessage({
          type: "error",
          text: "Gagal memuat pengaturan",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateSettings = () => {
    const { startTime, endTime } = settings;

    if (!startTime || !endTime) {
      return "Waktu mulai dan akhir harus diisi";
    }

    if (startTime >= endTime) {
      return "Waktu akhir harus setelah waktu mulai";
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateSettings();
    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    try {
      setIsSaving(true);
      setMessage({ type: "", text: "" });

      const response = await fetch("http://localhost:5000/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      setMessage({
        type: "success",
        text: result.message || "Pengaturan berhasil disimpan!",
      });

      // Auto clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({
        type: "error",
        text: error.message || "Error menyimpan pengaturan",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Fungsi khusus untuk handle sync manual
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setMessage({ type: "", text: "" });

      const res = await fetch("http://localhost:5000/api/sync", {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setMessage({
        type: "success",
        text: data.message || "Sync berhasil dijalankan!",
      });

      // Auto clear success message after 5 seconds (lebih lama untuk sync)
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } catch (error) {
      console.error("Sync gagal:", error);
      setMessage({
        type: "error",
        text: error.message || "Sync gagal",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTimeChange = (field, value) => {
    handleInputChange(field, value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
        <div className="text-white text-lg">Memuat pengaturan...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-2 mb-6">
          <SettingIcons size={36} className="text-white shrink-0" />
          <h1 className="text-4xl font-bold text-white leading-none">
            Settings
          </h1>
        </div>
        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "error"
                ? "bg-red-500/20 border border-red-500 text-red-200"
                : "bg-green-500/20 border border-green-500 text-green-200"
            }`}
          >
            {message.text}
          </div>
        )}
        <div className="bg-slate-900 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-gray-200 mb-2 text-sm font-medium">
              Jam Masuk:
            </label>
            <input
              type="time"
              value={settings.startTime}
              onChange={(e) => handleTimeChange("startTime", e.target.value)}
              className="w-full bg-white border-2 border-blue-500 rounded-lg px-4 py-3 text-slate-950 focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-200 mb-2 text-sm font-medium">
              Jam Pulang:
            </label>
            <input
              type="time"
              value={settings.endTime}
              onChange={(e) => handleTimeChange("endTime", e.target.value)}
              className="w-full bg-white border-2 border-blue-500 rounded-lg px-4 py-3 text-slate-950 focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {/* Tombol Simpan */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan...
                </>
              ) : (
                "Simpan Pengaturan"
              )}
            </button>

            {/* ✅ Tombol Sync Manual - DIPERBAIKI */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyinkronkan...
                </>
              ) : (
                "Sync Manual"
              )}
            </button>

            {/* Tombol Kembali */}
            <button
              onClick={() => window.history.back()}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
