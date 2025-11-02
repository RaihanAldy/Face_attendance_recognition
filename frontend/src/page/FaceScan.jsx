import React, { useState, useRef, useEffect } from "react";
import { ScanFace, Camera, AlertCircle, CheckCircle, XCircle, Lock, Settings, UserPlus, X } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

export default function FaceScan({ onLogin, onNavigateToRegistration }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle"); // idle, scanning, success, failed
  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Hidden button states
  const [clickCount, setClickCount] = useState(0);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);
  const clickTimeoutRef = useRef(null);
  
  const MySwal = withReactContent(Swal);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // Hidden button handler - Click logo 5x dalam 3 detik
  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 3000);

    if (clickCount + 1 >= 5) {
      setShowAdminMenu(true);
      setClickCount(0);
      
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  };

  // Admin login handler
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

          if (onLogin) {
            onLogin(result.token, 'admin', result);
          }
          
          setShowAdminMenu(false);
        } else {
          throw new Error('Login gagal');
        }
      } catch (error) {
        // Demo login untuk testing
        if (formValues.username === 'admin' && formValues.password === 'admin123') {
          MySwal.fire({
            title: 'Login Berhasil!',
            text: 'Selamat datang, Admin',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });

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

  // Navigate to registration page
  const handleNavigateToRegistration = () => {
    setShowAdminMenu(false);
    if (onNavigateToRegistration) {
      onNavigateToRegistration();
    }
  };

  // ✅ NEW: Capture image dari video dan kirim ke backend
  const captureAndExtractFace = async () => {
    try {
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      const video = videoRef.current;
      
      // Create canvas untuk capture
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      
      console.log("📸 Image captured from video");
      console.log(`   Size: ${canvas.width}x${canvas.height}`);
      console.log("🔍 Sending to backend for face extraction...");
      
      // Send ke backend untuk extract face
      const response = await fetch("http://localhost:5000/api/extract-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          image: imageData 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to extract face");
      }
      
      console.log("✅ Face extracted successfully");
      console.log(`   Embedding length: ${result.embedding.length}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      
      return {
        embedding: result.embedding,
        confidence: result.confidence,
        face_detected: result.face_detected
      };
      
    } catch (error) {
      console.error("❌ Error capturing/extracting face:", error);
      throw error;
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      console.log("🎥 Requesting camera access...");

      if (streamRef.current) {
        stopCamera();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Wait for video element
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

      // Wait for video to be ready
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
            console.log("✅ Video can play");

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
      console.error("Error accessing camera:", error);
      alert(
        "Tidak dapat mengakses kamera. Pastikan permission sudah diberikan."
      );
      setScanStatus("failed");
      return false;
    }
  };

  // Stop camera
  const stopCamera = () => {
    try {
      console.log("🛑 Stopping camera...");
      
      if (streamRef.current) {
        console.log("📹 Stopping stream from streamRef");
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          console.log(`⏹️ Stopping track: ${track.kind}`);
          track.stop();
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

  // ✅ UPDATED: Recognize face dengan real image capture
  const recognizeFace = async () => {
    try {
      console.log("🔍 Starting face recognition...");
      
      // Capture dan extract face dari video
      const faceData = await captureAndExtractFace();
      
      if (!faceData.face_detected) {
        setScanStatus("failed");
        setErrorMessage("Tidak ada wajah terdeteksi. Posisikan wajah di tengah frame.");
        
        await MySwal.fire({
          title: "Wajah Tidak Terdeteksi",
          text: "Pastikan wajah Anda berada di tengah frame dengan pencahayaan yang baik.",
          icon: "warning",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: true,
          confirmButtonText: "Coba Lagi",
        });
        
        return;
      }
      
      console.log("🔍 Sending recognition request...");

      // Recognize menggunakan embedding
      const response = await fetch("http://localhost:5000/api/recognize-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          faceEmbedding: faceData.embedding 
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Wajah tidak dikenali
          setScanStatus("failed");
          setErrorMessage("Wajah tidak dikenali. Silakan registrasi terlebih dahulu.");

          await MySwal.fire({
            title: "Wajah Tidak Dikenali",
            text: "Silakan hubungi admin untuk registrasi atau coba lagi.",
            icon: "warning",
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: "Coba Lagi",
          });

          setTimeout(() => {
            handleStopScan();
          }, 1000);
          
          return;
        }
        
        throw new Error(`Recognition API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Recognition result:", result);

      if (result.success) {
        const employee = result.employee;
        
        setEmployeeData({
          name: employee.name,
          id: employee.employee_id,
          department: employee.department,
          confidence: employee.confidence || employee.similarity,
        });
        
        setScanStatus("success");

        console.log(`✅ Face recognized: ${employee.name}`);
        console.log(`   Similarity: ${(employee.similarity * 100).toFixed(1)}%`);
        console.log(`   Final Confidence: ${((employee.confidence || employee.similarity) * 100).toFixed(1)}%`);

        // Record attendance automatically
        await recordAttendance(
          employee.employee_id,
          employee.confidence || employee.similarity
        );
      } else {
        setScanStatus("failed");
        setErrorMessage("Wajah tidak dikenali. Silakan coba lagi.");

        await MySwal.fire({
          title: "Wajah Tidak Dikenali",
          text: "Silakan coba lagi atau hubungi admin untuk registrasi.",
          icon: "warning",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: true,
          confirmButtonText: "Coba Lagi",
        });

        setTimeout(() => {
          handleStopScan();
        }, 1000);
      }
    } catch (error) {
      console.error("Recognition error:", error);
      setScanStatus("failed");
      
      let errorMsg = "Terjadi kesalahan saat mengenali wajah.";
      
      if (error.message.includes("No face detected")) {
        errorMsg = "Tidak ada wajah terdeteksi. Posisikan wajah dengan benar.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMsg = "Backend tidak merespon. Pastikan server running di http://localhost:5000";
      } else {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      
      MySwal.fire({
        title: "Kesalahan",
        text: errorMsg,
        icon: "error",
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: true,
      });
    }
  };

  // Record attendance (auto-detect check-in/check-out)
  const recordAttendance = async (employeeId, confidence) => {
    try {
      console.log(`📝 Recording attendance for ${employeeId}...`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      const response = await fetch(`http://localhost:5000/api/attendance/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          employeeId, 
          confidence: confidence
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Attendance recorded:", result);

      const employeeName = result.employee?.name || employeeData?.name || "Unknown";

      const statusConfig = {
        "on-time": { emoji: "✅", text: "Tepat Waktu", color: "#10b981" },
        "late": { emoji: "⏰", text: "Terlambat", color: "#f59e0b" },
        "early": { emoji: "⚡", text: "Pulang Cepat", color: "#eab308" },
        "ontime": { emoji: "✅", text: "Tepat Waktu", color: "#10b981" }
      };

      const status = statusConfig[result.punctuality || result.status] || statusConfig["ontime"];
      const actionType = result.action || "check_in";
      const currentTime = new Date().toLocaleTimeString("id-ID");

      await MySwal.fire({
        title: `${status.emoji} Berhasil!`,
        html: `
          <div style="text-align: center;">
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
              ${actionType === "check_in" ? "Check-In" : "Check-Out"} Berhasil
            </p>
            <p style="font-size: 16px; color: ${status.color}; margin-bottom: 12px;">
              Status: ${status.text}
            </p>
            <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin-top: 12px;">
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                👤 ${employeeName}
              </p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                🆔 ${employeeId}
              </p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                🕒 ${currentTime}
              </p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                📊 Confidence: ${(confidence * 100).toFixed(1)}%
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

      setTimeout(() => {
        handleStopScan();
      }, 1500);

      return result;
      
    } catch (error) {
      console.error("❌ Attendance recording failed:", error);
      
      await MySwal.fire({
        title: "Absensi Gagal",
        html: `
          <div style="text-align: center;">
            <p>Gagal mencatat absensi:</p>
            <p style="color: #ef4444; font-size: 14px; margin-top: 8px;">${error.message}</p>
          </div>
        `,
        icon: "error",
        confirmButtonText: "OK",
      });

      handleStopScan();
      throw error;
    }
  };

  // Start scan handler
  const handleStartScan = async () => {
    if (isStartingRef.current || isScanning) return;

    setErrorMessage("");
    setEmployeeData(null);
    setScanStatus("scanning");
    setEmployeeData(null);
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      console.log("❌ Camera failed to start");
    return;
    }

    // Wait 2 seconds then recognize
    setTimeout(async () => {
      await recognizeFace();
    }, 2000);
  };

  // Stop scan handler
  const handleStopScan = () => {
    stopCamera();
    setIsScanning(false);
    setScanStatus("idle");
    setEmployeeData(null);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Hidden Button - Click Logo 5x */}
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

        {/* Admin Menu Popup */}
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
                  💡 Default login: admin / admin123
                </p>
              </div>
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

            {/* Placeholder */}
            {!isScanning && (
              <div className="text-center absolute inset-0 flex items-center justify-center">
                <div>
                  <ScanFace className="h-24 w-24 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">Face Recognition</p>
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
                    <span className="text-sm text-slate-400">Recognition Mode</span>
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

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-900/20 border-t border-red-800">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="h-5" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
