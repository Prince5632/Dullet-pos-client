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
  scheduleDate: yup.string().required("Schedule date is required"),
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
  const [showCameraCapture, setShowCameraCapture] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateVisitForm>({
    resolver: yupResolver(schema) as any,
  });

  const getCurrentLocation = () => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        setLocation(locationData);
        setLocationLoading(false);
        toast.success("Location captured successfully");
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

  const handleCameraCapture = (imageData: string | null, imageFile: File | null) => {
    if (imageData && imageFile) {
      setCapturedImage(imageFile);
      setImagePreview(imageData);
      toast.success("Photo captured successfully");
    }
  };

  const handleCameraClose = () => {
    setShowCameraCapture(false);
  };

  const removeImage = () => {
    setCapturedImage(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: CreateVisitForm) => {
    try {
      setLoading(true);

      if (!capturedImage) {
        toast.error("Please capture or select an image");
        return;
      }

      if (!location) {
        toast.error("Please capture location");
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append("customer", data.customer);
      formData.append("scheduleDate", data.scheduleDate);
      formData.append("capturedImage", capturedImage);
      formData.append("captureLocation", JSON.stringify(location));
      if (data.notes) {
        formData.append("notes", data.notes);
      }

      // Create visit using fetch directly since we need to send FormData
      const response = await fetch("/api/orders/visits", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create visit");
      }

      const result = await response.json();
      toast.success("Visit created successfully!");
      navigate(`/orders?view=visits`);
    } catch (error) {
      console.error("Failed to create visit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create visit"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate("/orders")}
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
                  onCustomerChange={(customerId: string, customer: Customer | null) => {
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register("scheduleDate")}
                      
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                    {errors.scheduleDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.scheduleDate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      {...register("notes")}
                      rows={3}
                      placeholder="Additional notes about this visit"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Image Capture */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Image Capture <span className="text-red-500 ml-1">*</span>
                </h3>

                {!imagePreview && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowCameraCapture(true)}
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    >
                      <CameraIcon className="h-5 w-5 mr-2" />
                      Capture Photo
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                      Live camera capture required for visit verification
                    </p>
                  </div>
                )}

                {imagePreview && (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Captured visit image"
                        className="w-full rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeImage();
                        setShowCameraCapture(true);
                      }}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    >
                      <CameraIcon className="h-4 w-4 mr-2" />
                      Retake Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Location Capture */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Location
                </h3>

                {!location && (
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  >
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    {locationLoading
                      ? "Getting Location..."
                      : "Capture Location"}
                  </button>
                )}

                {location && (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-800">
                        <MapPinIcon className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">
                          Location Captured
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-green-700">
                        <div>Lat: {location.latitude.toFixed(6)}</div>
                        <div>Lng: {location.longitude.toFixed(6)}</div>
                        {location.accuracy && (
                          <div>Accuracy: ±{Math.round(location.accuracy)}m</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                    >
                      Update Location
                    </button>
                  </div>
                )}
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

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !selectedCustomer ||
                      !capturedImage ||
                      !location
                    }
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? (
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
                    onClick={() => navigate("/orders")}
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
