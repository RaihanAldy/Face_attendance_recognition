import React, { useState, useRef, useEffect } from "react";
import {
  ScanFace,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
  Lock,
  Settings,
  UserPlus,
  X,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import ManualAttendanceForm from "../components/ManualAttendanceForm.jsx";

// Constants
const API_BASE_URL = "http://localhost:5000";

export default function FaceScan({ onLogin, onNavigateToRegistration }) {
  // State management
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [clickCount, setClickCount] = useState(0);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [failureCount, setFailureCount] = useState(0);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);
  const clickTimeoutRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  const MySwal = withReactContent(Swal);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  /* ========== ADMIN FUNCTIONS ========== */
  const handleLogoClick = () => {
    setClickCount((prev) => prev + 1);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 3000);

    if (clickCount + 1 >= 5) {
      setShowAdminMenu(true);
      setClickCount(0);
      if (navigator.vibrate) navigator.vibrate(200);
    }
  };

  const handleAdminLogin = async () => {
    const { value: formValues } = await MySwal.fire({
      title: " Admin Login",
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Username" type="text">
        <input id="swal-input2" class="swal2-input" placeholder="Password" type="password">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Login",
      cancelButtonText: "Batal",
      confirmButtonColor: "#3b82f6",
      preConfirm: () => {
        const username = document.getElementById("swal-input1").value;
        const password = document.getElementById("swal-input2").value;
        if (!username || !password) {
          Swal.showValidationMessage("Username dan password harus diisi!");
          return false;
        }
        return { username, password };
      },
    });

    if (formValues) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });

        if (response.ok) {
          const result = await response.json();
          MySwal.fire({
            title: "Login Berhasil!",
            text: `Selamat datang, ${result.name || "Admin"}`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          onLogin?.(result.token, "admin", result);
          setShowAdminMenu(false);
          return;
        } else {
          throw new Error("Login gagal");
        }
      } catch (err) {
        // fallback
        console.log("Admin login error, fallback to demo:", err);

        if (
          formValues.username === "admin" &&
          formValues.password === "admin123"
        ) {
          MySwal.fire({
            title: "Login Berhasil!",
            text: "Selamat datang, Admin",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          onLogin?.("demo-token-123", "admin", {
            name: "Admin Demo",
            email: "admin@demo.com",
          });
          setShowAdminMenu(false);
        } else {
          MySwal.fire({
            title: "Login Gagal",
            text: "Username atau password salah!",
            icon: "error",
            confirmButtonText: "Coba Lagi",
          });
        }
      }
    }
  };

  const handleNavigateToRegistration = () => {
    setShowAdminMenu(false);
    onNavigateToRegistration?.();
  };

  /* ========== CAMERA MANAGEMENT ========== */
  const startCamera = async () => {
    if (isStartingRef.current) {
      console.log("Camera is starting, skip duplicate start");
      return false;
    }

    isStartingRef.current = true;
    setErrorMessage("");

    try {
      // Stop existing stream if present
      if (streamRef.current) {
        stopCamera();
        await new Promise((res) => setTimeout(res, 80));
      }

      // Wait for video element to be mounted
      let tries = 0;
      while (!videoRef.current && tries < 10) {
        await new Promise((res) => setTimeout(res, 100));
        tries++;
      }
      if (!videoRef.current) throw new Error("Video element not found");

      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve, reject) => {
        const video = videoRef.current;
        let finished = false;

        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("canplay", onCanPlay);
          video.removeEventListener("error", onError);
        };

        // Define the event handlers
        const onLoadedMetadata = () => {
          console.log("Video metadata loaded");
        };

        const onCanPlay = () => {
          if (finished) return;
          finished = true;
          cleanup();
          video
            .play()
            .then(resolve)
            .catch((e) => reject(e));
        };

        const onError = (err) => {
          console.log("Video playback error:", err);
          if (finished) return;
          finished = true;
          cleanup();
          reject(new Error("Video playback error"));
        };

        // Add event listeners
        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("error", onError);

        // Fallback timeout
        setTimeout(() => {
          if (!finished) {
            finished = true;
            cleanup();
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              video.play().then(resolve).catch(reject);
            } else {
              reject(new Error("Video load timeout - no dimensions"));
            }
          }
        }, 5000);
      });

      setIsScanning(true);
      setScanStatus("scanning");
      isStartingRef.current = false;
      return true;
    } catch (error) {
      console.error("Camera access failed:", error);
      isStartingRef.current = false;
      setIsScanning(false);
      setScanStatus("failed");

      let detailedError = "Tidak dapat mengakses kamera. ";
      if (error.name === "NotAllowedError") {
        detailedError +=
          "Permission kamera ditolak. Silakan izinkan akses kamera di browser.";
      } else if (error.name === "NotFoundError") {
        detailedError += "Tidak ada kamera yang ditemukan.";
      } else {
        detailedError += error.message || "Unknown error";
      }

      setErrorMessage(detailedError);

      MySwal.fire({
        title: "Gagal Akses Kamera",
        text: detailedError,
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true,
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      return false;
    }
  };

  const stopCamera = () => {
    try {
      console.log(" Stopping camera...");

      if (streamRef.current) {
        console.log(" Stopping stream from streamRef");
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          console.log(` Stopping track: ${track.kind}`);
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.error("stopCamera error:", err);
    } finally {
      setIsScanning(false);
      isStartingRef.current = false;
    }
  };

  /* ========== FACE RECOGNITION ========== */
  const captureAndExtractFace = async () => {
    try {
      if (!videoRef.current) throw new Error("Video element not available");

      const video = videoRef.current;
      const scale = Math.min(1, 640 / video.videoWidth || 1);
      const w = Math.max(160, Math.round(video.videoWidth * scale));
      const h = Math.max(120, Math.round(video.videoHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);

      const imageData = canvas.toDataURL("image/jpeg", 0.9);

      const res = await fetch(`${API_BASE_URL}/api/extract-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to extract face");
      }

      return {
        embedding: result.embedding,
        confidence: result.confidence,
        face_detected: result.face_detected,
      };
    } catch (err) {
      console.error("captureAndExtractFace error:", err);
      throw err;
    }
  };

  const recognizeFace = async () => {
    try {
      console.log("Start recognition...");
      setScanStatus("scanning");

      const faceData = await captureAndExtractFace();

      if (!faceData.face_detected) {
        setFailureCount((prev) => prev + 1);
        setScanStatus("failed");
        setErrorMessage(
          "Tidak ada wajah terdeteksi. Posisikan wajah di tengah frame."
        );

        if (failureCount >= 2) {
          const result = await MySwal.fire({
            title: "Kesulitan Mendeteksi Wajah?",
            html: `
              <p>Sudah ${failureCount + 1}x gagal mendeteksi wajah.</p>
              <p class="mt-2">Apakah Anda ingin menggunakan <strong>Manual Attendance</strong>?</p>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Ya, Gunakan Manual",
            cancelButtonText: "Coba Lagi",
            confirmButtonColor: "#10b981",
            cancelButtonColor: "#6b7280",
          });

          if (result.isConfirmed) {
            setShowManualForm(true);
            handleStopScan();
            return;
          } else {
            setFailureCount(0);
          }
        } else {
          await MySwal.fire({
            title: "Wajah Tidak Terdeteksi",
            text: "Pastikan wajah Anda berada di tengah frame dengan pencahayaan yang baik.",
            icon: "warning",
            timer: 3000,
            showConfirmButton: true,
            confirmButtonText: "Coba Lagi",
          });
        }
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/recognize-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceEmbedding: faceData.embedding }),
      });

      const result = await res.json();

      if (result.success && result.employee) {
        const employee = result.employee;
        setFailureCount(0);

        const employeeName = employee.name || "Unknown Employee";
        const confidence = employee.confidence || employee.similarity || 0.95;

        console.log(" Employee recognized:", {
          name: employeeName,
          id: employee.employee_id,
          department: employee.department || "General",
          confidence: confidence,
        });

        setScanStatus("success");
        await recordAttendance(
          employee.employee_id,
          confidence,
          employeeName,
          employee.department || "General"
        );
      } else {
        setFailureCount((prev) => prev + 1);
        setScanStatus("failed");
        setErrorMessage("Wajah tidak dikenali. Silakan coba lagi.");

        if (failureCount >= 2) {
          const result = await MySwal.fire({
            title: "Wajah Tidak Dikenali",
            html: `
              <p>Sudah ${failureCount + 1}x gagal mengenali wajah.</p>
              <p class="mt-2">Apakah Anda ingin menggunakan <strong>Manual Attendance</strong>?</p>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Ya, Gunakan Manual",
            cancelButtonText: "Coba Lagi",
            confirmButtonColor: "#10b981",
            cancelButtonColor: "#6b7280",
          });

          if (result.isConfirmed) {
            setShowManualForm(true);
            handleStopScan();
            return;
          } else {
            setFailureCount(0);
          }
        } else {
          await MySwal.fire({
            title: "Wajah Tidak Dikenali",
            text: "Silakan coba lagi atau hubungi admin untuk registrasi.",
            icon: "warning",
            timer: 3000,
            showConfirmButton: true,
          });
          setTimeout(handleStopScan, 1000);
        }
      }
    } catch (err) {
      console.error("recognizeFace error:", err);
      setFailureCount((prev) => prev + 1);
      setScanStatus("failed");

      let msg = "Terjadi kesalahan saat mengenali wajah.";
      if (err.message?.includes("Failed to fetch")) {
        msg =
          "Backend tidak merespon. Pastikan server running di http://localhost:5000";
      } else if (err.message?.toLowerCase().includes("no face")) {
        msg = "Tidak ada wajah terdeteksi. Posisikan wajah dengan benar.";
      } else {
        msg = err.message || msg;
      }

      setErrorMessage(msg);

      if (failureCount >= 2) {
        const result = await MySwal.fire({
          title: "Kesalahan Berulang",
          html: `
            <p>${msg}</p>
            <p class="mt-2">Apakah Anda ingin menggunakan <strong>Manual Attendance</strong>?</p>
          `,
          icon: "error",
          showCancelButton: true,
          confirmButtonText: "Ya, Gunakan Manual",
          cancelButtonText: "Tutup",
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#6b7280",
        });

        if (result.isConfirmed) {
          setShowManualForm(true);
          handleStopScan();
        } else {
          setFailureCount(0);
        }
      } else {
        MySwal.fire({
          title: "Kesalahan",
          text: msg,
          icon: "error",
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: true,
        });
      }
    }
  };

  /* ========== ATTENDANCE RECORDING ========== */
  const recordAttendance = async (
    employeeId,
    confidence,
    employeeName,
    department
  ) => {
    try {
      console.log(
        `Recording attendance for ${employeeId} - ${employeeName} (${(
          confidence * 100
        ).toFixed(1)}%)`
      );

      const res = await fetch(`${API_BASE_URL}/api/attendance/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, confidence }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      const statusFromBackend = result.status || "ontime";

      const statusConfig = {
        ontime: { text: "Tepat Waktu", color: "#10b981" },
        late: { text: "Terlambat", color: "#f59e0b" },
        early: { text: "Pulang Cepat", color: "#eab308" },
      };

      const status = statusConfig[statusFromBackend] || statusConfig["ontime"];
      const actionType = result.action || "check_in";
      const currentTime = new Date().toLocaleTimeString("id-ID");

      const finalEmployeeName =
        employeeName ||
        result.employee_name ||
        result.employee?.name ||
        "Unknown Employee";

      await MySwal.fire({
        title: `Berhasil!`,
        html: `
          <div style="text-align: center;">
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
              ${actionType === "check_in" ? "Check-In" : "Check-Out"} Berhasil
            </p>
            <p style="font-size: 16px; color: ${
              status.color
            }; margin-bottom: 12px;">
              Status: ${status.text}
            </p>
            <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin-top: 12px;">
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;"> ${finalEmployeeName}</p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;"> ${employeeId}</p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;"> ${
                department || "General"
              }</p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;"> ${currentTime}</p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;"> Confidence: ${(
                confidence * 100
              ).toFixed(1)}%</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 4px 0; border-top: 1px solid #334155; padding-top: 8px;">
                 Berdasarkan settings: ${
                   actionType === "check_in" ? "Check-in" : "Check-out"
                 } time validation
              </p>
            </div>
          </div>
        `,
        icon: "success",
        timer: 4000,
        timerProgressBar: true,
        showConfirmButton: true,
        confirmButtonText: "OK",
      });

      setTimeout(handleStopScan, 1500);
      return result;
    } catch (err) {
      console.error("Attendance recording failed:", err);

      let errorMsg = err.message || "Gagal mencatat absensi";
      if (err.message.includes("Employee not found")) {
        errorMsg =
          "Employee ID tidak ditemukan di database. Pastikan karyawan sudah terdaftar.";
      }

      await MySwal.fire({
        title: "Absensi Gagal",
        html: `<div style="text-align:center;">
                <p>Gagal mencatat absensi:</p>
                <p style="color:#ef4444; font-size:14px; margin-top:8px;">${errorMsg}</p>
                <p style="color:#94a3b8; font-size:12px; margin-top:8px;">Employee ID: ${employeeId}</p>
              </div>`,
        icon: "error",
        confirmButtonText: "OK",
      });
      handleStopScan();
      throw err;
    }
  };

  /* ========== UI HANDLERS ========== */
  const handleStartScan = async () => {
    if (isStartingRef.current || isScanning) return;
    setErrorMessage("");
    setScanStatus("scanning");

    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      console.log(" Camera failed to start");
      return;
    }

    setTimeout(() => {
      recognizeFace();
    }, 1200);
  };

  const handleStopScan = () => {
    stopCamera();
    setIsScanning(false);
    setScanStatus("idle");
    setErrorMessage("");
  };

  /* ========== RENDER ========== */
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-2 relative">
          <div
            onClick={handleLogoClick}
            className="inline-block cursor-pointer hover:scale-105 transition-transform active:scale-90"
            title="Click 5x untuk menu admin"
          >
            <ScanFace className="h-16 w-16 text-blue-500 mx-auto" />
          </div>

          {clickCount > 0 && clickCount < 5 && (
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              {clickCount}/5
            </div>
          )}
        </div>

        {/* Admin Menu Modal */}
        {showAdminMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-600 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-500" />
                  Admin Menu
                </h2>
                <button
                  onClick={() => setShowAdminMenu(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleAdminLogin}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
                >
                  <Lock className="w-5 h-5" />
                  Login Admin Dashboard
                </button>

                <button
                  onClick={handleNavigateToRegistration}
                  className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
                >
                  <UserPlus className="w-5 h-5" />
                  Registrasi Karyawan Baru
                </button>

                <button
                  onClick={() => setShowAdminMenu(false)}
                  className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-900/20 rounded-lg">
                <p className="text-blue-400 text-xs text-center">
                  Default login: admin / admin123
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Section */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="relative bg-slate-950 aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                !isScanning ? "hidden" : ""
              }`}
            />

            {!isScanning && (
              <div className="text-center absolute inset-0 flex items-center justify-center">
                <div>
                  <ScanFace className="h-24 w-24 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">Face Recognition</p>
                  <p className="text-slate-600 text-sm mt-2">
                    Klik "Mulai Scan" untuk memulai
                  </p>
                  <div className="flex space-x-2 m-4">
                    <button
                      onClick={handleStartScan}
                      disabled={isStartingRef.current}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Mulai Scan</span>
                    </button>
                    <button
                      onClick={() => setShowManualForm(true)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Manual</span>
                    </button>
                    )
                  </div>
                </div>
              </div>
            )}

            {isScanning && (
              <>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-lg opacity-50 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-green-500 rounded-lg pointer-events-none"></div>
              </>
            )}
          </div>

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

        {/* Manual Attendance Form */}
        {showManualForm && (
          <ManualAttendanceForm
            onClose={() => {
              setShowManualForm(false);
              setFailureCount(0);
            }}
            onSuccess={() => {
              setFailureCount(0);
            }}
          />
        )}
      </div>
    </div>
  );
}
