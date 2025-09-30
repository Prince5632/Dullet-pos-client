import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import CustomerSelector from '../../components/customers/CustomerSelector';
import OrderItemEditor from '../../components/orders/OrderItemEditor';
import type { CreateOrderForm, OrderItem, Customer, Godown } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { toast } from 'react-hot-toast';

const schema = yup.object({
  customer: yup.string().required('Customer is required'),
  paymentTerms: yup.string().required('Payment terms are required'),
  priority: yup.string().optional(),
  requiredDate: yup.string().optional(),
  discountPercentage: yup.number().min(0, 'Discount percentage must be positive').max(100, 'Discount percentage cannot exceed 100').optional(),
  discount: yup.number().min(0, 'Discount must be positive').optional(),
  taxAmount: yup.number().min(0, 'Tax amount must be positive').optional(),
  deliveryInstructions: yup.string().optional(),
  notes: yup.string().optional(),
});

const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      productName: 'Wheat Flour',
      grade: '',
      quantity: 1,
      unit: 'KG',
      ratePerUnit: 0,
      totalAmount: 0,
      packaging: 'Standard',
    },
  ]);
  const { user } = useAuth();
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodownId, setSelectedGodownId] = useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
        if (res.success && res.data) {
          setGodowns(res.data.godowns);
          // Default to user's primary godown if available
          const defaultId = (user as any)?.primaryGodown?._id;
          if (defaultId) setSelectedGodownId(defaultId);
        }
      } catch {}
    })();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateOrderForm>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      paymentTerms: 'Cash',
      priority: 'normal',
      discountPercentage: 0,
      discount: 0,
      taxAmount: 0,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: CreateOrderForm) => {
    try {
      setLoading(true);

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

      // Validate godown selection
      if (!selectedGodownId) {
        toast.error('Please select a godown');
        return;
      }

      // Prepare order data
      const orderData: CreateOrderForm = {
        ...data,
        items: orderItems,
        godown: selectedGodownId || undefined,
      };

      // Create order
      const createdOrder = await orderService.createOrder(orderData);

      toast.success('Order created successfully!');
      navigate(`/orders/${createdOrder._id}`);
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId: string, customer: Customer | null) => {
    setValue('customer', customerId);
    setSelectedCustomer(customer);
    
    // Auto-set delivery address if customer address is available
    if (customer?.address) {
      setValue('deliveryAddress', {
        street: customer.address.street,
        city: customer.address.city,
        state: customer.address.state,
        pincode: customer.address.pincode,
        country: customer.address.country,
      });
    }

    // Auto-set payment terms based on customer credit
    if (customer && customer.creditLimit > 0 && customer.creditDays > 0) {
      setValue('paymentTerms', 'Credit');
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Create Order</h1>
              <p className="hidden sm:block text-xs text-gray-600">
                New order for customer
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Customer Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                  Customer
                </h3>
                <CustomerSelector
                  selectedCustomerId={watchedValues.customer}
                  onCustomerChange={handleCustomerChange}
                  label="Select Customer"
                  placeholder="Search and select a customer"
                  required
                  error={errors.customer?.message}
                />

                {selectedCustomer && (
                  <div className="mt-3 p-2.5 sm:p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                      <div>
                        <span className="font-medium text-emerald-800">Contact:</span>
                        <p className="text-emerald-700">{selectedCustomer.contactPersonName}</p>
                        <p className="text-emerald-700">{selectedCustomer.phone}</p>
                      </div>
                      <div>
                        <span className="font-medium text-emerald-800">Address:</span>
                        <p className="text-emerald-700">
                          {selectedCustomer.address?.city}, {selectedCustomer.address?.state}
                        </p>
                      </div>
                      {selectedCustomer.creditLimit > 0 && (
                        <>
                          <div>
                            <span className="font-medium text-emerald-800">Credit Limit:</span>
                            <p className="text-emerald-700">₹{selectedCustomer.creditLimit.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium text-emerald-800">Outstanding:</span>
                            <p className="text-emerald-700">₹{selectedCustomer.outstandingAmount.toLocaleString()}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Godown Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                  Godown
                </h3>
                <select
                  value={selectedGodownId}
                  onChange={(e) => setSelectedGodownId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select godown</option>
                  {godowns.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.location.city}{g.location.area ? ` - ${g.location.area}` : ''})</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">Defaulted from your assigned godown when available.</p>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                  Items
                </h3>
                <OrderItemEditor
                  items={orderItems}
                  onChange={setOrderItems}
                />
              </div>

              {/* Order Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                  Details
                </h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 sticky top-16">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                  Summary
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{orderService.formatCurrency(calculateSubtotal())}</span>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2 p-2.5 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-700">Discount</div>
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
                  <div className="flex justify-between items-center text-xs">
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

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-base font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-emerald-600">{orderService.formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden lg:block mt-4 space-y-2">
                  <button
                    type="submit"
                    disabled={loading || orderItems.length === 0}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Order'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="w-full py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Mobile Bottom Action Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom shadow-lg">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500 mb-0.5">Total Amount</div>
                <div className="text-base font-bold text-emerald-600 truncate">
                  {orderService.formatCurrency(calculateTotal())}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || orderItems.length === 0}
                  className="px-4 py-2 border border-transparent rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Padding */}
        <div className="lg:hidden h-16"></div>
      </div>
    </div>
  );
};

export default CreateOrderPage;
