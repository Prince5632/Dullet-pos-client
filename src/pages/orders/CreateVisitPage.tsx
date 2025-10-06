import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  ArrowLeftIcon,
  CameraIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { orderService } from "../../services/orderService";
import CustomerSelector from "../../components/customers/CustomerSelector";
import CameraCapture from "../../components/common/CameraCapture";
import type { Customer } from "../../types";
import { toast } from "react-hot-toast";

const schema = yup.object({
  customer: yup.string().required("Customer is required"),
  scheduleDate: yup.string().required("Visit date is required"),
  notes: yup.string().optional(),
});

interface CreateVisitForm {
  customer: string;
  scheduleDate: string;
  notes?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
}

const CreateVisitPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState<string>("");
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Visit creation flow state
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);
  const [visitCreationStep, setVisitCreationStep] = useState<'idle' | 'location' | 'camera' | 'submitting'>('idle');
  const [storedFormData, setStoredFormData] = useState<CreateVisitForm | null>(null);
  const [visitCompleted, setVisitCompleted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateVisitForm>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      // Default visit date to today in YYYY-MM-DD format
      scheduleDate: new Date().toISOString().slice(0, 10),
    },
  });

  const noteSuggestions = [
    "Customer need loose atta.",
    "Owner not available.",
    "Not intrested.",
    "Prices are high."
  ];

  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    try {
      setAddressLoading(true);
      // Using OpenStreetMap Nominatim API for reverse geocoding (free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch address");
      }

      const data = await response.json();
      return (
        data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      );
    } catch (error) {
      console.error("Error getting address:", error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } finally {
      setAddressLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Get address from coordinates
        const address = await getAddressFromCoordinates(latitude, longitude);

        const locationData: LocationData = {
          latitude,
          longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
          address,
        };

        setLocation(locationData);
        setManualAddress(address);
        setLocationLoading(false);
        toast.success("Location and address captured successfully");
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Failed to get location. Please try again.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleCameraCapture = (
    imageData: string | null,
    imageFile: File | null
  ) => {
    if (imageData && imageFile) {
      setCapturedImage(imageFile);
      setImagePreview(imageData);
      toast.success("Photo captured successfully");
      
      // If we're in the visit creation flow, automatically submit the visit
      if (isCreatingVisit && visitCreationStep === 'camera') {
        // Don't close the camera modal here - let submitVisitAfterCapture handle it
        submitVisitAfterCapture(imageFile, storedFormData);
      }
    }
  };

  const handleCameraClose = () => {
    setShowCameraCapture(false);
    
    // If we're in the visit creation flow and it wasn't completed successfully, reset the flow
    if (isCreatingVisit && !visitCompleted) {
      setIsCreatingVisit(false);
      setVisitCreationStep('idle');
      setStoredFormData(null);
    }
    
    // Reset the completion flag
    setVisitCompleted(false);
  };

  const onSubmit = async (data: CreateVisitForm) => {
    // Validate required fields first
    const missingFields = [];
    if (!data.customer) missingFields.push('Customer');
    if (!data.scheduleDate) missingFields.push('Visit Date');
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    // Store form data for use during visit creation flow
    setStoredFormData(data);

    // Start the visit creation flow
    setIsCreatingVisit(true);
    setVisitCreationStep('location');
    setVisitCompleted(false);
    
    try {
      // Step 1: Automatically fetch location
      await fetchLocationAutomatically();
      
      // Step 2: Open camera modal
      setVisitCreationStep('camera');
      setShowCameraCapture(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start visit creation');
      setIsCreatingVisit(false);
      setVisitCreationStep('idle');
      setStoredFormData(null);
    }
  };

  const fetchLocationAutomatically = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      setLocationLoading(true);

      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // Get address from coordinates
            const address = await getAddressFromCoordinates(latitude, longitude);

            const locationData: LocationData = {
              latitude,
              longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now(),
              address,
            };

            setLocation(locationData);
            setManualAddress(address);
            setLocationLoading(false);
            toast.success("Location captured successfully");
            resolve();
          } catch (error) {
            setLocationLoading(false);
            reject(error);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationLoading(false);
          reject(new Error("Failed to get location. Please try again."));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const submitVisitAfterCapture = async (capturedImageFile?: File | null, formData?: CreateVisitForm | null) => {
    try {
      setVisitCreationStep('submitting');
      setLoading(true);

      // Use the passed image file or fall back to state
      const imageToUse = capturedImageFile || capturedImage;

      // Use passed form data or fall back to stored form data
      const dataToUse = formData || storedFormData;

      if (!dataToUse) {
        throw new Error("No form data available for visit creation");
      }

      // Prepare form data for file upload
      const submitFormData = new FormData();
      submitFormData.append("customer", dataToUse.customer || selectedCustomerId);
      submitFormData.append("scheduleDate", dataToUse.scheduleDate || '');
      if (imageToUse) {
        submitFormData.append("capturedImage", imageToUse);
      }
      submitFormData.append("captureLocation", JSON.stringify(location));
      if (dataToUse.notes) {
        submitFormData.append("notes", dataToUse.notes);
      }

      // Create visit using orderService
      const result = await orderService.createVisit(submitFormData);
      setVisitCompleted(true);
      setShowCameraCapture(false); // Close camera immediately after success
      toast.success("Visit created successfully!");
      navigate(`/visits`);
    } catch (error) {
      console.error("Failed to create visit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create visit"
      );
      setShowCameraCapture(false); // Close camera on error
    } finally {
      setLoading(false);
      setIsCreatingVisit(false);
      setVisitCreationStep('idle');
      setStoredFormData(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate("/visits")}
              className="inline-flex items-center p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Create Visit
              </h1>
              <p className="hidden sm:block mt-1 text-sm text-gray-600">
                Create a new visit with image and location capture
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-screen-2xl mx-auto">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 sm:space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Customer Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Customer
                </h3>
                <CustomerSelector
                  selectedCustomerId={selectedCustomerId}
                  onCustomerChange={(
                    customerId: string,
                    customer: Customer | null
                  ) => {
                    setSelectedCustomerId(customerId);
                    setSelectedCustomer(customer);
                    setValue("customer", customerId);
                  }}
                  error={errors.customer?.message}
                  required={true}
                />
              </div>

              {/* Visit Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Visit Details
                </h3>

                <div className="space-y-4">
                  {/* Visit Date (hidden by default, defaults to today) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visit Date <span className="text-red-500">*</span>
                    </label>
                    {!showDatePicker && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {watch("scheduleDate") || new Date().toISOString().slice(0, 10)}
                        </span>
                        {/* <button
                          type="button"
                          onClick={() => setShowDatePicker(true)}
                          className="text-sm text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          Change date
                        </button> */}
                      </div>
                    )}
                    {showDatePicker && (
                      <div className="space-y-2">
                        <input
                          type="date"
                          {...register("scheduleDate")}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().slice(0, 10);
                              setValue("scheduleDate", today, { shouldDirty: true });
                              setShowDatePicker(false);
                            }}
                            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                          >
                            Use today
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                    {errors.scheduleDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.scheduleDate.message}
                      </p>
                    )}
                  </div>

                  {/* Notes with quick-pick suggestions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {noteSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const current = watch("notes") || "";
                            const prefix = current ? "\n" : "";
                            const next = `${current}${prefix}${s}`;
                            setValue("notes", next, { shouldDirty: true });
                          }}
                          className="px-3 py-1.5 text-xs sm:text-sm rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <textarea
                      {...register("notes")}
                      rows={3}
                      placeholder="Additional notes about this visit"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>




            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Summary
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Customer</span>
                      <span
                        className={
                          selectedCustomer ? "text-green-600" : "text-gray-400"
                        }
                      >
                        {selectedCustomer ? "✓" : "Required"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Image</span>
                      <span
                        className={
                          capturedImage ? "text-green-600" : "text-gray-400"
                        }
                      >
                        {capturedImage ? "✓" : "Required"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Location</span>
                      <span
                        className={
                          location ? "text-green-600" : "text-gray-400"
                        }
                      >
                        {location ? "✓" : "Required"}
                      </span>
                    </div>
                  </div>

                  {/* Validation Messages */}
                  {(!selectedCustomerId || !watch('scheduleDate')) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Please complete the following:
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <ul className="list-disc pl-5 space-y-1">
                              {!selectedCustomerId && <li>Select a customer</li>}
                              {!watch('scheduleDate') && <li>Set a visit date</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreatingVisit || loading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isCreatingVisit && visitCreationStep === 'location' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Getting Location...
                      </>
                    ) : isCreatingVisit && visitCreationStep === 'camera' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Capture Image...
                      </>
                    ) : loading || (isCreatingVisit && visitCreationStep === 'submitting') ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      "Create Visit"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/visits")}
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCameraCapture}
        onCapture={handleCameraCapture}
        onClose={handleCameraClose}
        title="Capture Visit Image"
        instructions="Position the visit in the center of the frame and capture a clear image"
      />
    </div>
  );
};

export default CreateVisitPage;
