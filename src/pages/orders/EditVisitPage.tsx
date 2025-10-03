import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import orderService from "../../services/orderService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { toast } from "react-hot-toast";
import { resolveCapturedImageSrc } from "../../utils/image";

const visitSchema = yup.object().shape({
  scheduleDate: yup.string().required("Schedule date is required"),
  notes: yup.string(),
  address: yup.string(),
});

interface VisitFormData {
  scheduleDate: string;
  notes: string;
  address: string;
}

interface Visit {
  _id: string;
  type: string;
  customer: {
    _id: string;
    businessName: string;
    contactPersonName: string;
    phone: string;
    email?: string;
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
  capturedImage?: string;
  captureLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  };
  orderDate: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
}

const EditVisitPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<VisitFormData>({
    resolver: yupResolver(visitSchema),
  });
  useEffect(() => {
    if (!visitId) {
      setError("Visit ID is required");
      setLoading(false);
      return;
    }
    loadVisit();
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
        scheduleDate: visitData?.scheduleDate
          ? visitData?.scheduleDate?.split("T")[0]
          : "",
        notes: visitData?.notes || "",
        address: visitData?.captureLocation?.address || "",
      });
    } catch (err: any) {
      console.error("Error loading visit:", err);
      setError(
        err?.message ||
          err?.response?.data?.message ||
          "Failed to load visit details"
      );
      toast.error("Failed to load visit details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleViewImage = (imageData: string | undefined, title: string) => {
    if (!imageData) return;

    const formattedSrc = resolveCapturedImageSrc(imageData);
    if (formattedSrc) {
      setSelectedImage(formattedSrc);
      setShowImageModal(true);
    }
  };

  const onSubmit = async (data: VisitFormData) => {
    try {
      setSaving(true);

      // Prepare the update data
      const updateData = {
        scheduleDate: data.scheduleDate,
        notes: data.notes || "",
        captureLocation: visit?.captureLocation
          ? {
              ...visit.captureLocation,
              address: data.address || visit.captureLocation.address,
            }
          : undefined,
      };

      await orderService.updateVisit(visitId!, updateData);
      toast.success("Visit updated successfully");
      navigate(`/orders/visits/${visitId}`);
    } catch (err: any) {
      console.error("Error updating visit:", err);
      toast.error(err?.response?.data?.message || "Failed to update visit");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <BellAlertIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Visit
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "Failed to load visit details"}
          </p>
          <button
            onClick={() => navigate("/visits")}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: ClockIcon },
    in_progress: { color: "bg-blue-100 text-blue-800", icon: ClockIcon },
    completed: { color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
    cancelled: { color: "bg-red-100 text-red-800", icon: XCircleIcon },
  } as const;

  const currentStatusInfo =
    statusInfo[visit.status as keyof typeof statusInfo] || statusInfo.pending;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/visits/${visitId}`)}
              className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Edit {visit?.orderNumber || "Visit"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge
                  className={`${currentStatusInfo.color} text-[10px] px-1.5 py-0.5`}
                >
                  <currentStatusInfo.icon className="h-3 w-3 mr-0.5" />
                  {visit.status.replace("_", " ")}
                </Badge>
                <span className="text-[10px] text-gray-500">
                  {visit.customer?.businessName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 sm:space-y-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Customer Information (Read-only) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <UserIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                    Customer Information
                  </h3>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar
                      name={visit.customer?.businessName || "Customer"}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {visit.customer?.businessName || "N/A"}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {visit.customer?.contactPersonName || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Phone
                      </label>
                      <p className="text-sm text-gray-900">
                        {visit.customer?.phone || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Customer ID
                      </label>
                      <p className="text-sm font-mono text-gray-900">
                        {visit.customer?.customerId || "N/A"}
                      </p>
                    </div>
                    {visit.customer?.location && (
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Location
                        </label>
                        <p className="text-sm">
                          <a
                            href={visit.customer.location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View on Google Maps
                          </a>
                        </p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Address
                      </label>
                      <p className="text-sm text-gray-900">
                        {visit.customer?.address
                          ? [
                              visit.customer.address.street,
                              `${visit.customer.address.city}, ${visit.customer.address.state}`,
                              visit.customer.address.pincode,
                              visit.customer.address.country,
                            ]
                              .filter(Boolean)
                              .join(", ")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Details Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                    Visit Details
                  </h3>
                </div>
                <div className="p-3 sm:p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Schedule Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register("scheduleDate")}
                      min={new Date().toISOString().split("T")[0]}
                      className={`w-full px-3 py-2 text-sm border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.scheduleDate
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.scheduleDate && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.scheduleDate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Notes
                    </label>
                    <textarea
                      {...register("notes")}
                      rows={3}
                      placeholder="Additional notes about this visit"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Captured Image (Read-only) */}
              {visit.capturedImage && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                      <CameraIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                      Captured Image
                    </h3>
                  </div>
                  <div className="p-3 sm:p-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleViewImage(visit.capturedImage, "Visit Image")
                      }
                      className="inline-flex cursor-pointer items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <CameraIcon className="h-4 w-4 mr-2" />
                      View Image
                    </button>
                  </div>
                </div>
              )}

              {/* Location Information */}
              {visit.captureLocation && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                      Location Information
                    </h3>
                  </div>
                  <div className="p-3 sm:p-4 space-y-4">
                    {/* <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-800 mb-2">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        <span className="text-xs font-medium">
                          Location Captured
                        </span>
                      </div>
                      <div className="text-[10px] text-green-700 space-y-0.5">
                        <div>
                          Lat: {visit.captureLocation.latitude.toFixed(6)}
                        </div>
                        <div>
                          Lng: {visit.captureLocation.longitude.toFixed(6)}
                        </div>
                        <div>
                          Captured:{" "}
                          {formatDate(visit.captureLocation.timestamp)}
                        </div>
                      </div>
                    </div> */}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Address
                      </label>
                      <textarea
                        {...register("address")}
                        placeholder="Address information"
                        rows={3}
                        disabled={true}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      />
                      <p className="mt-1 text-[10px] text-gray-500">
                        You can edit the address information if needed
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-3 sm:space-y-4">
              {/* Visit Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-20">
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Visit Summary
                  </h3>
                </div>
                <div className="p-3 sm:p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Status</span>
                    <Badge
                      className={`${currentStatusInfo.color} text-[10px] px-1.5 py-0.5`}
                    >
                      <currentStatusInfo.icon className="h-3 w-3 mr-0.5" />
                      {visit.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Priority</span>
                    <span className="text-xs font-medium text-gray-900 capitalize">
                      {visit.priority || "Normal"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Created By</span>
                    <span className="text-xs text-gray-900">
                      {visit.createdBy?.firstName} {visit.createdBy?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Created</span>
                    <span className="text-xs text-gray-900">
                      {formatDate(visit.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Updated</span>
                    <span className="text-xs text-gray-900">
                      {formatDate(visit.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-4 border-t border-gray-200 space-y-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>Save Changes</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/visits/${visitId}`)}
                    className="w-full py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <Modal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          title="Visit Image"
        >
          <div className="p-4">
            <img
              src={selectedImage}
              alt="Visit"
              className="w-full h-auto max-h-96 object-contain rounded-lg"
              onError={(e) => {
                console.error("Failed to load image:", selectedImage);
                e.currentTarget.src =
                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+";
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EditVisitPage;
