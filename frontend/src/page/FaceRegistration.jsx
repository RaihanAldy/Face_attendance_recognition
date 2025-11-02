
import React, { useState, useRef, useEffect } from "react";
import { Camera, ArrowLeft, UserPlus, CheckCircle, XCircle, AlertCircle, RotateCcw } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

export default function FaceRegistration({ onBack }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [faceCaptures, setFaceCaptures] = useState([]);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    email: "",
    phone: "",
    department: "General",
  });
  const [errors, setErrors] = useState({});

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);

  const MySwal = withReactContent(Swal);

  const angles = [
    { id: 0, name: "Depan", description: "Hadap lurus ke kamera" },
    { id: 1, name: "Kiri", description: "Miringkan kepala ke kiri 15-20°" },
    { id: 2, name: "Kanan", description: "Miringkan kepala ke kanan 15-20°" },
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ✅ NEW: Extract face embedding from video (same as FaceScan)
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
      console.log(`   Angle: ${angles[currentAngle].name}`);
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
        face_detected: result.face_detected,
        image: imageData
      };
      
    } catch (error) {
      console.error("❌ Error capturing/extracting face:", error);
      throw error;
    }
  };

  // Start camera
  const startCamera = async () => {
    if (isStartingRef.current || isScanning) return;

    isStartingRef.current = true;

    try {
      console.log("🎥 Starting camera for registration...");

      if (streamRef.current) {
        stopCamera();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Set isScanning first to render video element
      setIsScanning(true);
      
      // Wait for video element to be rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Wait for video element to be available
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

        const onCanPlay = () => {
          if (!resolved) {
            resolved = true;
            video.removeEventListener("canplay", onCanPlay);
            
            video.play()
              .then(() => {
                console.log("✅ Camera ready");
                resolve();
              })
              .catch(reject);
          }
        };

        video.addEventListener("canplay", onCanPlay);

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            video.removeEventListener("canplay", onCanPlay);
            if (video.videoWidth > 0) {
              video.play().then(resolve).catch(reject);
            } else {
              reject(new Error("Camera timeout"));
            }
          }
        }, 5000);
      });

      isStartingRef.current = false;

    } catch (error) {
      console.error("Camera error:", error);
      isStartingRef.current = false;
      setIsScanning(false);

      let errorMsg = "Tidak dapat mengakses kamera.";
      if (error.name === "NotAllowedError") {
        errorMsg = "Permission kamera ditolak. Silakan izinkan di browser settings.";
      }

      MySwal.fire({
        title: "Gagal Akses Kamera",
        text: errorMsg,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Stop camera
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
    }
  };

  // ✅ UPDATED: Capture face with real embedding extraction
  const captureFace = async () => {
    if (!videoRef.current || !isScanning) return;

    try {
      // Show loading
      MySwal.fire({
        title: 'Memproses Wajah...',
        html: 'Mengekstrak face embedding...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Extract face from video using backend
      const faceData = await captureAndExtractFace();
      
      if (!faceData.face_detected) {
        MySwal.fire({
          title: "Wajah Tidak Terdeteksi",
          text: "Pastikan wajah Anda terlihat jelas di tengah frame.",
          icon: "warning",
          confirmButtonText: "Coba Lagi",
        });
        return;
      }

      // Add capture to array with real embedding
      const newCapture = {
        angle: currentAngle,
        angleName: angles[currentAngle].name,
        image: faceData.image,
        embedding: faceData.embedding,
        confidence: faceData.confidence,
        timestamp: new Date().toISOString()
      };

      setFaceCaptures(prev => [...prev, newCapture]);
      
      // Move to next angle or finish
      if (currentAngle < angles.length - 1) {
        setCurrentAngle(currentAngle + 1);
        
        MySwal.fire({
          title: `Posisi ${angles[currentAngle].name} Terekam!`,
          html: `
            <div style="text-align: center;">
              <p>Confidence: ${(faceData.confidence * 100).toFixed(1)}%</p>
              <p style="margin-top: 8px;">Sekarang ${angles[currentAngle + 1].description}</p>
            </div>
          `,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setScanStatus("captured");
        stopCamera();
        
        MySwal.fire({
          title: "Semua Posisi Terekam!",
          text: "Silakan lengkapi form data karyawan.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error capturing face:", error);
      
      let errorMsg = "Gagal mengambil foto wajah.";
      if (error.message.includes("No face detected")) {
        errorMsg = "Tidak ada wajah terdeteksi. Posisikan wajah dengan benar.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMsg = "Backend tidak merespon. Pastikan server running.";
      }
      
      MySwal.fire({
        title: "Kesalahan",
        text: errorMsg,
        icon: "error",
        confirmButtonText: "Coba Lagi",
      });
    }
  };

  // Retake specific angle
  const retakeAngle = (angleIndex) => {
    const updatedCaptures = faceCaptures.filter(capture => capture.angle !== angleIndex);
    setFaceCaptures(updatedCaptures);
    setCurrentAngle(angleIndex);
    startCamera();
  };

  // Retake all photos
  const retakeAll = () => {
    setFaceCaptures([]);
    setCurrentAngle(0);
    setScanStatus("idle");
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nama wajib diisi";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Nama minimal 2 karakter";
    }

    if (formData.email && !/^[\w.-]+@[\w.-]+\.\w+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }

    if (formData.phone && !/^\+?62\d{9,12}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = "Format phone tidak valid (gunakan +62xxx)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // ✅ UPDATED: Submit with real embeddings
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (faceCaptures.length < angles.length) {
      MySwal.fire({
        title: "Foto Belum Lengkap",
        text: `Silakan ambil semua ${angles.length} posisi wajah terlebih dahulu.`,
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!validateForm()) {
      MySwal.fire({
        title: "Form Tidak Valid",
        text: "Silakan periksa kembali data yang diisi.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      setScanStatus("submitting");

      // Extract embeddings from captures (REAL embeddings from backend)
      const faceEmbeddings = faceCaptures.map(capture => capture.embedding);
      
      console.log("📤 Submitting registration with real embeddings:");
      console.log(`   Name: ${formData.name}`);
      console.log(`   Embeddings count: ${faceEmbeddings.length}`);
      console.log(`   Embedding length: ${faceEmbeddings[0].length}`);
      faceCaptures.forEach((capture, idx) => {
        console.log(`   ${capture.angleName}: ${(capture.confidence * 100).toFixed(1)}% confidence`);
      });

      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          department: formData.department,
          position: formData.position.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          faceEmbeddings: faceEmbeddings, // Real embeddings from backend
          captureCount: faceCaptures.length
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setScanStatus("success");

        await MySwal.fire({
          title: "Registrasi Berhasil!",
          html: `
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                Karyawan berhasil terdaftar
              </p>
              <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin-top: 12px;">
                <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                  ID: ${result.employee_id}
                </p>
                <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                  Nama: ${formData.name}
                </p>
                <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                  Department: ${formData.department}
                </p>
                <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                  Face angles: ${faceCaptures.length}
                </p>
                <p style="color: #cbd5e1; font-size: 14px; margin: 4px 0;">
                  Avg confidence: ${(faceCaptures.reduce((sum, c) => sum + c.confidence, 0) / faceCaptures.length * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          `,
          icon: "success",
          confirmButtonText: "OK",
        });

        // Reset form
        setFormData({
          name: "",
          position: "",
          email: "",
          phone: "",
          department: "General",
        });
        setFaceCaptures([]);
        setCurrentAngle(0);
        setScanStatus("idle");
        setErrors({});

      } else {
        throw new Error(result.error || "Registration failed");
      }

    } catch (error) {
      console.error("Registration error:", error);
      setScanStatus("idle");

      MySwal.fire({
        title: "Registrasi Gagal",
        text: error.message || "Terjadi kesalahan saat registrasi.",
        icon: "error",
        confirmButtonText: "Coba Lagi",
      });
    }
  };

  const currentAngleData = angles[currentAngle];

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>

          <div className="text-center">
            <UserPlus className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Registrasi Karyawan Baru</h1>
            <p className="text-slate-400">Ambil foto wajah dari 3 angle berbeda untuk akurasi lebih tinggi</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera Section */}
          <div className="space-y-6">
            {/* Camera Preview */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="relative bg-slate-950 aspect-4/3 flex items-center justify-center">
                {/* Video Preview */}
                {isScanning && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-4 border-green-500 rounded-lg opacity-50 pointer-events-none"></div>
                    
                    {/* Angle Guide Overlay */}
                    <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                      <div className="text-sm font-medium">{currentAngleData.name}</div>
                      <div className="text-xs text-slate-300">{currentAngleData.description}</div>
                    </div>
                  </>
                )}

                {/* Placeholder */}
                {!isScanning && faceCaptures.length === 0 && (
                  <div className="text-center">
                    <Camera className="h-20 w-20 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">Siap mengambil foto</p>
                    <p className="text-slate-600 text-sm mt-2">Klik "Buka Kamera" untuk memulai</p>
                  </div>
                )}

                {/* Completed Message */}
                {!isScanning && faceCaptures.length === angles.length && (
                  <div className="text-center">
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
                    <p className="text-green-400 font-medium">Semua foto telah diambil!</p>
                    <p className="text-slate-400 text-sm mt-2">
                      {faceCaptures.length}/{angles.length} posisi
                    </p>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {scanStatus === "idle" && (
                      <>
                        <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                        <span className="text-sm text-slate-400">
                          {faceCaptures.length > 0 
                            ? `${faceCaptures.length}/${angles.length} Posisi` 
                            : "Siap"}
                        </span>
                      </>
                    )}
                    {scanStatus === "captured" && (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-400">Semua Posisi Terekam</span>
                      </>
                    )}
                    {scanStatus === "submitting" && (
                      <>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-slate-400">Mengirim...</span>
                      </>
                    )}
                  </div>

                  {faceCaptures.length > 0 && (
                    <div className="text-sm text-slate-400">
                      {faceCaptures.length}/{angles.length}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isScanning && faceCaptures.length < angles.length && (
                    <button
                      onClick={startCamera}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      {faceCaptures.length === 0 ? 'Buka Kamera' : 'Lanjutkan'}
                    </button>
                  )}

                  {isScanning && (
                    <>
                      <button
                        onClick={captureFace}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        📸 Ambil {currentAngleData.name}
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Batal
                      </button>
                    </>
                  )}

                  {faceCaptures.length > 0 && !isScanning && (
                    <button
                      onClick={retakeAll}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Ambil Ulang Semua
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Captured Images Grid */}
            {faceCaptures.length > 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Foto yang Telah Diambil</h3>
                <div className="grid grid-cols-3 gap-3">
                  {angles.map((angle, index) => {
                    const capture = faceCaptures.find(c => c.angle === angle.id);
                    return (
                      <div key={angle.id} className="text-center">
                        <div className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                          capture ? 'border-green-500' : 'border-slate-600'
                        }`}>
                          {capture ? (
                            <>
                              <img
                                src={capture.image}
                                alt={`Wajah ${angle.name}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => retakeAngle(angle.id)}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full text-xs"
                                title="Ambil ulang"
                              >
                                ↻
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                              <span className="text-slate-500 text-sm">Belum</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          {angle.name}
                        </div>
                        {capture && (
                          <div className="text-xs text-green-400">✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Data Karyawan</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className={`w-full px-4 py-2 bg-slate-800 border ${
                    errors.name ? "border-red-500" : "border-slate-600"
                  } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Posisi/Jabatan
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Software Engineer"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="General">General</option>
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  className={`w-full px-4 py-2 bg-slate-800 border ${
                    errors.email ? "border-red-500" : "border-slate-600"
                  } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+6281234567890"
                  className={`w-full px-4 py-2 bg-slate-800 border ${
                    errors.phone ? "border-red-500" : "border-slate-600"
                  } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={faceCaptures.length < angles.length || scanStatus === "submitting"}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {scanStatus === "submitting" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Daftarkan Karyawan ({faceCaptures.length}/{angles.length})
                  </>
                )}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-blue-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Panduan Pengambilan Foto:</strong> Ambil wajah dari 3 angle berbeda (depan, kiri, kanan) untuk meningkatkan akurasi recognition. Pastikan wajah terlihat jelas dengan pencahayaan yang baik.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}