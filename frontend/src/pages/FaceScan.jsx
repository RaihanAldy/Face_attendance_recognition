import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';

const FaceScan = () => {
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const startCapture = () => {
    setIsCapturing(true);
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setIsCapturing(false);
    // Here you would typically send the image to your backend for face recognition
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-orange-500">Face Recognition Attendance</h1>
      
      <div className="flex flex-col items-center">
        {isCapturing ? (
          <div className="relative w-full max-w-md">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded-lg shadow-lg w-full"
            />
            <button
              onClick={captureImage}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Capture
            </button>
          </div>
        ) : (
          <div className="text-center">
            {capturedImage ? (
              <div className="space-y-4">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="rounded-lg shadow-lg max-w-md mx-auto"
                />
                <button
                  onClick={() => setIsCapturing(true)}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Retake
                </button>
              </div>
            ) : (
              <button
                onClick={startCapture}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Start Face Scan
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-orange-50 rounded-lg">
        <h2 className="text-xl font-semibold text-orange-700 mb-2">Instructions</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Position your face clearly in front of the camera</li>
          <li>Ensure good lighting conditions</li>
          <li>Remove any face coverings</li>
          <li>Look directly at the camera</li>
        </ul>
      </div>
    </div>
  );
};

export default FaceScan;