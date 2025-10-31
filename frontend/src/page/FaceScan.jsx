import React, { useState, useRef, useEffect } from "react";
import {
  ScanFace,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  Clock,
  X,
  Lock,
  Settings,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

export default function FaceScan({ onLogin }) {
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

  // ✅ HIDDEN BUTTON STATES
  const [clickCount, setClickCount] = useState(0);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const clickTimeoutRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);
  const alertTimeoutRef = useRef(null);
  const cameraTimeoutRef = useRef(null);
  
  const MySwal = withReactContent(Swal);

  useEffect(() => {
    return () => {
      stopCamera();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // ✅ HIDDEN BUTTON HANDLER - Click logo 5x dalam 3 detik
  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);

    // Clear previous timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Reset after 3 seconds
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 3000);

    // Check if clicked 5 times
    if (clickCount + 1 >= 5) {
      setShowAdminMenu(true);
      setClickCount(0);
      
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  };

  // ✅ ADMIN LOGIN HANDLER
  const handleAdminLogin = async () => {
    const { value: formValues } = await MySwal.fire({
      title: '🔐 Admin Login',
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Username" type="text">
        <input id="swal-input2" class="swal2-input" placeholder="Password" type="password">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Login',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3b82f6',
      preConfirm: () => {
        const username = document.getElementById('swal-input1').value;
        const password = document.getElementById('swal-input2').value;
        
        if (!username || !password) {
          Swal.showValidationMessage('Username dan password harus diisi!');
          return false;
        }
        
        return { username, password };
      }
    });

    if (formValues) {
      try {
        // TODO: Replace dengan API login yang sebenarnya
        const response = await fetch('http://localhost:5000/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues),
        });

        if (response.ok) {
          const result = await response.json();
          
          MySwal.fire({
            title: 'Login Berhasil!',
            text: `Selamat datang, ${result.name || 'Admin'}`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });

          // Call onLogin prop from App.jsx
          if (onLogin) {
            onLogin(result.token, 'admin', result);
          }
          
          setShowAdminMenu(false);
        } else {
          throw new Error('Login gagal');
        }
      } catch (error) {
        // DEMO: Hardcoded login untuk testing
        if (formValues.username === 'admin' && formValues.password === 'admin123') {
          MySwal.fire({
            title: 'Login Berhasil!',
            text: 'Selamat datang, Admin',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });

          // Demo login
          if (onLogin) {
            onLogin('demo-token-123', 'admin', {
              name: 'Admin Demo',
              email: 'admin@demo.com'
            });
          }
          
          setShowAdminMenu(false);
        } else {
          MySwal.fire({
            title: 'Login Gagal',
            text: 'Username atau password salah!',
            icon: 'error',
            confirmButtonText: 'Coba Lagi',
          });
        }
      }
    }
  };

  // ✅ SWITCH TO REGISTRATION MODE
  const handleSwitchToRegistration = () => {
    setMode('registration');
    setShowAdminMenu(false);
    
    MySwal.fire({
      title: 'Mode Registrasi',
      text: 'Silakan scan wajah karyawan baru untuk registrasi',
      icon: 'info',
      timer: 3000,
      showConfirmButton: false,
    });
  };

  const generateFaceEmbedding = () => {
    return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
  };

  const startCamera = async () => {
    if (isStartingRef.current) {
      console.log("⏳ Camera already starting, skipping...");
      return false;
    }
    
    isStartingRef.current = true;

    try {
      console.log("🎥 Requesting camera access...");

      if (streamRef.current) {
        stopCamera();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      let retries = 0;
      const maxRetries = 10;
      while (!videoRef.current && retries < maxRetries) {
        console.log(`⏳ Waiting for video element... (${retries + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      if (!videoRef.current) {
        throw new Error("Video element not found after waiting");
      }

      console.log("✅ Video element found!");

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

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

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
            console.log("✅ Video can play - dimensions:", video.videoWidth, "x", video.videoHeight);

            video.play()
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
      return true;

    } catch (error) {
      console.error("Camera access failed:", error);
      isStartingRef.current = false;

      let detailedError = "Tidak dapat mengakses kamera. ";

      if (error.name === "NotAllowedError") {
        detailedError += "Permission kamera ditolak. Silakan izinkan akses kamera di browser settings.";
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

      MySwal.fire({
        title: "Gagal Akses Kamera",
        text: detailedError,
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true,
      });

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
    } catch (error) {
      console.error("Error stopping camera:", error);
      setIsScanning(false);
      isStartingRef.current = false;
    }
  };

  const autoStopCamera = () => {
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
    }
    
    cameraTimeoutRef.current = setTimeout(() => {
      stopCamera();
      setScanStatus("idle");
    }, 3000);
  };

  const recognizeFace = async () => {
    const faceEmbedding = generateFaceEmbedding();

    try {
      console.log("🔍 Sending recognition request...");

      const response = await fetch("http://localhost:5000/api/recognize-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          faceEmbedding: faceEmbedding 
        }),
      });

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Recognition API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Recognition result:", result);

      if (result.success) {
        setEmployeeData({
          name: result.employee.name,
          id: result.employee.employee_id,
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
        setEmployeeData({
          name: "Karyawan Baru",
          id: "UNKNOWN",
          department: "Unknown",
          confidence: result.similarity || 0,
          isExisting: false,
        });
        setScanStatus("new_employee");

        MySwal.fire({
          title: "Wajah Tidak Dikenali",
          text: "Wajah tidak ditemukan di database. Silakan registrasi sebagai karyawan baru.",
          icon: "warning",
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: true,
        });
      }
    } catch (error) {
      console.error("Recognition error:", error);
      setScanStatus("failed");
      setErrorMessage("Server tidak merespon. Pastikan backend running.");
      
      MySwal.fire({
        title: "Koneksi Gagal",
        text: "Server tidak merespon. Pastikan backend running di http://localhost:5000",
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true,
      });
    }
  };

  const registerEmployee = async () => {
    if (!registrationData.name) {
      MySwal.fire({
        title: "Nama Wajib Diisi",
        text: "Silakan masukkan nama karyawan",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      const faceEmbedding = generateFaceEmbedding();

      console.log("📝 Sending registration request...");

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

      if (!response.ok) {
        throw new Error(`Registration API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Registration result:", result);

      if (result.success) {
        setEmployeeData({
          name: registrationData.name,
          id: result.employee_id,
          department: registrationData.department,
          confidence: 0.95,
          isExisting: true,
        });
        setScanStatus("registration_success");

        await MySwal.fire({
          title: "Registrasi Berhasil!",
          html: `
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                ${registrationData.name}
              </p>
              <p style="font-size: 16px; color: #10b981;">
                ID: ${result.employee_id}
              </p>
              <p style="font-size: 14px; color: #64748b; margin-top: 8px;">
                Departemen: ${registrationData.department}
              </p>
            </div>
          `,
          icon: "success",
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: true,
        });

        console.log("✅ Employee registered successfully with ID:", result.employee_id);
        
        setTimeout(() => {
          handleStopScan();
          setMode('recognition'); // Back to recognition mode
        }, 2000);
      } else {
        throw new Error(result.message || "Registrasi gagal");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setScanStatus("failed");
      setErrorMessage("Gagal melakukan registrasi");
      
      MySwal.fire({
        title: "Registrasi Gagal",
        text: error.message || "Terjadi kesalahan saat registrasi",
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true,
      });
    }
  };

  const recordAttendance = async (employeeId, confidence, type) => {
    try {
      if (type === "check_out") {
        const confirmResult = await MySwal.fire({
          title: "Konfirmasi Checkout",
          text: "Apakah Anda yakin ingin melakukan Check-Out?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Ya, Checkout",
          cancelButtonText: "Batal",
          confirmButtonColor: "#3b82f6",
          cancelButtonColor: "#64748b",
        });

        if (!confirmResult.isConfirmed) {
          console.log("❌ Checkout dibatalkan");
          handleStopScan();
          return null;
        }
      }

      const endpoint = type === "check_in" ? "/attendance/checkin" : "/attendance/checkout";

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

      console.log("📥 Attendance response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ ${type.toUpperCase()} recorded:`, result);

      const punctuality = result.punctuality || "on-time";

      const statusConfig = {
        "on-time": {
          emoji: "✅",
          text: "Tepat Waktu",
          color: "#10b981",
        },
        late: {
          emoji: "⏰",
          text: "Terlambat",
          color: "#f59e0b",
        },
        early: {
          emoji: "⚡",
          text: "Pulang Cepat",
          color: "#eab308",
        },
      };

      const status = statusConfig[punctuality] || statusConfig["on-time"];

      await MySwal.fire({
        title: "Berhasil!",
        html: `
          <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">${status.emoji}</div>
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
              ${type === "check_in" ? "Check-In" : "Check-Out"} berhasil
            </p>
            <p style="font-size: 16px; color: ${status.color}; margin-bottom: 12px;">
              Status: ${status.text}
            </p>
            <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin-top: 12px;">
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                Nama: ${employeeData.name}
              </p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                ID: ${employeeId}
              </p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                Waktu: ${new Date().toLocaleTimeString("id-ID")}
              </p>
            </div>
          </div>
        `,
        icon: "success",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true,
        confirmButtonText: "OK",
      });

      setTimeout(() => {
        handleStopScan();
      }, 1000);

      return result;
      
    } catch (error) {
      console.error(`❌ Failed to record ${type}:`, error);

      MySwal.fire({
        title: "Absensi Gagal",
        text: `Gagal melakukan ${type === "check_in" ? "check-in" : "check-out"}: ${error.message}`,
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true,
      });

      throw error;
    }
  };

  const handleStartScan = async () => {
    if (isStartingRef.current || isScanning) return;

    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);

    setErrorMessage("");
    setEmployeeData(null);
    setScanStatus("scanning");

    console.log("🔄 Starting scan process...");

    const cameraStarted = await startCamera();

    if (!cameraStarted) {
      setScanStatus("idle");
      return;
    }

    setTimeout(async () => {
      if (mode === 'recognition') {
        await recognizeFace();
      } else {
        setScanStatus("ready_for_registration");
      }
    }, 2000);
  };

  const handleStopScan = () => {
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
    
    stopCamera();
    setScanStatus("idle");
    setEmployeeData(null);
    setErrorMessage("");
    setRegistrationData({
      name: "",
      department: "General",
    });
  };

  useEffect(() => {
    handleStopScan();
  }, [mode]);

  useEffect(() => {
    console.log("🔍 State update - isScanning:", isScanning, "scanStatus:", scanStatus);
  }, [isScanning, scanStatus]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* ✅ HIDDEN BUTTON - Click Logo 5x */}
        <div className="text-center mb-8 relative">
          <div 
            onClick={handleLogoClick}
            className="inline-block cursor-pointer hover:scale-105 transition-transform"
            title="Click 5x untuk menu admin"
          >
            <ScanFace className="h-16 w-16 text-blue-500 mx-auto mb-2" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Face Recognition</h1>
          <p className="text-slate-300">Scan wajah Anda untuk absensi</p>
          
          {/* Click indicator */}
          {clickCount > 0 && clickCount < 5 && (
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              {clickCount}/5
            </div>
          )}
        </div>

        {/* ✅ ADMIN MENU POPUP */}
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
                  onClick={handleSwitchToRegistration}
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
                  💡 Default login: admin / admin123
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mode Indicator */}
        {mode === 'registration' && (
          <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-400 font-medium">Mode Registrasi Karyawan</span>
              </div>
              <button
                onClick={() => setMode('recognition')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Kembali ke Recognition
              </button>
            </div>
          </div>
        )}

        {/* Attendance Type Selection - Only show in recognition mode */}
        {mode === 'recognition' && (
          <div className="flex justify-center mb-6">
            <div className="bg-slate-800 rounded-lg p-1 flex">
              <button
                onClick={() => setAttendanceType("check_in")}
                disabled={isScanning}
                className={`px-6 py-3 rounded-md transition-all flex items-center space-x-2 ${
                  attendanceType === "check_in"
                    ? "bg-green-600 text-white shadow-lg"
                    : "text-slate-300 hover:text-white bg-slate-700"
                } ${isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Clock className="w-5 h-5" />
                <span>Check-In</span>
              </button>
              <button
                onClick={() => setAttendanceType("check_out")}
                disabled={isScanning}
                className={`px-6 py-3 rounded-md transition-all flex items-center space-x-2 ${
                  attendanceType === "check_out"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-300 hover:text-white bg-slate-700"
                } ${isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Clock className="w-5 h-5" />
                <span>Check-Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Camera Card */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {/* Camera Preview */}
          <div className="relative bg-slate-950 aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isScanning ? "hidden" : ""}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Placeholder */}
            {!isScanning && (
              <div className="text-center absolute inset-0 flex items-center justify-center">
                <div>
                  <ScanFace className="h-24 w-24 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">
                    {mode === "recognition" ? "Face Recognition" : "Employee Registration"}
                  </p>
                  <p className="text-slate-600 text-sm mt-2">Klik "Mulai Scan" untuk memulai</p>
                </div>
              </div>
            )}

            {/* Scan Overlay */}
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
              <div className="flex items-center space-x-2">
                {!isScanning && (
                  <>
                    <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                    <span className="text-sm text-slate-400">
                      {mode === "recognition" ? "Recognition Mode" : "Registration Mode"}
                    </span>
                  </>
                )}
                {isScanning && scanStatus === "scanning" && (
                  <>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-slate-400">Scanning Wajah...</span>
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
                    <span className="text-sm text-yellow-400">Karyawan Baru</span>
                  </>
                )}
                {isScanning && scanStatus === "registration_success" && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-400">Registrasi Berhasil!</span>
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
          {(scanStatus === "new_employee") && (
            <div className="p-6 bg-yellow-900/20 border-t border-yellow-800">
              <div className="flex items-start space-x-4">
                <UserPlus className="h-12 w-12 text-yellow-500 shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Registrasi Karyawan Baru
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

                  <div className="flex space-x-3">
                    <button
                      onClick={registerEmployee}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center"
                    >
                      Daftarkan Karyawan
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

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-900/20 border-t border-red-800">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="h-5 h-5" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}