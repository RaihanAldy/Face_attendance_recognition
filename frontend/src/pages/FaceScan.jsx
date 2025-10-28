import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Clock } from 'lucide-react';

const FaceScan = () => {
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognizedPerson, setRecognizedPerson] = useState(null);
  const [captureTime, setCaptureTime] = useState(null);
  const [loading, setLoading] = useState(false);

  const startCapture = () => {
    setIsCapturing(true);
    setRecognizedPerson(null);
    setCaptureTime(null);
  };

  const captureImage = async () => {
    setLoading(true);
    const imageSrc = webcamRef.current.getScreenshot();
    const timestamp = new Date();
    setCapturedImage(imageSrc);
    setCaptureTime(timestamp);
    setIsCapturing(false);

    try {
      // Simulate API call to face recognition service
      // Replace this with your actual API call
      const response = await simulateFaceRecognition(imageSrc);
      setRecognizedPerson(response);
      
      // Save attendance record
      await saveAttendanceRecord({
        image: imageSrc,
        timestamp: timestamp.toISOString(),
        employeeId: response.employeeId,
        name: response.name,
        confidence: response.confidence
      });
    } catch (error) {
      console.error('Face recognition failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simulate face recognition API call
  const simulateFaceRecognition = async (image) => {
    // Convert image to blob for actual API implementation
    const imageBlob = await fetch(image).then(r => r.blob());
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    // In a real implementation, you would send imageBlob to your API
    console.log('Image size:', Math.round(imageBlob.size / 1024), 'KB');
    
    return {
      employeeId: 'EMP001',
      name: 'John Doe',
      confidence: 0.98,
      department: 'Engineering'
    };
  };

  // Save attendance record
  const saveAttendanceRecord = async (record) => {
    // Replace with your actual API endpoint
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  return (
    <div className="p-6 bg-navy-950 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-sky-400">Face Recognition Attendance</h1>
      
      <div className="flex flex-col items-center">
        {isCapturing ? (
          <div className="relative w-full max-w-md">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded-lg shadow-lg w-full border-2 border-navy-800"
            />
            <button
              onClick={captureImage}
              disabled={loading}
              className={`mt-4 px-6 py-2 ${loading ? 'bg-navy-700' : 'bg-sky-500 hover:bg-sky-600'} text-white rounded-lg transition-colors w-full flex items-center justify-center space-x-2`}
            >
              {loading ? 'Processing...' : 'Capture'}
            </button>
          </div>
        ) : (
          <div className="text-center w-full max-w-md">
            {capturedImage ? (
              <div className="space-y-4">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="rounded-lg shadow-lg max-w-md mx-auto border-2 border-navy-800"
                />
                
                {/* Recognition Details */}
                {recognizedPerson && (
                  <div className="bg-navy-900 p-4 rounded-lg text-left border border-navy-800">
                    <h3 className="text-sky-400 font-semibold mb-2">Recognition Details</h3>
                    <div className="space-y-2 text-sky-100">
                      <p><span className="text-sky-400">Name:</span> {recognizedPerson.name}</p>
                      <p><span className="text-sky-400">Employee ID:</span> {recognizedPerson.employeeId}</p>
                      <p><span className="text-sky-400">Department:</span> {recognizedPerson.department}</p>
                      <p><span className="text-sky-400">Confidence:</span> {(recognizedPerson.confidence * 100).toFixed(1)}%</p>
                      <div className="flex items-center">
                        <Clock className="text-sky-400 w-4 h-4 mr-2" />
                        <p>{captureTime?.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsCapturing(true)}
                    className="flex-1 px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  >
                    Scan Again
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={startCapture}
                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors w-full"
              >
                Start Face Scan
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-navy-900 rounded-lg border border-navy-800">
        <h2 className="text-xl font-semibold text-sky-400 mb-2">Instructions</h2>
        <ul className="list-disc list-inside text-sky-100 space-y-2">
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