import React, { useState, useRef, useEffect } from "react";
import {
  ScanFace,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  X,
} from "lucide-react";

export default function FaceScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [attendanceType, setAttendanceType] = useState("check_in");
  const [lastAttendance, setLastAttendance] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);
  const alertTimeoutRef = useRef(null);
  const cameraTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
    };
  }, []);

  const startCamera = async () => {
    if (isStartingRef.current) return false;
    isStartingRef.current = true;

    try {
      setErrorMessage("");
      setShowErrorAlert(false);

      if (streamRef.current) {
        stopCamera();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        const video = videoRef.current;
        if (video.readyState >= 3) {
          resolve();
        } else {
          video.addEventListener("canplay", () => resolve(), { once: true });
        }
      });

      setIsScanning(true);
      isStartingRef.current = false;
      return true;
    } catch (error) {
      console.error("Camera access failed:", error);
      isStartingRef.current = false;

      let detailedError = "Tidak dapat mengakses kamera. ";

      if (error.name === "NotAllowedError") {
        detailedError += "Izin kamera ditolak. Silakan izinkan akses kamera.";
      } else if (error.name === "NotFoundError") {
        detailedError += "Tidak ada kamera yang ditemukan.";
      } else {
        detailedError += `Error: ${error.message}`;
      }

      setErrorMessage(detailedError);
      setScanStatus("failed");
      setIsScanning(false);
      setShowErrorAlert(true);

      alertTimeoutRef.current = setTimeout(() => {
        setShowErrorAlert(false);
      }, 3000);

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
        streamRef.current.getTracks().forEach((track) => track.stop());
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

  // Face Recognition dengan API Backend
  const recognizeFace = async () => {
    try {
      // Generate face embedding (simulasi)
      const faceEmbedding = Array.from({ length: 512 }, () => Math.random());

      console.log("🔍 Sending face recognition request...");

      const response = await fetch("http://localhost:5000/api/recognize-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faceEmbedding: faceEmbedding,
        }),
      });

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Recognition result:", result);

      if (result.success) {
        setEmployeeData({
          ...result.employee,
          confidence: result.employee.similarity,
        });
        setScanStatus("success");

        // Record attendance to backend
        await recordAttendance(
          result.employee.employee_id,
          result.employee.similarity
        );

        const attendanceRecord = {
          type: attendanceType,
          time: new Date().toLocaleTimeString("id-ID"),
          date: new Date().toLocaleDateString("id-ID"),
          confidence: result.employee.similarity,
          employeeName: result.employee.name,
          employeeId: result.employee.employee_id,
        };

        setLastAttendance(attendanceRecord);
        localStorage.setItem(
          "lastAttendance",
          JSON.stringify(attendanceRecord)
        );

        setShowSuccessAlert(true);
        alertTimeoutRef.current = setTimeout(() => {
          setShowSuccessAlert(false);
        }, 3000);

        autoStopCamera();
      } else {
        setScanStatus("failed");
        setErrorMessage(result.message || "Wajah tidak dikenali");
        setShowErrorAlert(true);
        alertTimeoutRef.current = setTimeout(() => {
          setShowErrorAlert(false);
        }, 3000);
        autoStopCamera();
      }
    } catch (error) {
      console.error("Recognition error:", error);
      setScanStatus("failed");
      setErrorMessage(`Gagal memindai wajah: ${error.message}`);
      setShowErrorAlert(true);
      alertTimeoutRef.current = setTimeout(() => {
        setShowErrorAlert(false);
      }, 3000);
      autoStopCamera();
    }
  };

  // Record Attendance to Backend
  const recordAttendance = async (employeeId, confidence) => {
    try {
      const endpoint =
        attendanceType === "check_in"
          ? "/api/attendance/checkin"
          : "/api/attendance/checkout";

      console.log(`📝 Recording ${attendanceType} for: ${employeeId}`);

      const response = await fetch(`http://localhost:5000${endpoint}`, {
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
      console.log(`✅ ${attendanceType} recorded:`, result);

      if (!result.success) {
        throw new Error(result.error || `Failed to record ${attendanceType}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to record ${attendanceType}:`, error);
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
    setShowSuccessAlert(false);
    setShowErrorAlert(false);

    const cameraStarted = await startCamera();

    if (!cameraStarted) {
      setScanStatus("idle");
      return;
    }

    setTimeout(async () => {
      await recognizeFace();
    }, 2000);
  };

  const handleStopScan = () => {
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);

    stopCamera();
    setScanStatus("idle");
    setEmployeeData(null);
    setErrorMessage("");
    setShowSuccessAlert(false);
    setShowErrorAlert(false);
  };

  const closeErrorAlert = () => {
    setShowErrorAlert(false);
    setErrorMessage("");
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
  };

  // Load last attendance on component mount
  useEffect(() => {
    const lastAtt = localStorage.getItem("lastAttendance");
    if (lastAtt) {
      setLastAttendance(JSON.parse(lastAtt));
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* SUCCESS ALERT MODAL */}
      {showSuccessAlert && employeeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-600">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-center text-white mb-2">
              {attendanceType === "check_in"
                ? "Check-In Berhasil!"
                : "Check-Out Berhasil!"}
            </h2>
          </div>
        </div>
      )}

      {/* ERROR ALERT */}
      {showErrorAlert && errorMessage && (
        <div className="fixed top-6 right-6 z-50 bg-red-900 border border-red-700 rounded-lg p-4 max-w-md">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="text-red-200 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={closeErrorAlert}
              className="text-red-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Face Recognition</h1>
        <p className="text-slate-300">Scan wajah Anda untuk absensi</p>
      </div>

      {/* Attendance Type Selection */}
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

      {/* Camera Preview */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-6">
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video mb-4 border-2 border-slate-700">
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <ScanFace className="h-16 w-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Kamera Siap</p>
                <p className="text-slate-600 text-sm mt-1">
                  Klik "Mulai Scan" untuk memindai wajah
                </p>
              </div>
            </div>
          )}

          {isScanning && (
            <>
              <div className="absolute inset-0 border-4 border-blue-500 opacity-50 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-60 border-2 border-green-500 rounded-lg pointer-events-none"></div>
            </>
          )}
        </div>

        {/* Status and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!isScanning && (
              <>
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <span className="text-slate-400 text-sm">Siap Memindai</span>
              </>
            )}
            {isScanning && scanStatus === "scanning" && (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-400 text-sm">Memindai Wajah...</span>
              </>
            )}
            {isScanning && scanStatus === "success" && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-400 text-sm">Berhasil!</span>
              </>
            )}
            {isScanning && scanStatus === "failed" && (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-400 text-sm">Gagal</span>
              </>
            )}
          </div>

          <div className="flex space-x-3">
            {!isScanning ? (
              <button
                onClick={handleStartScan}
                disabled={isStartingRef.current}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Scan</span>
              </button>
            ) : (
              <button
                onClick={handleStopScan}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Hentikan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
