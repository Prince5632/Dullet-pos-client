import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EyeIcon, EyeSlashIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginRequest } from '../../types';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

// Validation schema (identifier: username | email | phone)
const loginSchema = yup.object({
  identifier: yup
    .string()
    .required('Username, email, or phone is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

type LoginFormData = {
  identifier: string;
  password: string;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, isAuthenticated, hasPermission, hasRole } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [faceImagePreview, setFaceImagePreview] = useState<string | null>(null);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      console.log('Already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      clearErrors();

      const loginData: LoginRequest = {
        identifier: data.identifier,
        password: data.password,
        faceImage: faceImage || undefined,
      };

      console.log('[LoginPage] Attempting login...');
      await login(loginData);
      console.log('[LoginPage] Login successful, preparing to navigate...');
      
      // Wait for user data to be available in AuthContext state with timeout
      const waitForUserData = () => {
        return new Promise<void>((resolve, reject) => {
          const timeout = 10000; // 10 second timeout
          const startTime = Date.now();
          let attempts = 0;
          
          const checkUserData = () => {
            attempts++;
            const elapsed = Date.now() - startTime;
            
            console.log(`[LoginPage] Checking user data (attempt ${attempts}, elapsed: ${elapsed}ms)`);
            console.log(`[LoginPage] State - isAuthenticated: ${isAuthenticated}, isLoading: ${isLoading}`);
            
            // Check if timeout exceeded
            if (elapsed > timeout) {
              console.error('[LoginPage] Timeout waiting for user data');
              reject(new Error('Timeout waiting for user authentication data'));
              return;
            }
            
            // Check if user data is available and authentication is complete
            if (isAuthenticated && !isLoading) {
              console.log('[LoginPage] User data is ready for navigation');
              resolve();
              return;
            }
            
            // Check again in 50ms (reduced frequency to avoid excessive polling)
            setTimeout(checkUserData, 50);
          };
          
          checkUserData();
        });
      };

      // Wait for user data to be ready with timeout handling
      try {
        await waitForUserData();
      } catch (timeoutError) {
        console.error('[LoginPage] Failed to wait for user data:', timeoutError);
        // Fallback: try to navigate anyway, the route guard will handle it
        toast.error('Authentication completed but navigation may be delayed. Please wait...');
      }

      // Add a small delay to ensure all state updates are complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Role/permission-based landing using AuthContext functions
      let landing = '/dashboard';
      
      try {
        // Drivers: send to orders (or a dedicated page if exists)
        if (hasRole && hasRole('Driver')) {
          landing = '/orders';
        }
        // Sales executive: send to visits by default if they have access
        else if (hasRole && hasRole('Sales Executive') && hasPermission && hasPermission('orders.read')) {
          landing = '/visits';
        }
        // Admin/Manager: dashboard by default
        else if (hasRole && (hasRole('Super Admin') || hasRole('Admin') || hasRole('Manager'))) {
          landing = '/dashboard';
        }
      } catch (roleError) {
        console.warn('[LoginPage] Error checking roles, using default landing:', roleError);
        // Use default landing if role checking fails
      }
      
      // If a guarded route redirected us here, prefer that
      const from = (location.state as any)?.from?.pathname;
      const destination = from || landing;
      
      console.log('[LoginPage] Navigating to:', destination);
      navigate(destination, { replace: true });
      
    } catch (error: any) {
      // Error is handled by the auth context and displayed via toast
      console.error('[LoginPage] Login error:', error);
    }
  };


  // Start camera for face capture
  const startFaceCapture = async () => {
    try {
      setIsCapturingFace(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please upload an image instead.');
      setIsCapturingFace(false);
    }
  };

  // Capture face image from camera
  const captureFaceImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'face-capture.jpg', { type: 'image/jpeg' });
            setFaceImage(file);
            setFaceImagePreview(canvas.toDataURL());
            stopFaceCapture();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  // Stop camera
  const stopFaceCapture = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturingFace(false);
  };

  // Remove face image
  const removeFaceImage = () => {
    setFaceImage(null);
    setFaceImagePreview(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
        <p className="mt-1 text-sm text-gray-600">Use your work email and password</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Identifier */}
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
            Username / Email / Phone
          </label>
          <input
            {...register('identifier')}
            type="text"
            autoComplete="username"
            className={cn(
              'w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
              'transition-all duration-200 bg-white',
              (errors as any).identifier
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 hover:border-emerald-300'
            )}
            placeholder="Enter username, email or phone"
          />
          {(errors as any).identifier && (
            <p className="mt-1 text-sm text-red-600">{(errors as any).identifier.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={cn(
                'w-full px-4 py-3 pr-12 border rounded-lg shadow-sm placeholder-gray-400 text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                'transition-all duration-200 bg-white',
                errors.password
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 hover:border-emerald-300'
              )}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-emerald-600 transition-colors duration-200"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Face Verification - Required */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Face verification <span className="text-red-500">*</span>
          </label>
          
          {!faceImagePreview && !isCapturingFace && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={startFaceCapture}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <CameraIcon className="h-5 w-5" />
                <span>Start face verification</span>
              </button>
              <p className="text-xs text-gray-500 text-center">For security, capture a quick photo. It’s never shared.</p>
            </div>
          )}

          {/* Camera View */}
          {isCapturingFace && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden shadow">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <div className="absolute inset-0 border-4 border-emerald-400 rounded-lg pointer-events-none" />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={captureFaceImage}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Capture
                </button>
                <button
                  type="button"
                  onClick={stopFaceCapture}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {faceImagePreview && (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={faceImagePreview}
                  alt="Face verification capture"
                  className="w-full h-40 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeFaceImage}
                  className="absolute top-2 right-2 p-2 bg-white text-gray-700 rounded-full shadow hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
                  title="Retake photo"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Face verification is required; no extra warning box to keep UI minimal */}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isLoading || !faceImage}
          className={cn(
            'w-full py-4 px-6 border border-transparent rounded-lg shadow text-base font-medium text-white',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200',
            isSubmitting || isLoading || !faceImage
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500 shadow-emerald-200'
          )}
        >
          {isSubmitting || isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Authenticating...</span>
            </div>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
