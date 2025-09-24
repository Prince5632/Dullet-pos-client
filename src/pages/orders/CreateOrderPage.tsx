import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import CustomerSelector from '../../components/customers/CustomerSelector';
import OrderItemEditor from '../../components/orders/OrderItemEditor';
import type { CreateOrderForm, OrderItem, Customer } from '../../types';
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

      // Prepare order data
      const orderData: CreateOrderForm = {
        ...data,
        items: orderItems,
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/orders')}
              className="text-gray-600 hover:text-gray-800 p-1"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
              <p className="mt-1 text-sm text-gray-600">
                Create a new order for a customer
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Selection */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <CustomerSelector
                  selectedCustomerId={watchedValues.customer}
                  onCustomerChange={handleCustomerChange}
                  label="Select Customer"
                  placeholder="Search and select a customer"
                  required
                  error={errors.customer?.message}
                />

                {selectedCustomer && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Contact:</span>
                        <p className="text-gray-600">{selectedCustomer.contactPersonName}</p>
                        <p className="text-gray-600">{selectedCustomer.phone}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Address:</span>
                        <p className="text-gray-600">
                          {selectedCustomer.address?.city}, {selectedCustomer.address?.state}
                        </p>
                      </div>
                      {selectedCustomer.creditLimit > 0 && (
                        <>
                          <div>
                            <span className="font-medium text-gray-700">Credit Limit:</span>
                            <p className="text-gray-600">₹{selectedCustomer.creditLimit.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Outstanding:</span>
                            <p className="text-gray-600">₹{selectedCustomer.outstandingAmount.toLocaleString()}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow p-6">
                <OrderItemEditor
                  items={orderItems}
                  onChange={setOrderItems}
                />
              </div>

              {/* Order Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('paymentTerms')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      {...register('priority')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {orderService.getPriorityOptions().map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Date
                    </label>
                    <input
                      type="date"
                      {...register('requiredDate')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Instructions
                    </label>
                    <input
                      type="text"
                      {...register('deliveryInstructions')}
                      placeholder="Special delivery instructions"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Additional notes about this order"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{orderService.formatCurrency(calculateSubtotal())}</span>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        {...register('discountPercentage')}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-600">% discount</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Or fixed amount: ₹
                      <input
                        type="number"
                        {...register('discount')}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-xs ml-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Tax */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax Amount:</span>
                    <div className="flex items-center space-x-1">
                      <span>₹</span>
                      <input
                        type="number"
                        {...register('taxAmount')}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">{orderService.formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="submit"
                    disabled={loading || orderItems.length === 0}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Order...
                      </>
                    ) : (
                      'Create Order'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderPage;
