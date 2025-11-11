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

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      setError(null);

      if (streamRef.current) stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }

      setUseCamera(true);
    } catch (err) {
      handleCameraError(err);
    }
  };

  const handleCameraError = (err) => {
    let msg = "Failed to access camera. ";
    switch (err.name) {
      case "NotAllowedError":
        msg += "Permission denied. Please allow camera access.";
        break;
      case "NotFoundError":
        msg += "No camera device found.";
        break;
      case "NotReadableError":
        msg += "Camera is in use by another application.";
        break;
      case "OverconstrainedError":
        msg += "Camera does not support the requested resolution.";
        break;
      default:
        msg += err.message || "Unknown error.";
    }
    setError(msg);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera is not ready");
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture photo");
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
  };

  const handlePhotoCapture = (file) => {
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.onerror = () => setError("Failed to load photo preview");
    reader.readAsDataURL(file);
    stopCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File must be an image");
      return;
    }
    handlePhotoCapture(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!employeeName.trim()) return setError("Full name is required");
    if (!photo) return setError("A photo is required");

    setLoading(true);
    setError(null);

    try {
      const photoBase64 = await fileToBase64(photo);
      const res = await fetch(`${API_BASE_URL}/api/attendance/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employees: employeeName.trim(),
          photo: photoBase64,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const result = await res.json();
      if (result.success) {
        alert(
          `Manual Attendance Successful!\n\nName: ${employeeName}\nTime: ${new Date().toLocaleString()}`
        );
        onSuccess?.(result);
        onClose?.();
      } else {
        setError(result.error || "Submission failed");
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const testCameraAccess = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Browser does not support camera access");
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      if (videoDevices.length === 0) {
        setError("No camera detected");
        return;
      }
      await startCamera();
    } catch (err) {
      setError("Cannot access camera: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md">
        <div className="sticky top-0 bg-slate-800 border-b rounded-t-2xl border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Manual Attendance</h2>
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
                {error.toLowerCase().includes("permission") && (
                  <button
                    onClick={testCameraAccess}
                    className="text-xs text-blue-400 underline mt-1"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Enter full name"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Selfie Photo *
            </label>

            {useCamera ? (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black/70 px-4 py-2 rounded-lg">
                    <p className="text-white font-medium">Take Photo</p>
                    <p className="text-sm text-slate-300">
                      Position your face at the center
                    </p>
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-green-600 px-3 py-1 rounded-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-sm">Camera Active</span>
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
                    Take Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Selfie"
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
                      Photo Ready
                    </span>
                  </div>
                </div>
                <p className="text-sm text-green-400 text-center">
                  ✓ Photo captured successfully
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
                  <Camera className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4">
                    Take a selfie photo for attendance
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={testCameraAccess}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <Camera className="h-4 w-4" />
                      Use Camera
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

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-300">
                    Tips: If the camera does not turn on, ensure:
                  </p>
                  <ul className="text-xs text-yellow-300 mt-1 space-y-1">
                    <li>Camera permission is allowed</li>
                    <li>The camera is not being used by another app</li>
                    <li>Refresh the page if the problem persists</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !employeeName.trim() || !photo}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Attendance"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendanceForm;
