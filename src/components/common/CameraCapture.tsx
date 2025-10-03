import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CameraIcon, XMarkIcon, ArrowPathIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

interface CameraCaptureProps {
  onCapture: (imageData: string | null, imageFile: File | null) => void;
  onClose: () => void;
  title?: string;
  instructions?: string;
  isOpen: boolean;
  skipCapture?: boolean; // new flag to skip showing camera
}

const STABLE_ON_MS = 400;   // require 400ms of stable playing before hiding overlays
const STABLE_OFF_MS = 400;  // require 400ms of disruption before showing reconnecting

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  title = 'Capture Photo',
  instructions = 'Position your face in the center of the frame',
  isOpen,
  skipCapture = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [usingFrontCamera, setUsingFrontCamera] = useState(true);

  // Stabilized playback indicators
  const [stablePlaying, setStablePlaying] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Prevent double start (React StrictMode)
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

  useEffect(() => {
    if (isOpen && skipCapture) {
      onCapture(null, null);
      onClose();
    }
  }, [isOpen, skipCapture, onCapture, onClose]);

  const startCamera = useCallback(async () => {
    if (skipCapture) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API not supported in this browser. Please try with Chrome or Edge.');
      setHasPermission(false);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    setIsLoading(true);
    setError('');
    setStablePlaying(false);
    setReconnecting(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: usingFrontCamera ? 'user' : 'environment',
        },
        audio: false,
      });
      streamRef.current = stream;
      setHasPermission(true);
      // continue in effect where stream is attached
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setStablePlaying(false);
      setReconnecting(false);

      if (err?.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow permission and retry.');
      } else if (err?.name === 'NotFoundError') {
        setError('No camera detected. Connect a webcam and try again.');
      } else {
        setError('Unable to start the camera. Please retry.');
      }

      setIsLoading(false);
      startedRef.current = false;
    }
  }, [skipCapture, usingFrontCamera]);

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
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      const v = videoRef.current;
      try { v.pause(); } catch {}
      v.srcObject = null;
    }
    setHasPermission(null);
    setIsLoading(false);
    startedRef.current = false;
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');

    // Try to calm devices prone to fluctuation by constraining the track
    const vTrack = stream.getVideoTracks()[0];
    if (vTrack) {
      try {
        await vTrack.applyConstraints({
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        });
      } catch (e) {
        // OverconstrainedError or not supported; ignore
      }
    }

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

    const onPlaying = () => {
      markPlayingDebounced();
    };
    const onWaiting = () => {
      markReconnectingDebounced();
    };
    const onStalled = () => {
      markReconnectingDebounced();
    };
    const onEnded = () => {
      markReconnectingDebounced();
    };
    const onError = () => {
      markReconnectingDebounced();
    };

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

    if (vTrack) {
      const onTrackMute = () => markReconnectingDebounced();
      const onTrackUnmute = () => markPlayingDebounced();
      const onTrackEnded = () => markReconnectingDebounced();
      vTrack.addEventListener('mute', onTrackMute);
      vTrack.addEventListener('unmute', onTrackUnmute);
      vTrack.addEventListener('ended', onTrackEnded);
      cleanupRefs.current.push(() => {
        vTrack.removeEventListener('mute', onTrackMute);
        vTrack.removeEventListener('unmute', onTrackUnmute);
        vTrack.removeEventListener('ended', onTrackEnded);
      });
    }

    // Visibility handling: pause when hidden, resume when visible
    const onVis = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await video.play();
          markPlayingDebounced();
        } catch {
          markReconnectingDebounced();
        }
      } else {
        try { video.pause(); } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVis);
    cleanupRefs.current.push(() => {
      document.removeEventListener('visibilitychange', onVis);
    });

    // Device changes: restart stream
    const onDeviceChange = () => {
      markReconnectingDebounced();
      handleRetry(); // soft restart
    };
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
      cleanupRefs.current.push(() => {
        navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
      });
    }
  }, []);

  const handleRetry = useCallback(() => {
    stopCamera();
    startCamera();
  }, [startCamera, stopCamera]);

  const toggleCamera = useCallback(() => {
    setUsingFrontCamera((prev) => !prev);
    stopCamera();
    startedRef.current = false;
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Unable to access camera frame. Please retry.');
      return;
    }
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Failed to capture photo. Please retry.');
        return;
      }
      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      const imageFile = new File([blob], 'attendance-photo.jpg', { type: 'image/jpeg' });
      onCapture(imageData, imageFile);
      stopCamera();
      onClose();
    }, 'image/jpeg', 0.85);
  }, [onCapture, onClose, stopCamera]);

  useEffect(() => {
    if (!isOpen) return;
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // When stream changes, attach to video and set up stability handlers
  useEffect(() => {
    if (streamRef.current) {
      attachStream(streamRef.current);
    }
  }, [streamRef.current, attachStream]);

  if (!isOpen) return null;

  const showOverlay = isLoading || !!error || reconnecting || !stablePlaying || !hasPermission;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/20 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
                <button
                  onClick={toggleCamera}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Switch camera"
                >
                  <ArrowUturnLeftIcon className="h-6 w-6" />
                </button>
            <button
              onClick={() => { stopCamera(); onClose(); }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 text-center">{instructions}</p>

        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
          <div className="aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                {isLoading ? (
                  <div className="text-white text-center">
                    <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Starting camera...</p>
                  </div>
                ) : (
                  <div className="text-center text-white p-4">
                    <CameraIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm mb-3">
                      {error || (reconnecting ? 'Reconnecting to camera…' : 'Preparing preview…')}
                    </p>
                    <button
                      onClick={handleRetry}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex justify-center space-x-3">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={capturePhoto}
            disabled={!stablePlaying}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Capture
          </button>
        </div>

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
