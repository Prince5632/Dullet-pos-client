import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  PencilIcon as EditIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon as AlertCircleIcon,
} from "@heroicons/react/24/outline";
import orderService from "../../services/orderService";
import LoadingSpinner from "../../components/common/LoadingSpinner";

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
    creditLimit: number;
    creditDays: number;
    outstandingAmount: number;
    isActive: boolean;
    customerType: string;
    lastOrderDate: string;
    totalOrders: number;
    totalOrderValue: number;
    customerId: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  };
  items: any[];
  subtotal: number;
  discount: number;
  discountPercentage: number;
  taxAmount: number;
  totalAmount: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
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
  capturedImage: string;
}

const VisitDetailsPage: React.FC = () => {
  // Local date/time formatting functions
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatFullAddress = (address: any) => {
    if (!address) return "N/A";
    const parts = [
      address.street,
      address.city,
      address.state,
      address.pincode,
      address.country,
    ];
    return parts.filter(Boolean).join(", ");
  };
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setVisit(response);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load visit details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: ClockIcon },
      in_progress: { color: "bg-purple-100 text-purple-800", icon: ClockIcon },
      completed: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircleIcon,
      },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircleIcon },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3" />
        {status?.charAt(0)?.toUpperCase() + status?.slice(1)?.replace("_", " ")}
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
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircleIcon className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-gray-800">Visit not found</div>
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
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Orders
          </button>
          <div>
            <h1 className="text-2xl font-bold">Visit Details</h1>
            {/* <p className="text-gray-600">Visit ID: {visit._id}</p> */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(visit.status)}
          <button
            onClick={() => navigate(`/orders/visits/${visit._id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <EditIcon className="w-4 h-4" />
            Edit Visit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Customer Information
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600">
                    {visit.customer?.businessName?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">
                    {visit.customer?.businessName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Contact: {visit.customer?.contactPersonName}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <PhoneIcon className="w-4 h-4" />
                      {visit?.customer?.phone}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {visit?.customer?.address?.city},{" "}
                      {visit?.customer?.address?.state}
                    </div>
                  </div>
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
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Scheduled Date
                  </label>
                  <p className="text-lg">{formatDate(visit.scheduleDate)}</p>
                </div>
                {/* <div>
                  <label className="text-sm font-medium text-gray-600">
                    Scheduled Time
                  </label>
                  <p className="text-lg">{formatDateTime(visit.scheduleDate)}</p>
                </div> */}
              </div>
              {/* <div>
                <label className="text-sm font-medium text-gray-600">
                  Priority
                </label>
                <p className="text-lg capitalize">{visit.priority}</p>
              </div> */}
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
            <div className="px-6 py-4">
              <p className="text-gray-800">
                {formatFullAddress(visit.customer?.address)}
              </p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Customer Type: {visit.customer?.customerType}</p>
                <p>Customer ID: {visit.customer?.customerId}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {visit.notes && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Notes</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {visit.notes}
                </p>
              </div>
            </div>
          )}

          {/* Captured Image */}
          {visit.capturedImage && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CameraIcon className="w-5 h-5" />
                  Captured Image
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="max-w-md">
                  <img
  src={`data:image/jpeg;base64,${visit.capturedImage}`}
  alt="Captured visit image"
  className="w-full rounded-lg object-cover hover:scale-105 transition-transform cursor-pointer"
  onClick={() =>
    window.open(`data:image/jpeg;base64,${visit.capturedImage}`, "_blank")
  }
/>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Visit Summary */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Visit Summary</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* <div>
                <label className="text-sm font-medium text-gray-600">
                  Visit ID
                </label>
                <p className="font-mono text-sm">{visit._id}</p>
              </div> */}
              {/* <div className="border-t border-gray-200"></div> */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <div className="mt-1">{getStatusBadge(visit.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Type
                </label>
                <p className="capitalize">{visit.type}</p>
              </div>
              {/* <div className="border-t border-gray-200"></div> */}
              {/* <div>
                <label className="text-sm font-medium text-gray-600">
                  Total Amount
                </label>
                <p className="text-lg font-semibold">₹{visit.totalAmount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Paid Amount
                </label>
                <p>₹{visit.paidAmount}</p>
              </div> */}
              <div className="border-t border-gray-200"></div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Created By
                </label>
                <p>
                  {visit.createdBy.firstName} {visit.createdBy.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Customer Stats
                </label>
                <p className="text-sm">
                  Total Orders: {visit.customer?.totalOrders}
                </p>
                <p className="text-sm">
                  Total Value: ₹{visit.customer?.totalOrderValue}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitDetailsPage;
