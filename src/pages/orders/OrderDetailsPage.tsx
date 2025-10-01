import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  ArrowLeftIcon,
  PencilIcon,
  PrinterIcon,
  ShareIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { orderService } from "../../services/orderService";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import OrderStatusDropdown from "../../components/orders/OrderStatusDropdown";
import OrderTimeline from "../../components/orders/OrderTimeline";
import OrderActivityTimeline from "../../components/orders/OrderActivityTimeline";
import type { Order } from "../../types";
import { toast } from "react-hot-toast";
import Modal from "../../components/ui/Modal";

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is required");
      setLoading(false);
      return;
    }

    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getOrderById(orderId!);
      setOrder(data);
      // Fetch activities after order is loaded
      fetchActivities();
    } catch (err: any) {
      console.error("Error fetching order:", err);
      setError(
        err?.message ||
          err?.response?.data?.message ||
          "Failed to fetch order details"
      );
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!orderId) return;
    
    try {
      setActivitiesLoading(true);
      const auditTrail = await orderService.getOrderAuditTrail(orderId);
      setActivities(auditTrail);
    } catch (err: any) {
      console.error("Error fetching activities:", err);
      // Don't show error toast for activities as it's not critical
    } finally {
      setActivitiesLoading(false);
    }
  };
  console.log(activities)
  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrder(updatedOrder);
    toast.success("Order updated successfully");
  };

  const handlePrint = () => {
    window.print();
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
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order ${order?.orderNumber}`,
          text: `Order details for ${order?.customer?.businessName}`,
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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Order Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The order you're looking for doesn't exist."}
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
    approved: { color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
    driver_assigned: { color: "bg-blue-100 text-blue-800", icon: TruckIcon },
    out_for_delivery: {
      color: "bg-purple-100 text-purple-800",
      icon: TruckIcon,
    },
    delivered: { color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
    completed: { color: "bg-gray-100 text-gray-800", icon: CheckCircleIcon },
    cancelled: {
      color: "bg-red-100 text-red-800",
      icon: ExclamationTriangleIcon,
    },
    rejected: {
      color: "bg-red-100 text-red-800",
      icon: ExclamationTriangleIcon,
    },
    processing: {
      color: "bg-blue-100 text-blue-800",
      icon: BuildingOfficeIcon,
    },
    ready: { color: "bg-purple-100 text-purple-800", icon: CheckCircleIcon },
    dispatched: { color: "bg-indigo-100 text-indigo-800", icon: TruckIcon },
  } as const;

  const currentStatusInfo = statusInfo[order.status as keyof typeof statusInfo];

  // Fallback: show just-created payment (from QuickOrder navigation state) if backend hasn't persisted yet
  const navState = (location as unknown as { state?: any })?.state;
  const justCreatedPayment = navState?.justCreatedPayment as
    | { paidAmount?: number; paymentStatus?: Order["paymentStatus"] }
    | undefined;
  const paidDisplay =
    typeof order.paidAmount === "number" && order.paidAmount > 0
      ? order.paidAmount
      : justCreatedPayment?.paidAmount || 0;
  const paymentStatusDisplay: Order["paymentStatus"] =
    typeof order.paidAmount === "number" && order.paidAmount > 0
      ? order.paymentStatus
      : justCreatedPayment?.paymentStatus || order.paymentStatus;
  const remainingDisplay = Math.max(
    0,
    (order.totalAmount || 0) - (paidDisplay || 0)
  );

  return (
    <>
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
                    {order.orderNumber}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge
                      className={`${currentStatusInfo.color} text-[10px] px-1.5 py-0.5`}
                    >
                      <currentStatusInfo.icon className="h-3 w-3 mr-0.5" />
                      {order.status}
                    </Badge>
                    <span className="text-[10px] text-gray-500">
                      {orderService.formatDate(order.orderDate)}
                    </span>
                    {order.godown && (
                      <span className="text-[10px] text-gray-500">
                        • {order.godown.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {hasPermission("orders.update") && (
                  <OrderStatusDropdown
                    order={order}
                    onOrderUpdate={handleOrderUpdate}
                  />
                )}
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
                {hasPermission("orders.update") && (
                  <Link
                    to={`/orders/${order._id}/edit`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <PencilIcon className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                )}
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
                      name={order.customer?.businessName || "Customer"}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {order.customer?.businessName || "N/A"}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {order.customer?.contactPersonName || "N/A"}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {order.customer?.phone && (
                          <div className="flex items-center text-xs text-gray-600">
                            <PhoneIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            {order.customer.phone}
                          </div>
                        )}
                        {order.customer?.email && (
                          <div className="flex items-center text-xs text-gray-600">
                            <EnvelopeIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            {order.customer.email}
                          </div>
                        )}
                        {order.customer?.address && (
                          <div className="flex items-start text-xs text-gray-600 sm:col-span-2">
                            <MapPinIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>
                              {[
                                order.customer.address.street,
                                `${order.customer.address.city}, ${order.customer.address.state}`,
                                order.customer.address.pincode,
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

              {/* Order Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <DocumentTextIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                    Items
                  </h3>
                </div>
                <div className="p-3 sm:p-0">
                  {/* Mobile: Card view */}
                  <div className="sm:hidden space-y-2">
                    {order.items?.map((item, index) => (
                      <div
                        key={index}
                        className="p-2.5 border border-gray-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {item.productName}
                            </div>
                            {item.packaging && (
                              <div className="text-[10px] text-gray-500">
                                {item.packaging}
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-gray-900">
                            {orderService.formatCurrency(item.totalAmount)}
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>
                            {item.quantity} {item.unit}
                          </span>
                          <span>
                            @ {orderService.formatCurrency(item.ratePerUnit)}
                            /unit
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table view */}
                  <div className="hidden sm:block overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                            Quantity
                          </th>
                          <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                            Rate
                          </th>
                          <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {order.items?.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <div>
                                <div className="text-xs font-medium text-gray-900">
                                  {item.productName}
                                </div>
                                {item.packaging && (
                                  <div className="text-[10px] text-gray-500">
                                    {item.packaging}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-900">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-900">
                              {orderService.formatCurrency(item.ratePerUnit)}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-900">
                              {orderService.formatCurrency(item.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* Captured Location */}
              {order?.captureLocation && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                      Capture Location
                    </h3>
                  </div>
                  <div className="p-3 sm:p-4 space-y-2">
                    <p className="text-xs text-gray-700">
                      {order?.captureLocation?.address}
                    </p>
                    {/* <div className="text-[10px] text-gray-500">
                    <p>Lat: {order?.captureLocation?.latitude}</p>
                    <p>Lng: {order?.captureLocation?.longitude}</p>
                    <p>Time: {formatDateTime(order?.captureLocation?.timestamp)}</p>
                  </div> */}
                  </div>
                </div>
              )}

              {/* Captured Image */}
              {order?.capturedImage && (
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
                        handleViewImage(order.capturedImage, "Captured Image")
                      }
                      className="inline-flex cursor-pointer items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <CameraIcon className="h-4 w-4 mr-2" />
                      View Image
                    </button>
                  </div>
                </div>
              )}
              {/* Delivery Information */}
              {(order.status === "delivered" || order.status === "completed") &&
                (order.driverAssignment ||
                  order.signatures ||
                  order.settlements) && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200">
                    <div className="px-3 sm:px-4 py-2.5 border-b border-green-200 bg-green-100/50">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1.5 text-green-600" />
                        Delivery Confirmation
                      </h3>
                      {order.driverAssignment?.deliveryAt && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {orderService.formatDate(
                            order.driverAssignment.deliveryAt
                          )}
                        </p>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 space-y-3">
                      {/* Driver Information */}
                      {order.driverAssignment?.driver && (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <TruckIcon className="h-4 w-4 text-blue-600" />
                            <h4 className="text-xs font-semibold text-gray-900">
                              Delivered By
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={
                                order.driverAssignment.driver.fullName ||
                                "Driver"
                              }
                              size="sm"
                            />
                            <div>
                              <p className="text-xs font-medium text-gray-900">
                                {order.driverAssignment.driver.fullName}
                              </p>
                              <p className="text-[10px] text-gray-600">
                                {order.driverAssignment.driver.email}
                              </p>
                              {order.driverAssignment.driver.phone && (
                                <p className="text-[10px] text-gray-500">
                                  {order.driverAssignment.driver.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Settlement Information */}
                      {order.settlements && order.settlements.length > 0 && (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CurrencyRupeeIcon className="h-4 w-4 text-green-600" />
                            <h4 className="text-xs font-semibold text-gray-900">
                              Payment Settlement
                            </h4>
                          </div>
                          {order.settlements.map((settlement, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">
                                  Collected
                                </span>
                                <span className="text-base font-bold text-green-600">
                                  {orderService.formatCurrency(
                                    settlement.amountCollected || 0
                                  )}
                                </span>
                              </div>
                              {settlement.notes && (
                                <div className="bg-gray-50 rounded p-2 mt-1.5">
                                  <p className="text-[10px] font-medium text-gray-700 mb-0.5">
                                    Notes
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {settlement.notes}
                                  </p>
                                </div>
                              )}
                              {settlement.recordedAt && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {orderService.formatDate(
                                    settlement.recordedAt
                                  )}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Delivery Location */}
                      {order.driverAssignment?.deliveryLocation?.address && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start gap-3">
                            <MapPinIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                Delivery Location
                              </h4>
                              <p className="text-sm text-gray-600">
                                {
                                  order.driverAssignment.deliveryLocation
                                    .address
                                }
                              </p>
                              {(order.driverAssignment.deliveryLocation
                                .latitude ||
                                order.driverAssignment.deliveryLocation
                                  .longitude) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Coordinates:{" "}
                                  {order.driverAssignment.deliveryLocation.latitude?.toFixed(
                                    6
                                  )}
                                  ,{" "}
                                  {order.driverAssignment.deliveryLocation.longitude?.toFixed(
                                    6
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Driver Notes */}
                      {order.driverAssignment?.driverNotes && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start gap-3">
                            <DocumentTextIcon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                Delivery Notes
                              </h4>
                              <p className="text-sm text-gray-600">
                                {order.driverAssignment.driverNotes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Signatures */}
                      {(order.signatures?.driver ||
                        order.signatures?.receiver) && (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2.5 flex items-center">
                            <PencilIcon className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
                            Signatures
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Driver Signature */}
                            {order.signatures.driver && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <TruckIcon className="h-3.5 w-3.5 text-blue-600" />
                                  <p className="text-[10px] font-semibold text-gray-700 uppercase">
                                    Driver
                                  </p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border-2 border-dashed border-blue-200">
                                  <img
                                    src={order.signatures.driver}
                                    alt="Driver Signature"
                                    className="w-full h-auto max-h-24 object-contain"
                                  />
                                </div>
                                <p className="text-[10px] text-gray-500 text-center">
                                  {order.driverAssignment?.driver?.fullName ||
                                    "Driver"}
                                </p>
                              </div>
                            )}

                            {/* Customer Signature */}
                            {order.signatures.receiver && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <UserIcon className="h-3.5 w-3.5 text-green-600" />
                                  <p className="text-[10px] font-semibold text-gray-700 uppercase">
                                    Customer
                                  </p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 border-2 border-dashed border-green-200">
                                  <img
                                    src={order.signatures.receiver}
                                    alt="Customer Signature"
                                    className="w-full h-auto max-h-24 object-contain"
                                  />
                                </div>
                                <p className="text-[10px] text-gray-500 text-center">
                                  {order.customer?.contactPersonName ||
                                    "Customer"}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                              <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
                              <span>Verified</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Order Notes */}
              {(order.notes || order.internalNotes) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notes
                    </h3>
                  </div>
                  <div className="p-3 sm:p-4 space-y-2.5">
                    {order.notes && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-900 mb-1">
                          Customer Notes
                        </h4>
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                          {order.notes}
                        </p>
                      </div>
                    )}
                    {order.internalNotes && hasPermission("orders.read") && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-900 mb-1">
                          Internal Notes
                        </h4>
                        <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded-lg">
                          {order.internalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-3 sm:space-y-4">
              {/* Order Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <CurrencyRupeeIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                    Summary
                  </h3>
                </div>
                <div className="p-3 sm:p-4 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {orderService.formatCurrency(order.subtotal)}
                    </span>
                  </div>
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">
                        {orderService.formatCurrency(order.taxAmount)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2.5">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        Total
                      </span>
                      <span className="text-base font-bold text-gray-900">
                        {orderService.formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    {order.paymentTerms !== "Cash" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Terms</span>
                        <span className="font-medium">
                          {order.paymentTerms}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Status</span>
                      <Badge
                        className={`${orderService.getPaymentStatusColor(
                          paymentStatusDisplay
                        )} text-[10px] px-1.5 py-0.5`}
                      >
                        {paymentStatusDisplay}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Paid</span>
                      <span className="font-medium">
                        {orderService.formatCurrency(paidDisplay || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-medium text-orange-600">
                        {orderService.formatCurrency(remainingDisplay)}
                      </span>
                    </div>
                    {order.priority !== "normal" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Priority</span>
                        <Badge
                          className={`${
                            order.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : order.priority === "high"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-700"
                          } text-[10px] px-1.5 py-0.5`}
                        >
                          {order.priority}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

        
              {/* Activity Timeline */}
              <OrderActivityTimeline 
                activities={activities} 
                loading={activitiesLoading} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <Modal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          title="Captured Image"
        >
          <div className="p-4">
            <img
              src={selectedImage}
              alt="Captured"
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
    </>
  );
};

export default OrderDetailsPage;
