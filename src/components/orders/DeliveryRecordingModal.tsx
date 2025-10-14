import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPinIcon,
  CurrencyRupeeIcon,
  UserIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import Modal from "../ui/Modal";
import SignaturePad, { type SignaturePadRef } from "../ui/SignaturePad";
import { orderService } from "../../services/orderService";
import type { Order } from "../../types";
import { toast } from "react-hot-toast";

interface DeliveryRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onOrderUpdate: (updatedOrder: Order) => void;
}

const DeliveryRecordingModal: React.FC<DeliveryRecordingModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdate,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [formData, setFormData] = useState({
    notes: "",
    amountCollected: order.paidAmount || 0,
    remainingAmount: 0,
    settlementNotes: "",
    paymentTerms: order.paymentTerms || "Cash",
    location: {
      address: "",
    },
  });
  const [driverSignature, setDriverSignature] = useState("");
  const [receiverSignature, setReceiverSignature] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const driverSignatureRef = useRef<SignaturePadRef>(null);
  const receiverSignatureRef = useRef<SignaturePadRef>(null);
  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith("location.")) {
      const locationField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleNextStep = () => {
    if (activeStep < 3) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  // Handle signature changes with useCallback to prevent rerenders
  const handleDriverSignatureChange = useCallback((signature: string) => {
    setDriverSignature(signature);
  }, []);

  const handleReceiverSignatureChange = useCallback((signature: string) => {
    setReceiverSignature(signature);
  }, []);

  // Fetch current location using geolocation API
  const fetchCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setLocationLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        }
      );

      const { latitude, longitude } = position.coords;
      setCoordinates({ latitude, longitude });

      // Reverse geocoding to get address using Nominatim (free service)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              "User-Agent": "Dullet-POS-App",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            handleInputChange("location.address", data.display_name);
            toast.success("Location fetched successfully");
          } else {
            // Fallback to coordinates if no address found
            const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(
              6
            )}`;
            handleInputChange("location.address", coordsAddress);
            toast.success("Location coordinates fetched");
          }
        } else {
          // Fallback to coordinates if geocoding fails
          const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(
            6
          )}`;
          handleInputChange("location.address", coordsAddress);
          toast.success("Location coordinates fetched");
        }
      } catch (geocodingError) {
        // Fallback to coordinates if geocoding fails
        const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        handleInputChange("location.address", coordsAddress);
        toast.success("Location coordinates fetched");
      }
    } catch (error) {
      let errorMessage = "Failed to get location";

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
      }

      toast.error(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Auto-fetch location when modal opens
  useEffect(() => {
    if (isOpen && !formData.location.address) {
      fetchCurrentLocation();
    }
  }, [isOpen, fetchCurrentLocation, formData.location.address]);

  const validateCurrentStep = () => {
    switch (activeStep) {
      case 1:
        return (
          formData.amountCollected >= 0 &&
          formData.location.address.trim() !== ""
        );
      case 2:
        return (
          !!driverSignature ||
          (driverSignatureRef.current && !driverSignatureRef.current.isEmpty())
        );
      case 3:
        return (
          !!receiverSignature ||
          (receiverSignatureRef.current &&
            !receiverSignatureRef.current.isEmpty())
        );
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast.error("Please complete all required fields");
      return;
    }

    const driverSigToSend =
      driverSignature || driverSignatureRef.current?.getSignature() || "";
    const receiverSigToSend =
      receiverSignature || receiverSignatureRef.current?.getSignature() || "";

    console.log(
      "Driver signature:",
      driverSigToSend ? `${driverSigToSend.substring(0, 30)}...` : "EMPTY"
    );
    console.log(
      "Receiver signature:",
      receiverSigToSend ? `${receiverSigToSend.substring(0, 30)}...` : "EMPTY"
    );

    if (!driverSigToSend || !receiverSigToSend) {
      toast.error("Both driver and receiver signatures are required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        notes: formData.notes,
        paymentTerms: formData.paymentTerms,
        location: formData.location.address
          ? {
              address: formData.location.address,
              latitude: coordinates?.latitude || 0,
              longitude: coordinates?.longitude || 0,
            }
          : undefined,
        signatures: {
          driver: driverSigToSend,
          receiver: receiverSigToSend,
        },
        settlement: {
          amountCollected: formData.remainingAmount,
          notes: formData.settlementNotes,
        },
      };

      const updatedOrder = await orderService.recordDelivery(
        order._id,
        payload
      );
      toast.success("Delivery recorded successfully");

      // Update the order and close the modal
      onOrderUpdate(updatedOrder);
      onClose();

      // Navigate to OrderDetailsPage with flag to open share modal
      navigate(`/orders/${order._id}`, {
        state: { openShareModal: true },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to record delivery";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  const resetForm = () => {
    setActiveStep(1);
    setFormData({
      notes: "",
      amountCollected: order.paidAmount || 0,
      remainingAmount: 0,
      settlementNotes: "",
      paymentTerms: order.paymentTerms || "Cash",
      location: { address: "" },
    });
    driverSignatureRef.current?.clear();
    receiverSignatureRef.current?.clear();
    setDriverSignature("");
    setReceiverSignature("");
    setLocationLoading(false);
    setCoordinates(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step <= activeStep
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-300 text-gray-400"
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-0.5 ${
                step < activeStep ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        <CurrencyRupeeIcon className="h-5 w-5 mr-2 text-green-600" />
        Settlement Details
      </h3>

      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Order Number:</span>
            <p className="font-medium">{order.orderNumber}</p>
          </div>
          <div>
            <span className="text-gray-600">Customer:</span>
            <p className="font-medium">{order.customer?.businessName}</p>
          </div>
          <div>
            <span className="text-gray-600">Total Amount:</span>
            <p className="font-medium">
              ₹{order.totalAmount?.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Already Paid:</span>
            <p className="font-medium text-green-600">
              ₹{(order.paidAmount || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Remaining Amount:</span>
            <p className="font-medium text-orange-600">
              ₹{(order.totalAmount - order.paidAmount || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Original Payment Terms:</span>
            <p className="font-medium">{order.paymentTerms}</p>
          </div>
        </div>
      </div>

      {/* Payment Terms Update */}
      <div>
        <label
          htmlFor="payment-terms"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Payment Terms <span className="text-red-500">*</span>
        </label>
        <select
          id="payment-terms"
          value={formData.paymentTerms}
          onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {orderService.getPaymentTerms().map((term) => (
            <option key={term} value={term}>
              {term}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          You can update the payment terms if needed during delivery
        </p>
      </div>

      {/* Amount Collection */}
      <div>
        <label
          htmlFor="amount-collected"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Amount to Collect (Remaining) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CurrencyRupeeIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="amount-collected"
            min="0"
            max={order.totalAmount - order.paidAmount || 0}
            value={formData.remainingAmount}
            onChange={(e) => {
              let value = e.target.value.toString(); // ensure string

              // 1️⃣ Allow only digits + one optional dot
              if (!/^\d*\.?\d*$/.test(value)) return;

              // 2️⃣ Remove leading zeros but keep one if "0." case
              value = value.replace(/^0+(?=\d)/, "");

              // 3️⃣ Apply max limit check — only after it’s a valid float
              const maxValue = order.totalAmount - order.paidAmount || 0;

              // 🔹 Don't convert early — allow typing like "12."
              const numericValue = parseFloat(value);

              if (!isNaN(numericValue) && numericValue > maxValue) return;

              // ✅ 4️⃣ Pass both numeric and string version
              handleInputChange("remainingAmount", value);
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="0"
            disabled={order.paidAmount === order.totalAmount}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Maximum remaining amount: ₹
          {(
            order.totalAmount - order.paidAmount - formData.remainingAmount || 0
          ).toLocaleString()}
        </p>
        {(order.paidAmount || 0) > 0 && (
          <p className="text-xs text-green-600 mt-1">
            ₹{(order.paidAmount || 0).toLocaleString()} already paid
          </p>
        )}
      </div>

      {/* Settlement Notes */}
      <div>
        <label
          htmlFor="settlement-notes"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Settlement Notes
        </label>
        <textarea
          id="settlement-notes"
          rows={3}
          value={formData.settlementNotes}
          onChange={(e) => handleInputChange("settlementNotes", e.target.value)}
          placeholder="Payment method, partial payment details, etc..."
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Delivery Location */}
      <div>
        <label
          htmlFor="delivery-location"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Delivery Location <span className="text-red-500">*</span>
        </label>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPinIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="delivery-location"
              type="text"
              value={formData.location.address}
              disabled
              placeholder="Location will be fetched automatically..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={fetchCurrentLocation}
            disabled={locationLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {locationLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <MapPinIcon className="h-4 w-4" />
                <span>Refresh Location</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Location is required and will be automatically detected when the modal
          opens
        </p>
      </div>

      {/* General Notes */}
      <div>
        <label
          htmlFor="delivery-notes"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Delivery Notes
        </label>
        <textarea
          id="delivery-notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder="Any additional notes about the delivery..."
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        <TruckIcon className="h-5 w-5 mr-2 text-blue-600" />
        Driver Signature
      </h3>

      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Please provide your signature to confirm the delivery
        </p>

        <div className="flex justify-center">
          <div
            className="touch-none select-none"
            style={{ touchAction: "none", userSelect: "none" }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <SignaturePad
              ref={driverSignatureRef}
              width={400}
              height={200}
              backgroundColor="#ffffff"
              penColor="#000000"
              penWidth={2}
              onChange={handleDriverSignatureChange}
              className="border-2 border-dashed border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Use your finger or stylus to sign above
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        <UserIcon className="h-5 w-5 mr-2 text-green-600" />
        Customer Signature
      </h3>

      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Please ask the customer to sign below to confirm receipt of goods
        </p>

        <div className="flex justify-center">
          <div
            className="touch-none select-none"
            style={{ touchAction: "none", userSelect: "none" }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <SignaturePad
              ref={receiverSignatureRef}
              width={400}
              height={200}
              backgroundColor="#ffffff"
              penColor="#000000"
              penWidth={2}
              onChange={handleReceiverSignatureChange}
              className="border-2 border-dashed border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Customer signature required for delivery confirmation
        </p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Delivery"
      size="xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <div>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            {activeStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!validateCurrentStep()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !validateCurrentStep()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Recording...
                  </>
                ) : (
                  "Complete Delivery"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DeliveryRecordingModal;
