import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ArrowLeftIcon,
  BookmarkIcon as SaveIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CameraIcon,
  ExclamationCircleIcon as AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import orderService from '../../services/orderService';
import { formatDate } from '../../utils';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Validation schema
const visitSchema = yup.object({
  scheduledDate: yup.string().required('Scheduled date is required'),
  scheduledTime: yup.string().required('Scheduled time is required'),
  address: yup.string().required('Address is required'),
  status: yup.string().oneOf(['scheduled', 'in_progress', 'completed', 'cancelled']).required('Status is required'),
  visitStatus: yup.string().oneOf(['pending', 'visited', 'not_visited']).required('Visit status is required'),
  notes: yup.string(),
  location: yup.object({
    latitude: yup.number(),
    longitude: yup.number(),
  }),
});

interface VisitFormData {
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  visitStatus: 'pending' | 'visited' | 'not_visited';
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface Visit {
  _id: string;
  orderId: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  visitStatus: 'pending' | 'visited' | 'not_visited';
  notes?: string;
  images?: string[];
  completedAt?: string;
  createdBy: {
    _id: string;
    name: string;
  };
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

  const watchedStatus = watch('status');
  const watchedVisitStatus = watch('visitStatus');

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
      const visitData = response.data;
      setVisit(visitData);

      // Populate form with visit data
      reset({
        scheduledDate: visitData.scheduledDate.split('T')[0], // Format for date input
        scheduledTime: visitData.scheduledTime,
        address: visitData.address,
        status: visitData.status,
        visitStatus: visitData.visitStatus,
        notes: visitData.notes || '',
        location: visitData.location,
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
      await orderService.updateVisit(visitId!, data);
      toast.success('Visit updated successfully');
      navigate(`/orders/visits/${visitId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update visit');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: CalendarIcon },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
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
      <div className="container mx-auto px-4 py-8">
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircleIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
          <p className="text-gray-800">Visit not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/orders/visits/${visitId}`)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Visit
          </button>
          <div>
            <h1 className="text-2xl font-bold">Edit Visit</h1>
            <p className="text-gray-600">Visit ID: {visit._id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(watchedStatus || visit.status)}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information (Read-only) */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Customer Information
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Customer Name</label>
                    <p className="text-lg font-medium">{visit.customerId.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-800">{visit.customerId.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-800">{visit.customerId.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Order ID</label>
                    <p className="font-mono text-sm">{visit.orderId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visit Schedule */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Visit Schedule
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">Scheduled Date</label>
                    <input
                      id="scheduledDate"
                      type="date"
                      {...register('scheduledDate')}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.scheduledDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.scheduledDate && (
                      <p className="text-sm text-red-600">{errors.scheduledDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                    <input
                      id="scheduledTime"
                      type="time"
                      {...register('scheduledTime')}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.scheduledTime ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.scheduledTime && (
                      <p className="text-sm text-red-600">{errors.scheduledTime.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  Location
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    id="address"
                    {...register('address')}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                    rows={3}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">Latitude (Optional)</label>
                    <input
                      id="latitude"
                      type="number"
                      step="any"
                      {...register('location.latitude')}
                      placeholder="e.g., 40.7128"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">Longitude (Optional)</label>
                    <input
                      id="longitude"
                      type="number"
                      step="any"
                      {...register('location.longitude')}
                      placeholder="e.g., -74.0060"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Notes</h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Visit Notes (Optional)</label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    rows={4}
                    placeholder="Add any additional notes about this visit..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Images (Read-only) */}
            {visit.images && visit.images.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CameraIcon className="w-5 h-5" />
                    Visit Images
                  </h3>
                </div>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {visit.images.map((image, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={image}
                          alt={`Visit image ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(image, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Status Management</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Visit Status</label>
                  <div className="relative">
                    <select
                      id="status"
                      value={watchedStatus}
                      onChange={(e) => setValue('status', e.target.value as any)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select status</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.status && (
                    <p className="text-sm text-red-600">{errors.status.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="visitStatus" className="block text-sm font-medium text-gray-700">Visit Outcome</label>
                  <div className="relative">
                    <select
                      id="visitStatus"
                      value={watchedVisitStatus}
                      onChange={(e) => setValue('visitStatus', e.target.value as any)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${errors.visitStatus ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select visit outcome</option>
                      <option value="pending">Pending</option>
                      <option value="visited">Visited</option>
                      <option value="not_visited">Not Visited</option>
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.visitStatus && (
                    <p className="text-sm text-red-600">{errors.visitStatus.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Visit Information */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Visit Information</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Created By</label>
                  <p>{visit.createdBy.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created At</label>
                  <p className="text-sm">{formatDate(visit.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-sm">{formatDate(visit.updatedAt)}</p>
                </div>
                {visit.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Completed At</label>
                    <p className="text-sm">{formatDate(visit.completedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Actions</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <SaveIcon className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => navigate(`/orders/visits/${visitId}`)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditVisitPage;