import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000";

const ManualAttendanceForm = ({ onClose, onSuccess }) => {
  const [employeeName, setEmployeeName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup camera on unmount
  useEffect(() => {
    startCamera();

    // dijalankan saat komponen UNMOUNT
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setError(null);

      // Stop any existing stream first
      if (streamRef.current) {
        stopCamera();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log("Starting camera...");

      // Try different camera constraints
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user", // Front camera
          frameRate: { ideal: 30 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera access granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const video = videoRef.current;

          const onLoadedMetadata = () => {
            console.log("Video metadata loaded");
            video.onloadedmetadata = () => {
              video.play().catch((err) => console.error("Play failed:", err));
            };
          };

          const onError = () => {
            reject(new Error("Video playback failed", cameraError));
          };

          video.addEventListener("loadedmetadata", onLoadedMetadata, {
            once: true,
          });
          video.addEventListener("error", onError, { once: true });

          // Timeout fallback
          setTimeout(() => {
            if (video.readyState >= 2) {
              video.play().then(resolve).catch(reject);
            } else {
              reject(new Error("Camera timeout"));
            }
          }, 3000);
        });
      }

      setUseCamera(true);
      console.log("Camera started successfully");
    } catch (err) {
      console.error("Camera error:", err);
      let errorMessage = "Gagal mengakses kamera. ";

      if (err.name === "NotAllowedError") {
        errorMessage +=
          "Izin kamera ditolak. Silakan izinkan akses kamera di browser Anda.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "Tidak ada kamera yang ditemukan.";
      } else if (err.name === "NotReadableError") {
        errorMessage += "Kamera sedang digunakan oleh aplikasi lain.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage += "Kamera tidak mendukung resolusi yang diminta.";
      } else {
        errorMessage += err.message || "Error tidak diketahui.";
      }

      setCameraError(errorMessage);
      setError(errorMessage);
      stopCamera();
    }
  };

  const stopCamera = () => {
    console.log("Stopping camera...");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log(`Stopping track: ${track.kind}`);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Kamera tidak siap");
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError("Gagal mengambil foto");
            return;
          }

          const file = new File([blob], `attendance_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          handlePhotoCapture(file);
        },
        "image/jpeg",
        0.9
      );
    } catch (err) {
      console.error("Capture error:", err);
      setError("Gagal mengambil foto: " + err.message);
    }
  };

  const handlePhotoCapture = (file) => {
    setPhoto(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.onerror = () => {
      setError("Gagal memuat preview foto");
    };
    reader.readAsDataURL(file);

    stopCamera();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("File harus berupa gambar");
        return;
      }
      handlePhotoCapture(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!employeeName.trim()) {
      setError("Nama harus diisi");
      return;
    }

    if (!photo) {
      setError("Foto harus diambil atau diupload");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const photoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(photo);
      });

      const response = await fetch(`${API_BASE_URL}/api/attendance/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employees: employeeName.trim(),
          photo: photoBase64,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(
          `Absensi Manual Berhasil!\n\nNama: ${employeeName}\nWaktu: ${new Date().toLocaleString()}`
        );
        if (onSuccess) onSuccess(result);
        if (onClose) onClose();
      } else {
        setError(result.error || "Gagal mengirim absensi");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test camera permissions first
  const testCameraAccess = async () => {
    try {
      // Check if browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Browser tidak mendukung akses kamera");
        return;
      }

      // Quick permission test
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      if (videoDevices.length === 0) {
        setError("Tidak ada kamera yang terdeteksi");
        return;
      }

      console.log(`Found ${videoDevices.length} camera(s):`, videoDevices);

      // Now start the camera
      await startCamera();
    } catch (err) {
      console.error("Camera test failed:", err);
      setError("Tidak dapat mengakses kamera: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Absensi Manual</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">{error}</p>
                {error.includes("izin") && (
                  <button
                    onClick={testCameraAccess}
                    className="text-xs text-blue-400 underline mt-1"
                  >
                    Coba lagi
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Nama Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Photo Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Foto Selfie *
            </label>

            {useCamera ? (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    controls={false}
                    className="w-full h-64 object-cover"
                    style={{ backgroundColor: "black" }}
                  />
                  <div className="absolute top-4 left-4 bg-black/70 px-4 py-2 rounded-lg">
                    <p className="text-white font-medium">Ambil Foto</p>
                    <p className="text-sm text-slate-300">
                      Posisikan wajah di tengah
                    </p>
                  </div>

                  {/* Camera status indicator */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-green-600 px-3 py-1 rounded-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white text-sm">Kamera Aktif</span>
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-3">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <Camera className="h-5 w-5" />
                    Ambil Foto
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    disabled={loading}
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Foto selfie"
                    className="w-full h-64 object-cover rounded-lg border-2 border-green-500"
                  />
                  <button
                    onClick={removePhoto}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  <div className="absolute top-2 left-2 px-3 py-1 bg-green-600 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-white" />
                    <span className="text-sm text-white font-medium">
                      Foto Tersedia
                    </span>
                  </div>
                </div>
                <p className="text-sm text-green-400 text-center">
                  ✓ Foto berhasil diambil
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
                  <Camera className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4">
                    Ambil foto selfie untuk absensi
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={testCameraAccess}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <Camera className="h-4 w-4" />
                      Gunakan Kamera
                    </button>
                    <label className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                  </div>
                </div>

                {/* Camera troubleshooting tips */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-300">
                    Tips: Jika kamera tidak mau nyala, pastikan:
                  </p>
                  <ul className="text-xs text-yellow-300 mt-1 space-y-1">
                    <li>Izin kamera sudah diberikan</li>
                    <li>Kamera tidak sedang digunakan aplikasi lain</li>
                    <li>Coba refresh halaman jika masih bermasalah</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !employeeName.trim() || !photo}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Submit Absensi"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceForm;
