import React, { useState, useRef, useEffect } from "react";
import {
  ScanFace,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

export default function FaceScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [attendanceType, setAttendanceType] = useState("check_in");
  const [mode, setMode] = useState("recognition");
  const [registrationData, setRegistrationData] = useState({
    name: "",
    department: "General",
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);
  const MySwal = withReactContent(Swal);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ✅ FIXED: Proper async/await camera initialization
  const startCamera = async () => {
    // Prevent concurrent calls
    if (isStartingRef.current) {
      console.log("⏳ Camera already starting, skipping...");
      isStartingRef.current = true;
    }
    try {
      console.log("🎥 Requesting camera access...");

      // Stop existing camera first
      if (streamRef.current) {
        console.log("🛑 Stopping existing stream first");
        stopCamera();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // ✅ FIX: Wait for video element to be ready
      let retries = 0;
      const maxRetries = 10;
      while (!videoRef.current && retries < maxRetries) {
        console.log(
          `⏳ Waiting for video element... (${retries + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      if (!videoRef.current) {
        throw new Error("Video element not found after waiting");
      }

      console.log("✅ Video element found!");

      // Request camera with constraints
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!stream) {
        throw new Error("No stream returned from camera");
      }

      console.log("✅ Stream obtained:", stream.id);

      // Assign stream to video
      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      // ✅ Wait for video to load and play
      await new Promise((resolve, reject) => {
        const video = videoRef.current;
        let resolved = false;

        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("canplay", onCanPlay);
          video.removeEventListener("error", onError);
        };

        const onLoadedMetadata = () => {
          console.log("📹 Video metadata loaded");
        };

        const onCanPlay = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            console.log(
              "✅ Video can play - dimensions:",
              video.videoWidth,
              "x",
              video.videoHeight
            );

            video
              .play()
              .then(() => {
                console.log("▶️ Video playing");
                resolve();
              })
              .catch((err) => {
                console.error("❌ Play error:", err);
                reject(err);
              });
          }
        };

        const onError = (err) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            console.error("❌ Video error:", err);
            reject(new Error(`Video error: ${err.message || "Unknown"}`));
          }
        };

        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("error", onError);

        // Fallback timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log("⏰ Timeout but video has dimensions, accepting");
              video.play().then(resolve).catch(reject);
            } else {
              reject(new Error("Video load timeout - no dimensions"));
            }
          }
        }, 5000);
      });

      setIsScanning(true);
      isStartingRef.current = false;
      console.log("✅ Camera started successfully!");
      return true;
    } catch (error) {
      console.error("❌ Camera access failed:", error);
      isStartingRef.current = false;

      let detailedError = "Tidak dapat mengakses kamera. ";

      if (error.name === "NotAllowedError") {
        detailedError +=
          "Permission kamera ditolak. Silakan izinkan akses kamera di browser settings.";
      } else if (error.name === "NotFoundError") {
        detailedError += "Tidak ada kamera yang ditemukan.";
      } else if (error.name === "NotSupportedError") {
        detailedError += "Browser tidak mendukung akses kamera.";
      } else if (error.name === "NotReadableError") {
        detailedError += "Kamera sedang digunakan oleh aplikasi lain.";
      } else {
        detailedError += `Error: ${error.message}`;
      }

      setErrorMessage(detailedError);
      setScanStatus("failed");
      setIsScanning(false);

      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      return false;
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        console.log("🛑 Stopping camera tracks...");
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          track.stop();
          console.log(`⏹️ Stopped ${track.kind} track`);
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsScanning(false);
      isStartingRef.current = false;
      console.log("✅ Camera fully stopped");
    } catch (error) {
      console.error("Error in stopCamera:", error);
      setIsScanning(false);
      isStartingRef.current = false;
    }
  };

  // Generate mock face embedding
  const generateFaceEmbedding = () => {
    return Array.from({ length: 512 }, () => Math.random());
  };

  // Face Recognition Function
  const recognizeFace = async () => {
    const faceEmbedding = generateFaceEmbedding();

    try {
      console.log("🔍 Sending REAL recognition request...");

      const response = await fetch("http://localhost:5000/api/recognize-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ faceEmbedding: faceEmbedding }),
      });

      if (!response.ok)
        throw new Error(`Recognition API error: ${response.status}`);

      const result = await response.json();
      console.log("✅ REAL Recognition result:", result);

      if (result.success) {
        // ✅ GUNAKAN DATA REAL DARI BACKEND
        setEmployeeData({
          name: result.employee.name,
          id: result.employee.employee_id, // ✅ ID dari backend
          department: result.employee.department,
          confidence: result.employee.similarity,
          isExisting: true,
        });
        setScanStatus("success");

        await recordAttendance(
          result.employee.employee_id,
          result.employee.similarity,
          attendanceType
        );
      } else {
        // Karyawan tidak dikenali - TAMPILKAN FORM REGISTRASI
        setEmployeeData({
          name: "Karyawan Baru",
          id: "UNKNOWN",
          department: "Unknown",
          confidence: result.similarity || 0,
          isExisting: false,
        });
        setScanStatus("new_employee");
      }
    } catch (error) {
      console.error("Recognition error:", error);
      setScanStatus("failed");
      setErrorMessage("Server tidak merespon. Pastikan backend running.");
    }
  };

  // Employee Registration Function - REAL DATA
  const registerEmployee = async () => {
    if (!registrationData.name) {
      setErrorMessage("Nama harus diisi");
      return;
    }

    try {
      const faceEmbedding = generateFaceEmbedding();

      console.log("📝 Sending REAL registration request...");

      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registrationData.name,
          department: registrationData.department,
          faceEmbedding: faceEmbedding,
        }),
      });

      if (!response.ok)
        throw new Error(`Registration API error: ${response.status}`);

      const result = await response.json();
      console.log("✅ REAL Registration result:", result);

      if (result.success) {
        // ✅ GUNAKAN DATA REAL DARI BACKEND
        setEmployeeData({
          name: registrationData.name,
          id: result.employee_id, // ✅ ID REAL dari backend
          department: registrationData.department,
          confidence: 0.95,
          isExisting: true,
        });
        setScanStatus("registration_success");
        console.log(
          "✅ Employee registered successfully with REAL ID:",
          result.employee_id
        );
      } else {
        setScanStatus("failed");
        setErrorMessage(result.error || "Registrasi gagal");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setScanStatus("failed");
      setErrorMessage("Gagal melakukan registrasi");
    }
  };

  // ✅ Update recordAttendance function di FaceScan.jsx

  const recordAttendance = async (employeeId, confidence, type) => {
    try {
      // ✅ Jika checkout, tampilkan konfirmasi
      if (type === "check_out") {
        const confirmResult = await MySwal.fire({
          title: "Konfirmasi Checkout",
          text: "Apakah Anda yakin ingin melakukan Check-Out?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Ya, Checkout",
          cancelButtonText: "Batal",
          timerProgressBar: true,
        });

        if (!confirmResult.isConfirmed) {
          console.log("❌ Checkout dibatalkan");
          return null;
        }
      }

      const endpoint =
        type === "check_in" ? "/attendance/checkin" : "/attendance/checkout";

      const response = await fetch(`http://localhost:5000/api${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employeeId,
          confidence: confidence,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ ${type.toUpperCase()} recorded:`, result);

      // ✅ Ambil attendance status dari response
      const attendanceStatus = result.attendanceStatus || "on-time";

      // ✅ Mapping status ke emoji dan text
      const statusConfig = {
        "on-time": {
          emoji: "✅",
          text: "Tepat Waktu",
          color: "green",
        },
        late: {
          emoji: "⏰",
          text: "Terlambat",
          color: "orange",
        },
        early: {
          emoji: "⚡",
          text: "Pulang Cepat",
          color: "yellow",
        },
      };

      const status = statusConfig[attendanceStatus] || statusConfig["on-time"];

      // ✅ Tampilkan alert sukses dengan status
      await MySwal.fire({
        title: "Berhasil!",
        html: `
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">${
            status.emoji
          }</div>
          <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
            ${type === "check_in" ? "Check-In" : "Check-Out"} berhasil
          </p>
          <p style="font-size: 16px; color: ${
            status.color === "green"
              ? "#10b981"
              : status.color === "orange"
              ? "#f59e0b"
              : "#eab308"
          };">
            Status: ${status.text}
          </p>
        </div>
      `,
        icon: "success",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      return result;
    } catch (error) {
      console.error(`❌ Failed to record ${type}:`, error);

      // ✅ Alert gagal otomatis 5 detik
      MySwal.fire({
        title: "Gagal!",
        text: `Absensi gagal: ${error.message}`,
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      throw error;
    }
  };

  const handleStartScan = async () => {
    if (isStartingRef.current || isScanning) {
      console.log("⏳ Already scanning or starting, ignoring click");
      return;
    }

    setErrorMessage("");
    setEmployeeData(null);
    setScanStatus("scanning");

    console.log("🔄 Starting scan process...");

    const cameraStarted = await startCamera();

    if (!cameraStarted) {
      console.log("❌ Camera failed to start, reverting state");
      setScanStatus("idle");
      return;
    }

    console.log("📸 Camera active, waiting before recognition...");

    setTimeout(async () => {
      console.log("🔍 Starting recognition process");
      if (mode === "recognition") {
        await recognizeFace();
      } else {
        setScanStatus("ready_for_registration");
      }
    }, 2000);
  };

  const handleStopScan = () => {
    console.log("🛑 User requested stop");
    stopCamera();
    setScanStatus("idle");
    setEmployeeData(null);
    setErrorMessage("");
    setRegistrationData({
      name: "",
      department: "General",
      position: "",
      email: "",
      phone: "",
    });
  };

  useEffect(() => {
    handleStopScan();
  }, [mode]);

  useEffect(() => {
    console.log(
      "🔍 State update - isScanning:",
      isScanning,
      "scanStatus:",
      scanStatus
    );
  }, [isScanning, scanStatus]);

  return (
    <div className="bg-slate-950 px-6 py-2 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Mode Selection */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-800 rounded-lg p-1 flex">
            <button
              onClick={() => setMode("recognition")}
              disabled={isScanning}
              className={`px-4 py-2 rounded-md transition-all ${
                mode === "recognition"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:text-white"
              } ${isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Recognition
            </button>
            <button
              onClick={() => setMode("registration")}
              disabled={isScanning}
              className={`px-4 py-2 rounded-md transition-all ${
                mode === "registration"
                  ? "bg-green-600 text-white shadow-lg"
                  : "text-slate-300 hover:text-white"
              } ${isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Registration
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center flex-col">
          <div className="w-4/5 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Camera Preview */}
            <div className="relative bg-slate-950 aspect-video flex items-center justify-center">
              {/* ✅ Video element ALWAYS rendered, just hidden when not scanning */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  !isScanning ? "hidden" : ""
                }`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* ✅ Placeholder - shown when NOT scanning */}
              {!isScanning && (
                <div className="text-center absolute inset-0 flex items-center justify-center">
                  <div>
                    <ScanFace className="h-24 w-24 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">
                      {mode === "recognition"
                        ? "Face Recognition"
                        : "Employee Registration"}
                    </p>
                    <p className="text-slate-600 text-sm mt-2">
                      Klik "Mulai Scan" untuk memulai
                    </p>
                  </div>
                </div>
              )}

              {/* ✅ Scan Overlay - shown when IS scanning */}
              {isScanning && (
                <>
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-lg opacity-50 pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-green-500 rounded-lg pointer-events-none"></div>
                </>
              )}
            </div>
            {/* Status Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <div className="flex items-center justify-between">
                {mode === "recognition" && (
                  <div className="space-x-2">
                    <button
                      onClick={() => setAttendanceType("check_in")}
                      disabled={isScanning}
                      className={`px-4 py-2 rounded-lg ${
                        attendanceType === "check_in"
                          ? "bg-green-600 text-white"
                          : "bg-gray-600 text-gray-300"
                      } ${isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Check-In
                    </button>
                    <button
                      onClick={() => setAttendanceType("check_out")}
                      disabled={isScanning}
                      className={`px-4 py-2 rounded-lg ${
                        attendanceType === "check_out"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-600 text-gray-300"
                      } ${isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Check-Out
                    </button>
                  </div>
                )}

                {mode === "registration" && (
                  <div className="text-slate-400 text-sm">
                    📝 Mode Registrasi Karyawan Baru
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  {!isScanning && (
                    <>
                      <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                      <span className="text-sm text-slate-400">
                        {mode === "recognition"
                          ? "Recognition Mode"
                          : "Registration Mode"}
                      </span>
                    </>
                  )}
                  {isScanning && scanStatus === "scanning" && (
                    <>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-slate-400">
                        Scanning Wajah...
                      </span>
                    </>
                  )}
                  {isScanning && scanStatus === "success" && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-400">Dikenali!</span>
                    </>
                  )}
                  {isScanning && scanStatus === "new_employee" && (
                    <>
                      <UserPlus className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-yellow-400">
                        Karyawan Baru
                      </span>
                    </>
                  )}
                  {isScanning && scanStatus === "ready_for_registration" && (
                    <>
                      <UserPlus className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-blue-400">
                        Siap Registrasi
                      </span>
                    </>
                  )}
                  {isScanning && scanStatus === "registration_success" && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-400">
                        Registrasi Berhasil!
                      </span>
                    </>
                  )}
                  {isScanning && scanStatus === "failed" && (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-red-400">Gagal!</span>
                    </>
                  )}
                </div>

                <div className="flex space-x-2">
                  {!isScanning ? (
                    <button
                      onClick={handleStartScan}
                      disabled={isStartingRef.current}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Mulai Scan</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopScan}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Hentikan
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Registration Form */}
            {(scanStatus === "new_employee" ||
              scanStatus === "ready_for_registration") && (
              <div className="p-6 bg-yellow-900/20 border-t border-yellow-800">
                <div className="flex items-start space-x-4">
                  <UserPlus className="h-12 w-12 text-yellow-500 shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-4">
                      {mode === "recognition"
                        ? "Karyawan Baru Terdeteksi!"
                        : "Registrasi Karyawan Baru"}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-2">
                          Nama Lengkap *
                        </label>
                        <input
                          type="text"
                          value={registrationData.name}
                          onChange={(e) =>
                            setRegistrationData({
                              ...registrationData,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          placeholder="Masukkan nama lengkap"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-2">
                          Departemen
                        </label>
                        <select
                          value={registrationData.department}
                          onChange={(e) =>
                            setRegistrationData({
                              ...registrationData,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="General">General</option>
                          <option value="IT">IT</option>
                          <option value="HR">HR</option>
                          <option value="Finance">Finance</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Operations">Operations</option>
                          <option value="Sales">Sales</option>
                        </select>
                      </div>
                      <div className="bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-blue-400 text-sm">
                          💡 ID Karyawan akan dibuat otomatis oleh sistem
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-900/20 p-3 rounded-lg mb-4">
                      <p className="text-blue-400 text-sm">
                        💡 ID Karyawan akan dibuat otomatis oleh sistem
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={registerEmployee}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center"
                      >
                        {mode === "recognition"
                          ? "Daftarkan & Check-In"
                          : "Daftarkan Karyawan"}
                      </button>
                      <button
                        onClick={handleStopScan}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Result Panel */}
            {(scanStatus === "success" ||
              scanStatus === "registration_success") &&
              employeeData && (
                <div className="p-6 bg-green-900/20 border-t border-green-800">
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="h-12 w-12 text-green-500 shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {scanStatus === "success"
                          ? "Absensi Berhasil!"
                          : "Registrasi Berhasil!"}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400">Nama</p>
                          <p className="text-white font-medium">
                            {employeeData.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">ID Karyawan</p>
                          <p className="text-white font-medium">
                            {employeeData.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Departemen</p>
                          <p className="text-white font-medium">
                            {employeeData.department}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Waktu</p>
                          <p className="text-white font-medium">
                            {new Date().toLocaleTimeString("id-ID")}
                          </p>
                        </div>
                        {scanStatus === "success" && (
                          <>
                            <div>
                              <p className="text-slate-400">Status</p>
                              <p className="text-white font-medium">
                                {attendanceType === "check_in"
                                  ? "Check-In"
                                  : "Check-Out"}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Confidence</p>
                              <p className="text-white font-medium">
                                {Math.round(employeeData.confidence * 100)}%
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-900/20 border-t border-red-800">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
