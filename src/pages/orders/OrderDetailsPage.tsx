import React, { useState, useEffect, useCallback } from "react";
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
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
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
import { resolveCapturedImageSrc } from "../../utils/image";
import { generateDeliveryNotePDF, getDeliveryNotePDFFileName } from "../../utils/deliveryNotePdf";

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
  const [activitiesPagination, setActivitiesPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false,
  });

  // Delivery summary sharing state
  const [showDeliverySummaryModal, setShowDeliverySummaryModal] =
    useState(false);
  const [deliverySummaryLoading, setDeliverySummaryLoading] = useState(false);
  const [isAutoOpenedModal, setIsAutoOpenedModal] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is required");
      setLoading(false);
      return;
    }

    fetchOrder();
  }, [orderId]);

  // Auto-open share modal if navigated from delivery recording
  useEffect(() => {
    if (location.state?.openShareModal && order) {
      setIsAutoOpenedModal(true);
      setShowDeliverySummaryModal(true);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, order]);

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

  const fetchActivities = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!orderId) return;

      try {
        setActivitiesLoading(true);
        const response = await orderService.getOrderAuditTrail(orderId, {
          page,
          limit: 5,
        });

        if (append) {
          setActivities((prev) => [...prev, ...(response.activities || [])]);
        } else {
          setActivities(response.activities || []);
        }

        if (response.pagination) {
          setActivitiesPagination((prev) => ({
            ...prev,
            currentPage: response.pagination.currentPage || 1,
            totalPages: response.pagination.totalPages || 1,
            totalCount: response.pagination.totalItems || 0,
            hasMore: response.pagination.hasMore || false,
          }));
        }
      } catch (err: any) {
        console.error("Error fetching activities:", err);
        // Don't show error toast for activities as it's not critical
      } finally {
        setActivitiesLoading(false);
      }
    },
    [orderId]
  );

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
  const handleOrderUpdate = useCallback(async (updatedOrder: Order) => {
    const wasDelivered = order?.status !== 'delivered' && updatedOrder.status === 'delivered';
    await fetchOrder();
    toast.success("Order updated successfully");
    
    // Auto-open delivery share modal when order is marked as delivered
    if (wasDelivered) {
      setTimeout(() => {
        setIsAutoOpenedModal(true);
        setShowDeliverySummaryModal(true);
      }, 500);
    }
  }, [order?.status]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!order) return;
    try {
      generateDeliveryNotePDF(order);
      toast.success("Delivery note PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Create comprehensive text-based delivery summary (WhatsApp-safe)
  const generateTextDeliverySummary = (order: Order): string => {
    const deliveryDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const deliveryTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Format items list
    const itemsList =
      order.items
        ?.map((item, index) => {
          const quantity = Number(item.quantity) || 0;
          const rate = Number(item.ratePerUnit) || 0;
          const total = Number(item.totalAmount) || 0;

          return `${index + 1}. ${item.productName || "N/A"}
   Packaging: ${item.packaging || "N/A"}
   Quantity: ${quantity} ${item.unit || ""}
   Rate: ₹${rate.toFixed(2)}
   Amount: ₹${total.toFixed(2)}`;
        })
        .join("\n\n") || "No items found";

    // Calculate totals
    const subtotal = Number(order.subtotal) || 0;
    const discount = Number(order.discount) || 0;
    const tax = Number(order.taxAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;
    const amountCollected =
      Number(order.settlements?.[0]?.amountCollected) || totalAmount;

    return `DELIVERY SUMMARY - DULLET INDUSTRIES
Punjab, India

=======================================

ORDER DETAILS
---------------------------------------
Order No: ${order.orderNumber || "N/A"}
Order Date: ${orderService.formatDate(order.orderDate)}
Status: ${(order.status || "N/A").toUpperCase()}
Payment Terms: ${order.paymentTerms || "Cash"}

CUSTOMER DETAILS
---------------------------------------
Business: ${order.customer?.businessName || "N/A"}
Contact Location: ${order.customer?.location || "No location provided"}
Phone: ${order.customer?.phone || "N/A"}
Address: ${
      order.customer?.address
        ? `${order.customer.address.street || ""}, ${
            order.customer.address.city || ""
          }, ${order.customer.address.state || ""} ${
            order.customer.address.pincode || ""
          }`
            .replace(/^,\s*|,\s*$/g, "")
            .replace(/,\s*,/g, ",")
        : "N/A"
    }

DELIVERY INFO
---------------------------------------
Delivered At: ${deliveryDate}, ${deliveryTime}
Location: ${
      order.driverAssignment?.deliveryLocation?.address || "Location recorded"
    }${
      order.driverAssignment?.vehicleNumber
        ? `\nVehicle: ${order.driverAssignment.vehicleNumber}`
        : ""
    }

ITEMS DELIVERED
---------------------------------------
${itemsList}

PAYMENT SUMMARY
---------------------------------------
Subtotal: ₹${subtotal.toFixed(2)}
Discount: ₹${discount.toFixed(2)}
Tax: ₹${tax.toFixed(2)}
---------------------------------------
Grand Total: ₹${totalAmount.toFixed(2)}
Amount Collected: ₹${amountCollected.toFixed(2)}
Payment Status: ${order.paymentStatus || "Completed"}

NOTES
---------------------------------------
${order.notes?.trim() || "No additional notes"}

${
  order.driverAssignment?.driverNotes?.trim()
    ? `Delivery Notes: ${order.driverAssignment.driverNotes}`
    : ""
}

=======================================
Thank you for your business!
Dullet POS - Delivery Management System
Generated on: ${new Date().toLocaleString("en-IN")}`;
  };

  const handleViewImage = (imageData: string | undefined, title: string) => {
    if (!imageData) return;

    const formattedSrc = resolveCapturedImageSrc(imageData);
    if (formattedSrc) {
      setSelectedImage(formattedSrc);
      setShowImageModal(true);
    }
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

  // Delivery Summary Sharing Functions
  const handleShareDeliverySummary = () => {
    if (!order) return;
    setIsAutoOpenedModal(false);
    setShowDeliverySummaryModal(true);
  };

  const handleShareWhatsappSummary = async () => {
    if (!order) return;

    setDeliverySummaryLoading(true);
    try {
      // Generate PDF as blob
      const pdfBlob = generateDeliveryNotePDF(order, false);
      
      if (!pdfBlob) {
        throw new Error("Failed to generate PDF");
      }

      const fileName = getDeliveryNotePDFFileName(order);
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Delivery Note - ${order.orderNumber}`,
          text: `Delivery note for order ${order.orderNumber}`,
          files: [pdfFile],
        });
        toast.success("PDF shared successfully!", {
          duration: 3000,
          icon: "✅",
        });
        setShowDeliverySummaryModal(false);
      } else if (navigator.share) {
        // Fallback: Share text if files not supported
        const textSummary = generateTextDeliverySummary(order);
        await navigator.share({
          text: textSummary,
        });
        toast.success("Shared successfully!", {
          duration: 3000,
          icon: "✅",
        });
        setShowDeliverySummaryModal(false);
      } else {
        // Final fallback for desktop: Download PDF and open WhatsApp Web
        generateDeliveryNotePDF(order, true);
        toast.success("PDF downloaded! Opening WhatsApp...", {
          duration: 3000,
          icon: "📥",
        });
        
        // Open WhatsApp Web
        setTimeout(() => {
          const message = `📄 Delivery Note for Order ${order.orderNumber}\n\nPlease find the attached PDF document.`;
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, "_blank");
        }, 1000);
        
        setShowDeliverySummaryModal(false);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error sharing to WhatsApp:", error);
        toast.error("Failed to share PDF. Please try again.");
      }
    } finally {
      setDeliverySummaryLoading(false);
    }
  };

  const handleShareEmailSummary = async () => {
    if (!order) return;

    setDeliverySummaryLoading(true);
    try {
      const textSummary = generateTextDeliverySummary(order);
      const subject = `Delivery Summary - Order ${order.orderNumber}`;
      const body = `Dear ${order.customer?.businessName || "Customer"},

Please find below the delivery summary for your order:

${textSummary}

Thank you for your business!

Best regards,
Dullet POS Team`;

      const mailtoUrl = `mailto:${
        order.customer?.email || ""
      }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`;
      window.open(mailtoUrl);

      toast.success("Opening email client with delivery summary!", {
        duration: 3000,
        icon: "📧",
      });

      setShowDeliverySummaryModal(false);
    } catch (error) {
      console.error("Error preparing email:", error);
      toast.error("Failed to prepare email sharing. Please try again.");
    } finally {
      setDeliverySummaryLoading(false);
    }
  };

  const handleCopyTextSummary = async () => {
    if (!order) return;

    setDeliverySummaryLoading(true);
    try {
      const textSummary = generateTextDeliverySummary(order);
      await navigator.clipboard.writeText(textSummary);

      toast.success("Delivery summary copied to clipboard!", {
        duration: 3000,
        icon: "📋",
      });

      setShowDeliverySummaryModal(false);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy to clipboard. Please try again.");
    } finally {
      setDeliverySummaryLoading(false);
    }
  };

  const handlePrintTextSummary = async () => {
    if (!order) return;

    setDeliverySummaryLoading(true);
    try {
      const textSummary = generateTextDeliverySummary(order);

      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Delivery Summary - ${order.orderNumber}</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  line-height: 1.4;
                  margin: 20px;
                  white-space: pre-wrap;
                }
                @media print {
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>${textSummary}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }

      toast.success("Opening print dialog...", {
        duration: 2000,
        icon: "🖨️",
      });

      setShowDeliverySummaryModal(false);
    } catch (error) {
      console.error("Error printing summary:", error);
      toast.error("Failed to print summary. Please try again.");
    } finally {
      setDeliverySummaryLoading(false);
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
                {(order.status === "delivered" || order.status === "completed") && (
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </button>
                )}
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
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        {order.customer?.businessName || "N/A"}
                      </h4>

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
                        {order.customer?.location && (
                          <div className="flex items-center text-xs text-gray-600 sm:col-span-2">
                            <MapPinIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                            <a
                              href={order.customer.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View on Google Maps
                            </a>
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
                                order?.driverAssignment?.driver?.firstName ||
                                "Driver"
                              }
                              size="sm"
                            />
                            <div>
                              <p className="text-xs font-medium text-gray-900">
                                {order?.driverAssignment?.driver?.firstName} {order?.driverAssignment?.driver?.lastName}
                              </p>
                              <p className="text-[10px] text-gray-600">
                                {order.driverAssignment.driver.email}
                              </p>
                              {order.driverAssignment.driver.phone && (
                                <p className="text-[10px] text-gray-500">
                                  {order.driverAssignment.driver.phone}
                                </p>
                              )}
                              {order.driverAssignment.vehicleNumber && (
                                <p className="text-[10px] text-gray-900 font-medium mt-1">
                                  Vehicle: {order.driverAssignment.vehicleNumber}
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
                                  {order.customer?.businessName ||
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

                      {/* Share Delivery Summary Button - Only show for delivered orders */}
                      {(order.status === "delivered" ||
                        order.status === "completed") && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <PaperAirplaneIcon className="h-5 w-5 text-blue-600" />
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">
                                  Delivery Summary
                                </h4>
                                <p className="text-xs text-gray-600">
                                  Share or download the delivery summary PDF
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                console.log(
                                  "Share Delivery Summary button clicked!"
                                );
                                handleShareDeliverySummary();
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                              <ShareIcon className="h-4 w-4" />
                              Share Summary
                            </button>
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
                hasMore={activitiesPagination.hasMore}
                onLoadMore={loadMoreActivities}
                totalCount={activitiesPagination.totalCount}
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

      {/* Delivery Summary Sharing Modal */}
      {showDeliverySummaryModal && order && (
        <Modal
          isOpen={showDeliverySummaryModal}
          onClose={() => {
            setShowDeliverySummaryModal(false);
            setIsAutoOpenedModal(false);
          }}
          title={isAutoOpenedModal ? "🎉 Order Delivered - Share Details" : "Share Delivery Summary"}
        >
          <div className="p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Order Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {order.customer?.businessName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium text-green-600">
                    ₹{order.totalAmount?.toLocaleString("en-IN") || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-blue-600 capitalize">
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* WhatsApp Sharing Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Share via WhatsApp
                  </h4>
                  <p className="text-xs text-gray-600">
                    Send delivery note PDF with signatures
                  </p>
                </div>
              </div>
              <button
                onClick={handleShareWhatsappSummary}
                disabled={deliverySummaryLoading}
                className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deliverySummaryLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                    Share via WhatsApp
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                📄 Professional PDF with signatures, vehicle details, and complete order information
              </p>
            </div>

            {/* Download PDF - Prominent */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <ArrowDownTrayIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Download Delivery Note PDF
                  </h4>
                  <p className="text-xs text-gray-600">
                    Professional PDF with signatures and vehicle details
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download PDF
              </button>
            </div>

            {/* Other Sharing Options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  handleShareEmailSummary();
                }}
                disabled={deliverySummaryLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <EnvelopeIcon className="h-4 w-4" />
                Email
              </button>

              <button
                onClick={() => {
                  handleCopyTextSummary();
                }}
                disabled={deliverySummaryLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Copy
              </button>

              <button
                onClick={handlePrintTextSummary}
                disabled={deliverySummaryLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Print Text Summary
              </button>
            </div>

            {/* Cancel Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeliverySummaryModal(false)}
                className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default OrderDetailsPage;
