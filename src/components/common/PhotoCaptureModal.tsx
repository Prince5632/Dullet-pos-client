import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  CameraIcon, 
  XMarkIcon, 
  ArrowPathIcon, 
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string, imageFile: File) => void;
  title?: string;
  instructions?: string;
}

interface CameraInfo {
  deviceId: string;
  label: string;
  facing: 'front' | 'back';
}

const STABLE_ON_MS = 400;
const STABLE_OFF_MS = 400;

const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Photo',
  instructions = 'Position the subject in the center of the frame and click capture'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>('');
  const [currentCameraFacing, setCurrentCameraFacing] = useState<'front' | 'back' | 'unknown'>('back');
  
  // Stabilized playback indicators
  const [stablePlaying, setStablePlaying] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Prevent double start
  const startedRef = useRef(false);
  
  // Debounce timers
  const onTimerRef = useRef<number | null>(null);
  const offTimerRef = useRef<number | null>(null);
  
  // Event listeners cleanup refs
  const cleanupRefs = useRef<(() => void)[]>([]);

  const clearTimers = () => {
    if (onTimerRef.current !== null) {
      window.clearTimeout(onTimerRef.current);
      onTimerRef.current = null;
    }
    if (offTimerRef.current !== null) {
      window.clearTimeout(offTimerRef.current);
      offTimerRef.current = null;
    }
  };

  const markPlayingDebounced = () => {
    if (offTimerRef.current !== null) {
      window.clearTimeout(offTimerRef.current);
      offTimerRef.current = null;
    }
    if (onTimerRef.current === null) {
      onTimerRef.current = window.setTimeout(() => {
        setStablePlaying(true);
        setReconnecting(false);
        onTimerRef.current = null;
      }, STABLE_ON_MS);
    }
  };

  const markReconnectingDebounced = () => {
    if (onTimerRef.current !== null) {
      window.clearTimeout(onTimerRef.current);
      onTimerRef.current = null;
    }
    if (offTimerRef.current === null) {
      offTimerRef.current = window.setTimeout(() => {
        setStablePlaying(false);
        setReconnecting(true);
        offTimerRef.current = null;
      }, STABLE_OFF_MS);
    }
  };

  // Detect available cameras
  const detectCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        // Even if no cameras detected, we can still try facingMode switching
        setAvailableCameras([]);
        setCurrentCameraFacing('back'); // Default to back camera
        setCurrentCameraId('');
        return;
      }

      const cameras: CameraInfo[] = videoDevices.map((device, index) => {
        const label = device.label.toLowerCase();
        let facing: 'front' | 'back' = 'back';
        
        // Enhanced detection logic
        if (label.includes('front') || label.includes('user') || label.includes('selfie') || 
            label.includes('facetime') || label.includes('internal')) {
          facing = 'front';
        } else if (label.includes('back') || label.includes('rear') || label.includes('environment') ||
                   label.includes('main') || label.includes('primary')) {
          facing = 'back';
        } else {
          // Default assumption: first camera is usually front, second is back
          facing = index === 0 ? 'front' : 'back';
        }
        
        return {
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          facing
        };
      });
      
      setAvailableCameras(cameras);
      
      // Set default camera (prefer back camera)
      const backCamera = cameras.find(cam => cam.facing === 'back');
      const defaultCamera = backCamera || cameras[0];
      
      if (defaultCamera) {
        setCurrentCameraId(defaultCamera.deviceId);
        setCurrentCameraFacing(defaultCamera.facing);
      } else {
        // Fallback to facingMode if no specific cameras detected
        setCurrentCameraFacing('back');
        setCurrentCameraId('');
      }
      
    } catch (err) {
      console.error('Error detecting cameras:', err);
      // Even on error, allow facingMode switching
      setAvailableCameras([]);
      setCurrentCameraFacing('back');
      setCurrentCameraId('');
    }
  }, []);

  // Request camera permission
  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API not supported in this browser. Please use Chrome, Firefox, or Edge.');
      setHasPermission(false);
      return false;
    }

    setPermissionRequested(true);
    setIsLoading(true);
    setError('');

    try {
      // Request permission with basic constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setIsLoading(false);
      
      // Detect cameras after permission is granted
      await detectCameras();
      return true;
    } catch (err: any) {
      console.error('Permission request error:', err);
      setHasPermission(false);
      
      if (err?.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permission in your browser settings and try again.');
      } else if (err?.name === 'NotFoundError') {
        setError('No camera detected. Please connect a camera and try again.');
      } else if (err?.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other apps using the camera and try again.');
      } else {
        setError('Unable to access camera. Please check your camera settings and try again.');
      }
      
      setIsLoading(false);
      return false;
    }
  }, [detectCameras]);

  // Start camera with specific device
  const startCamera = useCallback(async (deviceId?: string) => {
    if (startedRef.current) return;
    startedRef.current = true;

    setIsLoading(true);
    setError('');
    setStablePlaying(false);
    setReconnecting(false);

    try {
      let videoConstraints: MediaTrackConstraints = {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 30 }
      };

      // If no specific device, use facing mode
      if (!deviceId) {
        videoConstraints = {
          ...videoConstraints,
          facingMode: currentCameraFacing === 'front' ? 'user' : 'environment'
        };
      }

      const constraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Attach stream to video element immediately
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');

        try {
          await video.play();
          setIsLoading(false);
          setError('');
          markPlayingDebounced();
        } catch (playErr) {
          console.warn('Video play error:', playErr);
          setIsLoading(false);
          markReconnectingDebounced();
        }
      }
      
    } catch (err: any) {
      console.error('Camera start error:', err);
      setStablePlaying(false);
      setReconnecting(false);
      
      if (err?.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow permission and try again.');
        setHasPermission(false);
      } else if (err?.name === 'NotFoundError') {
        setError('Selected camera not found. Please try a different camera.');
      } else if (err?.name === 'NotReadableError') {
        setError('Camera is busy. Please close other apps using the camera.');
      } else {
        setError('Unable to start camera. Please try again.');
      }
      
      setIsLoading(false);
      startedRef.current = false;
    }
  }, [currentCameraFacing]);

  // Stop camera
  const stopCamera = useCallback(() => {
    // Cleanup event listeners
    cleanupRefs.current.forEach(fn => {
      try { fn(); } catch {}
    });
    cleanupRefs.current = [];

    clearTimers();
    setStablePlaying(false);
    setReconnecting(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      const video = videoRef.current;
      try { video.pause(); } catch {}
      video.srcObject = null;
    }
    
    setIsLoading(false);
    startedRef.current = false;
  }, []);

  // Attach stream to video element
  const attachStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');

    const onLoaded = async () => {
      try {
        await video.play();
        setIsLoading(false);
        setError('');
        markPlayingDebounced();
      } catch (playErr) {
        console.warn('Video play error:', playErr);
        setIsLoading(false);
        markReconnectingDebounced();
      }
    };

    const onPlaying = () => markPlayingDebounced();
    const onWaiting = () => markReconnectingDebounced();
    const onStalled = () => markReconnectingDebounced();
    const onEnded = () => markReconnectingDebounced();
    const onError = () => markReconnectingDebounced();

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('stalled', onStalled);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    
    cleanupRefs.current.push(() => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('stalled', onStalled);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    });
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (availableCameras.length > 1) {
      // If we have multiple cameras detected, switch between them
      const currentIndex = availableCameras.findIndex(cam => cam.deviceId === currentCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCamera = availableCameras[nextIndex];
      
      setCurrentCameraId(nextCamera.deviceId);
      setCurrentCameraFacing(nextCamera.facing);
      
      stopCamera();
      startedRef.current = false;
    } else {
      // Fallback: Try to switch using facingMode (useful on mobile)
      const newFacing = currentCameraFacing === 'front' ? 'back' : 'front';
      setCurrentCameraFacing(newFacing);
      setCurrentCameraId(''); // Clear specific device ID to use facingMode
      
      stopCamera();
      startedRef.current = false;
      
      // Try to start with the new facing mode
      try {
        setIsLoading(true);
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: newFacing === 'front' ? 'user' : 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        // Attach stream to video element immediately
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');

          try {
            await video.play();
            setIsLoading(false);
            setError('');
            markPlayingDebounced();
          } catch (playErr) {
            console.warn('Video play error:', playErr);
            setIsLoading(false);
            markReconnectingDebounced();
          }
        }
      } catch (err: any) {
        console.error('Camera switch error:', err);
        setError(`Unable to switch to ${newFacing} camera. This device may only have one camera.`);
        setIsLoading(false);
        // Revert to original facing
        setCurrentCameraFacing(currentCameraFacing === 'front' ? 'back' : 'front');
      }
    }
  }, [availableCameras, currentCameraId, currentCameraFacing, stopCamera, markPlayingDebounced, markReconnectingDebounced]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera is not ready. Please wait and try again.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setError('Unable to process image. Please try again.');
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw the video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);
    
    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Failed to capture photo. Please try again.');
        return;
      }
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      const imageFile = new File([blob], `photo-${Date.now()}.jpg`, { 
        type: 'image/jpeg' 
      });
      
      onCapture(imageData, imageFile);
      handleClose();
    }, 'image/jpeg', 0.9);
  }, [onCapture]);

  // Handle modal close
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Initialize when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    const initialize = async () => {
      if (hasPermission === null) {
        await requestPermission();
      } else if (hasPermission) {
        await detectCameras();
      }
    };
    
    initialize();
    
    return () => {
      stopCamera();
    };
  }, [isOpen, hasPermission, requestPermission, detectCameras, stopCamera]);

  // Start camera when camera ID changes
  useEffect(() => {
    if (hasPermission && currentCameraId && isOpen) {
      startCamera(currentCameraId);
    }
  }, [hasPermission, currentCameraId, isOpen, startCamera]);

  // Note: Stream attachment is now handled directly in startCamera function

  if (!isOpen) return null;

  const showOverlay = isLoading || !!error || reconnecting || !stablePlaying || hasPermission === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
            {availableCameras.length > 1 && hasPermission && (
              <button
                onClick={switchCamera}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                title={`Switch to ${availableCameras.find(cam => cam.deviceId !== currentCameraId)?.facing || 'other'} camera`}
              >
                <ArrowUturnLeftIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 mb-4 text-center">{instructions}</p>

        {/* Camera Info and Controls */}
        {hasPermission && (
          <div className="mb-4 text-center space-y-3">
            {availableCameras.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                <CheckCircleIcon className="h-4 w-4" />
                <span>
                  Using {availableCameras.find(cam => cam.deviceId === currentCameraId)?.facing || 'unknown'} camera
                  {availableCameras.length > 1 && ` (${availableCameras.length} available)`}
                </span>
              </div>
            )}
            
            {/* Camera Switch Button - Always show if we have permission */}
            <div className="flex justify-center gap-2">
              <button
                onClick={switchCamera}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                title={availableCameras.length > 1 ? `Switch to ${availableCameras.find(cam => cam.deviceId !== currentCameraId)?.facing || 'other'} camera` : `Switch to ${currentCameraFacing === 'front' ? 'back' : 'front'} camera`}
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                Switch Camera
                {availableCameras.length > 1 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {availableCameras.length}
                  </span>
                )}
              </button>
              
              {/* Try to detect more cameras button */}
              <button
                onClick={async () => {
                  setIsLoading(true);
                  await detectCameras();
                  setIsLoading(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                title="Refresh camera list"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Camera Preview */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-6">
          <div className="aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                {hasPermission === false ? (
                  <div className="text-center text-white p-6">
                    <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                    <h3 className="text-lg font-medium mb-2">Camera Permission Required</h3>
                    <p className="text-sm mb-4 opacity-90">
                      {error || 'We need access to your camera to capture photos.'}
                    </p>
                    {!permissionRequested ? (
                      <button
                        onClick={requestPermission}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Allow Camera Access
                      </button>
                    ) : (
                      <button
                        onClick={requestPermission}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                ) : isLoading ? (
                  <div className="text-white text-center">
                    <ArrowPathIcon className="h-12 w-12 animate-spin mx-auto mb-3" />
                    <p className="text-lg">Starting camera...</p>
                  </div>
                ) : error ? (
                  <div className="text-center text-white p-6">
                    <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-3 text-red-400" />
                    <p className="text-sm mb-4">{error}</p>
                    <button
                      onClick={() => {
                        stopCamera();
                        startedRef.current = false;
                        startCamera(currentCameraId);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : reconnecting ? (
                  <div className="text-white text-center">
                    <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Reconnecting to camera...</p>
                  </div>
                ) : (
                  <div className="text-white text-center">
                    <CameraIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Preparing camera...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={capturePhoto}
            disabled={!stablePlaying || hasPermission === false}
            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <CameraIcon className="h-5 w-5" />
            Capture Photo
          </button>
        </div>

        {/* Browser compatibility note */}
        {!navigator.mediaDevices && (
          <p className="text-xs text-gray-500 text-center mt-4">
            Camera capture requires HTTPS or localhost. Please ensure you're using a secure connection.
          </p>
        )}
      </div>
    </div>
  );
};

export default PhotoCaptureModal;