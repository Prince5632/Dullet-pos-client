import React, { useState, useRef, useCallback } from 'react';
import { 
  MapPinIcon, 
  CurrencyRupeeIcon,
  UserIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import SignaturePad, { type SignaturePadRef } from '../ui/SignaturePad';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types';
import { toast } from 'react-hot-toast';
import { getDeliverySummaryPdfBlob, downloadDeliverySummaryPdf } from '../../utils/pdf';

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
  onOrderUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [orderForShare, setOrderForShare] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    notes: '',
    amountCollected: order.remainingAmount || order.totalAmount || 0,
    settlementNotes: '',
    location: {
      address: ''
    }
  });
  const [driverSignature, setDriverSignature] = useState('');
  const [receiverSignature, setReceiverSignature] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{latitude: number, longitude: number} | null>(null);

  const driverSignatureRef = useRef<SignaturePadRef>(null);
  const receiverSignatureRef = useRef<SignaturePadRef>(null);

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith('location.')) {
      const locationField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
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
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      setCoordinates({ latitude, longitude });

      // Reverse geocoding to get address using Nominatim (free service)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Dullet-POS-App'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            handleInputChange('location.address', data.display_name);
            toast.success('Location fetched successfully');
          } else {
            // Fallback to coordinates if no address found
            const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            handleInputChange('location.address', coordsAddress);
            toast.success('Location coordinates fetched');
          }
        } else {
          // Fallback to coordinates if geocoding fails
          const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          handleInputChange('location.address', coordsAddress);
          toast.success('Location coordinates fetched');
        }
      } catch (geocodingError) {
        // Fallback to coordinates if geocoding fails
        const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        handleInputChange('location.address', coordsAddress);
        toast.success('Location coordinates fetched');
      }
    } catch (error) {
      let errorMessage = 'Failed to get location';
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const validateCurrentStep = () => {
    switch (activeStep) {
      case 1:
        return formData.amountCollected >= 0;
      case 2:
        return !!driverSignature || (driverSignatureRef.current && !driverSignatureRef.current.isEmpty());
      case 3:
        return !!receiverSignature || (receiverSignatureRef.current && !receiverSignatureRef.current.isEmpty());
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast.error('Please complete all required fields');
      return;
    }

    const driverSigToSend = driverSignature || driverSignatureRef.current?.getSignature() || '';
    const receiverSigToSend = receiverSignature || receiverSignatureRef.current?.getSignature() || '';

    console.log('Driver signature:', driverSigToSend ? `${driverSigToSend.substring(0, 30)}...` : 'EMPTY');
    console.log('Receiver signature:', receiverSigToSend ? `${receiverSigToSend.substring(0, 30)}...` : 'EMPTY');

    if (!driverSigToSend || !receiverSigToSend) {
      toast.error('Both driver and receiver signatures are required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        notes: formData.notes,
        location: formData.location.address ? {
          address: formData.location.address,
          latitude: coordinates?.latitude || 0,
          longitude: coordinates?.longitude || 0
        } : undefined,
        signatures: {
          driver: driverSigToSend,
          receiver: receiverSigToSend
        },
        settlement: {
          amountCollected: formData.amountCollected,
          notes: formData.settlementNotes
        }
      };

      const updatedOrder = await orderService.recordDelivery(order._id, payload);
      toast.success('Delivery recorded successfully');
      // Keep a copy with ensured signatures for PDF generation
      const mergedForPdf: Order = {
        ...updatedOrder,
        signatures: {
          ...updatedOrder.signatures,
          driver: driverSigToSend,
          receiver: receiverSigToSend
        },
        driverAssignment: {
          ...updatedOrder.driverAssignment,
          deliveryLocation: updatedOrder.driverAssignment?.deliveryLocation || (payload.location ? {
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
            address: payload.location.address
          } : undefined)
        }
      } as Order;
      onOrderUpdate(updatedOrder);
      setOrderForShare(mergedForPdf);
      console.log('Order for share prepared:', { orderNumber: mergedForPdf.orderNumber, customer: mergedForPdf.customer?.businessName });
      // Try native share automatically; fall back to prompt if not supported or fails
      try {
        console.log('Attempting native share...');
        const didShare = await tryNativeShare(mergedForPdf);
        console.log('Native share result:', didShare);
        if (didShare) {
          resetForm();
          onClose();
        } else {
          console.log('Showing share prompt...');
          setShowSharePrompt(true);
        }
      } catch (err) {
        console.log('Native share failed or cancelled:', err);
        setShowSharePrompt(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record delivery';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActiveStep(1);
    setFormData({
      notes: '',
      amountCollected: order.remainingAmount || order.totalAmount || 0,
      settlementNotes: '',
      location: { address: '' }
    });
    driverSignatureRef.current?.clear();
    receiverSignatureRef.current?.clear();
    setDriverSignature('');
    setReceiverSignature('');
    setLocationLoading(false);
    setCoordinates(null);
    setShowSharePrompt(false);
    setOrderForShare(null);
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
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-400'
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-0.5 ${
                step < activeStep ? 'bg-blue-600' : 'bg-gray-300'
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
            <p className="font-medium">₹{order.totalAmount?.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-600">Payment Terms:</span>
            <p className="font-medium">{order.paymentTerms}</p>
          </div>
        </div>
      </div>

      {/* Amount Collection */}
      <div>
        <label htmlFor="amount-collected" className="block text-sm font-medium text-gray-700 mb-2">
          Amount Collected <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CurrencyRupeeIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="amount-collected"
            type="number"
            min="0"
            max={order.totalAmount}
            value={formData.amountCollected}
            onChange={(e) => handleInputChange('amountCollected', parseFloat(e.target.value) || 0)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Maximum: ₹{order.totalAmount?.toLocaleString()}
        </p>
      </div>

      {/* Settlement Notes */}
      <div>
        <label htmlFor="settlement-notes" className="block text-sm font-medium text-gray-700 mb-2">
          Settlement Notes
        </label>
        <textarea
          id="settlement-notes"
          rows={3}
          value={formData.settlementNotes}
          onChange={(e) => handleInputChange('settlementNotes', e.target.value)}
          placeholder="Payment method, partial payment details, etc..."
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Delivery Location */}
      <div>
        <label htmlFor="delivery-location" className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Location
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
              placeholder="Click 'Fetch Location' to get current location"
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
                <span>Fetch Location</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Your current location will be automatically detected and filled
        </p>
      </div>

      {/* General Notes */}
      <div>
        <label htmlFor="delivery-notes" className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Notes
        </label>
        <textarea
          id="delivery-notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
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
            style={{ touchAction: 'none', userSelect: 'none' }}
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
            style={{ touchAction: 'none', userSelect: 'none' }}
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

  const generatePdfFile = async (ord: Order) => {
    const blob = await getDeliverySummaryPdfBlob(ord, {
      companyName: 'Dullet Industries',
      companyAddressLines: [
        `${ord.customer?.address?.street || ''}`,
        `${ord.customer?.address?.city || ''}, ${ord.customer?.address?.state || 'Punjab'}`
      ],
      watermarkText: 'DELIVERED'
    });
    const fileName = `delivery_${ord.orderNumber || ord._id}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });
    return { blob, file, fileName };
  };

  const tryNativeShare = async (ord: Order): Promise<boolean> => {
    try {
      const { file } = await generatePdfFile(ord);
      const navAny = navigator as any;
      const canShareFiles = typeof navAny.canShare === 'function' && navAny.canShare({ files: [file] });
      const canShare = typeof navAny.share === 'function';
      if (canShare && canShareFiles) {
        await navAny.share({
          files: [file],
          title: `Delivery Summary - ${ord.orderNumber}`,
          text: `Delivery summary for ${ord.customer?.businessName} (Order ${ord.orderNumber}).`
        });
        toast.success('Shared successfully');
        return true;
      }
      return false;
    } catch (error) {
      // User cancelled or share failed
      console.log('Share error:', error);
      return false;
    }
  };

  const buildWhatsappNumber = (raw?: string): string | null => {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits; // already with country code
    if (digits.length === 10) return `91${digits}`; // assume India
    if (digits.length > 0) return digits; // best effort
    return null;
  };

  const handleShareNative = async () => {
    if (!orderForShare) return;
    try {
      setLoading(true);
      const didShare = await tryNativeShare(orderForShare);
      if (didShare) {
        handleClose();
      } else {
        toast.error('Share not supported on this device');
      }
    } catch {
      toast.error('Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsapp = async () => {
    if (!orderForShare) return;
    try {
      setLoading(true);
      const { blob, fileName } = await generatePdfFile(orderForShare);
      // Download PDF then open WhatsApp with message
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const phone = buildWhatsappNumber(orderForShare.customer?.phone || orderForShare.customer?.alternatePhone);
      const message = `Delivery summary for Order ${orderForShare.orderNumber} has been downloaded as PDF. Total: ₹${(orderForShare.totalAmount || 0).toLocaleString('en-IN')}.`;
      const waUrl = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      toast.success('PDF downloaded');
      handleClose();
    } catch {
      toast.error('Failed to share on WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleShareEmail = async () => {
    if (!orderForShare) return;
    try {
      setLoading(true);
      // We cannot attach via mailto, but we can prepare the email content
      const subject = encodeURIComponent(`Delivery Summary - ${orderForShare.orderNumber}`);
      const body = encodeURIComponent(
        `Hello,\n\nPlease find the delivery summary for Order ${orderForShare.orderNumber} for ${orderForShare.customer?.businessName}.\nTotal Amount: ₹${(orderForShare.totalAmount || 0).toLocaleString('en-IN')}\n\n(If the PDF is not attached automatically, please attach the downloaded PDF file.)\n\nThank you.\n`
      );
      window.location.href = `mailto:${orderForShare.customer?.email || ''}?subject=${subject}&body=${body}`;
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdfOnly = async () => {
    if (!orderForShare) return;
    try {
      setLoading(true);
      await downloadDeliverySummaryPdf(orderForShare, {
        companyName: 'Dullet Industries',
        companyAddressLines: [
          `${orderForShare.customer?.address?.street || ''}`,
          `${orderForShare.customer?.address?.city || ''}, ${orderForShare.customer?.address?.state || 'Punjab'}`
        ],
        watermarkText: 'DELIVERED'
      });
      toast.success('PDF downloaded');
      handleClose();
    } catch (e) {
      toast.error('Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!orderForShare) return;
    try {
      setLoading(true);
      const { blob } = await generatePdfFile(orderForShare);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={showSharePrompt ? "Share Delivery Summary" : "Record Delivery"}
      size="xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        {!showSharePrompt && renderStepIndicator()}

        {/* Step Content / Share Prompt */}
        <div className="min-h-[400px]">
          {!showSharePrompt ? (
            <>
              {activeStep === 1 && renderStep1()}
              {activeStep === 2 && renderStep2()}
              {activeStep === 3 && renderStep3()}
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Send Delivery Summary</h3>
              <p className="text-sm text-gray-600">
                Share or export the delivery summary using any of the options below.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-500">Order</div>
                    <div className="font-medium">{orderForShare?.orderNumber}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Customer</div>
                    <div className="font-medium">{orderForShare?.customer?.businessName}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total</div>
                    <div className="font-medium">₹{orderForShare?.totalAmount?.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Phone</div>
                    <div className="font-medium">{orderForShare?.customer?.phone}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleShareNative}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {loading ? 'Preparing...' : 'Share...'}
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsapp}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleShareEmail}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdfOnly}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 disabled:opacity-50"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
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
            {!showSharePrompt ? (
              <>
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
                      'Complete Delivery'
                    )}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleShareWhatsapp}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Preparing...' : 'Send on WhatsApp'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdfOnly}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DeliveryRecordingModal;