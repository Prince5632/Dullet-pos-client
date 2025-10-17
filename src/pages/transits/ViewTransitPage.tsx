import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { transitService } from "../../services/transitService";
import type { Transit } from "../../types";
import {
  ArrowLeftIcon,
  TruckIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CubeIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  EyeIcon,
  DocumentIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../../components/ui/Avatar";
import Modal from "../../components/ui/Modal";
import TransitStatusDropdown from "../../components/transits/TransitStatusDropdown";
import OrderActivityTimeline from "../../components/orders/OrderActivityTimeline";
import toast from "react-hot-toast";

const ViewTransitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [transit, setTransit] = useState<Transit | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    attachment: any;
    previewUrl: string | null;
  }>({
    isOpen: false,
    attachment: null,
    previewUrl: null,
  });

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
      if (!id) return;

      try {
        setActivitiesLoading(true);
        const response = await transitService.getTransitAuditTrail(id, {
          page,
          limit: 5,
        });
        if (append) {
          setActivities((prev) => [...prev, ...response?.data?.activities]);
        } else {
          setActivities(response?.data?.activities);
        }

        setActivitiesPagination({
          currentPage: response?.data.pagination.currentPage,
          totalPages: response?.data?.pagination.totalPages,
          totalCount: response?.data?.pagination.totalItems,
          hasMore: response?.data?.pagination.hasMore,
        });
      } catch (err: any) {
        console.error("Error fetching activities:", err);
        // Don't show error toast for activities as it's not critical
      } finally {
        setActivitiesLoading(false);
      }
    },
    [id]
  );
  useEffect(() => {
    if (!hasPermission("transits.read")) {
      navigate("/transits");
      return;
    }
    if (id) {
      loadTransit();
      fetchActivities();
    }
  }, [id, hasPermission, navigate, fetchActivities]);

  const loadTransit = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await transitService.getTransitById(id);
      if (response.success && response.data) {
        setTransit(response.data);
      } else {
        toast.error("Failed to load transit details");
        navigate("/transits");
      }
    } catch (error) {
      console.error("Error loading transit:", error);
      toast.error("Failed to load transit details");
      navigate("/transits");
    } finally {
      setLoading(false);
    }
  };

  const handleTransitUpdate = (updatedTransit: Transit) => {
    loadTransit();
    // Refresh activities to show the status change
    fetchActivities(1, false);
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

  const handleDelete = async () => {
    if (!id || !transit) return;

    try {
      setDeleteLoading(true);
      const response = await transitService.deleteTransit(id);
      if (response.success) {
        toast.success("Transit deleted successfully");
        navigate("/transits");
      } else {
        toast.error("Failed to delete transit");
      }
    } catch (error) {
      console.error("Error deleting transit:", error);
      toast.error("Failed to delete transit");
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-blue-100 text-blue-800";
      case "In Transit":
        return "bg-yellow-100 text-yellow-800";
      case "Received":
        return "bg-green-100 text-green-800";
      case "Partially Received":
        return "bg-orange-100 text-orange-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const openPreviewModal = (attachment: any) => {
    let previewUrl: string | null = null;

    const isS3Url =
      typeof attachment.base64Data === "string" &&
      attachment.base64Data.startsWith("http");

    if (isS3Url) {
      previewUrl = attachment.base64Data;
    } else if (
      attachment.fileType?.startsWith("image/") &&
      attachment.base64Data
    ) {
      previewUrl = `data:${attachment.fileType};base64,${attachment.base64Data}`;
    } else if (
      attachment.fileType === "application/pdf" &&
      attachment.base64Data
    ) {
      previewUrl = `data:${attachment.fileType};base64,${attachment.base64Data}`;
    }

    setPreviewModal({
      isOpen: true,
      attachment,
      previewUrl,
      file: attachment,
    });
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      attachment: null,
      previewUrl: null,
      file: null,
    });
  };

  const getFileIcon = (file: File | null) => {
    console.log(file, "file");
    if (!file) {
      return <DocumentIcon className="w-8 h-8 text-gray-500" />;
    }
    if (file.fileType === "application/pdf") {
      return <DocumentIcon className="w-8 h-8 text-red-500" />;
    } else if (file.fileType.startsWith("image/")) {
      return <PhotoIcon className="w-8 h-8 text-blue-500" />;
    }
    return <DocumentIcon className="w-8 h-8 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!transit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Transit not found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The transit you're looking for doesn't exist or has been removed.
          </p>
          <div className="mt-6">
            <Link
              to="/transits"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
              Back to Transits
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-4 sm:px-6">
            {/* Top Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left Side */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="flex">
                <button
                  onClick={() => navigate("/transits")}
                  className="mb-2 sm:mb-0 sm:mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                    Transit {transit.transitId}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Created on {formatDate(transit.createdAt)}
                  </p>
                </div>
                </div>
              </div>

              {/* Right Side Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <TransitStatusDropdown
                  transit={transit}
                  onTransitUpdate={handleTransitUpdate}
                />

                {hasPermission("transits.update") && (
                  <Link
                    to={`/transits/${transit._id}/edit`}
                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                  >
                    <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                )}

                {hasPermission("transits.delete") && (
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
                  >
                    <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Details */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Product Details
                </h3>
                {transit.productDetails && transit.productDetails.length > 0 ? (
            <div className="space-y-4">
  {transit.productDetails.map((product, index) => (
    <div
      key={index}
      className="border border-gray-200 bg-white rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Header with index or product name */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
          {product.productName}
        </h3>
        <span className="text-xs text-gray-500">
          Item #{index + 1}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Quantity
          </span>
          <span className="mt-1 text-sm sm:text-base text-gray-900 font-medium">
            {product.quantity}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Unit
          </span>
          <span className="mt-1 text-sm sm:text-base text-gray-900 font-medium">
            {product.unit}
          </span>
        </div>

        {product.remarks && (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Remarks
            </span>
            <span className="mt-1 text-sm sm:text-base text-gray-900">
              {product.remarks}
            </span>
          </div>
        )}
      </div>
    </div>
  ))}
</div>

                ) : (
                  <p className="text-sm text-gray-500">
                    No product details available
                  </p>
                )}
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Route Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      From Location
                    </label>
                    <div className="mt-1 flex items-center">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {transit.fromLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      To Location
                    </label>
                    <div className="mt-1 flex items-center">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.toLocation === "string"
                            ? transit.toLocation
                            : transit.toLocation?.name}
                        </p>
                        {typeof transit.toLocation === "object" &&
                          transit.toLocation?.location && (
                            <p className="text-xs text-gray-500">
                              {transit.toLocation.location.city},{" "}
                              {transit.toLocation.location.state}
                              {transit.toLocation.location.area &&
                                ` - ${transit.toLocation.location.area}`}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle & Driver Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Vehicle & Driver Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Vehicle Number
                    </label>
                    <div className="mt-1 flex items-center">
                      <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">
                        {transit.vehicleNumber}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Driver
                    </label>
                    <div className="mt-1 flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.driverId === "string"
                            ? transit.driverId
                            : transit.driverId?.firstName &&
                              transit.driverId?.lastName
                            ? `${transit.driverId.firstName} ${transit.driverId.lastName}`
                            : "Not assigned"}
                        </p>
                        {typeof transit.driverId === "object" &&
                          transit.driverId?.email && (
                            <p className="text-xs text-gray-500">
                              {transit.driverId.email}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Attachments */}
              {transit.attachments && transit.attachments.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Attachments
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {transit.attachments
                        .filter(
                          (attachment) => attachment && attachment.fileName
                        ) // Filter out null/undefined attachments
                        .map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {attachment.fileType === "application/pdf" ? (
                                <DocumentTextIcon className="w-8 h-8 text-red-500" />
                              ) : attachment.fileType?.startsWith("image/") ? (
                                <CubeIcon className="w-8 h-8 text-blue-500" />
                              ) : (
                                <DocumentTextIcon className="w-8 h-8 text-gray-500" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {attachment.fileName || "Unknown file"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {attachment.fileSize
                                    ? `${(
                                        attachment.fileSize /
                                        1024 /
                                        1024
                                      ).toFixed(2)} MB`
                                    : "Unknown size"}
                                </p>
                                {attachment.uploadedAt && (
                                  <p className="text-xs text-gray-400">
                                    Uploaded:{" "}
                                    {formatDate(attachment.uploadedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {(attachment.fileType?.startsWith("image/") ||
                                attachment.fileType === "application/pdf") &&
                                attachment.base64Data && (
                                  <button
                                    type="button"
                                    onClick={() => openPreviewModal(attachment)}
                                    className="p-1 text-blue-600 hover:text-blue-800"
                                    title="Preview"
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                  </button>
                                )}
                              {attachment.base64Data && attachment.fileType && (
                                <a
                                  href={`data:${attachment.fileType};base64,${attachment.base64Data}`}
                                  download={attachment.fileName || "download"}
                                  className="p-1 text-green-600 hover:text-green-800"
                                  title="Download"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Timeline
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Dispatch Date
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(transit.dateOfDispatch)}
                      </p>
                    </div>
                  </div>
                  {transit.expectedArrivalDate && (
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Expected Arrival
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(transit.expectedArrivalDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Management */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Management
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Assigned Manager
                    </label>
                    <div className="mt-1 flex items-center">
                      <Avatar
                        name={
                          typeof transit.assignedTo === "string"
                            ? transit.assignedTo
                            : transit.assignedTo?.firstName &&
                              transit.assignedTo?.lastName
                            ? `${transit.assignedTo.firstName} ${transit.assignedTo.lastName}`
                            : "Not assigned"
                        }
                        size="sm"
                        className="mr-2"
                      />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.assignedTo === "string"
                            ? transit.assignedTo
                            : transit.assignedTo?.firstName &&
                              transit.assignedTo?.lastName
                            ? `${transit.assignedTo.firstName} ${transit.assignedTo.lastName}`
                            : "Not assigned"}
                        </p>
                        {typeof transit.assignedTo === "object" &&
                          transit.assignedTo?.email && (
                            <p className="text-xs text-gray-500">
                              {transit.assignedTo.email}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Created By
                    </label>
                    <div className="mt-1 flex items-center">
                      <Avatar
                        name={
                          typeof transit.createdBy === "string"
                            ? transit.createdBy
                            : transit.createdBy?.firstName &&
                              transit.createdBy?.lastName
                            ? `${transit.createdBy.firstName} ${transit.createdBy.lastName}`
                            : "Unknown"
                        }
                        size="sm"
                        className="mr-2"
                      />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.createdBy === "string"
                            ? transit.createdBy
                            : transit.createdBy?.firstName &&
                              transit.createdBy?.lastName
                            ? `${transit.createdBy.firstName} ${transit.createdBy.lastName}`
                            : "Unknown"}
                        </p>
                        {typeof transit.createdBy === "object" &&
                          transit.createdBy?.email && (
                            <p className="text-xs text-gray-500">
                              {transit.createdBy.email}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                  {transit?.partiallyReceivedBy ?<div>
                    <label className="block text-sm font-medium text-gray-500">
                      Partially Received By
                    </label>
                    <div className="mt-1 flex items-center">
                      <Avatar
                        name={
                          typeof transit.partiallyReceivedBy === "string"
                            ? transit.partiallyReceivedBy
                            : transit.partiallyReceivedBy?.firstName &&
                              transit.partiallyReceivedBy?.lastName
                            ? `${transit.partiallyReceivedBy.firstName} ${transit.partiallyReceivedBy.lastName}`
                            : "Unknown"
                        }
                        size="sm"
                        className="mr-2"
                      />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.partiallyReceivedBy === "string"
                            ? transit.partiallyReceivedBy
                            : transit.partiallyReceivedBy?.firstName &&
                              transit.partiallyReceivedBy?.lastName
                            ? `${transit.partiallyReceivedBy.firstName} ${transit.partiallyReceivedBy.lastName}`
                            : "Unknown"}
                        </p>
                        {typeof transit.partiallyReceivedBy === "object" &&
                          transit.partiallyReceivedBy?.email && (
                            <p className="text-xs text-gray-500">
                              {transit.partiallyReceivedBy.email}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>:null}
                    {transit?.receivedBy ?<div>
                    <label className="block text-sm font-medium text-gray-500">
                      Received By
                    </label>
                    <div className="mt-1 flex items-center">
                      <Avatar
                        name={
                          typeof transit.receivedBy === "string"
                            ? transit.receivedBy
                            : transit.receivedBy?.firstName &&
                              transit.receivedBy?.lastName
                            ? `${transit.receivedBy.firstName} ${transit.receivedBy.lastName}`
                            : "Unknown"
                        }
                        size="sm"
                        className="mr-2"
                      />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.receivedBy === "string"
                            ? transit.receivedBy
                            : transit.receivedBy?.firstName &&
                              transit.receivedBy?.lastName
                            ? `${transit.receivedBy.firstName} ${transit.receivedBy.lastName}`
                            : "Unknown"}
                        </p>
                        {typeof transit.receivedBy === "object" &&
                          transit.receivedBy?.email && (
                            <p className="text-xs text-gray-500">
                              {transit.receivedBy.email}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>:null}
                </div>
              </div>
            </div>

            {/* Status History */}
            {transit.statusHistory && transit.statusHistory.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Status History
                  </h3>
                  <div className="space-y-4">
                    {transit.statusHistory
                      .slice()
                      .reverse()
                      .map((history, index) => (
                        <div
                          key={index}
                          className="border-l-4 border-blue-200 pl-4 pb-4 last:pb-0"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    history.status
                                  )}`}
                                >
                                  {history.status}
                                </span>
                              </div>
                              {history.notes && (
                                <p className="text-sm text-gray-700 mb-2">
                                  {history.notes}
                                </p>
                              )}
                              <div className="flex items-center text-xs text-gray-500 gap-4">
                                <div className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  <span>
                                    {typeof history.changedBy === "string"
                                      ? history.changedBy
                                      : history.changedBy?.firstName &&
                                        history.changedBy?.lastName
                                      ? `${history.changedBy.firstName} ${history.changedBy.lastName}`
                                      : "Unknown"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="h-3 w-3" />
                                  <span>
                                    {new Date(history.changedAt).toLocaleString(
                                      "en-US",
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
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
              text="transit"
            />
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0">
                  {getFileIcon(previewModal.file)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                    {previewModal.file?.fileName}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {previewModal.file &&
                      (previewModal?.file?.fileSize / 1024 / 1024).toFixed(
                        2
                      )}{" "}
                    MB • {previewModal.file?.type}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreviewModal}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
                title="Close preview"
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 bg-gray-50">
              {previewModal.previewUrl &&
              previewModal.file?.fileType.startsWith("image/") ? (
                <div className="flex justify-center items-center min-h-full">
                  <img
                    src={previewModal.previewUrl}
                    alt={previewModal.file.fileName}
                    className="max-w-full max-h-full object-contain rounded border shadow-sm bg-white"
                  />
                </div>
              ) : previewModal.previewUrl &&
                previewModal.file?.fileType === "application/pdf" ? (
                <div className="h-full flex flex-col">
                  <iframe
                    src={previewModal.previewUrl}
                    className="w-full flex-1 min-h-[500px] border-0 rounded"
                    title={`PDF Preview - ${previewModal.file.fileName}`}
                  />
                </div>
              ) : previewModal.file?.fileType === "application/pdf" ? (
                <div className="text-center py-8 sm:py-12">
                  <DocumentIcon className="w-16 h-16 sm:w-24 sm:h-24 text-red-500 mx-auto mb-4" />
                  <h4 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                    PDF Document
                  </h4>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base px-4">
                    This PDF file is attached to your transit.
                  </p>
                  <div className="bg-white rounded-lg p-4 max-w-sm mx-auto shadow-sm border">
                    <div className="text-sm text-gray-700 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">File Name:</span>
                        <span className="text-right truncate ml-2">
                          {previewModal.file.fileName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">File Size:</span>
                        <span>
                          {previewModal.file &&
                            (previewModal.file.fileSize / 1024 / 1024).toFixed(
                              2
                            )}{" "}
                          MB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">File Type:</span>
                        <span>PDF Document</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <DocumentIcon className="w-16 h-16 sm:w-24 sm:h-24 text-gray-500 mx-auto mb-4" />
                  <h4 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                    File Preview
                  </h4>
                  <p className="text-gray-600 text-sm sm:text-base px-4">
                    Preview not available for this file type.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0 gap-3 sm:gap-0">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                {previewModal.isExisting
                  ? "Existing attachment"
                  : "File attached to your transit"}
              </div>
              <div className="flex gap-2 justify-center sm:justify-end">
                {previewModal.file &&
                  !previewModal.isExisting &&
                  previewModal.fileId && (
                    <button
                      onClick={() => {
                        removeFile(previewModal.fileId!);
                        closePreviewModal();
                      }}
                      className="px-3 sm:px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                    >
                      Remove File
                    </button>
                  )}
                {previewModal.isExisting && (
                  <button
                    onClick={() => {
                      removeExistingAttachment(previewModal.file!.name);
                      closePreviewModal();
                    }}
                    className="px-3 sm:px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                  >
                    Remove Attachment
                  </button>
                )}
                <button
                  onClick={closePreviewModal}
                  className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Transit"
      >
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Delete Transit
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete transit {transit.transitId}?
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={() => setDeleteModalOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ViewTransitPage;
