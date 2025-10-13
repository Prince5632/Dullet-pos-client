import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productionService } from "../../services/productionService";
import type { Production } from "../../types";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CogIcon,
  UserIcon,
  CubeIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import OrderActivityTimeline from "../../components/orders/OrderActivityTimeline";
import ProductionStatusDropdown from "../../components/productions/ProductionStatusDropdown";

const ViewProductionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [production, setProduction] = useState<Production | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesPagination, setActivitiesPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 20,
    totalPages: 0,
    hasMore: false,
  });
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    file: any | null;
    previewUrl: string | null;
    isExisting: boolean;
    fileId?: string;
  }>({
    isOpen: false,
    file: null,
    previewUrl: null,
    isExisting: false,
  });

  useEffect(() => {
    if (id) {
      loadProduction();
      loadActivities();
    }
  }, [id]);

  const loadProduction = async () => {
    try {
      setLoading(true);
      const res = await productionService.getProductionById(id!);
      if (res.success && res.data) {
        setProduction(res.data);
      } else {
        throw new Error(res.message || "Failed to load production");
      }
    } catch (error: any) {
      console.error("Failed to load production:", error);
      toast.error(error.message || "Failed to load production");
      navigate("/productions");
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async (page: number = 1) => {
    try {
      setActivitiesLoading(true);
      const response = await productionService.getProductionAuditTrail(
        id!,
        page,
        20
      );

      if (response.success && response.data) {
        const { activities: newActivities, pagination } = response.data;

        if (page === 1) {
          setActivities(newActivities);
        } else {
          setActivities((prev) => [...prev, ...newActivities]);
        }

        setActivitiesPagination(pagination);
      }
    } catch (error: any) {
      console.error("Failed to load activities:", error);
      if (page === 1) {
        toast.error("Failed to load production activities");
      }
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadMoreActivities = () => {
    if (activitiesPagination.hasMore && !activitiesLoading) {
      loadActivities(activitiesPagination.currentPage + 1);
    }
  };

  const handleDelete = async () => {
    if (!production) return;

    try {
      setDeleteLoading(true);
      const res = await productionService.deleteProduction(production._id);

      if (res.success) {
        toast.success("Production deleted successfully");
        navigate("/productions");
      } else {
        throw new Error(res.message || "Failed to delete production");
      }
    } catch (error: any) {
      console.error("Failed to delete production:", error);
      toast.error(error.message || "Failed to delete production");
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const openPreviewModal = (file: any, isExisting: boolean = true) => {
    let previewUrl = null;

    if (
      file.fileType?.startsWith("image/") ||
      file.type?.startsWith("image/")
    ) {
      if (isExisting && file.base64Data) {
        previewUrl = `data:${file.fileType};base64,${file.base64Data}`;
      } else if (!isExisting && file instanceof File) {
        previewUrl = URL.createObjectURL(file);
      }
    }

    setPreviewModal({
      isOpen: true,
      file,
      previewUrl,
      isExisting,
    });
  };

  const closePreviewModal = () => {
    if (previewModal.previewUrl && !previewModal.isExisting) {
      URL.revokeObjectURL(previewModal.previewUrl);
    }
    setPreviewModal({
      isOpen: false,
      file: null,
      previewUrl: null,
      isExisting: false,
    });
  };

  const getFileIcon = (file: any) => {
    const fileType = file?.fileType || file?.type || "";

    if (fileType.startsWith("image/")) {
      return <PhotoIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <DocumentIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  function getTotalQuantities(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      return { kg: 0, quintal: 0, ton: 0 };
    }

    const totalKg = items.reduce((total, item) => {
      const { productQty = 0, productUnit = "KG" } = item;

      switch (productUnit?.toLowerCase()) {
        case "kg":
          return total + productQty;
        case "quintal":
          return total + productQty * 100;
        case "ton":
          return total + productQty * 1000;
        default:
          return total;
      }
    }, 0);

    return {
      kg: totalKg,
      quintal: totalKg / 100,
      ton: totalKg / 1000,
    };
  }

  const totals = getTotalQuantities(production?.outputDetails);
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading production details...</p>
        </div>
      </div>
    );
  }

  if (!production) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Production Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The production you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/productions")}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Productions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left Section */}
            <div className="flex items-start sm:items-center gap-3">
              <button
                onClick={() => navigate("/productions")}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Back to productions"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>

              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
                  Production{" "}
                  <span className="text-blue-600 font-bold">
                    {productionService.formatBatchId(production.batchId)}
                  </span>
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mt-1">
                  Created on {formatDate(production.createdAt)}
                </p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
              <div className="w-full sm:w-auto">
                <ProductionStatusDropdown
                  production={production}
                  onProductionUpdate={() => {
                    loadProduction();
                    loadActivities();
                  }}
                />
              </div>

              <button
                onClick={() => navigate(`/productions/${production._id}/edit`)}
                className="flex items-center justify-center w-full sm:w-auto px-3 sm:px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </button>

              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center justify-center w-full sm:w-auto px-3 sm:px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Production Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Production Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Production Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(production.productionDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Shift</p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${productionService.getShiftColor(
                          production.shift
                        )}`}
                      >
                        {productionService.getShiftDisplayName(
                          production.shift
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">
                        {production.location}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CogIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Machine</p>
                      <p className="font-medium text-gray-900">
                        {production?.machine || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Operator</p>
                      <p className="font-medium text-gray-900">
                        {production?.operator}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Input Details
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {production.inputType}
                    </p>
                    <p className="text-sm text-gray-500">Input Material</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {production.inputQty} {production.inputUnit}
                    </p>
                    <p className="text-sm text-gray-500">Quantity</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Output Details */}
            {production?.outputDetails?.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Output Details
                </h2>
                <div className="space-y-3">
                  {production.outputDetails.map((output, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {output.itemName}
                          </p>
                          {output.notes && (
                            <p className="text-sm text-gray-500 mt-1">
                              {output.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {output.productQty} {output.productUnit}
                          </p>
                          <p className="text-sm text-gray-500">Quantity</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-blue-900">
                          Total Output
                        </p>
                        <p className="text-sm text-blue-600">
                          Combined quantity
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div className="bg-white rounded-md p-3 border border-blue-100 shadow-sm">
                        <p className="text-xs text-blue-600">
                          In Kilograms (KG)
                        </p>
                        <p className="text-lg font-semibold text-blue-900">
                          {totals.kg.toFixed(2)} KG
                        </p>
                      </div>

                      <div className="bg-white rounded-md p-3 border border-blue-100 shadow-sm">
                        <p className="text-xs text-blue-600">In Quintals</p>
                        <p className="text-lg font-semibold text-blue-900">
                          {totals.quintal.toFixed(2)} Qtl
                        </p>
                      </div>

                      <div className="bg-white rounded-md p-3 border border-blue-100 shadow-sm">
                        <p className="text-xs text-blue-600">In Tons</p>
                        <p className="text-lg font-semibold text-blue-900">
                          {totals.ton.toFixed(3)} Ton
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Attachments */}
            {production.attachments && production.attachments?.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Attachments
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {production.attachments.map((file, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {getFileIcon(file)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openPreviewModal(file, true)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Preview
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks */}
            {production.remarks && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Remarks
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {production.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Production Date
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(production.productionDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(production.createdAt)}
                    </p>
                  </div>
                </div>
                {production.updatedAt !== production.createdAt && (
                  <div className="flex items-center gap-3">
                    <ClockIcon className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Last Updated
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(production.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Management */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Management
              </h2>
              <div className="space-y-4">
                {production?.operator ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Operator</p>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={production?.operator || "Unknown"}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {production?.operator || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {production.operator}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Created By</p>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={
                        production?.createdBy?.firstName +
                        " " +
                        production?.createdBy?.lastName
                      }
                      email={production.createdBy.email}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {production?.createdBy?.firstName +
                          " " +
                          production?.createdBy?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {production.createdBy.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <OrderActivityTimeline
              activities={activities}
              loading={activitiesLoading}
              hasMore={activitiesPagination.hasMore}
              onLoadMore={loadMoreActivities}
              totalCount={activitiesPagination.totalCount}
              clampDescriptionLines={3}
              text="production"
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
                    MB • {previewModal.file?.fileType}
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
              {previewModal.file?.fileType.startsWith("image/") &&
              previewModal.previewUrl ? (
                <div className="flex justify-center items-center min-h-full">
                  <img
                    src={previewModal.previewUrl}
                    alt={previewModal.file.fileName}
                    className="max-w-full max-h-full object-contain rounded border shadow-sm bg-white"
                  />
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
                File attached to production
              </div>
              <div className="flex gap-2 justify-center sm:justify-end">
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
        title="Delete Production"
      >
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Delete Production
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete production{" "}
                {productionService.formatBatchId(production.batchId)}? This
                action cannot be undone.
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

export default ViewProductionPage;
