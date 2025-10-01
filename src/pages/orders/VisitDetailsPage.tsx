import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  PencilIcon,
  ShareIcon,
  PrinterIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import orderService from "../../services/orderService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import Modal from "../../components/ui/Modal";
import OrderActivityTimeline from "../../components/orders/OrderActivityTimeline";
import { toast } from "react-hot-toast";

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

const VisitDetailsPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Activity timeline state
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesPagination, setActivitiesPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false,
  });
  const fetchActivities = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!visitId) return;

      try {
        setActivitiesLoading(true);
        const response = await orderService.getVisitAuditTrail(visitId, {
          page,
          limit: 5,
        });
        if (append) {
          setActivities((prev) => [...prev, ...response.activities]);
        } else {
          setActivities(response.activities);
        }

        setActivitiesPagination({
          currentPage: response.pagination.currentPage,
          totalPages: response.pagination.totalPages,
          totalCount: response.pagination.totalItems,
          hasMore: response.pagination.hasMore,
        });
      } catch (err: any) {
        console.error("Error fetching activities:", err);
        // Don't show error toast for activities as it's not critical
      } finally {
        setActivitiesLoading(false);
      }
    },
    [visitId]
  );

  useEffect(() => {
    if (!visitId) {
      setError("Visit ID is required");
      setLoading(false);
      return;
    }
    fetchVisit();
    fetchActivities();
  }, [visitId, fetchActivities]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getVisitById(visitId!);
      setVisit(data);
    } catch (err: any) {
      console.error("Error fetching visit:", err);
      setError(
        err?.message ||
          err?.response?.data?.message ||
          "Failed to fetch visit details"
      );
      toast.error("Failed to load visit details");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreActivities = useCallback(() => {
    if (
      activitiesPagination?.hasMore &&
      !activitiesLoading &&
      activitiesPagination?.currentPage
    ) {
      fetchActivities(activitiesPagination.currentPage + 1, true);
    }
  }, [
    activitiesPagination?.hasMore,
    activitiesPagination?.currentPage,
    activitiesLoading,
    fetchActivities,
  ]);

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
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatImageSrc = (imageData: string | undefined): string => {
    if (!imageData) return "";

    // If it's already a complete URL, return as is
    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      return imageData;
    }

    // If it's a base64 string, return as is
    if (imageData.startsWith("data:image/")) {
      return imageData;
    }

    // Default case - assume it's a base64 string
    return `data:image/jpeg;base64,${imageData}`;
  };
  const handleViewImage = (imageData: string | undefined, title: string) => {
    if (!imageData) return;

    const formattedSrc = formatImageSrc(imageData);
    setSelectedImage(formattedSrc);
    setShowImageModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Visit ${visit?.orderNumber || visit?._id}`,
          text: `Visit details for ${visit?.customer?.businessName}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
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
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Visit Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The visit you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => navigate("/orders")}
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/orders")}
                className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  Visit Details
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge
                    className={`${currentStatusInfo.color} text-[10px] px-1.5 py-0.5`}
                  >
                    <currentStatusInfo.icon className="h-3 w-3 mr-0.5" />
                    {visit.status.replace("_", " ")}
                  </Badge>
                  <span className="text-[10px] text-gray-500">
                    {formatDate(visit.scheduleDate)}
                  </span>
                  {visit.customer?.businessName && (
                    <span className="text-[10px] text-gray-500">
                      • {visit.customer.businessName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={handleShare}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <ShareIcon className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <PrinterIcon className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <Link
                to={`/orders/visits/${visit._id}/edit`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <PencilIcon className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <UserIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                  Customer
                </h3>
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    name={visit.customer?.businessName || "Customer"}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">
                      {visit.customer?.businessName || "N/A"}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {visit.customer?.contactPersonName || "N/A"}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {visit.customer?.phone && (
                        <div className="flex items-center text-xs text-gray-600">
                          <PhoneIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                          {visit.customer.phone}
                        </div>
                      )}
                      {visit.customer?.email && (
                        <div className="flex items-center text-xs text-gray-600">
                          <EnvelopeIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                          {visit.customer.email}
                        </div>
                      )}
                      {visit.customer?.address && (
                        <div className="flex items-start text-xs text-gray-600 sm:col-span-2">
                          <MapPinIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>
                            {[
                              visit.customer.address.street,
                              `${visit.customer.address.city}, ${visit.customer.address.state}`,
                              visit.customer.address.pincode,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visit Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                  Schedule
                </h3>
              </div>
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Scheduled Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(visit.scheduleDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Priority
                    </label>
                    <p className="text-sm text-gray-900 capitalize">
                      {visit.priority || "Normal"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visit Notes */}
            {visit.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <DocumentTextIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                    Notes
                  </h3>
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-sm text-gray-700">{visit.notes}</p>
                </div>
              </div>
            )}

            {/* Captured Image */}
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

            {/* Activity Timeline */}
            <OrderActivityTimeline
              activities={activities}
              loading={activitiesLoading}
              hasMore={activitiesPagination.hasMore}
              onLoadMore={loadMoreActivities}
              totalCount={activitiesPagination.totalCount}
              clampDescriptionLines={3}
              text="visit"
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-3 sm:space-y-4">
            {/* Visit Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
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
                  <span className="text-xs text-gray-600">Type</span>
                  <span className="text-xs font-medium text-gray-900 capitalize">
                    {visit.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Created</span>
                  <span className="text-xs text-gray-900">
                    {formatDate(visit.createdAt)}
                  </span>
                </div>
                {visit.createdBy && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Created By</span>
                    <span className="text-xs text-gray-900">
                      {visit.createdBy.firstName} {visit.createdBy.lastName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Customer Details
                </h3>
              </div>
              <div className="p-3 sm:p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Customer ID</span>
                  <span className="text-xs font-medium text-gray-900">
                    {visit.customer?.customerId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Type</span>
                  <span className="text-xs text-gray-900 capitalize">
                    {visit.customer?.customerType}
                  </span>
                </div>
                {/* <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Total Orders</span>
                  <span className="text-xs text-gray-900">{visit.customer?.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Outstanding</span>
                  <span className="text-xs text-gray-900">₹{visit.customer?.outstandingAmount?.toLocaleString() || 0}</span>
                </div> */}
              </div>
            </div>

            {/* Location Details */}
            {visit.captureLocation && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                    Capture Location
                  </h3>
                </div>
                <div className="p-3 sm:p-4 space-y-2">
                  <p className="text-xs text-gray-700">
                    {visit.captureLocation.address}
                  </p>
                  {/* <div className="text-[10px] text-gray-500">
                    <p>Lat: {visit.captureLocation.latitude}</p>
                    <p>Lng: {visit.captureLocation.longitude}</p>
                    <p>Time: {formatDateTime(visit.captureLocation.timestamp)}</p>
                  </div> */}
                </div>
              </div>
            )}
          </div>
        </div>
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

export default VisitDetailsPage;
