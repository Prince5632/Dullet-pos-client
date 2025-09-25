import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import OrderStatusDropdown from '../../components/orders/OrderStatusDropdown';
import OrderTimeline from '../../components/orders/OrderTimeline';
import type { Order } from '../../types';
import { toast } from 'react-hot-toast';

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is required');
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
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err?.message || err?.response?.data?.message || 'Failed to fetch order details');
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrder(updatedOrder);
    toast.success('Order updated successfully');
  };

  const handlePrint = () => {
    window.print();
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
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The order you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => navigate('/orders')}
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
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
    approved: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    rejected: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
    processing: { color: 'bg-blue-100 text-blue-800', icon: BuildingOfficeIcon },
    ready: { color: 'bg-purple-100 text-purple-800', icon: CheckCircleIcon },
    dispatched: { color: 'bg-indigo-100 text-indigo-800', icon: TruckIcon },
    delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircleIcon },
    cancelled: { color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
  };

  const currentStatusInfo = statusInfo[order.status as keyof typeof statusInfo];

  // Fallback: show just-created payment (from QuickOrder navigation state) if backend hasn't persisted yet
  const navState = (location as unknown as { state?: any })?.state;
  const justCreatedPayment = navState?.justCreatedPayment as { paidAmount?: number; paymentStatus?: Order['paymentStatus'] } | undefined;
  const paidDisplay = (typeof order.paidAmount === 'number' && order.paidAmount > 0)
    ? order.paidAmount
    : (justCreatedPayment?.paidAmount || 0);
  const paymentStatusDisplay: Order['paymentStatus'] = (typeof order.paidAmount === 'number' && order.paidAmount > 0)
    ? order.paymentStatus
    : (justCreatedPayment?.paymentStatus || order.paymentStatus);
  const remainingDisplay = Math.max(0, (order.totalAmount || 0) - (paidDisplay || 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/orders')}
                className="inline-flex items-center p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Order {order.orderNumber}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge className={currentStatusInfo.color}>
                    <currentStatusInfo.icon className="h-3 w-3 mr-1" />
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Created {orderService.formatDate(order.orderDate)}
                  </span>
                  {order.godown && (
                    <span className="text-sm text-gray-500">
                      • {order.godown.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {hasPermission('orders.update') && (
                <OrderStatusDropdown
                  order={order}
                  onOrderUpdate={handleOrderUpdate}
                />
              )}
              <button
                onClick={handleShare}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <ShareIcon className="h-4 w-4 mr-2" />
                Share
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </button>
              {hasPermission('orders.update') && (
                <Link
                  to={`/orders/${order._id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Order
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Customer Information
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar 
                    name={order.customer?.businessName || 'Customer'} 
                    size="lg" 
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-medium text-gray-900">
                      {order.customer?.businessName || 'N/A'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {order.customer?.contactPersonName || 'N/A'}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {order.customer?.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {order.customer.phone}
                        </div>
                      )}
                      {order.customer?.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {order.customer.email}
                        </div>
                      )}
                      {order.customer?.address && (
                        <div className="flex items-start text-sm text-gray-600 sm:col-span-2">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>
                            {[
                              order.customer.address.street,
                              `${order.customer.address.city}, ${order.customer.address.state}`,
                              order.customer.address.pincode
                            ].filter(Boolean).join(' • ')}
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
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Order Items
                </h3>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items?.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.productName}
                            </div>
                            {item.packaging && (
                              <div className="text-sm text-gray-500">
                                Packaging: {item.packaging}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {orderService.formatCurrency(item.ratePerUnit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {orderService.formatCurrency(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Notes */}
            {(order.notes || order.internalNotes) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                </div>
                <div className="p-6 space-y-4">
                  {order.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {order.notes}
                      </p>
                    </div>
                  )}
                  {order.internalNotes && hasPermission('orders.read') && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Internal Notes</h4>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                        {order.internalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CurrencyRupeeIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Order Summary
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{orderService.formatCurrency(order.subtotal)}</span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{orderService.formatCurrency(order.taxAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {orderService.formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  {order.paymentTerms !== 'Cash' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payment Terms</span>
                      <span className="font-medium">{order.paymentTerms}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status</span>
                    <Badge className={orderService.getPaymentStatusColor(paymentStatusDisplay)}>
                      {paymentStatusDisplay.charAt(0).toUpperCase() + paymentStatusDisplay.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-medium">{orderService.formatCurrency(paidDisplay || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining</span>
                    <span className="font-medium">{orderService.formatCurrency(remainingDisplay)}</span>
                  </div>
                  {order.priority !== 'normal' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Priority</span>
                      <Badge className={
                        order.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        order.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <OrderTimeline order={order} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
