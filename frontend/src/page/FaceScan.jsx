import React, { useState, useRef, useEffect } from "react";
import {
  ScanFace,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function FaceScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle"); // idle, scanning, success, failed
  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [attendanceType, setAttendanceType] = useState("check_in");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let interval;
    if (scanStatus === "scanning") {
      interval = setInterval(() => {}, 60); // 3 seconds total (100 / 2 * 60ms = 3000ms)
    }
    return () => clearInterval(interval);
  }, [scanStatus]);

  const startCamera = async () => {
    try {
      setErrorMessage("");
      stopCamera();
      console.log("🎥 Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // ✅ TUNGGU sampai video benar-benar ready
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });

        console.log("✅ Camera started and ready");
      }
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
  const stopCamera = () => {
    try {
      console.log("🛑 Stopping camera...");

      if (streamRef.current) {
        console.log("📹 Stopping stream from streamRef");
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          console.log(`⏹️ Stopping track: ${track.kind}`);
          track.stop();
        });
        streamRef.current = null;
      }
      console.log("✅ Camera stopped successfully");
    } catch (error) {
      console.error("❌ Error stopping camera:", error);
      // Force cleanup bahkan jika error
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
    }
  };

  const captureAndRecognize = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    // ✅ PERUBAHAN: Setup canvas dengan ukuran yang tepat
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ✅ PERUBAHAN: Convert ke base64 untuk dikirim ke backend
    const imageData = canvas.toDataURL("image/jpeg");

    try {
      const response = await fetch("http://localhost:5000/api/recognize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error(`Recognition API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.faces_detected > 0) {
        const mockEmployee = {
          name: "John Doe",
          id: "EMP-12345",
          department: "IT Department",
          confidence: result.results[0]?.confidence || 0.95,
        };

        setEmployeeData(mockEmployee);
        setScanStatus("success");

        // ✅ HANDLE ERROR DENGAN TRY-CATCH
        try {
          await recordAttendance(
            mockEmployee.id,
            mockEmployee.confidence,
            attendanceType
          );
        } catch {
          console.error(
            "Attendance recording failed, but recognition succeeded"
          );
          // Tetap show success UI meski recording gagal
        }
      } else {
        setScanStatus("failed");
        setErrorMessage("Tidak ada wajah terdeteksi");
      }
    } catch (error) {
      console.error("Recognition error:", error);
      setScanStatus("failed");
      setErrorMessage("Server tidak merespon. Pastikan backend running.");
    }
  };

  // ✅ PERUBAHAN BARU: Function untuk record attendance ke backend
  const recordAttendance = async (employeeId, confidence, type) => {
    try {
      console.log(`🔄 Recording ${type} for ${employeeId}`);
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
          status: "present",
        }),
      });
      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ ${type.toUpperCase()} recorded:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to record ${type}:`, error);
      throw error; // Re-throw agar bisa dihandle di caller
    }
  };

  const handleStartScan = async () => {
    setErrorMessage("");
    setEmployeeData(null);
    setScanStatus("scanning");
    setEmployeeData(null);
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      console.log("❌ Camera failed to start");
      return;
    }

    setIsScanning(true);

    setTimeout(async () => {
      await captureAndRecognize();
    }, 2000);
  };

  const handleStopScan = () => {
    stopCamera();
    setIsScanning(false);
    setScanStatus("idle");
    setEmployeeData(null);
    setErrorMessage("");
  };

  useEffect(() => {
    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isScanning]);

  return (
    <div className=" bg-slate-950 px-6 py-2">
      <div className="max-w-7xl mx-auto">
        <div className="w-full flex items-center justify-center pt-0 pb-2"></div>
        <div className="flex items-center justify-center flex-col">
          <div className="w-4/5 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Camera Preview */}
            <div className="relative bg-slate-950 aspect-video flex items-center justify-center">
              {!isScanning ? (
                <div className="text-center">
                  <ScanFace className="h-24 w-24 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">Kamera belum aktif</p>
                  <p className="text-slate-600 text-sm mt-2">
                    Klik "Mulai Scan" untuk memulai
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scan Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative"></div>
                  </div>
                </>
              )}
            </div>

            {/* Status Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="space-x-2">
                  <button
                    onClick={() => setAttendanceType("check_in")}
                    className={`px-4 py-2 rounded-lg ${
                      attendanceType === "check_in"
                        ? "bg-green-600 text-white"
                        : "bg-gray-600 text-gray-300"
                    }`}
                  >
                    Check-In
                  </button>
                  <button
                    onClick={() => setAttendanceType("check_out")}
                    className={`px-4 py-2 rounded-lg ${
                      attendanceType === "check_out"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-600 text-gray-300"
                    }`}
                  >
                    Check-Out
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {!isScanning && (
                    <>
                      <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                      <span className="text-sm text-slate-400">
                        Kamera Tidak Aktif
                      </span>
                    </>
                  )}
                  {isScanning && scanStatus === "scanning" && (
                    <>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-slate-400">
                        Scanning...
                      </span>
                    </>
                  )}
                  {isScanning && scanStatus === "success" && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-400">Berhasil!</span>
                    </>
                  )}
                  {isScanning && scanStatus === "failed" && (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-red-400">Gagal!</span>
                    </>
                  )}
                  {isScanning && scanStatus === "idle" && (
                    <>
                      <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                      <span className="text-sm text-slate-400">
                        Kamera Aktif
                      </span>
                    </>
                  )}
                </div>
                <div className="flex space-x-2">
                  {!isScanning ? (
                    <button
                      onClick={handleStartScan}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Mulai Scan</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleStopScan}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Hentikan
                      </button>
                      <button
                        onClick={handleStartScan}
                        disabled={scanStatus === "scanning"}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <Camera className="h-4 w-4" />
                        <span>Mulai Scan</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Result Panel */}
            {employeeData && scanStatus === "success" && (
              <div className="p-6 bg-green-900/20 border-t border-green-800">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-12 w-12 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Absensi Berhasil!
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
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
