import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import OrderItemEditor from '../../components/orders/OrderItemEditor';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { Order, OrderItem, UpdateOrderForm } from '../../types';
import { toast } from 'react-hot-toast';

const schema = yup.object({
  paymentTerms: yup.mixed<'Cash' | 'Credit' | 'Advance'>().oneOf(['Cash', 'Credit', 'Advance']).required('Payment terms are required'),
  priority: yup.mixed<'low' | 'normal' | 'high' | 'urgent'>().oneOf(['low', 'normal', 'high', 'urgent']).optional(),
  requiredDate: yup.string().optional(),
  discountPercentage: yup.number().min(0, 'Discount percentage must be positive').max(100, 'Discount percentage cannot exceed 100').optional(),
  discount: yup.number().min(0, 'Discount must be positive').optional(),
  taxAmount: yup.number().min(0, 'Tax amount must be positive').optional(),
  deliveryInstructions: yup.string().optional(),
  notes: yup.string().optional(),
  paidAmount: yup.number().min(0, 'Paid amount must be positive').optional(),
});

const EditOrderPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateOrderForm>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      paymentTerms: 'Cash',
      priority: 'normal',
      discountPercentage: 0,
      discount: 0,
      taxAmount: 0,
      paidAmount: 0,
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        toast.error('Order ID is required');
        navigate('/orders');
        return;
      }

      try {
        setLoading(true);
        const data = await orderService.getOrderById(orderId);
        setOrder(data);
        setOrderItems(data.items || []);

        // Populate form values
        setValue('paymentTerms', data.paymentTerms);
        setValue('priority', data.priority);
        if (data.requiredDate) setValue('requiredDate', data.requiredDate.split('T')[0]);
        if (typeof data.discountPercentage === 'number') setValue('discountPercentage', data.discountPercentage);
        if (typeof data.discount === 'number') setValue('discount', data.discount);
        if (typeof data.taxAmount === 'number') setValue('taxAmount', data.taxAmount);
        if (data.deliveryInstructions) setValue('deliveryInstructions', data.deliveryInstructions);
        if (data.notes) setValue('notes', data.notes);
        if (typeof data.paidAmount === 'number') setValue('paidAmount', data.paidAmount);
      } catch (err) {
        console.error('Failed to load order:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load order');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, navigate, setValue]);

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = watchedValues.discountPercentage
      ? (subtotal * watchedValues.discountPercentage) / 100
      : (watchedValues.discount || 0);
    return subtotal - discountAmount + (watchedValues.taxAmount || 0);
  };

  const onSubmit = async (data: UpdateOrderForm) => {
    try {
      if (!order) return;
      setSaving(true);

      // Validate order items
      if (orderItems.length === 0) {
        toast.error('Please add at least one order item');
        return;
      }

      const itemErrors = orderItems.flatMap((item, index) =>
        orderService.validateOrderItem(item).map(error => `Item ${index + 1}: ${error}`)
      );

      if (itemErrors.length > 0) {
        toast.error(itemErrors[0]);
        return;
      }

      // Determine payment status from paid amount
      const effectiveTotal = calculateTotal();
      let paymentStatus: Order['paymentStatus'] | undefined = undefined;
      if (typeof data.paidAmount === 'number') {
        if (data.paidAmount >= effectiveTotal) paymentStatus = 'paid';
        else if (data.paidAmount > 0) paymentStatus = 'partial';
        else paymentStatus = 'pending';
      }

      const payload: UpdateOrderForm = {
        ...data,
        items: orderItems,
        ...(paymentStatus ? { paymentStatus } : {}),
      };

      const updated = await orderService.updateOrder(order._id, payload);
      toast.success('Order updated successfully!');
      navigate(`/orders/${updated._id}`);
    } catch (err) {
      console.error('Failed to update order:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalAmount = calculateTotal();
  const paidAmount = watchedValues.paidAmount || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile-optimized Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(`/orders/${order._id}`)}
              className="inline-flex items-center p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Edit Order {order.orderNumber}
              </h1>
              <p className="hidden sm:block mt-1 text-sm text-gray-600">
                Modify items and order details
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-screen-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Customer Info (Read-only) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Customer
                </h3>
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Business:</span>
                      <p className="text-gray-900">{order.customer?.businessName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Contact:</span>
                      <p className="text-gray-900">{order.customer?.contactPersonName}</p>
                      <p className="text-gray-600">{order.customer?.phone}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Customer cannot be changed when editing an order
                </p>
              </div>

              {/* Godown Info (Read-only) */}
              {order.godown && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Godown
                  </h3>
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{order.godown.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.godown.location.city}
                      {order.godown.location.area && `, ${order.godown.location.area}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Items
                </h3>
                <OrderItemEditor
                  items={orderItems}
                  onChange={setOrderItems}
                />
              </div>

              {/* Order Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Details
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Terms <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('paymentTerms')}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      >
                        {orderService.getPaymentTerms().map((term) => (
                          <option key={term} value={term}>
                            {term}
                          </option>
                        ))}
                      </select>
                      {errors.paymentTerms && (
                        <p className="mt-1 text-sm text-red-600">{errors.paymentTerms.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        {...register('priority')}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      >
                        {orderService.getPriorityOptions().map((priority) => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Required Date
                      </label>
                      <input
                        type="date"
                        {...register('requiredDate')}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Instructions
                    </label>
                    <input
                      type="text"
                      {...register('deliveryInstructions')}
                      placeholder="Special delivery instructions"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      placeholder="Additional notes about this order"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Summary
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{orderService.formatCurrency(calculateSubtotal())}</span>
                  </div>

                  {/* Discount */}
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700">Discount</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        {...register('discountPercentage')}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Or fixed: ₹
                      <input
                        type="number"
                        {...register('discount')}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs ml-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Tax */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tax</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">₹</span>
                      <input
                        type="number"
                        {...register('taxAmount')}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-emerald-600">{orderService.formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  {/* Payment Section */}
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Payment</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Paid Amount</span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">₹</span>
                          <input
                            type="number"
                            {...register('paidAmount')}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Remaining</span>
                        <span className="font-medium text-orange-600">
                          {orderService.formatCurrency(remainingAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setValue('paidAmount', totalAmount)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                        >
                          Mark as Paid
                        </button>
                        <button
                          type="button"
                          onClick={() => setValue('paidAmount', 0)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden lg:block mt-6 space-y-3">
                  <button
                    type="submit"
                    disabled={saving || orderItems.length === 0}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/orders/${order._id}`)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Mobile Bottom Action Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom">
          <div className="px-4 py-4 max-w-screen-2xl mx-auto w-full">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                <div className="text-lg font-semibold text-emerald-600 truncate">
                  {orderService.formatCurrency(totalAmount)}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/orders/${order._id}`)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || orderItems.length === 0}
                  onClick={handleSubmit(onSubmit as any)}
                  className="px-6 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center whitespace-nowrap"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Padding */}
        <div className="lg:hidden h-20"></div>
      </div>
    </div>
  );
};

export default EditOrderPage;