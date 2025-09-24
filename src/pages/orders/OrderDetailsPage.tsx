import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  CalendarIcon,
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
import type { Order } from '../../types';
import { toast } from 'react-hot-toast';

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
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
      const response = await orderService.getOrderById(orderId!);
      setOrder(response.data);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.message || 'Failed to fetch order details');
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
                          <span>{order.customer.address}</span>
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
                            {item.description && (
                              <div className="text-sm text-gray-500">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {orderService.formatCurrency(item.rate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {orderService.formatCurrency(item.amount)}
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
                  <span className="font-medium">{orderService.formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{orderService.formatCurrency(0)}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {orderService.formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Terms</span>
                    <span className="font-medium">{order.paymentTerms}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status</span>
                    <Badge className={orderService.getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </Badge>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Order Timeline
                </h3>
              </div>
              <div className="p-6">
                <div className="flow-root">
                  <ul className="-mb-8">
                    <li>
                      <div className="relative pb-8">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                              <CalendarIcon className="h-4 w-4 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-900 font-medium">Order Created</p>
                              <p className="text-sm text-gray-500">
                                Order {order.orderNumber} was created
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {orderService.formatDate(order.orderDate)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>

                    {order.approvedDate && (
                      <li>
                        <div className="relative pb-8">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                <CheckCircleIcon className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900 font-medium">Order Approved</p>
                                <p className="text-sm text-gray-500">
                                  {order.approvedBy ? `Approved by ${order.approvedBy}` : 'Order was approved'}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {orderService.formatDate(order.approvedDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}

                    {order.dispatchDate && (
                      <li>
                        <div className="relative pb-8">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                                <TruckIcon className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900 font-medium">Order Dispatched</p>
                                <p className="text-sm text-gray-500">Order is on its way</p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {orderService.formatDate(order.dispatchDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}

                    {order.deliveryDate && (
                      <li>
                        <div className="relative">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                <CheckCircleIcon className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900 font-medium">Order Delivered</p>
                                <p className="text-sm text-gray-500">Order has been delivered</p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {orderService.formatDate(order.deliveryDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
