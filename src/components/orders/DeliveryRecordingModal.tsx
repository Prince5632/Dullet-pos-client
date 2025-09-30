import React, { useState, useRef, useEffect } from 'react';
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
  const [formData, setFormData] = useState({
    notes: '',
    amountCollected: order.remainingAmount || order.totalAmount || 0,
    settlementNotes: '',
    location: {
      address: ''
    }
  });
  const [driverSigned, setDriverSigned] = useState(false);
  const [receiverSigned, setReceiverSigned] = useState(false);
  const [driverSignature, setDriverSignature] = useState('');
  const [receiverSignature, setReceiverSignature] = useState('');

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

  // Polling fallback to keep "Next" enabled even if onChange doesn't fire on some devices
  useEffect(() => {
    let intervalId: number | undefined;
    if (activeStep === 2) {
      intervalId = window.setInterval(() => {
        if (driverSignatureRef.current && !driverSignatureRef.current.isEmpty()) {
          const sig = driverSignatureRef.current.getSignature();
          setDriverSignature(sig);
          setDriverSigned(true);
        }
      }, 200);
    } else if (activeStep === 3) {
      intervalId = window.setInterval(() => {
        if (receiverSignatureRef.current && !receiverSignatureRef.current.isEmpty()) {
          const sig = receiverSignatureRef.current.getSignature();
          setReceiverSignature(sig);
          setReceiverSigned(true);
        }
      }, 200);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [activeStep]);

  const validateCurrentStep = () => {
    switch (activeStep) {
      case 1:
        return formData.amountCollected >= 0;
      case 2:
        return !!driverSignature || driverSigned;
      case 3:
        return !!receiverSignature || receiverSigned;
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
          latitude: 0, // Can be enhanced with geolocation
          longitude: 0
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
      onOrderUpdate(updatedOrder);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record delivery';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(1);
    setFormData({
      notes: '',
      amountCollected: order.remainingAmount || order.totalAmount || 0,
      settlementNotes: '',
      location: { address: '' }
    });
    driverSignatureRef.current?.clear();
    receiverSignatureRef.current?.clear();
    setDriverSigned(false);
    setReceiverSigned(false);
    setDriverSignature('');
    setReceiverSignature('');
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
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPinIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="delivery-location"
            type="text"
            value={formData.location.address}
            onChange={(e) => handleInputChange('location.address', e.target.value)}
            placeholder="Delivery address or landmark"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
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
          <SignaturePad
            ref={driverSignatureRef}
            width={400}
            height={200}
            backgroundColor="#ffffff"
            penColor="#000000"
            onChange={(data) => {
              setDriverSignature(data);
              setDriverSigned(!!data);
            }}
            className="border-2 border-dashed border-gray-300 rounded-lg"
          />
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
          <SignaturePad
            ref={receiverSignatureRef}
            width={400}
            height={200}
            backgroundColor="#ffffff"
            penColor="#000000"
            onChange={(data) => {
              setReceiverSignature(data);
              setReceiverSigned(!!data);
            }}
            className="border-2 border-dashed border-gray-300 rounded-lg"
          />
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
                  'Complete Delivery'
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