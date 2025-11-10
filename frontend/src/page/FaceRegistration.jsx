import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  ArrowLeft,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
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
    { id: 0, name: "Front", description: "Face straight toward the camera" },
    { id: 1, name: "Left", description: "Tilt your head 15–20° to the left" },
    { id: 2, name: "Right", description: "Tilt your head 15–20° to the right" },
  ];

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  /* ---------------------------- Capture & Extract Face ---------------------------- */
  const captureAndExtractFace = async () => {
    try {
      if (!videoRef.current) throw new Error("Video element not available");

      const video = videoRef.current;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg", 0.95);

      console.log("Image captured");
      console.log(`Angle: ${angles[currentAngle].name}`);
      console.log("Sending to backend...");

      const response = await fetch("http://localhost:5000/api/extract-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Face extraction failed");
      }

      console.log("Face extracted");
      return {
        embedding: result.embedding,
        confidence: result.confidence,
        face_detected: result.face_detected,
        image: imageData,
      };
    } catch (error) {
      console.error("Error extracting face:", error);
      throw error;
    }
  };

  /* ------------------------------- Start Camera ------------------------------ */
  const startCamera = async () => {
    if (isStartingRef.current || isScanning) return;

    isStartingRef.current = true;

    try {
      if (streamRef.current) {
        stopCamera();
        await new Promise((res) => setTimeout(res, 100));
      }

      setIsScanning(true);

      await new Promise((res) => setTimeout(res, 100));

      let retries = 0;
      while (!videoRef.current && retries < 10) {
        await new Promise((res) => setTimeout(res, 100));
        retries++;
      }

      if (!videoRef.current) throw new Error("Video element not found");

      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!stream) throw new Error("No stream returned");

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve, reject) => {
        const video = videoRef.current;
        let resolved = false;

        const onCanPlay = () => {
          if (!resolved) {
            resolved = true;
            video.removeEventListener("canplay", onCanPlay);
            video.play().then(resolve).catch(reject);
          }
        };

        video.addEventListener("canplay", onCanPlay);

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            video.removeEventListener("canplay", onCanPlay);

            if (video.videoWidth > 0) {
              video.play().then(resolve).catch(reject);
            } else reject(new Error("Camera timeout"));
          }
        }, 5000);
      });

      isStartingRef.current = false;
    } catch (error) {
      console.error("Camera error:", error);
      isStartingRef.current = false;
      setIsScanning(false);

      let msg = "Unable to access the camera.";
      if (error.name === "NotAllowedError") {
        msg = "Camera permission denied. Enable it in browser settings.";
      }

      MySwal.fire({
        title: "Camera Access Failed",
        text: msg,
        icon: "error",
      });
    }
  };

  /* --------------------------- Stop Camera --------------------------- */
  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;

      setIsScanning(false);
      isStartingRef.current = false;
    } catch (err) {
      console.error("Error stopping camera:", err);
    }
  };

  /* ------------------------------ Capture Face ------------------------------ */
  const captureFace = async () => {
    if (!videoRef.current || !isScanning) return;

    try {
      MySwal.fire({
        title: "Processing Face...",
        html: "Extracting face embedding...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const faceData = await captureAndExtractFace();

      if (!faceData.face_detected) {
        MySwal.fire({
          title: "No Face Detected",
          text: "Ensure your face is centered and visible.",
          icon: "warning",
        });
        return;
      }

      const newCapture = {
        angle: currentAngle,
        angleName: angles[currentAngle].name,
        image: faceData.image,
        embedding: faceData.embedding,
        confidence: faceData.confidence,
        timestamp: new Date().toISOString(),
      };

      setFaceCaptures((prev) => [...prev, newCapture]);

      if (currentAngle < angles.length - 1) {
        setCurrentAngle(currentAngle + 1);

        MySwal.fire({
          title: `${angles[currentAngle].name} Captured!`,
          html: `
            <p>Confidence: ${(faceData.confidence * 100).toFixed(1)}%</p>
            <p style="margin-top: 8px;">Next: ${
              angles[currentAngle + 1].description
            }</p>
          `,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setScanStatus("captured");
        stopCamera();

        MySwal.fire({
          title: "All Angles Captured!",
          text: "Please complete the employee form.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error(err);

      let msg = "Failed to capture face.";
      if (err.message.includes("No face detected")) {
        msg = "No face detected. Adjust your position.";
      } else if (err.message.includes("Failed to fetch")) {
        msg = "Backend not responding. Ensure server is running.";
      }

      MySwal.fire({
        title: "Error",
        text: msg,
        icon: "error",
      });
    }
  };

  const retakeAngle = (index) => {
    setFaceCaptures(faceCaptures.filter((c) => c.angle !== index));
    setCurrentAngle(index);
    startCamera();
  };

  const retakeAll = () => {
    setFaceCaptures([]);
    setCurrentAngle(0);
    setScanStatus("idle");
  };

  /* ------------------------------ Validation ------------------------------ */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    else if (formData.name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters";

    if (formData.email && !/^[\w.-]+@[\w.-]+\.\w+$/.test(formData.email))
      newErrors.email = "Invalid email format";

    if (
      formData.phone &&
      !/^\+?62\d{9,12}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
      newErrors.phone = "Invalid phone format (use +62...)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  /* ------------------------------ Submit Form ------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (faceCaptures.length < angles.length) {
      MySwal.fire({
        title: "Incomplete Photos",
        text: `Please capture all ${angles.length} face angles first.`,
        icon: "warning",
      });
      return;
    }

    if (!validateForm()) {
      MySwal.fire({
        title: "Invalid Form",
        text: "Please check your input fields.",
        icon: "error",
      });
      return;
    }

    try {
      setScanStatus("submitting");

      const embeddings = faceCaptures.map((c) => c.embedding);

      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          department: formData.department,
          position: formData.position.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          faceEmbeddings: embeddings,
          captureCount: faceCaptures.length,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setScanStatus("success");

        await MySwal.fire({
          title: "Registration Successful!",
          html: `
            <div style="text-align: center;">
              <div style="font-size: 48px;">✅</div>
              <p class="mt-2">Employee has been registered</p>
              <div style="background:#1e293b;padding:12px;border-radius:8px;margin-top:12px;text-align:left;">
                <p>ID: ${result.employee_id}</p>
                <p>Name: ${formData.name}</p>
                <p>Department: ${formData.department}</p>
                <p>Face angles: ${faceCaptures.length}</p>
              </div>
            </div>
          `,
          icon: "success",
        });

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
      }
    } catch (err) {
      setScanStatus("idle");
      MySwal.fire({
        title: "Registration Failed",
        text: err.message || "An error occurred.",
        icon: "error",
      });
    }
  };

  const currentAngleData = angles[currentAngle];

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="text-center">
            <UserPlus className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">
              New Employee Registration
            </h1>
            <p className="text-slate-400">
              Capture 3 face angles for higher recognition accuracy
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* CAMERA SECTION */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="relative bg-slate-950 aspect-4/3 flex items-center justify-center">
                {isScanning && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-4 border-green-500 rounded-lg opacity-50"></div>

                    <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                      <div className="text-sm font-medium">
                        {currentAngleData.name}
                      </div>
                      <div className="text-xs text-slate-300">
                        {currentAngleData.description}
                      </div>
                    </div>
                  </>
                )}

                {!isScanning && faceCaptures.length === 0 && (
                  <div className="text-center">
                    <Camera className="h-20 w-20 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">Ready to capture</p>
                    <p className="text-slate-600 text-sm mt-2">
                      Click "Open Camera" to start
                    </p>
                  </div>
                )}

                {!isScanning && faceCaptures.length === angles.length && (
                  <div className="text-center">
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
                    <p className="text-green-400 font-medium">
                      All photos captured!
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                      {faceCaptures.length}/{angles.length} positions
                    </p>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="p-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {scanStatus === "idle" && (
                      <>
                        <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                        <span className="text-sm text-slate-400">
                          {faceCaptures.length > 0
                            ? `${faceCaptures.length}/${angles.length} Positions`
                            : "Ready"}
                        </span>
                      </>
                    )}

                    {scanStatus === "captured" && (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-400">
                          All Positions Captured
                        </span>
                      </>
                    )}

                    {scanStatus === "submitting" && (
                      <>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-slate-400">
                          Submitting...
                        </span>
                      </>
                    )}
                  </div>

                  {faceCaptures.length > 0 && (
                    <span className="text-sm text-slate-400">
                      {faceCaptures.length}/{angles.length}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Start Camera */}
                  {!isScanning && faceCaptures.length < angles.length && (
                    <button
                      onClick={startCamera}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      <Camera className="w-4 h-4 inline-block" />
                      {faceCaptures.length === 0 ? "Open Camera" : "Continue"}
                    </button>
                  )}

                  {/* Capture Button */}
                  {isScanning && (
                    <>
                      <button
                        onClick={captureFace}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        📸 Capture {currentAngleData.name}
                      </button>

                      <button
                        onClick={stopCamera}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {/* Retake All */}
                  {faceCaptures.length > 0 && !isScanning && (
                    <button
                      onClick={retakeAll}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake All
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Captured Photos Grid */}
            {faceCaptures.length > 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Captured Photos
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  {angles.map((angle) => {
                    const capture = faceCaptures.find(
                      (c) => c.angle === angle.id
                    );
                    return (
                      <div key={angle.id} className="text-center">
                        <div
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                            capture ? "border-green-500" : "border-slate-600"
                          }`}
                        >
                          {capture ? (
                            <>
                              <img
                                src={capture.image}
                                alt={`Face ${angle.name}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => retakeAngle(angle.id)}
                                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs"
                                title="Retake"
                              >
                                ↻
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                              <span className="text-slate-500 text-sm">
                                Not Yet
                              </span>
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

          {/* FORM SECTION */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Employee Data</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-slate-800 border ${
                    errors.name ? "border-red-500" : "border-slate-600"
                  } rounded-lg text-white`}
                />

                {errors.name && (
                  <p className="text-red-400 text-sm">{errors.name}</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Position / Job Title
                </label>

                <input
                  type="text"
                  name="position"
                  placeholder="Software Engineer"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Department
                </label>

                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
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
                <label className="block text-sm text-slate-300 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-slate-800 border ${
                    errors.email ? "border-red-500" : "border-slate-600"
                  } rounded-lg text-white`}
                />

                {errors.email && (
                  <p className="text-red-400 text-sm">{errors.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  placeholder="+6281234567890"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-slate-800 border ${
                    errors.phone ? "border-red-500" : "border-slate-600"
                  } rounded-lg text-white`}
                />

                {errors.phone && (
                  <p className="text-red-400 text-sm">{errors.phone}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  faceCaptures.length < angles.length ||
                  scanStatus === "submitting"
                }
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg flex items-center justify-center gap-2"
              >
                {scanStatus === "submitting" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Register Employee ({faceCaptures.length}/{angles.length})
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-blue-400 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>
                  <strong>Photo Guide:</strong> Capture all 3 angles (front,
                  left, right) with clear lighting for maximum recognition
                  accuracy.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
