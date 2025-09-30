import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ArrowLeftIcon,
  BookmarkIcon as SaveIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  CameraIcon,
  ExclamationCircleIcon as AlertCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import orderService from '../../services/orderService';
import { formatDate } from '../../utils';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Validation schema - only for editable fields
const visitSchema = yup.object({
  scheduleDate: yup.string().required('Schedule date is required'),
  notes: yup.string().optional(),
  address: yup.string().optional(),
});

interface VisitFormData {
  scheduleDate: string;
  notes?: string;
  address?: string;
}

interface Visit {
  _id: string;
  type: string;
  customer: {
    _id: string;
    businessName: string;
    contactPersonName: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
    customerId: string;
  };
  items: any[];
  subtotal: number;
  discount: number;
  discountPercentage: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  priority: string;
  paidAmount: number;
  deliveryAddress: {
    country: string;
  };
  deliveryInstructions: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  notes: string;
  internalNotes: string;
  scheduleDate: string;
  capturedImage?: string;
  captureLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  };
  orderDate: string;
  settlements: any[];
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
}

const EditVisitPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<VisitFormData>({
    resolver: yupResolver(visitSchema),
  });

  const watchedScheduleDate = watch('scheduleDate');
  const watchedNotes = watch('notes');
  const watchedAddress = watch('address');

  useEffect(() => {
    if (visitId) {
      loadVisit();
    }
  }, [visitId]);

  const loadVisit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getVisitById(visitId!);
      const visitData = response;
      setVisit(visitData);

      // Populate form with visit data
      reset({
        scheduleDate: visitData.scheduleDate ? visitData.scheduleDate.split('T')[0] : '', // Format for date input
        notes: visitData.notes || '',
        address: visitData.captureLocation?.address || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: VisitFormData) => {
    try {
      setSaving(true);
      
      // Prepare the update data
      const updateData = {
        scheduleDate: data.scheduleDate,
        notes: data.notes || '',
        captureLocation: visit?.captureLocation ? {
          ...visit.captureLocation,
          address: data.address || visit.captureLocation.address
        } : undefined
      };

      await orderService.updateVisit(visitId!, updateData);
      toast.success('Visit updated successfully');
      navigate(`/orders/visits/${visitId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update visit');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-screen-2xl mx-auto">
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-screen-2xl mx-auto">
          <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircleIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
            <p className="text-gray-800">Visit not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(`/orders/visits/${visitId}`)}
              className="inline-flex items-center p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Edit Visit
              </h1>
              <p className="hidden sm:block mt-1 text-sm text-gray-600">
                Visit ID: {visit.orderNumber}
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
              {/* Customer Information (Read-only) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business Name</label>
                    <p className="text-lg font-medium">{visit.customer.businessName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact Person</label>
                    <p className="text-gray-800">{visit.customer.contactPersonName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-800">{visit.customer.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Customer ID</label>
                    <p className="font-mono text-sm">{visit.customer.customerId}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-800">
                    {visit.customer.address.street}, {visit.customer.address.city}, {visit.customer.address.state} - {visit.customer.address.pincode}, {visit.customer.address.country}
                  </p>
                </div>
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
                      min={new Date().toISOString().split("T")[0]} // disables past dates
                      className={`w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${errors.scheduleDate ? 'border-red-500' : 'border-gray-300'}`}
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

              {/* Captured Image (Read-only) */}
              {visit.capturedImage && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Captured Image
                  </h3>
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={`data:image/jpeg;base64,${visit.capturedImage}`}
                      alt="Visit capture"
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => {
                        const newWindow = window.open();
                        if (newWindow) {
                          newWindow.document.write(`<img src="data:image/jpeg;base64,${visit.capturedImage}" style="max-width: 100%; height: auto;" />`);
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Location Information */}
              {visit.captureLocation && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Location Information
                  </h3>

                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-800">
                        <MapPinIcon className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">
                          Location Captured
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-green-700">
                        <div>Lat: {visit.captureLocation.latitude.toFixed(6)}</div>
                        <div>Lng: {visit.captureLocation.longitude.toFixed(6)}</div>
                        <div>Captured: {formatDate(visit.captureLocation.timestamp)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <textarea
                        {...register("address")}
                        placeholder="Address information"
                        rows={3}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                      />
                      <p className="text-xs text-gray-500">
                        You can edit the address information if needed
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Visit Information
                </h3>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <p className="capitalize">{visit.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Priority</label>
                      <p className="capitalize">{visit.priority}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created By</label>
                      <p>{visit.createdBy.firstName} {visit.createdBy.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created At</label>
                      <p className="text-sm">{formatDate(visit.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Updated</label>
                      <p className="text-sm">{formatDate(visit.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <SaveIcon className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/orders/visits/${visitId}`)}
                      className="w-full mt-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVisitPage;