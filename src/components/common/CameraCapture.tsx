import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CameraIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface CameraCaptureProps {
  onCapture: (imageData: string, imageFile: File) => void;
  onClose: () => void;
  title?: string;
  instructions?: string;
  isOpen: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  title = "Capture Photo",
  instructions = "Position your face in the center of the frame",
  isOpen
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      streamRef.current = stream;
      setHasPermission(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permission and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setHasPermission(null);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob and call onCapture
    canvas.toBlob((blob) => {
      if (blob) {
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        const imageFile = new File([blob], 'attendance-photo.jpg', { type: 'image/jpeg' });
        onCapture(imageData, imageFile);
        stopCamera();
        onClose();
      }
    }, 'image/jpeg', 0.8);
  }, [onCapture, onClose, stopCamera]);

  // Handle retry
  const handleRetry = useCallback(() => {
    stopCamera();
    startCamera();
  }, [startCamera, stopCamera]);

  // Start camera when component opens
  useEffect(() => {
    if (isOpen && !streamRef.current) {
      startCamera();
    }
    
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle component cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 mb-4 text-center">{instructions}</p>

        {/* Camera View */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
          {isLoading && (
            <div className="aspect-video flex items-center justify-center">
              <div className="text-white text-center">
                <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Starting camera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center text-white p-4">
                <CameraIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-3">{error}</p>
                <button
                  onClick={handleRetry}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {hasPermission && !error && !isLoading && (
            <div className="aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white border-dashed rounded-full opacity-50"></div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Actions */}
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={capturePhoto}
            disabled={!hasPermission || !!error || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Capture
          </button>
        </div>

        {/* Browser compatibility note */}
        {!navigator.mediaDevices && (
          <p className="text-xs text-gray-500 text-center mt-3">
            Camera capture requires HTTPS or localhost
          </p>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
