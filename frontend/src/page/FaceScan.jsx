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

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let interval;
    if (scanStatus === "scanning") {
      interval = setInterval(() => {}, 60); // 3 seconds total (100 / 2 * 60ms = 3000ms)
    }
    return () => clearInterval(interval);
  }, [scanStatus]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert(
        "Tidak dapat mengakses kamera. Pastikan permission sudah diberikan."
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanStatus("scanning");
    setEmployeeData(null);
    await startCamera();

    setTimeout(() => {
      const mockEmployee = {
        name: "John Doe",
        id: "EMP-12345",
        department: "IT Department",
        position: "Software Developer",
        photo: null,
      };

      setEmployeeData(mockEmployee);
      setScanStatus("success");
    }, 3000);
  };

  const handleStopScan = () => {
    stopCamera();
    setScanStatus("idle");
    setEmployeeData(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-2">
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
