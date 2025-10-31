import React, { useState, useRef, useEffect } from "react";
import {
  ScanFace,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserCheck,
  X,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FaceRegistration() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: "",
    department: "IT",
    position: "",
    email: "",
    phone: ""
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);
  const alertTimeoutRef = useRef(null);
  const cameraTimeoutRef = useRef(null);
  const navigate = useNavigate();

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
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        const video = videoRef.current;
        if (video.readyState >= 3) {
          resolve();
        } else {
          video.addEventListener('canplay', () => resolve(), { once: true });
        }
      });

      setIsScanning(true);
      isStartingRef.current = false;
      return true;
      
    } catch (error) {
      console.error("Camera access failed:", error);
      isStartingRef.current = false;
      
      let detailedError = "Tidak dapat mengakses kamera. ";
      
      if (error.name === 'NotAllowedError') {
        detailedError += "Izin kamera ditolak. Silakan izinkan akses kamera.";
      } else if (error.name === 'NotFoundError') {
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
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      return false;
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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

  // Simulasi face registration
  const simulateFaceRegistration = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.05; // 95% success rate
        
        if (success) {
          resolve({
            success: true,
            message: "Wajah berhasil diregistrasi",
            employeeId: "EMP" + Math.random().toString(36).substr(2, 9).toUpperCase()
          });
        } else {
          resolve({
            success: false,
            error: "Gagal meregistrasi wajah"
          });
        }
      }, 2000);
    });
  };

// Di bagian registerFace function, ganti dengan:

    const registerFace = async () => {
    if (!registrationData.name || !registrationData.email) {
        setErrorMessage("Nama dan email harus diisi");
        setShowErrorAlert(true);
        alertTimeoutRef.current = setTimeout(() => {
        setShowErrorAlert(false);
        }, 3000);
        return;
    }

    try {
        // Generate face embedding (simulasi)
        const faceEmbedding = Array.from({ length: 512 }, () => Math.random());
        
        console.log("📝 Sending REAL registration request to backend...");
        
        const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: registrationData.name,
            department: registrationData.department,
            position: registrationData.position,
            email: registrationData.email,
            phone: registrationData.phone,
            faceEmbedding: faceEmbedding  // Pastikan key-nya sesuai
        }),
        });

        if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log("✅ REAL Registration result:", result);

        if (result.success) {
        setEmployeeData({
            name: registrationData.name,
            id: result.employee_id,
            department: registrationData.department,
            position: registrationData.position,
            email: registrationData.email,
            phone: registrationData.phone,
            confidence: 0.95
        });
        setScanStatus("success");
        
        setShowSuccessAlert(true);
        alertTimeoutRef.current = setTimeout(() => {
            setShowSuccessAlert(false);
        }, 3000);
        
        autoStopCamera();
        
        } else {
        setScanStatus("failed");
        setErrorMessage(result.error || "Gagal meregistrasi wajah");
        setShowErrorAlert(true);
        alertTimeoutRef.current = setTimeout(() => {
            setShowErrorAlert(false);
        }, 3000);
        autoStopCamera();
        }
    } catch (error) {
        console.error("Registration error:", error);
        setScanStatus("failed");
        setErrorMessage(`Gagal melakukan registrasi: ${error.message}`);
        setShowErrorAlert(true);
        alertTimeoutRef.current = setTimeout(() => {
        setShowErrorAlert(false);
        }, 3000);
        autoStopCamera();
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
      await registerFace();
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

  const closeSuccessAlert = () => {
    setShowSuccessAlert(false);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
  };

  const closeErrorAlert = () => {
    setShowErrorAlert(false);
    setErrorMessage("");
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
  };

  const handleBack = () => {
    navigate(-1);
  };

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
              Registrasi Berhasil!
            </h2>

            <div className="bg-slate-700 rounded-lg p-4 space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-300">Nama</span>
                <span className="text-white font-medium">{employeeData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">ID Karyawan</span>
                <span className="text-white font-medium">{employeeData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Departemen</span>
                <span className="text-white font-medium">{employeeData.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Email</span>
                <span className="text-white font-medium">{employeeData.email}</span>
              </div>
            </div>
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
        <button
          onClick={handleBack}
          className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">Registrasi Wajah</h1>
        <p className="text-slate-300">Registrasi wajah karyawan baru</p>
      </div>

      {/* Camera Preview - DI ATAS */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-6">
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video mb-4 border-2 border-slate-700">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isScanning ? 'hidden' : ''}`}
          />
          
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <ScanFace className="h-16 w-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Kamera Siap</p>
                <p className="text-slate-600 text-sm mt-1">
                  Klik "Registrasi Wajah" untuk memindai
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
                <span className="text-slate-400 text-sm">Siap Registrasi</span>
              </>
            )}
            {isScanning && scanStatus === "scanning" && (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-400 text-sm">Meregistrasi Wajah...</span>
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
                disabled={isStartingRef.current || !registrationData.name || !registrationData.email}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrasi Wajah</span>
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

      {/* Registration Form - DI BAWAH KAMERA */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <Briefcase className="w-4 h-4 mr-2" />
          Data Karyawan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={registrationData.name}
              onChange={(e) => setRegistrationData({...registrationData, name: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Masukkan nama lengkap"
            />
          </div>
          
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Departemen
            </label>
            <select
              value={registrationData.department}
              onChange={(e) => setRegistrationData({...registrationData, department: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="Sales">Sales</option>
            </select>
          </div>
          
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Posisi/Jabatan
            </label>
            <input
              type="text"
              value={registrationData.position}
              onChange={(e) => setRegistrationData({...registrationData, position: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Contoh: Software Engineer"
            />
          </div>
          
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Email *
            </label>
            <input
              type="email"
              value={registrationData.email}
              onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="email@company.com"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Nomor Telepon
            </label>
            <input
              type="tel"
              value={registrationData.phone}
              onChange={(e) => setRegistrationData({...registrationData, phone: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="+62 812-3456-7890"
            />
          </div>
        </div>

        <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
          <p className="text-blue-400 text-sm text-center">
            💡 Isi data karyawan sebelum melakukan registrasi wajah
          </p>
        </div>
      </div>
    </div>
  );
}